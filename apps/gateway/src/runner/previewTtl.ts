import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import db from "../db";
import { previewInstances } from "../db/schema";

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:3002";

function parseIntOrDefault(value: string | undefined, fallback: number) {
  const n = parseInt(value || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function stopExpiredPreviews() {
  const ttlSeconds = parseIntOrDefault(process.env.PREVIEW_TTL_SECONDS, 1800);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;

  const cutoff = new Date(Date.now() - ttlSeconds * 1000);

  const expired = await db
    .select()
    .from(previewInstances)
    .where(
      and(
        isNull(previewInstances.endedAt),
        inArray(previewInstances.status, ["queued", "starting", "running", "ready"] as any),
        lt(previewInstances.createdAt, cutoff),
      ),
    )
    .limit(25);

  for (const preview of expired) {
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

    await db
      .update(previewInstances)
      .set({ status: "stopped", endedAt: new Date() })
      .where(eq(previewInstances.id, preview.id));
  }
}

