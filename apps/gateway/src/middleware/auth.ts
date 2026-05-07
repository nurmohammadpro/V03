import { FastifyReply, FastifyRequest } from "fastify";
import db from "../db";
import { adminAuditLogs, adminPermissions, adminRoles, rolePermissions, userAdminAssignments, users } from "../db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { createRemoteJWKSet, JWTPayload, jwtVerify } from "jose";

export interface AuthenticatedActor {
  userId: string;
  email: string;
  fullName: string | null;
  plan: string;
  status: string;
  isAdmin: boolean;
  roleKeys: string[];
  permissionKeys: string[];
}

type SupabaseJwtPayload = JWTPayload & {
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
};

type ActorRequest = FastifyRequest & {
  actor?: AuthenticatedActor;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL is required for auth verification");
  }

  return url.replace(/\/$/, "");
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${getSupabaseUrl()}/auth/v1/.well-known/jwks.json`));
  }

  return jwks;
}

async function verifySupabaseToken(token: string): Promise<SupabaseJwtPayload> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `${getSupabaseUrl()}/auth/v1`,
  });

  return payload as SupabaseJwtPayload;
}

export async function resolveAdminAccess(userId: string) {
  const assignments = await db
    .select({
      roleId: adminRoles.id,
      roleKey: adminRoles.key,
    })
    .from(userAdminAssignments)
    .innerJoin(adminRoles, eq(userAdminAssignments.roleId, adminRoles.id))
    .where(
      and(
        eq(userAdminAssignments.userId, userId),
        eq(userAdminAssignments.isActive, true),
        isNull(userAdminAssignments.revokedAt),
      ),
    );

  const roleIds = assignments.map((assignment) => assignment.roleId);
  const roleKeys = assignments.map((assignment) => String(assignment.roleKey));

  if (roleIds.length === 0) {
    return {
      isAdmin: false,
      roleKeys: [],
      permissionKeys: [],
    };
  }

  const permissionRows = await db
    .select({
      key: adminPermissions.key,
    })
    .from(rolePermissions)
    .innerJoin(adminPermissions, eq(rolePermissions.permissionId, adminPermissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  return {
    isAdmin: true,
    roleKeys,
    permissionKeys: [...new Set(permissionRows.map((permission) => String(permission.key)))],
  };
}

export async function buildActorFromEmail(email: string): Promise<AuthenticatedActor | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return null;
  }

  const adminAccess = await resolveAdminAccess(user.id);

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    plan: user.plan,
    status: user.status,
    isAdmin: adminAccess.isAdmin,
    roleKeys: adminAccess.roleKeys,
    permissionKeys: adminAccess.permissionKeys,
  };
}

async function upsertUserFromSupabase(payload: SupabaseJwtPayload) {
  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("Authenticated user is missing email");
  }

  const fullName = payload.user_metadata?.full_name ?? payload.user_metadata?.name ?? null;
  const avatarUrl = payload.user_metadata?.avatar_url ?? payload.user_metadata?.picture ?? null;
  const nextMetadata = {
    supabaseUserId: payload.sub ?? null,
    providers: payload.app_metadata?.providers ?? [],
    provider: payload.app_metadata?.provider ?? null,
  };

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!existingUser) {
    const [createdUser] = await db
      .insert(users)
      .values({
        email,
        fullName,
        avatarUrl,
        plan: "free",
        status: "active",
        metadata: nextMetadata,
      })
      .returning();

    return createdUser;
  }

  const mergedMetadata = {
    ...(typeof existingUser.metadata === "object" && existingUser.metadata ? existingUser.metadata : {}),
    ...nextMetadata,
  };

  const [updatedUser] = await db
    .update(users)
    .set({
      fullName,
      avatarUrl,
      metadata: mergedMetadata,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingUser.id))
    .returning();

  return updatedUser;
}

export function getRequestActor(request: FastifyRequest): AuthenticatedActor {
  const actor = (request as ActorRequest).actor;

  if (!actor) {
    throw new Error("Missing authenticated actor");
  }

  return actor;
}

export async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const payload = await verifySupabaseToken(token);
    const user = await upsertUserFromSupabase(payload);
    const adminAccess = await resolveAdminAccess(user.id);

    (request as ActorRequest).actor = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
      status: user.status,
      isAdmin: adminAccess.isAdmin,
      roleKeys: adminAccess.roleKeys,
      permissionKeys: adminAccess.permissionKeys,
    };
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireAdmin(requiredPermissions: string[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) {
      return authResult;
    }

    const actor = getRequestActor(request);

    if (!actor.isAdmin) {
      return reply.status(403).send({ error: "Admin access required" });
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !actor.permissionKeys.includes(permission),
    );

    if (missingPermissions.length > 0) {
      return reply.status(403).send({
        error: "Insufficient permissions",
        missingPermissions,
      });
    }
  };
}

export async function writeAdminAuditLog(input: {
  request: FastifyRequest;
  actor: AuthenticatedActor;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const primaryRole = input.actor.roleKeys[0] ?? "admin";

  await db.insert(adminAuditLogs).values({
    actorUserId: input.actor.userId,
    actorRoleKey: primaryRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.request.ip,
    userAgent: input.request.headers["user-agent"] ?? null,
  });
}
