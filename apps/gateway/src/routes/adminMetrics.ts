import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import db from "../db";
import { buildRuns, generationRuns, previewInstances, projects, subscriptions, users } from "../db/schema";
import { getRequestActor, requireAdmin, writeAdminAuditLog } from "../middleware/auth";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgoUtc(days: number) {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function pctChange(prev: number, curr: number) {
  if (prev <= 0 && curr <= 0) return 0;
  if (prev <= 0) return 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function adminMetricsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAdmin(["analytics.read"]));

  // GET /api/admin/metrics
  app.get("/api/admin/metrics", async (request, reply) => {
    const actor = getRequestActor(request);

    const today = startOfTodayUtc();
    const last7 = daysAgoUtc(7);
    const prev7 = daysAgoUtc(14);
    const todayIso = today.toISOString();
    const last7Iso = last7.toISOString();
    const prev7Iso = prev7.toISOString();

    const [
      [{ totalUsers }],
      [{ totalProjects }],
      [{ activeSubscriptions }],
      [{ generationsToday }],
      [{ suspendedUsers }],
      [{ activeUsers }],
      [{ queueDepth }],
      [{ gen7 }],
      [{ genPrev7 }],
      [{ users7 }],
      [{ usersPrev7 }],
      [{ projects7 }],
      [{ projectsPrev7 }],
      [{ genFailedToday }],
    ] = await Promise.all([
      db.select({ totalUsers: sql<number>`count(*)` }).from(users),
      db.select({ totalProjects: sql<number>`count(*)` }).from(projects),
      db.select({ activeSubscriptions: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db
        .select({ generationsToday: sql<number>`count(*)` })
        .from(generationRuns)
        .where(sql`${generationRuns.createdAt} >= ${todayIso}`),
      db.select({ suspendedUsers: sql<number>`count(*)` }).from(users).where(eq(users.status, "suspended")),
      db
        .select({ activeUsers: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.updatedAt} >= ${last7Iso}`),
      (async () => {
        const [[{ buildsQ }], [{ previewsQ }]] = await Promise.all([
          db
            .select({ buildsQ: sql<number>`count(*)` })
            .from(buildRuns)
            .where(eq(buildRuns.status, "queued")),
          db
            .select({ previewsQ: sql<number>`count(*)` })
            .from(previewInstances)
            .where(eq(previewInstances.status, "queued")),
        ]);
        return [{ queueDepth: (buildsQ ?? 0) + (previewsQ ?? 0) }];
      })(),
      db
        .select({ gen7: sql<number>`count(*)` })
        .from(generationRuns)
        .where(sql`${generationRuns.createdAt} >= ${last7Iso}`),
      db
        .select({ genPrev7: sql<number>`count(*)` })
        .from(generationRuns)
        .where(and(sql`${generationRuns.createdAt} >= ${prev7Iso}`, sql`${generationRuns.createdAt} < ${last7Iso}`)),
      db.select({ users7: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${last7Iso}`),
      db
        .select({ usersPrev7: sql<number>`count(*)` })
        .from(users)
        .where(and(sql`${users.createdAt} >= ${prev7Iso}`, sql`${users.createdAt} < ${last7Iso}`)),
      db.select({ projects7: sql<number>`count(*)` }).from(projects).where(sql`${projects.createdAt} >= ${last7Iso}`),
      db
        .select({ projectsPrev7: sql<number>`count(*)` })
        .from(projects)
        .where(and(sql`${projects.createdAt} >= ${prev7Iso}`, sql`${projects.createdAt} < ${last7Iso}`)),
      db
        .select({ genFailedToday: sql<number>`count(*)` })
        .from(generationRuns)
        .where(and(sql`${generationRuns.createdAt} >= ${todayIso}`, eq(generationRuns.status, "failed"))),
    ]);

    const errorRate = generationsToday > 0 ? Math.round(((genFailedToday / generationsToday) * 100) * 10) / 10 : 0;

    // 30-day trends: new users per day, and revenue (0 for now)
    const days = 30;
    const trendStart = daysAgoUtc(days - 1);
    const trendStartIso = trendStart.toISOString();
    const userRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${trendStartIso}`)
      .groupBy(sql`date_trunc('day', ${users.createdAt})`)
      .orderBy(sql`date_trunc('day', ${users.createdAt})`);

    const userCountByDay = new Map(userRows.map((r) => [r.day, r.count]));
    const userTrend = Array.from({ length: days }).map((_, idx) => {
      const d = new Date(trendStart);
      d.setUTCDate(d.getUTCDate() + idx);
      const day = isoDate(d);
      return { date: day, value: userCountByDay.get(day) ?? 0 };
    });

    const revenueTrend = Array.from({ length: days }).map((_, idx) => {
      const d = new Date(trendStart);
      d.setUTCDate(d.getUTCDate() + idx);
      return { date: isoDate(d), value: 0 };
    });

    await writeAdminAuditLog({
      request,
      actor,
      action: "metrics.view",
      targetType: "admin_metrics",
      metadata: {},
    });

    return reply.send({
      stats: {
        totalUsers,
        totalProjects,
        generationsToday,
        revenue: 0,
        activeUsers,
        suspendedUsers,
        activeSubscriptions,
        errorRate,
        apiUptime: 99.9,
        queueDepth,
        userGrowth: pctChange(usersPrev7, users7),
        projectGrowth: pctChange(projectsPrev7, projects7),
        generationGrowth: pctChange(genPrev7, gen7),
        revenueGrowth: 0,
        userTrend,
        revenueTrend,
      },
    });
  });
}
