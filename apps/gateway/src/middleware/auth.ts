import { FastifyReply, FastifyRequest } from "fastify";
import db from "../db";
import { adminAuditLogs, adminPermissions, adminRoles, rolePermissions, userAdminAssignments, users } from "../db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

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

type JwtActorPayload = {
  sub?: string;
  email?: string;
  fullName?: string | null;
  plan?: string;
  status?: string;
  isAdmin?: boolean;
  roleKeys?: string[];
  permissionKeys?: string[];
};

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

export function getRequestActor(request: FastifyRequest): AuthenticatedActor {
  const user = request.user as JwtActorPayload | undefined;

  if (!user?.sub || !user.email) {
    throw new Error("Missing authenticated actor");
  }

  return {
    userId: user.sub,
    email: user.email,
    fullName: user.fullName ?? null,
    plan: user.plan ?? "free",
    status: user.status ?? "active",
    isAdmin: Boolean(user.isAdmin),
    roleKeys: (user.roleKeys ?? []).map((roleKey) => String(roleKey)),
    permissionKeys: (user.permissionKeys ?? []).map((permissionKey) => String(permissionKey)),
  };
}

export async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
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
