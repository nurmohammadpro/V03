import { FastifyInstance } from "fastify";
import { and, eq, inArray, sql } from "drizzle-orm";
import crypto from "node:crypto";
import db from "../db";
import { buildRuns, previewInstances, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { getRunnerUrl } from "../runner/runnerClient";
import { runnerQueue } from "../runner/runnerQueue";
import { getProjectEnvVarsPlaintext } from "./env";
import { redactSecrets } from "../secrets/redact";

const RUNNER_URL = getRunnerUrl();
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

export async function buildRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  const maxPreviewsPerUser = parseInt(process.env.MAX_PREVIEWS_PER_USER || "2", 10);
  const maxBuildsPerUser = parseInt(process.env.MAX_BUILDS_PER_USER || "1", 10);

  // POST /api/projects/:id/builds
  app.post("/api/projects/:id/builds", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { mode?: "build" | "dev"; provider?: "docker" | string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const [{ count: activeBuilds }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buildRuns)
      .where(and(eq(buildRuns.userId, actor.userId), inArray(buildRuns.status, ["queued", "running"] as any)));

    if (Number.isFinite(maxBuildsPerUser) && activeBuilds >= maxBuildsPerUser) {
      return reply.status(429).send({ error: "Build limit reached" });
    }

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

    runnerQueue.enqueueBuild({ buildId: run.id, userId: actor.userId });
    return reply.status(201).send({ buildId: run.id, status: "queued" });
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

  // DELETE /api/builds/:id (cancel)
  app.delete("/api/builds/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [run] = await db.select().from(buildRuns).where(eq(buildRuns.id, id)).limit(1);
    if (!run) return reply.status(404).send({ error: "Build not found" });

    const project = await requireProjectAccess(run.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    if (!["queued", "running"].includes(run.status)) {
      return reply.send({ ok: true, build: run });
    }

    const runnerRef =
      run && typeof run.runnerRef === "object" && run.runnerRef ? (run.runnerRef as Record<string, unknown>) : {};
    const containerId = typeof runnerRef.containerId === "string" ? runnerRef.containerId : null;

    if (run.status === "queued") {
      runnerQueue.cancelQueued(run.id);
      const [updated] = await db
        .update(buildRuns)
        .set({ status: "canceled", finishedAt: new Date() })
        .where(eq(buildRuns.id, run.id))
        .returning();
      return reply.send({ ok: true, build: updated ?? null });
    }

    if (containerId) {
      try {
        await fetch(`${RUNNER_URL}/runs/${containerId}`, { method: "DELETE" });
      } catch {
        // best-effort stop
      }
    }

    const [updated] = await db
      .update(buildRuns)
      .set({ status: "canceled", finishedAt: new Date() })
      .where(eq(buildRuns.id, run.id))
      .returning();

    return reply.send({ ok: true, build: updated ?? null });
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

    // If runner container exists, proxy fresh logs
    const [full] = await db.select().from(buildRuns).where(eq(buildRuns.id, id)).limit(1);
    const runnerRef =
      full && typeof full.runnerRef === "object" && full.runnerRef ? (full.runnerRef as Record<string, unknown>) : {};
    const containerId = typeof runnerRef.containerId === "string" ? runnerRef.containerId : null;

    if (!containerId) {
      const env = await getProjectEnvVarsPlaintext(run.projectId);
      const secretValues = Object.values(env);
      const rawLogs = typeof run.logs === "string" ? run.logs : JSON.stringify(run.logs ?? []);
      return reply.send({ status: run.status, logs: redactSecrets(rawLogs, secretValues) });
    }

    const tail = typeof (request.query as any)?.tail === "string" ? (request.query as any).tail : "200";
    const url = new URL(`${RUNNER_URL}/runs/${containerId}/logs`);
    url.searchParams.set("tail", tail);

    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      const env = await getProjectEnvVarsPlaintext(run.projectId);
      const secretValues = Object.values(env);
      return reply.send({ status: run.status, logs: redactSecrets(String(data.logs ?? ""), secretValues) });
    } catch {
      const env = await getProjectEnvVarsPlaintext(run.projectId);
      const secretValues = Object.values(env);
      const rawLogs = typeof run.logs === "string" ? run.logs : JSON.stringify(run.logs ?? []);
      return reply.send({ status: run.status, logs: redactSecrets(rawLogs, secretValues) });
    }
  });

  // POST /api/projects/:id/previews
  app.post("/api/projects/:id/previews", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { mode?: "build" | "dev"; provider?: "docker" | string };
    const mode: "build" | "dev" = body.mode === "dev" ? "dev" : "build";

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const [{ count: activePreviews }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(previewInstances)
      .where(
        and(
          eq(previewInstances.userId, actor.userId),
          inArray(previewInstances.status, ["queued", "starting", "running", "ready"] as any),
        ),
      );

    if (Number.isFinite(maxPreviewsPerUser) && activePreviews >= maxPreviewsPerUser) {
      return reply.status(429).send({ error: "Preview limit reached" });
    }

    const base =
      PUBLIC_BASE_URL ||
      `${request.headers["x-forwarded-proto"] ?? "http"}://${request.headers["x-forwarded-host"] ?? request.headers.host}`;
    const shareToken = crypto.randomBytes(16).toString("hex");
    const ttlSeconds = parseInt(process.env.PREVIEW_TOKEN_TTL_SECONDS || "86400", 10);
    const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    const [preview] = await db
      .insert(previewInstances)
      .values({
        projectId: id,
        userId: actor.userId,
        status: "queued",
        url: null,
        ports: {},
        runnerRef: {
          provider: body.provider ?? "docker",
          runnerUrl: RUNNER_URL,
          mode,
          shareToken,
          shareTokenExpiresAt: expiresAt,
        },
      })
      .returning();

    const previewDomain = process.env.PREVIEW_DOMAIN?.trim();
    const scheme =
      process.env.PREVIEW_SCHEME?.trim() ||
      String(request.headers["x-forwarded-proto"] ?? "http");
    const publicUrl = previewDomain
      ? `${scheme}://${preview.id}.${previewDomain}/?t=${shareToken}`
      : `${String(base).replace(/\/$/, "")}/p/${preview.id}/?t=${shareToken}`;
    await db.update(previewInstances).set({ url: publicUrl }).where(eq(previewInstances.id, preview.id));

    runnerQueue.enqueuePreview({ previewId: preview.id, userId: actor.userId });
    return reply.status(201).send({ previewId: preview.id, status: "queued", url: publicUrl });
  });

  // GET /api/projects/:id/previews/active
  app.get("/api/projects/:id/previews/active", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const [preview] = await db
      .select()
      .from(previewInstances)
      .where(
        and(
          eq(previewInstances.projectId, id),
          inArray(previewInstances.status, ["queued", "starting", "running", "ready"] as any),
        ),
      )
      .orderBy(sql`${previewInstances.createdAt} desc`)
      .limit(1);

    return reply.send({ preview: preview ?? null });
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

  // POST /api/previews/:id/rotate-token
  app.post("/api/previews/:id/rotate-token", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, id)).limit(1);
    if (!preview) return reply.status(404).send({ error: "Preview not found" });

    const project = await requireProjectAccess(preview.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const base =
      PUBLIC_BASE_URL ||
      `${request.headers["x-forwarded-proto"] ?? "http"}://${request.headers["x-forwarded-host"] ?? request.headers.host}`;

    const shareToken = crypto.randomBytes(16).toString("hex");
    const ttlSeconds = parseInt(process.env.PREVIEW_TOKEN_TTL_SECONDS || "86400", 10);
    const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    const previewDomain = process.env.PREVIEW_DOMAIN?.trim();
    const scheme =
      process.env.PREVIEW_SCHEME?.trim() ||
      String(request.headers["x-forwarded-proto"] ?? "http");
    const publicUrl = previewDomain
      ? `${scheme}://${preview.id}.${previewDomain}/?t=${shareToken}`
      : `${String(base).replace(/\/$/, "")}/p/${preview.id}/?t=${shareToken}`;

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};

    const [updated] = await db
      .update(previewInstances)
      .set({
        url: publicUrl,
        runnerRef: {
          ...runnerRef,
          shareToken,
          shareTokenExpiresAt: expiresAt,
        },
      })
      .where(eq(previewInstances.id, preview.id))
      .returning();

    return reply.send({ ok: true, url: updated?.url ?? publicUrl });
  });

  // POST /api/previews/:id/revoke
  app.post("/api/previews/:id/revoke", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, id)).limit(1);
    if (!preview) return reply.status(404).send({ error: "Preview not found" });

    const project = await requireProjectAccess(preview.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};

    await db
      .update(previewInstances)
      .set({
        runnerRef: {
          ...runnerRef,
          shareTokenExpiresAt: Date.now() - 1000,
        },
      })
      .where(eq(previewInstances.id, preview.id));

    return reply.send({ ok: true });
  });

  // PATCH /api/previews/:id/sharing
  app.patch("/api/previews/:id/sharing", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { isPublic?: boolean; tokenTtlSeconds?: number | null };

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, id)).limit(1);
    if (!preview) return reply.status(404).send({ error: "Preview not found" });

    const project = await requireProjectAccess(preview.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};

    const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : (runnerRef.isPublic as any) === true;
    const ttl =
      body.tokenTtlSeconds == null
        ? parseInt(process.env.PREVIEW_TOKEN_TTL_SECONDS || "86400", 10)
        : Number(body.tokenTtlSeconds);
    const expiresAt = Number.isFinite(ttl) && ttl > 0 ? Date.now() + ttl * 1000 : null;

    await db
      .update(previewInstances)
      .set({
        runnerRef: {
          ...runnerRef,
          isPublic,
          shareTokenExpiresAt: expiresAt,
        },
      })
      .where(eq(previewInstances.id, preview.id));

    return reply.send({ ok: true });
  });

  // GET /api/previews/:id/logs
  app.get("/api/previews/:id/logs", async (request, reply) => {
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
    if (!containerId) return reply.send({ logs: "" });

    const tail = typeof (request.query as any)?.tail === "string" ? (request.query as any).tail : "200";
    const url = new URL(`${RUNNER_URL}/runs/${containerId}/logs`);
    url.searchParams.set("tail", tail);

    const res = await fetch(url);
    if (!res.ok) return reply.status(502).send({ error: "Runner unavailable" });
    const data = await res.json().catch(() => ({}));
    const env = await getProjectEnvVarsPlaintext(preview.projectId);
    const secretValues = Object.values(env);
    return reply.send({ logs: redactSecrets(String(data.logs ?? ""), secretValues) });
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

    if (preview.status === "queued") {
      runnerQueue.cancelQueued(preview.id);
    }

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
