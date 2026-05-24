import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import db from "../db";
import { projectAuditLogs, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";

async function requireProjectAccess(projectId: string, actor: { userId: string; isAdmin: boolean }) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  if (!actor.isAdmin && project.userId !== actor.userId) return "forbidden" as const;
  return project;
}

export async function auditRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/projects/:id/audit?limit=50
  app.get("/api/projects/:id/audit", async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const limitRaw = typeof (request.query as any)?.limit === "string" ? (request.query as any).limit : "50";
    const limit = Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50));

    const project = await requireProjectAccess(id, actor);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (project === "forbidden") return reply.status(403).send({ error: "Forbidden" });

    const rows = await db
      .select({
        id: projectAuditLogs.id,
        action: projectAuditLogs.action,
        metadata: projectAuditLogs.metadata,
        actorUserId: projectAuditLogs.actorUserId,
        createdAt: projectAuditLogs.createdAt,
      })
      .from(projectAuditLogs)
      .where(eq(projectAuditLogs.projectId, id))
      .orderBy(desc(projectAuditLogs.createdAt))
      .limit(limit);

    return reply.send({ events: rows });
  });
}

