import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import db from "../db";
import { couponRedemptions, coupons } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";

function normalizeCode(code: string) {
  const trimmed = String(code || "").trim();
  if (!trimmed) throw new Error("code is required");
  if (trimmed.length > 120) throw new Error("code is too long");
  return trimmed.toUpperCase();
}

function hashCode(code: string) {
  const pepper = process.env.COUPON_CODE_PEPPER || "";
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${code}`, "utf8")
    .digest("hex");
}

function parseTimestamp(value: unknown) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function couponRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/coupons/me
  // Returns the most recent active coupon redemption for the user (if any).
  app.get("/api/coupons/me", async (request, reply) => {
    const actor = getRequestActor(request);
    const now = new Date();

    const [row] = await db
      .select({
        couponId: coupons.id,
        label: coupons.label,
        overrides: coupons.overrides,
        expiresAt: coupons.expiresAt,
        redeemedAt: couponRedemptions.redeemedAt,
      })
      .from(couponRedemptions)
      .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
      .where(
        and(
          eq(couponRedemptions.userId, actor.userId),
          eq(coupons.isActive, true),
          or(isNull(coupons.expiresAt), sql`${coupons.expiresAt} > ${now.toISOString()}`),
        ),
      )
      .orderBy(desc(couponRedemptions.redeemedAt))
      .limit(1);

    if (!row) return reply.send({ coupon: null });
    return reply.send({
      coupon: {
        id: row.couponId,
        label: row.label,
        overrides: row.overrides,
        expiresAt: row.expiresAt,
        redeemedAt: row.redeemedAt,
      },
    });
  });

  // POST /api/coupons/redeem
  app.post("/api/coupons/redeem", async (request, reply) => {
    const actor = getRequestActor(request);
    const body = request.body as { code?: string };

    let normalized: string;
    try {
      normalized = normalizeCode(body?.code ?? "");
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Invalid code" });
    }

    const codeHash = hashCode(normalized);
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [coupon] = await tx
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.codeHash, codeHash),
            eq(coupons.isActive, true),
            or(isNull(coupons.expiresAt), sql`${coupons.expiresAt} > ${now.toISOString()}`),
          ),
        )
        .limit(1);

      if (!coupon) return { ok: false as const, reason: "invalid" as const };

      const max = coupon.maxRedemptions == null ? null : Number(coupon.maxRedemptions);
      const redeemed = Number(coupon.redeemedCount ?? 0);
      if (max != null && Number.isFinite(max) && max > 0 && redeemed >= max) {
        return { ok: false as const, reason: "exhausted" as const };
      }

      const inserted = await tx
        .insert(couponRedemptions)
        .values({ couponId: coupon.id, userId: actor.userId })
        .onConflictDoNothing()
        .returning({ id: couponRedemptions.id });

      if (inserted.length === 0) {
        return { ok: true as const, already: true as const, couponId: coupon.id, overrides: coupon.overrides };
      }

      await tx
        .update(coupons)
        .set({ redeemedCount: redeemed + 1, updatedAt: new Date() })
        .where(eq(coupons.id, coupon.id));

      return { ok: true as const, already: false as const, couponId: coupon.id, overrides: coupon.overrides };
    });

    if (!result.ok) {
      const message =
        result.reason === "exhausted" ? "Coupon fully redeemed" : "Invalid or expired coupon";
      return reply.status(400).send({ error: message });
    }

    return reply.send({ ok: true, already: result.already, couponId: result.couponId, overrides: result.overrides });
  });

  // Admin: create a coupon (returns coupon id; code is not stored in plaintext)
  app.post("/api/admin/coupons", async (request, reply) => {
    const actor = getRequestActor(request);
    if (!actor.isAdmin) return reply.status(403).send({ error: "Forbidden" });

    const body = request.body as {
      code?: string;
      label?: string | null;
      overrides?: Record<string, unknown>;
      maxRedemptions?: number | null;
      expiresAt?: string | null;
      isActive?: boolean | null;
    };

    let normalized: string;
    try {
      normalized = normalizeCode(body?.code ?? "");
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Invalid code" });
    }

    const codeHash = hashCode(normalized);
    const overrides =
      body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides) ? body.overrides : {};

    const expiresAt = parseTimestamp(body.expiresAt);
    const maxRedemptions =
      body.maxRedemptions == null ? null : Number.isFinite(Number(body.maxRedemptions)) ? Number(body.maxRedemptions) : null;
    const isActive = body.isActive == null ? true : Boolean(body.isActive);

    try {
      const [created] = await db
        .insert(coupons)
        .values({
          codeHash,
          label: body.label ?? null,
          overrides,
          maxRedemptions,
          isActive,
          expiresAt,
        })
        .returning({ id: coupons.id });

      return reply.status(201).send({ ok: true, couponId: created.id });
    } catch {
      // Most likely unique constraint.
      return reply.status(409).send({ error: "Coupon code already exists" });
    }
  });

  // Admin: list coupons (does not reveal codes)
  app.get("/api/admin/coupons", async (request, reply) => {
    const actor = getRequestActor(request);
    if (!actor.isAdmin) return reply.status(403).send({ error: "Forbidden" });

    const rows = await db
      .select({
        id: coupons.id,
        label: coupons.label,
        overrides: coupons.overrides,
        maxRedemptions: coupons.maxRedemptions,
        redeemedCount: coupons.redeemedCount,
        isActive: coupons.isActive,
        expiresAt: coupons.expiresAt,
        createdAt: coupons.createdAt,
        updatedAt: coupons.updatedAt,
      })
      .from(coupons)
      .orderBy(sql`${coupons.createdAt} desc`)
      .limit(200);

    return reply.send({ coupons: rows });
  });

  // Admin: update coupon (toggle active, set expiry/limits/overrides)
  app.patch("/api/admin/coupons/:id", async (request, reply) => {
    const actor = getRequestActor(request);
    if (!actor.isAdmin) return reply.status(403).send({ error: "Forbidden" });

    const { id } = request.params as { id: string };
    const body = request.body as {
      label?: string | null;
      overrides?: Record<string, unknown>;
      maxRedemptions?: number | null;
      expiresAt?: string | null;
      isActive?: boolean | null;
    };

    const overrides =
      body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides) ? body.overrides : undefined;
    const expiresAt = body.expiresAt === undefined ? undefined : parseTimestamp(body.expiresAt);
    const maxRedemptions =
      body.maxRedemptions === undefined
        ? undefined
        : body.maxRedemptions == null
          ? null
          : Number.isFinite(Number(body.maxRedemptions))
            ? Number(body.maxRedemptions)
            : null;
    const isActive = body.isActive === undefined ? undefined : Boolean(body.isActive);

    const [updated] = await db
      .update(coupons)
      .set({
        ...(body.label !== undefined ? { label: body.label ?? null } : {}),
        ...(overrides !== undefined ? { overrides } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(maxRedemptions !== undefined ? { maxRedemptions } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(coupons.id, id))
      .returning({
        id: coupons.id,
        label: coupons.label,
        overrides: coupons.overrides,
        maxRedemptions: coupons.maxRedemptions,
        redeemedCount: coupons.redeemedCount,
        isActive: coupons.isActive,
        expiresAt: coupons.expiresAt,
        createdAt: coupons.createdAt,
        updatedAt: coupons.updatedAt,
      });

    if (!updated) return reply.status(404).send({ error: "Coupon not found" });
    return reply.send({ coupon: updated });
  });
}
