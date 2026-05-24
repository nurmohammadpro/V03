import { FastifyInstance } from "fastify";
import db from "../db";
import { fileBlobs, projectFiles, projectFileVersions, projects, projectSnapshots } from "../db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { bootstrapProjectFromTemplate } from "../templates/bootstrap";
import { enforceActiveProjectsLimit } from "../billing/limits";
import crypto from "node:crypto";

type FrameworkKind = "nextjs" | "react-vite" | "mern" | "django" | "laravel" | "nestjs";

function defaultsForFramework(kind: FrameworkKind) {
  switch (kind) {
    case "react-vite":
      return {
        framework: "React (Vite)",
        frameworkKind: "react-vite",
        runtimeKind: "node",
        templateKey: "react-vite",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm run preview -- --host 0.0.0.0 --port 3000",
        devCommand: "npm run dev -- --host 0.0.0.0 --port 3000",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "mern":
      return {
        framework: "MERN",
        frameworkKind: "mern",
        runtimeKind: "node",
        templateKey: "mern",
        templateVersion: "1",
        installCommand: "npm --prefix server install && npm --prefix client install",
        buildCommand: "npm --prefix client run build",
        startCommand: "node server/index.js",
        devCommand: "node server/index.js",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "django":
      return {
        framework: "Django",
        frameworkKind: "django",
        runtimeKind: "python",
        templateKey: "django",
        templateVersion: "2",
        installCommand: "pip install -r requirements.txt",
        buildCommand: "python -m compileall .",
        startCommand: "python manage.py runserver 0.0.0.0:8000",
        devCommand: "python manage.py runserver 0.0.0.0:8000",
        defaultPort: 8000,
        healthcheckPath: "/",
      } as const;
    case "laravel":
      return {
        framework: "Laravel",
        frameworkKind: "laravel",
        runtimeKind: "php",
        templateKey: "laravel",
        templateVersion: "2",
        installCommand:
          "tmp=$(mktemp -d) && composer create-project laravel/laravel \"$tmp\" --no-interaction --prefer-dist && cp -R \"$tmp\"/. .",
        buildCommand: "",
        startCommand: "php artisan serve --host 0.0.0.0 --port 8000",
        devCommand: "php artisan serve --host 0.0.0.0 --port 8000",
        defaultPort: 8000,
        healthcheckPath: "/",
      } as const;
    case "nestjs":
      return {
        framework: "NestJS",
        frameworkKind: "nestjs",
        runtimeKind: "node",
        templateKey: "nestjs",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm run start:prod",
        devCommand: "npm run start:dev",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "nextjs":
    default:
      return {
        framework: "Next.js",
        frameworkKind: "nextjs",
        runtimeKind: "node",
        templateKey: "nextjs-app-router",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm start",
        devCommand: "npm run dev -- --host 0.0.0.0 --port 3000",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
  }
}

export async function projectRoutes(app: FastifyInstance) {
  // All project routes require auth
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/projects
  app.get("/api/projects", async (request, reply) => {
    const actor = getRequestActor(request);
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, actor.userId), isNull(projects.archivedAt)));
    return reply.send({ projects: result });
  });

  // POST /api/projects
  app.post("/api/projects", async (request, reply) => {
    const actor = getRequestActor(request);
    const { name, frameworkKind } = request.body as { name?: string; frameworkKind?: FrameworkKind };
    if (!name) {
      return reply.status(400).send({ error: "Name is required" });
    }

    const limitCheck = await enforceActiveProjectsLimit(actor.userId);
    if (!limitCheck.ok) {
      return reply.status(402).send({ error: limitCheck.error, limit: limitCheck.limit });
    }

    const defaults = defaultsForFramework(frameworkKind ?? "nextjs");

    const [project] = await db
      .insert(projects)
      .values({
        userId: actor.userId,
        name,
        ...defaults,
      })
      .returning();

    // Bootstrap the template into the project file store
    try {
      await bootstrapProjectFromTemplate({
        projectId: project.id,
        actorUserId: actor.userId,
        templateKey: project.templateKey,
        templateVersion: project.templateVersion,
      });
    } catch (err) {
      request.log.warn({ err }, "template bootstrap failed");
    }

    return reply.status(201).send({ project });
  });

  // GET /api/projects/:id
  app.get("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return reply.send({ project });
  });

  // POST /api/projects/:id/duplicate
  app.post("/api/projects/:id/duplicate", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string };

    const [source] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!source) return reply.status(404).send({ error: "Project not found" });
    if (!actor.isAdmin && source.userId !== actor.userId) return reply.status(403).send({ error: "Forbidden" });

    const limitCheck = await enforceActiveProjectsLimit(actor.userId);
    if (!limitCheck.ok) {
      return reply.status(402).send({ error: limitCheck.error, limit: limitCheck.limit });
    }

    const now = new Date();
    const newName = (body?.name && body.name.trim()) || `${source.name} (Copy)`;

    const [project] = await db
      .insert(projects)
      .values({
        userId: actor.userId,
        name: newName,
        framework: source.framework,
        frameworkKind: source.frameworkKind,
        runtimeKind: source.runtimeKind,
        templateKey: source.templateKey,
        templateVersion: source.templateVersion,
        installCommand: source.installCommand,
        buildCommand: source.buildCommand,
        startCommand: source.startCommand,
        devCommand: source.devCommand,
        defaultPort: source.defaultPort,
        healthcheckPath: source.healthcheckPath,
        createdAt: now,
      })
      .returning();

    const files = await db
      .select({ id: projectFiles.id, path: projectFiles.path, fileType: projectFiles.fileType, parentPath: projectFiles.parentPath })
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, source.id), isNull(projectFiles.deletedAt)));

    if (files.length === 0) return reply.status(201).send({ project });

    // Create new file rows
    const idMap = new Map<string, string>();
    for (const f of files) {
      const newId = crypto.randomUUID();
      idMap.set(f.id, newId);
    }

    await db.insert(projectFiles).values(
      files.map((f) => ({
        id: idMap.get(f.id)!,
        projectId: project.id,
        path: f.path,
        fileType: f.fileType,
        parentPath: f.parentPath,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
    );

    // Copy latest versions per file
    const fileIds = files.filter((f) => f.fileType === "file").map((f) => f.id);
    if (fileIds.length) {
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
        if (!latestByFile.has(row.projectFileId)) latestByFile.set(row.projectFileId, row.blobSha256);
      }

      const inserts = [...latestByFile.entries()].map(([oldFileId, sha]) => ({
        projectFileId: idMap.get(oldFileId)!,
        blobSha256: sha,
        actorUserId: actor.userId,
        source: "import",
        message: `Duplicated from ${source.id}`,
        createdAt: now,
      }));

      // Ensure referenced blobs exist (they should), but do not copy blob rows.
      // Insert only when blob exists (defensive).
      const shaList = [...new Set(inserts.map((i) => i.blobSha256))];
      const blobRows = await db.select({ sha256: fileBlobs.sha256 }).from(fileBlobs).where(inArray(fileBlobs.sha256, shaList));
      const okSha = new Set(blobRows.map((b) => b.sha256));

      const safeInserts = inserts.filter((i) => okSha.has(i.blobSha256));
      if (safeInserts.length) {
        await db.insert(projectFileVersions).values(safeInserts);
      }
    }

    return reply.status(201).send({ project });
  });

  // PATCH /api/projects/:id/archive
  app.patch("/api/projects/:id/archive", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { archived?: boolean };

    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (!actor.isAdmin && project.userId !== actor.userId) return reply.status(403).send({ error: "Forbidden" });

    const archived = body?.archived !== false;
    const [updated] = await db
      .update(projects)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(projects.id, id))
      .returning();

    return reply.send({ project: updated });
  });

  // DELETE /api/projects/:id
  app.delete("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(projects).where(eq(projects.id, id));
    return reply.send({ ok: true });
  });
}
