import { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import db from "../db";
import { buildRuns, fileBlobs, previewInstances, projectFiles, projectFileVersions, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";

const execFileAsync = promisify(execFile);
const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:3002";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || null;

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

async function exportProjectToTarGz(projectId: string) {
  const workRoot = path.join(tmpdir(), "v03-gateway-export");
  await mkdir(workRoot, { recursive: true });
  const exportDir = path.join(workRoot, projectId);
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });

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
    // Still create an empty tarball; runner will fail later if no package.json etc.
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

async function runnerStartRun(input: { runId: string; mode: "build" | "dev"; tarPath: string }) {
  const buffer = await (await import("node:fs/promises")).readFile(input.tarPath);
  const url = new URL(`${RUNNER_URL}/runs/raw`);
  url.searchParams.set("runId", input.runId);
  url.searchParams.set("mode", input.mode);

  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/gzip" }, body: buffer });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Runner error ${res.status}`);
  }
  return res.json() as Promise<{ containerId: string; url: string; ports: Record<string, number>; status: string }>;
}

export async function buildRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // POST /api/projects/:id/builds
  app.post("/api/projects/:id/builds", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { mode?: "build" | "dev"; provider?: "docker" | string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const [run] = await db
      .insert(buildRuns)
      .values({
        projectId: id,
        userId: actor.userId,
        mode: body.mode ?? "build",
        status: "queued",
        runnerRef: {
          provider: body.provider ?? "docker",
          runnerUrl: RUNNER_URL,
        },
        logs: [],
      })
      .returning();

    try {
      const { tarPath } = await exportProjectToTarGz(id);
      const runner = await runnerStartRun({ runId: run.id, mode: run.mode === "dev" ? "dev" : "build", tarPath });

      await db
        .update(buildRuns)
        .set({
          status: "running",
          startedAt: new Date(),
          runnerRef: {
            ...(typeof run.runnerRef === "object" && run.runnerRef ? (run.runnerRef as Record<string, unknown>) : {}),
            containerId: runner.containerId,
            url: runner.url,
            ports: runner.ports,
          },
        })
        .where(eq(buildRuns.id, run.id));

      return reply.status(201).send({ buildId: run.id, status: "running", url: runner.url });
    } catch (err: any) {
      await db
        .update(buildRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          runnerRef: {
            ...(typeof run.runnerRef === "object" && run.runnerRef ? (run.runnerRef as Record<string, unknown>) : {}),
            error: err.message || "Runner failed",
          },
        })
        .where(eq(buildRuns.id, run.id));

      return reply.status(502).send({ error: "Runner unavailable", detail: err.message || null, buildId: run.id });
    }
  });

  // GET /api/builds/:id
  app.get("/api/builds/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [run] = await db.select().from(buildRuns).where(eq(buildRuns.id, id)).limit(1);
    if (!run) return reply.status(404).send({ error: "Build not found" });

    const project = await requireProjectAccess(run.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    return reply.send({ build: run });
  });

  // GET /api/builds/:id/logs
  app.get("/api/builds/:id/logs", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [run] = await db
      .select({
        id: buildRuns.id,
        projectId: buildRuns.projectId,
        status: buildRuns.status,
        logs: buildRuns.logs,
        startedAt: buildRuns.startedAt,
        finishedAt: buildRuns.finishedAt,
      })
      .from(buildRuns)
      .where(eq(buildRuns.id, id))
      .limit(1);

    if (!run) return reply.status(404).send({ error: "Build not found" });

    const project = await requireProjectAccess(run.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    return reply.send({ status: run.status, logs: run.logs });
  });

  // POST /api/projects/:id/previews
  app.post("/api/projects/:id/previews", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { provider?: "docker" | string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const [preview] = await db
      .insert(previewInstances)
      .values({
        projectId: id,
        userId: actor.userId,
        status: "starting",
        url: null,
        ports: {},
        runnerRef: {
          provider: body.provider ?? "docker",
          runnerUrl: RUNNER_URL,
        },
      })
      .returning();

    try {
      const { tarPath } = await exportProjectToTarGz(id);
      const runner = await runnerStartRun({ runId: preview.id, mode: "build", tarPath });

      const base =
        PUBLIC_BASE_URL ||
        `${request.headers["x-forwarded-proto"] ?? "http"}://${request.headers["x-forwarded-host"] ?? request.headers.host}`;
      const publicUrl = `${String(base).replace(/\/$/, "")}/p/${preview.id}/`;

      const [updated] = await db
        .update(previewInstances)
        .set({
          status: "running",
          url: publicUrl,
          ports: runner.ports,
          runnerRef: {
            ...(typeof preview.runnerRef === "object" && preview.runnerRef
              ? (preview.runnerRef as Record<string, unknown>)
              : {}),
            containerId: runner.containerId,
            url: runner.url,
          },
        })
        .where(eq(previewInstances.id, preview.id))
        .returning();

      return reply
        .status(201)
        .send({ previewId: preview.id, status: updated?.status ?? "running", url: updated?.url ?? publicUrl });
    } catch (err: any) {
      await db
        .update(previewInstances)
        .set({
          status: "failed",
          runnerRef: {
            ...(typeof preview.runnerRef === "object" && preview.runnerRef
              ? (preview.runnerRef as Record<string, unknown>)
              : {}),
            error: err.message || "Runner failed",
          },
          endedAt: new Date(),
        })
        .where(eq(previewInstances.id, preview.id));

      return reply.status(502).send({ error: "Runner unavailable", detail: err.message || null, previewId: preview.id });
    }
  });

  // GET /api/previews/:id
  app.get("/api/previews/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, id)).limit(1);
    if (!preview) return reply.status(404).send({ error: "Preview not found" });

    const project = await requireProjectAccess(preview.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    return reply.send({ preview });
  });

  // DELETE /api/previews/:id (stop)
  app.delete("/api/previews/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, id)).limit(1);
    if (!preview) return reply.status(404).send({ error: "Preview not found" });

    const project = await requireProjectAccess(preview.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};
    const containerId = typeof runnerRef.containerId === "string" ? runnerRef.containerId : null;

    if (containerId) {
      try {
        await fetch(`${RUNNER_URL}/runs/${containerId}`, { method: "DELETE" });
      } catch {
        // best-effort stop
      }
    }

    const [updated] = await db
      .update(previewInstances)
      .set({
        status: "stopped",
        endedAt: new Date(),
      })
      .where(eq(previewInstances.id, preview.id))
      .returning();

    return reply.send({ ok: true, preview: updated ?? null });
  });
}
