import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import db from "../db";
import { fileBlobs, projectFiles, projectFileVersions } from "../db/schema";
import { and, eq, isNull } from "drizzle-orm";

function repoTemplatesRoot() {
  // apps/gateway/src/templates -> repo root/templates
  return path.resolve(process.cwd(), "..", "..", "templates");
}

async function walk(dir: string, relPrefix = ""): Promise<Array<{ relPath: string; type: "file" | "dir"; absPath: string }>> {
  const entries = await readdir(dir);
  const out: Array<{ relPath: string; type: "file" | "dir"; absPath: string }> = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry);
    const st = await stat(abs);
    const relPath = relPrefix ? `${relPrefix}/${entry}` : entry;
    if (st.isDirectory()) {
      out.push({ relPath, type: "dir", absPath: abs });
      out.push(...(await walk(abs, relPath)));
    } else if (st.isFile()) {
      out.push({ relPath, type: "file", absPath: abs });
    }
  }
  return out;
}

async function ensureFileBlob(content: string) {
  const sha256 = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  const [existing] = await db.select().from(fileBlobs).where(eq(fileBlobs.sha256, sha256)).limit(1);
  if (existing) return existing;
  const [inserted] = await db
    .insert(fileBlobs)
    .values({
      sha256,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      isBinary: false,
      textContent: content,
      metadata: { source: "template" },
    })
    .returning();
  return inserted;
}

export async function bootstrapProjectFromTemplate(input: {
  projectId: string;
  actorUserId: string;
  templateKey: string;
  templateVersion: string;
}) {
  const templateDir = path.join(repoTemplatesRoot(), input.templateKey, `v${input.templateVersion}`);
  const nodes = await walk(templateDir);

  for (const node of nodes) {
    const p = node.relPath.replace(/\\/g, "/");
    const parentPath = p.includes("/") ? p.split("/").slice(0, -1).join("/") : null;

    if (node.type === "dir") {
      const [existing] = await db
        .select({ id: projectFiles.id })
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.path, p), isNull(projectFiles.deletedAt)))
        .limit(1);
      if (!existing) {
        await db.insert(projectFiles).values({
          projectId: input.projectId,
          path: p,
          fileType: "dir",
          parentPath,
        });
      }
      continue;
    }

    const content = await readFile(node.absPath, "utf8");
    const blob = await ensureFileBlob(content);

    const [fileRow] = await db
      .insert(projectFiles)
      .values({
        projectId: input.projectId,
        path: p,
        fileType: "file",
        parentPath,
      })
      .onConflictDoUpdate({
        target: [projectFiles.projectId, projectFiles.path],
        set: {
          fileType: "file",
          parentPath,
          updatedAt: new Date(),
          deletedAt: null,
        },
      })
      .returning();

    await db.insert(projectFileVersions).values({
      projectFileId: fileRow.id,
      blobSha256: blob.sha256,
      actorUserId: input.actorUserId,
      source: "import",
      message: `bootstrap:${input.templateKey}@v${input.templateVersion}`,
    });
  }
}

