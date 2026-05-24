import { and, eq } from "drizzle-orm";
import db from "../db";
import { planFeatures, plans, projects, users } from "../db/schema";

function parseNumber(value: string | null | undefined) {
  if (value == null) return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

export async function getUserPlanKey(userId: string) {
  const [u] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.plan ?? "free";
}

export async function getUserLimit(userId: string, key: string) {
  const planKey = await getUserPlanKey(userId);
  const [plan] = await db.select().from(plans).where(eq(plans.key, planKey)).limit(1);
  if (!plan) return null;
  const [feature] = await db
    .select({ value: planFeatures.value })
    .from(planFeatures)
    .where(and(eq(planFeatures.planId, plan.id), eq(planFeatures.key, key)))
    .limit(1);
  return parseNumber(feature?.value ?? null);
}

export async function enforceActiveProjectsLimit(userId: string) {
  const limit = (await getUserLimit(userId, "active_projects")) ?? null;
  if (!limit || limit <= 0) return { ok: true as const };
  const rows = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId));
  if (rows.length >= limit) {
    return { ok: false as const, error: "Project limit reached", limit };
  }
  return { ok: true as const, limit };
}

