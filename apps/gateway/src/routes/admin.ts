import { FastifyInstance } from "fastify";
import db from "../db";
import {
  adminPermissions,
  adminRoles,
  aiModels,
  aiProviders,
  aiRoutingRules,
  planFeatures,
  planPrices,
  plans,
  projects,
  rolePermissions,
  serviceIntegrations,
  subscriptions,
  userAdminAssignments,
  users,
} from "../db/schema";
import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { getRequestActor, requireAdmin, writeAdminAuditLog } from "../middleware/auth";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAdmin());

  app.get("/api/admin/bootstrap", async (request, reply) => {
    const actor = getRequestActor(request);

    const [
      [{ totalUsers }],
      [{ totalProjects }],
      [{ totalPlans }],
      [{ totalProviders }],
      [{ activeSubscriptions }],
      [{ totalAdmins }],
    ] = await Promise.all([
      db.select({ totalUsers: sql<number>`count(*)` }).from(users),
      db.select({ totalProjects: sql<number>`count(*)` }).from(projects),
      db.select({ totalPlans: sql<number>`count(*)` }).from(plans),
      db.select({ totalProviders: sql<number>`count(*)` }).from(aiProviders),
      db.select({ activeSubscriptions: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db
        .select({ totalAdmins: sql<number>`count(*)` })
        .from(userAdminAssignments)
        .where(and(eq(userAdminAssignments.isActive, true), isNull(userAdminAssignments.revokedAt))),
    ]);

    return reply.send({
      actor,
      summary: {
        totalUsers,
        totalProjects,
        totalPlans,
        totalProviders,
        activeSubscriptions,
        totalAdmins,
      },
      permissions: actor.permissionKeys,
      roles: actor.roleKeys,
    });
  });

  app.get("/api/admin/users", { preHandler: requireAdmin(["users.read"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const query = request.query as { search?: string; status?: string };

    let userQuery = db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        status: users.status,
        plan: users.plan,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        avatarUrl: users.avatarUrl,
        metadata: users.metadata,
      })
      .from(users)
      .$dynamic();

    if (query.search) {
      userQuery = userQuery.where(
        sql`${users.email} ilike ${`%${query.search}%`} or ${users.fullName} ilike ${`%${query.search}%`}`,
      );
    } else if (query.status) {
      userQuery = userQuery.where(eq(users.status, query.status));
    }

    const rows = await userQuery.orderBy(desc(users.createdAt));
    const userIds = rows.map((row) => row.id);

    const adminAssignments = userIds.length
      ? await db
          .select({
            userId: userAdminAssignments.userId,
          })
          .from(userAdminAssignments)
          .where(
            and(
              inArray(userAdminAssignments.userId, userIds),
              eq(userAdminAssignments.isActive, true),
              isNull(userAdminAssignments.revokedAt),
            ),
          )
      : [];

    const projectCounts = userIds.length
      ? await db
          .select({
            userId: projects.userId,
            count: sql<number>`count(*)`,
          })
          .from(projects)
          .where(inArray(projects.userId, userIds))
          .groupBy(projects.userId)
      : [];

    const adminUserIds = new Set(adminAssignments.map((assignment) => assignment.userId));
    const projectCountMap = new Map(projectCounts.map((item) => [item.userId, item.count]));

    await writeAdminAuditLog({
      request,
      actor,
      action: "users.list",
      targetType: "user",
      metadata: query,
    });

    return reply.send({
      users: rows.map((row) => ({
        ...row,
        role: adminUserIds.has(row.id) ? "admin" : "user",
        projectsCount: projectCountMap.get(row.id) ?? 0,
      })),
    });
  });

  app.get("/api/admin/users/:id", { preHandler: requireAdmin(["users.read"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const assignments = await db
      .select({
        assignmentId: userAdminAssignments.id,
        roleId: adminRoles.id,
        roleKey: adminRoles.key,
        roleName: adminRoles.name,
        assignedAt: userAdminAssignments.assignedAt,
      })
      .from(userAdminAssignments)
      .innerJoin(adminRoles, eq(userAdminAssignments.roleId, adminRoles.id))
      .where(
        and(
          eq(userAdminAssignments.userId, id),
          eq(userAdminAssignments.isActive, true),
          isNull(userAdminAssignments.revokedAt),
        ),
      );

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const [projectCount] = await db
      .select({ value: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.userId, id));

    await writeAdminAuditLog({
      request,
      actor,
      action: "users.view",
      targetType: "user",
      targetId: id,
    });

    return reply.send({
      user,
      adminAssignments: assignments,
      subscription,
      projectCount: projectCount?.value ?? 0,
    });
  });

  app.patch("/api/admin/users/:id/status", { preHandler: requireAdmin(["users.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { status?: string };

    if (!body.status) {
      return reply.status(400).send({ error: "Status is required" });
    }

    const [user] = await db
      .update(users)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    await writeAdminAuditLog({
      request,
      actor,
      action: "users.status.update",
      targetType: "user",
      targetId: id,
      metadata: { status: body.status },
    });

    return reply.send({ user });
  });

  app.patch("/api/admin/users/:id/plan", { preHandler: requireAdmin(["subscriptions.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { planId?: string; planKey?: string; billingCycle?: string; status?: string };

    let targetPlanId = body.planId ?? null;

    if (!targetPlanId && body.planKey) {
      const [plan] = await db.select().from(plans).where(eq(plans.key, body.planKey)).limit(1);
      targetPlanId = plan?.id ?? null;
    }

    const [updatedUser] = await db
      .update(users)
      .set({ plan: body.planKey ?? "free", updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId: id,
        planId: targetPlanId,
        status: body.status ?? "active",
        billingCycle: body.billingCycle ?? "monthly",
      })
      .returning();

    await writeAdminAuditLog({
      request,
      actor,
      action: "subscriptions.plan.update",
      targetType: "user",
      targetId: id,
      metadata: {
        planId: targetPlanId,
        planKey: body.planKey ?? null,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
      },
    });

    return reply.send({ user: updatedUser, subscription });
  });

  app.get("/api/admin/plans", { preHandler: requireAdmin(["subscriptions.read"]) }, async (_request, reply) => {
    const planRows = await db.select().from(plans).orderBy(plans.name);
    const featureRows = await db.select().from(planFeatures).orderBy(planFeatures.sortOrder);
    const priceRows = await db.select().from(planPrices).orderBy(planPrices.market, planPrices.billingCycle);

    return reply.send({
      plans: planRows.map((plan) => ({
        ...plan,
        features: featureRows.filter((feature) => feature.planId === plan.id),
        prices: priceRows.filter((price) => price.planId === plan.id),
      })),
    });
  });

  app.post("/api/admin/plans", { preHandler: requireAdmin(["subscriptions.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const body = request.body as {
      key?: string;
      name?: string;
      description?: string;
      status?: string;
      billingModel?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.key || !body.name) {
      return reply.status(400).send({ error: "Plan key and name are required" });
    }

    const [plan] = await db
      .insert(plans)
      .values({
        key: body.key,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? "draft",
        billingModel: body.billingModel ?? "subscription",
        metadata: body.metadata ?? {},
      })
      .returning();

    await writeAdminAuditLog({
      request,
      actor,
      action: "plans.create",
      targetType: "plan",
      targetId: plan.id,
      metadata: { key: plan.key },
    });

    return reply.status(201).send({ plan });
  });

  app.patch("/api/admin/plans/:id", { preHandler: requireAdmin(["subscriptions.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as Partial<typeof plans.$inferInsert>;

    const [plan] = await db
      .update(plans)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    if (!plan) {
      return reply.status(404).send({ error: "Plan not found" });
    }

    await writeAdminAuditLog({
      request,
      actor,
      action: "plans.update",
      targetType: "plan",
      targetId: id,
      metadata: body as Record<string, unknown>,
    });

    return reply.send({ plan });
  });

  app.put("/api/admin/plans/:id/features", { preHandler: requireAdmin(["subscriptions.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as {
      features?: Array<{
        key: string;
        label: string;
        featureType?: string;
        value?: string | null;
        sortOrder?: number;
      }>;
    };

    await db.delete(planFeatures).where(eq(planFeatures.planId, id));

    const nextFeatures = body.features ?? [];
    const inserted = nextFeatures.length
      ? await db
          .insert(planFeatures)
          .values(
            nextFeatures.map((feature, index) => ({
              planId: id,
              key: feature.key,
              label: feature.label,
              featureType: feature.featureType ?? "boolean",
              value: feature.value ?? null,
              sortOrder: feature.sortOrder ?? index,
            })),
          )
          .returning()
      : [];

    await writeAdminAuditLog({
      request,
      actor,
      action: "plans.features.replace",
      targetType: "plan",
      targetId: id,
      metadata: { featureCount: inserted.length },
    });

    return reply.send({ features: inserted });
  });

  app.put("/api/admin/plans/:id/prices", { preHandler: requireAdmin(["subscriptions.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as {
      prices?: Array<{
        market: string;
        currency: string;
        billingCycle: string;
        amountMinor: number;
        isActive?: boolean;
      }>;
    };

    await db.delete(planPrices).where(eq(planPrices.planId, id));

    const nextPrices = body.prices ?? [];
    const inserted = nextPrices.length
      ? await db
          .insert(planPrices)
          .values(
            nextPrices.map((price) => ({
              planId: id,
              market: price.market,
              currency: price.currency,
              billingCycle: price.billingCycle,
              amountMinor: price.amountMinor,
              isActive: price.isActive ?? true,
            })),
          )
          .returning()
      : [];

    await writeAdminAuditLog({
      request,
      actor,
      action: "plans.prices.replace",
      targetType: "plan",
      targetId: id,
      metadata: { priceCount: inserted.length },
    });

    return reply.send({ prices: inserted });
  });

  app.get("/api/admin/ai/providers", { preHandler: requireAdmin(["ai.read"]) }, async (_request, reply) => {
    const providers = await db.select().from(aiProviders).orderBy(aiProviders.weight, aiProviders.name);
    const providerIds = providers.map((provider) => provider.id);
    const models = providerIds.length
      ? await db.select().from(aiModels).where(inArray(aiModels.providerId, providerIds)).orderBy(aiModels.name)
      : [];

    return reply.send({
      providers: providers.map((provider) => ({
        ...provider,
        models: models.filter((model) => model.providerId === provider.id),
      })),
    });
  });

  app.post("/api/admin/ai/providers", { preHandler: requireAdmin(["ai.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const body = request.body as Partial<typeof aiProviders.$inferInsert> & { key?: string; name?: string; providerType?: string };

    if (!body.key || !body.name || !body.providerType) {
      return reply.status(400).send({ error: "Provider key, name, and type are required" });
    }

    const [provider] = await db
      .insert(aiProviders)
      .values({
        key: body.key,
        name: body.name,
        providerType: body.providerType,
        status: body.status ?? "active",
        baseUrl: body.baseUrl ?? null,
        authMode: body.authMode ?? "api_key",
        secretRef: body.secretRef ?? null,
        weight: body.weight ?? 100,
        config: body.config ?? {},
      })
      .returning();

    await writeAdminAuditLog({
      request,
      actor,
      action: "ai.providers.create",
      targetType: "ai_provider",
      targetId: provider.id,
      metadata: { key: provider.key },
    });

    return reply.status(201).send({ provider });
  });

  app.patch("/api/admin/ai/providers/:id", { preHandler: requireAdmin(["ai.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as Partial<typeof aiProviders.$inferInsert>;

    const [provider] = await db
      .update(aiProviders)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(aiProviders.id, id))
      .returning();

    if (!provider) {
      return reply.status(404).send({ error: "Provider not found" });
    }

    await writeAdminAuditLog({
      request,
      actor,
      action: "ai.providers.update",
      targetType: "ai_provider",
      targetId: id,
      metadata: body as Record<string, unknown>,
    });

    return reply.send({ provider });
  });

  app.get("/api/admin/ai/routing-rules", { preHandler: requireAdmin(["ai.read"]) }, async (_request, reply) => {
    const rules = await db.select().from(aiRoutingRules).orderBy(aiRoutingRules.priority);
    const modelIds = [...new Set(rules.flatMap((rule) => [rule.primaryModelId, rule.fallbackModelId]).filter(Boolean))] as string[];
    const models = modelIds.length
      ? await db.select({ id: aiModels.id, name: aiModels.name }).from(aiModels).where(inArray(aiModels.id, modelIds))
      : [];
    const modelMap = new Map(models.map((model) => [model.id, model.name]));

    return reply.send({
      rules: rules.map((rule) => ({
        id: rule.id,
        key: rule.key,
        name: rule.name,
        isActive: rule.isActive,
        priority: rule.priority,
        matchSummary: String((rule.matchConfig as Record<string, unknown>)?.summary ?? "Custom routing rule"),
        primaryModel: rule.primaryModelId ? modelMap.get(rule.primaryModelId) ?? "Unassigned" : "Unassigned",
        fallbackModel: rule.fallbackModelId ? modelMap.get(rule.fallbackModelId) ?? "Unassigned" : "Unassigned",
      })),
    });
  });

  app.put("/api/admin/ai/routing-rules/:id", { preHandler: requireAdmin(["ai.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as Partial<typeof aiRoutingRules.$inferInsert>;

    const [rule] = await db
      .update(aiRoutingRules)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(aiRoutingRules.id, id))
      .returning();

    if (!rule) {
      return reply.status(404).send({ error: "Routing rule not found" });
    }

    await writeAdminAuditLog({
      request,
      actor,
      action: "ai.routing.update",
      targetType: "ai_routing_rule",
      targetId: id,
      metadata: body as Record<string, unknown>,
    });

    return reply.send({ rule });
  });

  app.get("/api/admin/services", { preHandler: requireAdmin(["services.read"]) }, async (_request, reply) => {
    const services = await db.select().from(serviceIntegrations).orderBy(serviceIntegrations.serviceType, serviceIntegrations.name);
    return reply.send({
      services: services.map((service) => ({
        id: service.id,
        key: service.key,
        name: service.name,
        serviceType: service.serviceType,
        status: service.status,
        secretRef: service.secretRef ?? "",
        note: String((service.config as Record<string, unknown>)?.note ?? ""),
      })),
    });
  });

  app.patch("/api/admin/services/:id", { preHandler: requireAdmin(["services.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as Partial<typeof serviceIntegrations.$inferInsert>;

    const [service] = await db
      .update(serviceIntegrations)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(serviceIntegrations.id, id))
      .returning();

    if (!service) {
      return reply.status(404).send({ error: "Service not found" });
    }

    await writeAdminAuditLog({
      request,
      actor,
      action: "services.update",
      targetType: "service_integration",
      targetId: id,
      metadata: body as Record<string, unknown>,
    });

    return reply.send({ service });
  });

  app.get("/api/admin/rbac/roles", { preHandler: requireAdmin(["rbac.read"]) }, async (_request, reply) => {
    const roles = await db.select().from(adminRoles).orderBy(adminRoles.name);
    const permissions = await db.select().from(adminPermissions).orderBy(adminPermissions.scope, adminPermissions.name);
    const mappings = await db.select().from(rolePermissions);

    return reply.send({
      roles: roles.map((role) => ({
        ...role,
        permissionIds: mappings.filter((mapping) => mapping.roleId === role.id).map((mapping) => mapping.permissionId),
      })),
      permissions,
    });
  });

  app.put("/api/admin/rbac/roles/:id/permissions", { preHandler: requireAdmin(["rbac.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { permissionIds?: string[] };

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

    const permissionIds = [...new Set(body.permissionIds ?? [])];
    const inserted = permissionIds.length
      ? await db
          .insert(rolePermissions)
          .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })))
          .returning()
      : [];

    await writeAdminAuditLog({
      request,
      actor,
      action: "rbac.role_permissions.replace",
      targetType: "admin_role",
      targetId: id,
      metadata: { permissionIds },
    });

    return reply.send({ roleId: id, permissions: inserted });
  });

  app.post("/api/admin/users/:id/roles", { preHandler: requireAdmin(["rbac.write"]) }, async (request, reply) => {
    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { roleId?: string };

    if (!body.roleId) {
      return reply.status(400).send({ error: "Role ID is required" });
    }

    const [assignment] = await db
      .insert(userAdminAssignments)
      .values({
        userId: id,
        roleId: body.roleId,
        assignedBy: actor.userId,
      })
      .returning();

    await writeAdminAuditLog({
      request,
      actor,
      action: "rbac.assignment.create",
      targetType: "user",
      targetId: id,
      metadata: { roleId: body.roleId },
    });

    return reply.status(201).send({ assignment });
  });
}
