import { FastifyInstance } from "fastify";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import crypto from "node:crypto";
import db from "../db";
import {
  fileBlobs,
  generationFileOps,
  generationEvents,
  generationRuns,
  projectFiles,
  projectFileVersions,
  projects,
} from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { getUserLimit } from "../billing/limits";

const AI_WORKER_URL = process.env.AI_WORKER_URL || "http://localhost:8001";

type GenerationIntent = "component" | "feature" | "app" | "fix" | "refactor";
type ApplyMode = "propose" | "auto_apply";

type WorkerFileNode =
  | {
      type: "directory";
      name: string;
      path: string;
      children?: WorkerFileNode[];
    }
  | {
      type: "file";
      name: string;
      path: string;
      content?: string;
      language?: string;
    };

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

function flattenWorkerNodes(nodes: WorkerFileNode[], out: WorkerFileNode[] = []) {
  for (const node of nodes) {
    out.push(node);
    if (node.type === "directory" && node.children?.length) {
      flattenWorkerNodes(node.children, out);
    }
  }
  return out;
}

function workerFilesToOps(files: WorkerFileNode[]) {
  const ops: Array<Record<string, unknown>> = [];

  const flat = flattenWorkerNodes(files);
  for (const node of flat) {
    if (node.type === "directory") {
      ops.push({
        op: "mkdir",
        path: node.path,
      });
      continue;
    }

    ops.push({
      op: "upsert_file",
      path: node.path,
      content: node.content ?? "",
      language: node.language ?? null,
      mode: "text",
      overwrite: true,
    });
  }

  return ops;
}

async function applyOpsToProject(input: {
  projectId: string;
  actorUserId: string;
  ops: Array<Record<string, unknown>>;
  source: "generation" | "manual";
  message?: string | null;
}) {
  for (const raw of input.ops) {
    const op = String(raw.op || "");

    if (op === "mkdir") {
      const pathRaw = String(raw.path || "");
      const dirPath = normalizePath(pathRaw);
      const parentPath = dirPath.includes("/") ? dirPath.split("/").slice(0, -1).join("/") : null;

      const [existing] = await db
        .select({ id: projectFiles.id })
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.path, dirPath), isNull(projectFiles.deletedAt)))
        .limit(1);

      if (!existing) {
        await db.insert(projectFiles).values({
          projectId: input.projectId,
          path: dirPath,
          fileType: "dir",
          parentPath,
        });
      }

      continue;
    }

    if (op === "upsert_file") {
      const pathRaw = String(raw.path || "");
      const content = typeof raw.content === "string" ? raw.content : "";
      const filePath = normalizePath(pathRaw);
      const parentPath = filePath.includes("/") ? filePath.split("/").slice(0, -1).join("/") : null;

      const blob = await ensureFileBlob(content);

      const [existingFile] = await db
        .select({ id: projectFiles.id, fileType: projectFiles.fileType })
        .from(projectFiles)
        .where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.path, filePath)))
        .limit(1);

      let projectFileId = existingFile?.id;

      if (!existingFile) {
        const [createdFile] = await db
          .insert(projectFiles)
          .values({
            projectId: input.projectId,
            path: filePath,
            fileType: "file",
            parentPath,
          })
          .returning();
        projectFileId = createdFile.id;
      } else {
        await db
          .update(projectFiles)
          .set({
            fileType: "file",
            parentPath,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(eq(projectFiles.id, existingFile.id));
      }

      await db.insert(projectFileVersions).values({
        projectFileId: String(projectFileId),
        blobSha256: blob.sha256,
        actorUserId: input.actorUserId,
        source: input.source,
        message: input.message ?? null,
      });

      continue;
    }

    if (op === "delete_file") {
      const pathRaw = String(raw.path || "");
      const filePath = normalizePath(pathRaw);

      await db
        .update(projectFiles)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(projectFiles.projectId, input.projectId), eq(projectFiles.path, filePath)));

      await db
        .update(projectFiles)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(projectFiles.projectId, input.projectId), like(projectFiles.path, `${filePath}/%`)));

      continue;
    }
  }
}

export async function generationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // List runs for project
  app.get("/api/projects/:id/generations", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const runs = await db
      .select({
        id: generationRuns.id,
        intent: generationRuns.intent,
        targetPath: generationRuns.targetPath,
        status: generationRuns.status,
        startedAt: generationRuns.startedAt,
        finishedAt: generationRuns.finishedAt,
        summary: generationRuns.summary,
      })
      .from(generationRuns)
      .where(eq(generationRuns.projectId, id))
      .orderBy(sql`${generationRuns.startedAt} desc`);

    return reply.send({ runs });
  });

  // Create a run (sync for now)
  app.post("/api/projects/:id/generations", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as {
      prompt?: string;
      intent?: GenerationIntent;
      targetPath?: string;
      applyMode?: ApplyMode;
      framework?: string;
    };

    if (!body.prompt || !body.prompt.trim()) {
      return reply.status(400).send({ error: "prompt is required" });
    }

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const intent: GenerationIntent = body.intent ?? "component";
    const applyMode: ApplyMode = body.applyMode ?? "propose";

    const [run] = await db
      .insert(generationRuns)
      .values({
        projectId: id,
        userId: actor.userId,
        intent,
        targetPath: body.targetPath ? normalizePath(body.targetPath) : null,
        framework: body.framework ?? project.framework ?? null,
        applyMode,
        status: "running",
        prompt: body.prompt,
        summary: {},
      })
      .returning();

    try {
      const workerResponse = await fetch(`${AI_WORKER_URL}/generate/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: body.prompt,
          framework: body.framework ?? project.framework ?? "Next.js",
          project_id: id,
          intent,
          target_path: body.targetPath ?? null,
        }),
      });

      if (!workerResponse.ok) {
        throw new Error(`AI worker responded with ${workerResponse.status}`);
      }

      const data = (await workerResponse.json()) as {
        text?: string;
        files?: WorkerFileNode[];
        status?: string;
      };

      const ops = workerFilesToOps(Array.isArray(data.files) ? data.files : []);

      const insertedOps = ops.length
        ? await db
            .insert(generationFileOps)
            .values(
              ops.map((op, index) => ({
                runId: run.id,
                seq: index,
                op,
              })),
            )
            .returning()
        : [];

      await db
        .update(generationRuns)
        .set({
          status: "complete",
          finishedAt: new Date(),
          summary: {
            text: data.text ?? null,
            opCount: insertedOps.length,
          },
        })
        .where(eq(generationRuns.id, run.id));

      if (applyMode === "auto_apply" && insertedOps.length) {
        await applyOpsToProject({
          projectId: id,
          actorUserId: actor.userId,
          ops,
          source: "generation",
          message: `Generation ${run.id}`,
        });

        await db
          .update(generationRuns)
          .set({ status: "applied" })
          .where(eq(generationRuns.id, run.id));
      }

      return reply.status(201).send({
        runId: run.id,
        status: applyMode === "auto_apply" ? "applied" : "complete",
        summary: data.text ?? null,
        ops,
      });
    } catch (err: any) {
      await db
        .update(generationRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          summary: { error: err.message || "Generation failed" },
        })
        .where(eq(generationRuns.id, run.id));

      return reply.status(502).send({ error: "AI worker unavailable", detail: err.message || null, runId: run.id });
    }
  });

  // Create a run (streaming) and persist SSE events
  app.post("/api/projects/:id/generations/stream", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as {
      prompt?: string;
      intent?: GenerationIntent;
      targetPath?: string;
      applyMode?: ApplyMode;
      framework?: string;
    };

    if (!body.prompt || !body.prompt.trim()) {
      return reply.status(400).send({ error: "prompt is required" });
    }

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    // Plan limit (MVP): weekly generation cap
    const weeklyLimit = await getUserLimit(actor.userId, "weekly_generations");
    if (weeklyLimit && weeklyLimit > 0) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(generationRuns)
        .where(and(eq(generationRuns.userId, actor.userId), sql`${generationRuns.createdAt} >= ${since}`));
      if (count >= weeklyLimit) {
        return reply.status(402).send({ error: "Weekly generation limit reached", limit: weeklyLimit });
      }
    }

    const intent: GenerationIntent = body.intent ?? "component";
    const applyMode: ApplyMode = body.applyMode ?? "propose";

    const [run] = await db
      .insert(generationRuns)
      .values({
        projectId: id,
        userId: actor.userId,
        intent,
        targetPath: body.targetPath ? normalizePath(body.targetPath) : null,
        framework: body.framework ?? project.framework ?? null,
        applyMode,
        status: "running",
        prompt: body.prompt,
        summary: {},
      })
      .returning();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const controller = new AbortController();
    request.raw.on("close", () => controller.abort());

    let seq = 0;
    const ops: Array<Record<string, unknown>> = [];
    let applied = false;

    const persistEvent = async (eventType: string, payload: Record<string, unknown>) => {
      await db.insert(generationEvents).values({
        runId: run.id,
        seq,
        eventType,
        payload,
      });
      seq += 1;
    };

    const persistOpsIfEmpty = async (files: WorkerFileNode[] | undefined) => {
      if (!files || !Array.isArray(files) || files.length === 0) return;
      if (ops.length > 0) return;
      ops.push(...workerFilesToOps(files));

      if (ops.length) {
        await db
          .insert(generationFileOps)
          .values(
            ops.map((op, index) => ({
              runId: run.id,
              seq: index,
              op,
            })),
          )
          .onConflictDoNothing();
      }
    };

    try {
      const workerResponse = await fetch(`${AI_WORKER_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: body.prompt,
          framework: body.framework ?? project.framework ?? "Next.js",
          project_id: id,
          intent,
          target_path: body.targetPath ?? null,
        }),
        signal: controller.signal,
      });

      if (!workerResponse.ok || !workerResponse.body) {
        throw new Error(`AI worker responded with ${workerResponse.status}`);
      }

      const reader = workerResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Forward raw SSE to client
        reply.raw.write(chunk);

        // Parse any completed SSE blocks
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const parsed = parseSseBlock(block);
          if (!parsed) continue;

          await persistEvent(parsed.event, parsed.data);

          if (parsed.event === "workspace_ready" || parsed.event === "done") {
            const maybeFiles = (parsed.data as any)?.files as WorkerFileNode[] | undefined;
            await persistOpsIfEmpty(maybeFiles);
          }
        }

        if (request.raw.destroyed) {
          controller.abort();
          break;
        }
      }

      if (applyMode === "auto_apply" && ops.length) {
        await applyOpsToProject({
          projectId: id,
          actorUserId: actor.userId,
          ops,
          source: "generation",
          message: `Generation ${run.id}`,
        });
        applied = true;
      }

      await db
        .update(generationRuns)
        .set({
          status: applied ? "applied" : "complete",
          finishedAt: new Date(),
          summary: { opCount: ops.length },
        })
        .where(eq(generationRuns.id, run.id));
    } catch (err: any) {
      await db
        .update(generationRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          summary: { error: err.message || "Generation failed" },
        })
        .where(eq(generationRuns.id, run.id));

      const errorPayload = JSON.stringify({ error: "AI worker unavailable", detail: err.message || null, runId: run.id });
      reply.raw.write(`event: error\ndata: ${errorPayload}\n\n`);
    } finally {
      if (!reply.raw.destroyed) {
        reply.raw.end();
      }
    }
  });

  // Get a run + ops
  app.get("/api/generations/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [run] = await db.select().from(generationRuns).where(eq(generationRuns.id, id)).limit(1);
    if (!run) return reply.status(404).send({ error: "Generation not found" });

    const project = await requireProjectAccess(run.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const ops = await db
      .select({ seq: generationFileOps.seq, op: generationFileOps.op })
      .from(generationFileOps)
      .where(eq(generationFileOps.runId, run.id))
      .orderBy(generationFileOps.seq);

    return reply.send({ run, ops });
  });

  // Apply ops to project
  app.post("/api/generations/:id/apply", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [run] = await db.select().from(generationRuns).where(eq(generationRuns.id, id)).limit(1);
    if (!run) return reply.status(404).send({ error: "Generation not found" });

    const project = await requireProjectAccess(run.projectId, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const opRows = await db
      .select({ op: generationFileOps.op })
      .from(generationFileOps)
      .where(eq(generationFileOps.runId, run.id))
      .orderBy(generationFileOps.seq);

    const ops = opRows.map((row) => row.op as Record<string, unknown>);

    await applyOpsToProject({
      projectId: run.projectId,
      actorUserId: actor.userId,
      ops,
      source: "generation",
      message: `Apply generation ${run.id}`,
    });

    await db.update(generationRuns).set({ status: "applied" }).where(eq(generationRuns.id, run.id));

    return reply.send({ ok: true });
  });
}

function parseSseBlock(block: string): { event: string; data: Record<string, unknown> } | null {
  const lines = block.split("\n").map((line) => line.trimEnd());
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
      continue;
    }
  }

  if (dataLines.length === 0) return null;

  const raw = dataLines.join("\n");
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { event, data: parsed as Record<string, unknown> };
    }
    return { event, data: { value: parsed } };
  } catch {
    return { event, data: { text: raw } };
  }
}
