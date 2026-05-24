import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import db from "../db";
import { projectEnvVars, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { decryptSecret, encryptSecret } from "../secrets/crypto";

const ENV_KEY_RE = /^[A-Z_][A-Z0-9_]*$/;

async function requireProjectAccess(projectId: string, actor: { userId: string; isAdmin: boolean }) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  if (!actor.isAdmin && project.userId !== actor.userId) return "forbidden" as const;
  return project;
}

export async function envRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/projects/:id/env
  // Returns keys only (no plaintext values).
  app.get("/api/projects/:id/env", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const rows = await db
      .select({ id: projectEnvVars.id, key: projectEnvVars.key, updatedAt: projectEnvVars.updatedAt })
      .from(projectEnvVars)
      .where(eq(projectEnvVars.projectId, id))
      .orderBy(projectEnvVars.key);

    return reply.send({
      vars: rows.map((r) => ({ id: r.id, key: r.key, hasValue: true, updatedAt: r.updatedAt })),
    });
  });

  // PUT /api/projects/:id/env
  // Upserts vars. Does not return plaintext.
  app.put("/api/projects/:id/env", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { vars?: Array<{ key: string; value: string }> };

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const vars = Array.isArray(body?.vars) ? body.vars : [];
    if (vars.length === 0) return reply.send({ ok: true, updated: 0 });

    const now = new Date();
    let updated = 0;
    for (const item of vars) {
      const key = String(item.key || "").trim().toUpperCase();
      const value = String(item.value ?? "");
      if (!ENV_KEY_RE.test(key)) {
        return reply.status(400).send({ error: `Invalid env var key: ${key}` });
      }
      const valueEnc = encryptSecret(value);

      await db
        .insert(projectEnvVars)
        .values({ projectId: id, key, valueEnc, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [projectEnvVars.projectId, projectEnvVars.key],
          set: { valueEnc, updatedAt: now },
        });
      updated += 1;
    }

    return reply.send({ ok: true, updated });
  });

  // DELETE /api/projects/:id/env?key=FOO
  app.delete("/api/projects/:id/env", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const key = typeof (request.query as any)?.key === "string" ? String((request.query as any).key) : "";
    const normalized = key.trim().toUpperCase();

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    if (!ENV_KEY_RE.test(normalized)) {
      return reply.status(400).send({ error: `Invalid env var key: ${normalized || "(empty)"}` });
    }

    await db.delete(projectEnvVars).where(and(eq(projectEnvVars.projectId, id), eq(projectEnvVars.key, normalized)));
    return reply.send({ ok: true });
  });
}

export async function getProjectEnvVarsPlaintext(projectId: string) {
  const rows = await db.select().from(projectEnvVars).where(eq(projectEnvVars.projectId, projectId));
  const out: Record<string, string> = {};
  for (const row of rows) {
    try {
      out[row.key] = decryptSecret(row.valueEnc);
    } catch {
      // ignore corrupted secrets; do not block runs
    }
  }
  return out;
}

