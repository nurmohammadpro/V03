import { FastifyInstance } from "fastify";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import crypto from "node:crypto";
import db from "../db";
import { fileBlobs, projectFiles, projectFileVersions, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { bootstrapProjectFromTemplate } from "../templates/bootstrap";
import { exportProjectToTarGz, readExportedTarball } from "../runner/exportProjectToTarGz";
import { refreshPreviewForProject } from "../runner/runnerQueue";

function normalizePath(input: string) {
  const trimmed = input.trim().replace(/\\/g, "/");
  const withoutLeading = trimmed.replace(/^\/+/, "");
  if (!withoutLeading || withoutLeading.includes("..")) {
    throw new Error("Invalid path");
  }
  return withoutLeading;
}

async function requireProjectAccess(projectId: string, actor: { userId: string; isAdmin: boolean }) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return null;
  }

  if (!actor.isAdmin && project.userId !== actor.userId) {
    return "forbidden" as const;
  }

  return project;
}

async function ensureFileBlob(content: string) {
  const sha256 = crypto.createHash("sha256").update(content, "utf8").digest("hex");

  const [existing] = await db.select().from(fileBlobs).where(eq(fileBlobs.sha256, sha256)).limit(1);
  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(fileBlobs)
    .values({
      sha256,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      isBinary: false,
      textContent: content,
      metadata: {},
    })
    .returning();

  return inserted;
}

export async function fileRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/projects/:id/tree
  app.get("/api/projects/:id/tree", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const project = await requireProjectAccess(id, actor);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    if (project === "forbidden") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    let rows = await db
      .select({
        id: projectFiles.id,
        path: projectFiles.path,
        fileType: projectFiles.fileType,
        parentPath: projectFiles.parentPath,
        updatedAt: projectFiles.updatedAt,
      })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, id), isNull(projectFiles.deletedAt)))
      .orderBy(projectFiles.path);

    if (
      rows.length === 0 &&
      typeof (project as any).templateKey === "string" &&
      (project as any).templateKey &&
      (typeof (project as any).templateVersion === "string" || typeof (project as any).templateVersion === "number") &&
      String((project as any).templateVersion)
    ) {
      const templateKey = String((project as any).templateKey);
      const templateVersion = String((project as any).templateVersion);

      try {
        request.log.info({ projectId: id, templateKey, templateVersion }, "Project tree empty; bootstrapping template");
        await bootstrapProjectFromTemplate({
          projectId: id,
          actorUserId: actor.userId,
          templateKey,
          templateVersion,
        });
        rows = await db
          .select({
            id: projectFiles.id,
            path: projectFiles.path,
            fileType: projectFiles.fileType,
            parentPath: projectFiles.parentPath,
            updatedAt: projectFiles.updatedAt,
          })
          .from(projectFiles)
          .where(and(eq(projectFiles.projectId, id), isNull(projectFiles.deletedAt)))
          .orderBy(projectFiles.path);
      } catch (err: any) {
        request.log.error({ err, projectId: id, templateKey, templateVersion }, "Template bootstrap failed for empty project");
      }
    }

    return reply.send({ files: rows });
  });

  // GET /api/projects/:id/files?path=...
  app.get("/api/projects/:id/files", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const query = request.query as { path?: string };

    if (!query.path) {
      return reply.status(400).send({ error: "path is required" });
    }

    let normalizedPath: string;
    try {
      normalizedPath = normalizePath(query.path);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Invalid path" });
    }

    const project = await requireProjectAccess(id, actor);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    if (project === "forbidden") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const [fileRow] = await db
      .select({
        fileId: projectFiles.id,
        path: projectFiles.path,
        fileType: projectFiles.fileType,
      })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, id), eq(projectFiles.path, normalizedPath), isNull(projectFiles.deletedAt)))
      .limit(1);

    if (!fileRow) {
      return reply.status(404).send({ error: "File not found" });
    }

    if (fileRow.fileType !== "file") {
      return reply.status(400).send({ error: "Path is not a file" });
    }

    const [version] = await db
      .select({
        blobSha256: projectFileVersions.blobSha256,
        createdAt: projectFileVersions.createdAt,
      })
      .from(projectFileVersions)
      .where(eq(projectFileVersions.projectFileId, fileRow.fileId))
      .orderBy(sql`${projectFileVersions.createdAt} desc`)
      .limit(1);

    if (!version) {
      return reply.send({ path: fileRow.path, content: "" });
    }

    const [blob] = await db.select().from(fileBlobs).where(eq(fileBlobs.sha256, version.blobSha256)).limit(1);
    if (!blob) {
      return reply.status(500).send({ error: "File content missing" });
    }

    return reply.send({
      path: fileRow.path,
      sha256: blob.sha256,
      content: blob.textContent ?? "",
      updatedAt: version.createdAt,
    });
  });

  // PUT /api/projects/:id/files?path=...
  app.put("/api/projects/:id/files", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const query = request.query as { path?: string };
    const body = request.body as { content?: string; message?: string; overwrite?: boolean };

    if (!query.path) {
      return reply.status(400).send({ error: "path is required" });
    }
    if (typeof body.content !== "string") {
      return reply.status(400).send({ error: "content is required" });
    }

    let normalizedPath: string;
    try {
      normalizedPath = normalizePath(query.path);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Invalid path" });
    }

    const project = await requireProjectAccess(id, actor);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    if (project === "forbidden") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const parentPath = normalizedPath.includes("/") ? normalizedPath.split("/").slice(0, -1).join("/") : null;

    const blob = await ensureFileBlob(body.content);

    const [existing] = await db
      .select({ id: projectFiles.id })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, id), eq(projectFiles.path, normalizedPath), isNull(projectFiles.deletedAt)))
      .limit(1);

    if (!existing) {
      const [createdFile] = await db
        .insert(projectFiles)
        .values({
          projectId: id,
          path: normalizedPath,
          fileType: "file",
          parentPath,
        })
        .returning();

      await db.insert(projectFileVersions).values({
        projectFileId: createdFile.id,
        blobSha256: blob.sha256,
        actorUserId: actor.userId,
        source: "manual",
        message: body.message ?? null,
      });

      return reply.status(201).send({ ok: true, path: normalizedPath, sha256: blob.sha256 });
    }

    await db
      .update(projectFiles)
      .set({ updatedAt: new Date() })
      .where(eq(projectFiles.id, existing.id));

    await db.insert(projectFileVersions).values({
      projectFileId: existing.id,
      blobSha256: blob.sha256,
      actorUserId: actor.userId,
      source: "manual",
      message: body.message ?? null,
    });

    await refreshPreviewForProject(id).catch(() => null);

    return reply.send({ ok: true, path: normalizedPath, sha256: blob.sha256 });
  });

  // DELETE /api/projects/:id/files?path=...
  app.delete("/api/projects/:id/files", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const query = request.query as { path?: string };

    if (!query.path) {
      return reply.status(400).send({ error: "path is required" });
    }

    let normalizedPath: string;
    try {
      normalizedPath = normalizePath(query.path);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Invalid path" });
    }

    const project = await requireProjectAccess(id, actor);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    if (project === "forbidden") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const [existing] = await db
      .select({ id: projectFiles.id, fileType: projectFiles.fileType })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, id), eq(projectFiles.path, normalizedPath), isNull(projectFiles.deletedAt)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "File not found" });
    }

    if (existing.fileType === "dir") {
      // Soft delete subtree
      await db
        .update(projectFiles)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(projectFiles.projectId, id), like(projectFiles.path, `${normalizedPath}/%`)));
    }

    await db.update(projectFiles).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(projectFiles.id, existing.id));

    await refreshPreviewForProject(id).catch(() => null);

    return reply.send({ ok: true });
  });

  // GET /api/projects/:id/download — export project as .tgz
  app.get("/api/projects/:id/download", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    try {
      const { tarPath } = await exportProjectToTarGz(id);
      const tarball = await readExportedTarball(tarPath);

      const projectName = (project as any).name?.replace(/[^a-zA-Z0-9_\-]/g, "_") || "project";
      reply.header("Content-Type", "application/gzip");
      reply.header("Content-Disposition", `attachment; filename="${projectName}.tgz"`);
      reply.header("Content-Length", String(tarball.length));

      return reply.send(tarball);
    } catch (err: any) {
      request.log.error({ err, projectId: id }, "Project export failed");
      const safeMsg = process.env.NODE_ENV === "production" ? "Export failed" : (err?.message || "Export failed");
      return reply.status(500).send({ error: "Failed to export project", detail: safeMsg });
    }
  });
}
