import { and, asc, eq, inArray, sql } from "drizzle-orm";
import crypto from "node:crypto";
import db from "../db";
import { buildRuns, previewInstances } from "../db/schema";
import { exportProjectToTarGz } from "./exportProjectToTarGz";
import { runnerStartRun } from "./runnerClient";

type QueueItem = { kind: "build" | "preview"; id: string; userId: string };

type QueueOptions = {
  maxConcurrentRuns: number;
  maxBuildsPerUser: number;
  maxPreviewsPerUser: number;
};

function parseIntOrDefault(value: string | undefined, fallback: number) {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveOptions(): QueueOptions {
  return {
    maxConcurrentRuns: parseIntOrDefault(process.env.RUNNER_MAX_CONCURRENT, 2),
    maxBuildsPerUser: parseIntOrDefault(process.env.MAX_BUILDS_PER_USER, 1),
    maxPreviewsPerUser: parseIntOrDefault(process.env.MAX_PREVIEWS_PER_USER, 2),
  };
}

export class RunnerQueue {
  private queue: QueueItem[] = [];
  private runningTotal = 0;
  private runningBuildsByUser = new Map<string, number>();
  private runningPreviewsByUser = new Map<string, number>();
  private draining = false;

  async rehydrateFromDb() {
    const [queuedBuilds, queuedPreviews] = await Promise.all([
      db
        .select({ id: buildRuns.id, userId: buildRuns.userId })
        .from(buildRuns)
        .where(eq(buildRuns.status, "queued"))
        .orderBy(asc(buildRuns.createdAt)),
      db
        .select({ id: previewInstances.id, userId: previewInstances.userId })
        .from(previewInstances)
        .where(eq(previewInstances.status, "queued"))
        .orderBy(asc(previewInstances.createdAt)),
    ]);

    for (const row of queuedBuilds) {
      this.enqueue({ kind: "build", id: row.id, userId: row.userId });
    }
    for (const row of queuedPreviews) {
      this.enqueue({ kind: "preview", id: row.id, userId: row.userId });
    }

    await this.drain();
  }

  enqueueBuild(input: { buildId: string; userId: string }) {
    this.enqueue({ kind: "build", id: input.buildId, userId: input.userId });
    void this.drain();
  }

  enqueuePreview(input: { previewId: string; userId: string }) {
    this.enqueue({ kind: "preview", id: input.previewId, userId: input.userId });
    void this.drain();
  }

  cancelQueued(id: string) {
    const idx = this.queue.findIndex((item) => item.id === id);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  private enqueue(item: QueueItem) {
    if (this.queue.some((existing) => existing.id === item.id)) return;
    this.queue.push(item);
  }

  private getRunningCount(map: Map<string, number>, userId: string) {
    return map.get(userId) ?? 0;
  }

  private incRunning(map: Map<string, number>, userId: string) {
    map.set(userId, this.getRunningCount(map, userId) + 1);
  }

  private decRunning(map: Map<string, number>, userId: string) {
    const current = this.getRunningCount(map, userId);
    if (current <= 1) map.delete(userId);
    else map.set(userId, current - 1);
  }

  private canStart(item: QueueItem, opts: QueueOptions) {
    if (this.runningTotal >= opts.maxConcurrentRuns) return false;
    if (item.kind === "build") {
      return this.getRunningCount(this.runningBuildsByUser, item.userId) < opts.maxBuildsPerUser;
    }
    return this.getRunningCount(this.runningPreviewsByUser, item.userId) < opts.maxPreviewsPerUser;
  }

  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      const opts = resolveOptions();
      // Keep starting work until we hit concurrency limits or the queue is empty.
      while (this.queue.length > 0) {
        const nextIndex = this.queue.findIndex((item) => this.canStart(item, opts));
        if (nextIndex === -1) break;
        const item = this.queue.splice(nextIndex, 1)[0]!;
        this.runningTotal += 1;
        if (item.kind === "build") this.incRunning(this.runningBuildsByUser, item.userId);
        else this.incRunning(this.runningPreviewsByUser, item.userId);

        void this.runItem(item)
          .catch(() => {})
          .finally(() => {
            this.runningTotal -= 1;
            if (item.kind === "build") this.decRunning(this.runningBuildsByUser, item.userId);
            else this.decRunning(this.runningPreviewsByUser, item.userId);
            void this.drain();
          });
      }
    } finally {
      this.draining = false;
    }
  }

  private async runItem(item: QueueItem) {
    if (item.kind === "build") {
      await this.runBuild(item.id);
      return;
    }
    await this.runPreview(item.id);
  }

  private async runBuild(buildId: string) {
    const [run] = await db.select().from(buildRuns).where(eq(buildRuns.id, buildId)).limit(1);
    if (!run) return;
    if (run.status !== "queued") return;

    const [claimed] = await db
      .update(buildRuns)
      .set({ status: "running", startedAt: new Date() })
      .where(and(eq(buildRuns.id, buildId), eq(buildRuns.status, "queued")))
      .returning();
    if (!claimed) return;

    try {
      const { tarPath } = await exportProjectToTarGz(run.projectId);
      const runner = await runnerStartRun({ runId: run.id, mode: run.mode === "dev" ? "dev" : "build", tarPath });

      await db
        .update(buildRuns)
        .set({
          status: runner.ready ? "complete" : "running",
          runnerRef: {
            ...(typeof claimed.runnerRef === "object" && claimed.runnerRef ? (claimed.runnerRef as Record<string, unknown>) : {}),
            containerId: runner.containerId,
            url: runner.url,
            ports: runner.ports,
            ready: runner.ready ?? null,
          },
          finishedAt: runner.ready ? new Date() : null,
        })
        .where(eq(buildRuns.id, run.id));
    } catch (err: any) {
      await db
        .update(buildRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          runnerRef: {
            ...(typeof claimed.runnerRef === "object" && claimed.runnerRef ? (claimed.runnerRef as Record<string, unknown>) : {}),
            error: err?.message || "Runner failed",
          },
        })
        .where(eq(buildRuns.id, run.id));
    }
  }

  private async runPreview(previewId: string) {
    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, previewId)).limit(1);
    if (!preview) return;
    if (preview.status !== "queued") return;

    const [claimed] = await db
      .update(previewInstances)
      .set({ status: "starting" })
      .where(and(eq(previewInstances.id, previewId), eq(previewInstances.status, "queued")))
      .returning();
    if (!claimed) return;

    const runnerRef =
      typeof claimed.runnerRef === "object" && claimed.runnerRef ? (claimed.runnerRef as Record<string, unknown>) : {};
    const mode = typeof runnerRef.mode === "string" && runnerRef.mode === "dev" ? "dev" : "build";

    try {
      const { tarPath } = await exportProjectToTarGz(claimed.projectId);
      const runner = await runnerStartRun({ runId: claimed.id, mode, tarPath });

      await db
        .update(previewInstances)
        .set({
          status: runner.ready ? "ready" : "running",
          ports: runner.ports,
          runnerRef: {
            ...runnerRef,
            containerId: runner.containerId,
            url: runner.url,
            ready: runner.ready ?? null,
          },
        })
        .where(eq(previewInstances.id, claimed.id));
    } catch (err: any) {
      await db
        .update(previewInstances)
        .set({
          status: "failed",
          endedAt: new Date(),
          runnerRef: {
            ...runnerRef,
            error: err?.message || "Runner failed",
            failureId: crypto.randomBytes(6).toString("hex"),
          },
        })
        .where(eq(previewInstances.id, claimed.id));
    }
  }
}

export const runnerQueue = new RunnerQueue();

export async function countActiveRunsForUser(userId: string) {
  const [[{ builds }], [{ previews }]] = await Promise.all([
    db
      .select({ builds: sql<number>`count(*)` })
      .from(buildRuns)
      .where(and(eq(buildRuns.userId, userId), inArray(buildRuns.status, ["queued", "running"] as any))),
    db
      .select({ previews: sql<number>`count(*)` })
      .from(previewInstances)
      .where(and(eq(previewInstances.userId, userId), inArray(previewInstances.status, ["queued", "starting", "running", "ready"] as any))),
  ]);

  return { builds, previews };
}
