import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { mkdir, rm, writeFile, readFile, stat, utimes, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import db from "../db";
import { fileBlobs, projectFiles, projectFileVersions, projects } from "../db/schema";

const execFileAsync = promisify(execFile);

function parseIntOrDefault(value: string | undefined, fallback: number) {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getArtifactRoot() {
  return path.join(tmpdir(), "v03-gateway-artifacts");
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

type ExportMeta = {
  projectId: string;
  frameworkKind: string | null;
  runtimeKind: string | null;
  installCommand: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  devCommand: string | null;
  internalPort: number | null;
  healthcheckPath: string | null;
};

function computeBundleHash(input: { meta: ExportMeta; files: Array<{ path: string; sha256: string | null }> }) {
  const payload = {
    meta: input.meta,
    files: input.files.sort((a, b) => a.path.localeCompare(b.path)),
  };
  const raw = JSON.stringify(payload);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function exportProjectToTarGz(projectId: string) {
  const workRoot = path.join(tmpdir(), "v03-gateway-export");
  await mkdir(workRoot, { recursive: true });

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const exportMeta: ExportMeta = {
    projectId,
    frameworkKind: project?.frameworkKind ?? null,
    runtimeKind: project?.runtimeKind ?? null,
    installCommand: project?.installCommand ?? null,
    buildCommand: project?.buildCommand ?? null,
    startCommand: project?.startCommand ?? null,
    devCommand: project?.devCommand ?? null,
    internalPort: project?.defaultPort ?? null,
    healthcheckPath: project?.healthcheckPath ?? null,
  };

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
    // Cache empty bundles too (still useful for reproducibility/debugging)
    const artifactRoot = getArtifactRoot();
    await mkdir(artifactRoot, { recursive: true });
    const bundleHash = computeBundleHash({ meta: exportMeta, files: [] });
    const cachedPath = path.join(artifactRoot, `${bundleHash}.tgz`);
    if (await fileExists(cachedPath)) {
      const now = new Date();
      await utimes(cachedPath, now, now).catch(() => {});
      return { tarPath: cachedPath, bundleHash, cacheHit: true as const };
    }

    const exportDir = path.join(workRoot, projectId);
    await rm(exportDir, { recursive: true, force: true });
    await mkdir(exportDir, { recursive: true });
    const metaDir = path.join(exportDir, ".v03");
    await mkdir(metaDir, { recursive: true });
    await writeFile(path.join(metaDir, "meta.json"), JSON.stringify(exportMeta, null, 2), "utf8");

    const tarPath = path.join(workRoot, `${bundleHash}.tgz`);
    await execFileAsync("tar", ["-czf", tarPath, "-C", exportDir, "."]);
    await writeFile(cachedPath, await readFile(tarPath));
    return { tarPath: cachedPath, bundleHash, cacheHit: false as const };
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

  const bundleHash = computeBundleHash({
    meta: exportMeta,
    files: files
      .filter((f) => f.fileType === "file")
      .map((f) => ({ path: f.path, sha256: latestByFile.get(f.id) ?? null })),
  });

  const artifactRoot = getArtifactRoot();
  await mkdir(artifactRoot, { recursive: true });
  const cachedPath = path.join(artifactRoot, `${bundleHash}.tgz`);
  if (await fileExists(cachedPath)) {
    const now = new Date();
    await utimes(cachedPath, now, now).catch(() => {});
    return { tarPath: cachedPath, bundleHash, cacheHit: true as const };
  }

  const exportDir = path.join(workRoot, projectId);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  const metaDir = path.join(exportDir, ".v03");
  await mkdir(metaDir, { recursive: true });
  await writeFile(path.join(metaDir, "meta.json"), JSON.stringify(exportMeta, null, 2), "utf8");

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

  const tarPath = path.join(workRoot, `${bundleHash}.tgz`);
  await execFileAsync("tar", ["-czf", tarPath, "-C", exportDir, "."]);
  await writeFile(cachedPath, await readFile(tarPath));
  return { tarPath: cachedPath, bundleHash, cacheHit: false as const };
}

export async function readExportedTarball(tarPath: string) {
  return readFile(tarPath);
}

export async function cleanupGatewayArtifacts() {
  const ttlSeconds = parseIntOrDefault(process.env.GATEWAY_ARTIFACT_CACHE_TTL_SECONDS, 3600);
  const maxFiles = parseIntOrDefault(process.env.GATEWAY_ARTIFACT_CACHE_MAX, 50);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;

  const root = getArtifactRoot();
  try {
    const entries = await readdir(root).catch(() => []);
    const tgzs = entries.filter((name) => name.endsWith(".tgz"));
    const now = Date.now();
    const inspected: Array<{ path: string; mtimeMs: number }> = [];

    for (const name of tgzs) {
      const full = path.join(root, name);
      try {
        const s = await stat(full);
        inspected.push({ path: full, mtimeMs: s.mtimeMs });
      } catch {
        // ignore
      }
    }

    const expired = inspected.filter((f) => (now - f.mtimeMs) / 1000 > ttlSeconds);
    for (const f of expired) {
      await unlink(f.path).catch(() => {});
    }

    if (Number.isFinite(maxFiles) && maxFiles > 0) {
      const remaining = inspected
        .filter((f) => !expired.some((e) => e.path === f.path))
        .sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first
      const overflow = remaining.length - maxFiles;
      if (overflow > 0) {
        for (const f of remaining.slice(0, overflow)) {
          await unlink(f.path).catch(() => {});
        }
      }
    }
  } catch {
    // ignore cleanup failures
  }
}
