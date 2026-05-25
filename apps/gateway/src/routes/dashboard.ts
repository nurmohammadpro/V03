import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import db from "../db";
import { generationRuns, projectAuditLogs, projects, users } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { getUserLimit } from "../billing/limits";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/dashboard/stats
  app.get("/api/dashboard/stats", async (request, reply) => {
    const actor = getRequestActor(request);

    const today = startOfTodayUtc();

    const [[{ projectsCount }], [{ totalGenerations }], [{ generationsToday }]] = await Promise.all([
      db.select({ projectsCount: sql<number>`count(*)` }).from(projects).where(eq(projects.userId, actor.userId)),
      db
        .select({ totalGenerations: sql<number>`count(*)` })
        .from(generationRuns)
        .where(eq(generationRuns.userId, actor.userId)),
      db
        .select({ generationsToday: sql<number>`count(*)` })
        .from(generationRuns)
        .where(and(eq(generationRuns.userId, actor.userId), sql`${generationRuns.createdAt} >= ${today.toISOString()}`)),
    ]);

    const weekly = await getUserLimit(actor.userId, "weekly_generations");
    const dailyLimit = weekly && weekly > 0 ? Math.max(1, Math.floor(weekly / 7)) : 10;

    // Storage is not metered yet; keep placeholders for UI.
    return reply.send({
      stats: {
        projectsCount,
        totalGenerations,
        generationsToday,
        dailyLimit,
        storageUsed: 0,
        storageLimit: 100,
      },
    });
  });

  // GET /api/activity?limit=50
  app.get("/api/activity", async (request, reply) => {
    const actor = getRequestActor(request);
    const limitRaw = typeof (request.query as any)?.limit === "string" ? (request.query as any).limit : "30";
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 30));

    const projectScopeWhere = actor.isAdmin ? undefined : eq(projects.userId, actor.userId);

    const [projectRows, generationRows, envAuditRows] = await Promise.all([
      db
        .select({ id: projects.id, userId: projects.userId, name: projects.name, createdAt: projects.createdAt })
        .from(projects)
        .where(projectScopeWhere as any)
        .orderBy(desc(projects.createdAt))
        .limit(limit),
      db
        .select({
          id: generationRuns.id,
          userId: generationRuns.userId,
          projectId: generationRuns.projectId,
          status: generationRuns.status,
          createdAt: generationRuns.createdAt,
        })
        .from(generationRuns)
        .where(actor.isAdmin ? undefined : eq(generationRuns.userId, actor.userId))
        .orderBy(desc(generationRuns.createdAt))
        .limit(limit),
      db
        .select({
          id: projectAuditLogs.id,
          actorUserId: projectAuditLogs.actorUserId,
          action: projectAuditLogs.action,
          metadata: projectAuditLogs.metadata,
          createdAt: projectAuditLogs.createdAt,
        })
        .from(projectAuditLogs)
        .innerJoin(projects, eq(projectAuditLogs.projectId, projects.id))
        .where(projectScopeWhere as any)
        .orderBy(desc(projectAuditLogs.createdAt))
        .limit(limit),
    ]);

    const userIds = new Set<string>();
    for (const row of projectRows) userIds.add(row.userId);
    for (const row of generationRows) userIds.add(row.userId);
    for (const row of envAuditRows) userIds.add(row.actorUserId);

    const usersList = userIds.size
      ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(sql`${users.id} in (${sql.join([...userIds].map((id) => sql`${id}`), sql`,`)})`)
      : [];
    const emailById = new Map(usersList.map((u) => [u.id, u.email]));

    const activities = [
      ...projectRows.map((p) => ({
        id: `project_${p.id}`,
        type: "project_create",
        message: `Created project “${p.name}”`,
        userId: p.userId,
        userEmail: emailById.get(p.userId) ?? undefined,
        timestamp: p.createdAt,
        metadata: { projectId: p.id },
      })),
      ...generationRows.map((g) => ({
        id: `gen_${g.id}`,
        type: g.status === "failed" ? "error" : "generation_complete",
        message: g.status === "failed" ? "Generation failed" : "Generation completed",
        userId: g.userId,
        userEmail: emailById.get(g.userId) ?? undefined,
        timestamp: g.createdAt,
        metadata: { projectId: g.projectId, runId: g.id, status: g.status },
      })),
      ...envAuditRows.map((e) => ({
        id: `audit_${e.id}`,
        type: "admin_action",
        message:
          e.action === "env.set"
            ? `Updated env var ${(e.metadata as any)?.key ?? ""}`.trim()
            : e.action === "env.delete"
              ? `Deleted env var ${(e.metadata as any)?.key ?? ""}`.trim()
              : `Action ${e.action}`,
        userId: e.actorUserId,
        userEmail: emailById.get(e.actorUserId) ?? undefined,
        timestamp: e.createdAt,
        metadata: { action: e.action },
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return reply.send({ activities });
  });
}
