import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import db from "../db";
import { fileBlobs, projectFiles, projectFileVersions, projects } from "../db/schema";

const execFileAsync = promisify(execFile);

export async function exportProjectToTarGz(projectId: string) {
  const workRoot = path.join(tmpdir(), "v03-gateway-export");
  await mkdir(workRoot, { recursive: true });
  const exportDir = path.join(workRoot, projectId);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project) {
    const metaDir = path.join(exportDir, ".v03");
    await mkdir(metaDir, { recursive: true });
    await writeFile(
      path.join(metaDir, "meta.json"),
      JSON.stringify(
        {
          projectId,
          frameworkKind: project.frameworkKind,
          runtimeKind: project.runtimeKind,
          installCommand: project.installCommand,
          buildCommand: project.buildCommand,
          startCommand: project.startCommand,
          devCommand: project.devCommand,
          internalPort: project.defaultPort,
          healthcheckPath: project.healthcheckPath,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  const files = await db
    .select({
      id: projectFiles.id,
      path: projectFiles.path,
      fileType: projectFiles.fileType,
    })
    .from(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), isNull(projectFiles.deletedAt)));

  const fileIds = files.filter((f) => f.fileType === "file").map((f) => f.id);
  if (fileIds.length === 0) {
    const tarPath = path.join(workRoot, `${projectId}.tgz`);
    await execFileAsync("tar", ["-czf", tarPath, "-C", exportDir, "."]);
    return { tarPath };
  }

  const versions = await db
    .select({
      projectFileId: projectFileVersions.projectFileId,
      blobSha256: projectFileVersions.blobSha256,
      createdAt: projectFileVersions.createdAt,
    })
    .from(projectFileVersions)
    .where(inArray(projectFileVersions.projectFileId, fileIds))
    .orderBy(desc(projectFileVersions.createdAt));

  const latestByFile = new Map<string, string>();
  for (const row of versions) {
    if (!latestByFile.has(row.projectFileId)) {
      latestByFile.set(row.projectFileId, row.blobSha256);
    }
  }

  const shaList = [...new Set([...latestByFile.values()])];
  const blobs = shaList.length
    ? await db
        .select({
          sha256: fileBlobs.sha256,
          textContent: fileBlobs.textContent,
        })
        .from(fileBlobs)
        .where(inArray(fileBlobs.sha256, shaList))
    : [];
  const blobMap = new Map(blobs.map((b) => [b.sha256, b.textContent ?? ""]));

  for (const file of files) {
    if (file.fileType !== "file") continue;
    const sha = latestByFile.get(file.id);
    const content = sha ? blobMap.get(sha) ?? "" : "";
    const fullPath = path.join(exportDir, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
  }

  const tarPath = path.join(workRoot, `${projectId}.tgz`);
  await execFileAsync("tar", ["-czf", tarPath, "-C", exportDir, "."]);
  return { tarPath };
}

export async function readExportedTarball(tarPath: string) {
  return readFile(tarPath);
}

