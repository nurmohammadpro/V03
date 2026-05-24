import { and, eq, isNull } from "drizzle-orm";
import db from ".";
import {
  adminPermissions,
  adminRoles,
  aiModels,
  aiProviders,
  aiRoutingRules,
  planFeatures,
  planPrices,
  plans,
  rolePermissions,
  serviceIntegrations,
  userAdminAssignments,
  users,
} from "./schema";

type SeedPlan = {
  key: string;
  name: string;
  status: string;
  billingModel: string;
  description: string;
  metadata: Record<string, unknown>;
  features: Array<{
    key: string;
    label: string;
    featureType: string;
    value: string;
    sortOrder: number;
  }>;
  prices: Array<{
    market: string;
    currency: string;
    billingCycle: string;
    amountMinor: number;
    isActive: boolean;
  }>;
};

const PERMISSIONS = [
  { key: "users.read", name: "Read users", description: "View user records and user profile detail.", scope: "users" },
  { key: "users.write", name: "Manage users", description: "Suspend, activate, and modify user state.", scope: "users" },
  { key: "subscriptions.read", name: "Read subscriptions", description: "View plans, prices, and payer state.", scope: "subscriptions" },
  { key: "subscriptions.write", name: "Manage subscriptions", description: "Create plans, update pricing, and change subscription posture.", scope: "subscriptions" },
  { key: "ai.read", name: "Read AI settings", description: "Inspect providers, models, and routing rules.", scope: "ai" },
  { key: "ai.write", name: "Manage AI settings", description: "Update providers, models, and routing rules.", scope: "ai" },
  { key: "services.read", name: "Read services", description: "Inspect service integrations and operational dependencies.", scope: "services" },
  { key: "services.write", name: "Manage services", description: "Update service integrations and supporting infrastructure settings.", scope: "services" },
  { key: "rbac.read", name: "Read RBAC", description: "Inspect roles, permissions, and assignments.", scope: "rbac" },
  { key: "rbac.write", name: "Manage RBAC", description: "Assign roles and update permission mappings.", scope: "rbac" },
  { key: "analytics.read", name: "Read analytics", description: "View operational analytics and admin reporting.", scope: "analytics" },
];

const ROLES = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full control across product, billing, AI, and administration.",
    permissionKeys: PERMISSIONS.map((permission) => permission.key),
  },
  {
    key: "billing_admin",
    name: "Billing Admin",
    description: "Owns plans, pricing, and subscription operations.",
    permissionKeys: ["users.read", "subscriptions.read", "subscriptions.write", "analytics.read"],
  },
  {
    key: "support_admin",
    name: "Support Admin",
    description: "Owns user support, account state, and profile review.",
    permissionKeys: ["users.read", "users.write", "subscriptions.read"],
  },
  {
    key: "ai_ops",
    name: "AI Operations",
    description: "Owns provider health, model mix, and routing policy.",
    permissionKeys: ["ai.read", "ai.write", "services.read", "services.write", "analytics.read"],
  },
];

const PLANS: SeedPlan[] = [
  {
    key: "free",
    name: "Free",
    status: "active",
    billingModel: "hybrid",
    description: "Weekly refresh for evaluation and light testing.",
    metadata: { seatsIncluded: 1, weeklyRefresh: true },
    features: [
      { key: "weekly_generations", label: "Weekly generations", featureType: "limit", value: "5", sortOrder: 0 },
      { key: "active_projects", label: "Active projects", featureType: "limit", value: "1", sortOrder: 1 },
    ],
    prices: [],
  },
  {
    key: "starter",
    name: "Starter",
    status: "active",
    billingModel: "subscription",
    description: "Solo builder plan with monthly usage and top-ups.",
    metadata: { seatsIncluded: 1, generationsIncluded: 100 },
    features: [
      { key: "generations", label: "Standard generations", featureType: "limit", value: "100", sortOrder: 0 },
      { key: "export_access", label: "Export access", featureType: "boolean", value: "Enabled", sortOrder: 1 },
    ],
    prices: [
      { market: "global", currency: "USD", billingCycle: "monthly", amountMinor: 15, isActive: true },
      { market: "bd", currency: "BDT", billingCycle: "monthly", amountMinor: 1850, isActive: true },
    ],
  },
  {
    key: "professional",
    name: "Professional",
    status: "active",
    billingModel: "subscription",
    description: "Growing-team plan with higher generation and operational limits.",
    metadata: { seatsIncluded: 5, generationsIncluded: 800 },
    features: [
      { key: "generations", label: "Standard generations", featureType: "limit", value: "800", sortOrder: 0 },
      { key: "priority_queue", label: "Priority queue", featureType: "boolean", value: "Enabled", sortOrder: 1 },
    ],
    prices: [
      { market: "global", currency: "USD", billingCycle: "monthly", amountMinor: 49, isActive: true },
      { market: "bd", currency: "BDT", billingCycle: "monthly", amountMinor: 6025, isActive: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    status: "active",
    billingModel: "subscription",
    description: "Operational plan for larger teams with custom overage posture.",
    metadata: { seatsIncluded: 15, generationsIncluded: 3000 },
    features: [
      { key: "generations", label: "Standard generations", featureType: "limit", value: "3000", sortOrder: 0 },
      { key: "routing_priority", label: "Routing priority", featureType: "boolean", value: "Enabled", sortOrder: 1 },
      { key: "support", label: "Admin support", featureType: "text", value: "Priority", sortOrder: 2 },
    ],
    prices: [
      { market: "global", currency: "USD", billingCycle: "monthly", amountMinor: 199, isActive: true },
      { market: "bd", currency: "BDT", billingCycle: "monthly", amountMinor: 24500, isActive: true },
    ],
  },
];

const AI_PROVIDER_DEFS = [
  {
    key: "deepseek",
    name: "DeepSeek",
    providerType: "llm",
    status: "active",
    baseUrl: "https://api.deepseek.com",
    authMode: "api_key",
    secretRef: "vault://ai/deepseek/prod",
    weight: 60,
    config: { health: 99.4, monthlySpend: 842, successRate: 98.7, defaultModelKey: "deepseek-v4-flash", chatCompletionsPath: "/chat/completions" },
    models: [
      {
        key: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        status: "active",
        inputCostPerMillion: 14,
        outputCostPerMillion: 28,
        latencyTier: "fast",
        qualityTier: "balanced",
        config: {},
      },
    ],
  },
  {
    key: "openai",
    name: "OpenAI",
    providerType: "llm",
    status: "active",
    baseUrl: "https://api.openai.com",
    authMode: "api_key",
    secretRef: "vault://ai/openai/prod",
    weight: 25,
    config: { health: 97.8, monthlySpend: 1240, successRate: 97.9, defaultModelKey: "gpt-fast", chatCompletionsPath: "/v1/chat/completions" },
    models: [
      {
        key: "gpt-fast",
        name: "GPT Fast",
        status: "active",
        inputCostPerMillion: 50,
        outputCostPerMillion: 150,
        latencyTier: "fast",
        qualityTier: "premium",
        config: {},
      },
    ],
  },
  {
    key: "zai",
    name: "Z.ai (GLM)",
    providerType: "llm",
    status: "active",
    baseUrl: "https://api.z.ai/api/paas/v4",
    authMode: "api_key",
    secretRef: "vault://ai/zai/prod",
    weight: 15,
    config: { health: 99.0, monthlySpend: 0, successRate: 99.0, defaultModelKey: "glm-4.6-coding-lite", chatCompletionsPath: "/chat/completions" },
    models: [
      {
        key: "glm-4.6-coding-lite",
        name: "GLM 4.6 Coding Lite",
        status: "active",
        inputCostPerMillion: null,
        outputCostPerMillion: null,
        latencyTier: "fast",
        qualityTier: "balanced",
        config: {},
      },
    ],
  },
];

const ROUTING_RULE_DEFS = [
  {
    key: "default_builder",
    name: "Default builder flow",
    isActive: true,
    priority: 100,
    matchConfig: { summary: "All standard builder prompts under normal load." },
    primaryModelKey: "deepseek-v4-flash",
    fallbackModelKey: "gpt-fast",
    routingConfig: { mode: "weighted", maxRetries: 1 },
  },
  {
    key: "premium_retry",
    name: "High-value retry flow",
    isActive: true,
    priority: 50,
    matchConfig: { summary: "Escalate failed premium prompts to higher quality model." },
    primaryModelKey: "gpt-fast",
    fallbackModelKey: "deepseek-v4-flash",
    routingConfig: { mode: "fallback", maxRetries: 2 },
  },
];

const SERVICE_DEFS = [
  {
    key: "r2_storage",
    name: "Artifact storage",
    serviceType: "storage",
    status: "active",
    secretRef: "vault://storage/r2/prod",
    config: { note: "Workspace artifacts, exports, and backup object storage." },
  },
  {
    key: "stripe_live",
    name: "Billing gateway",
    serviceType: "billing",
    status: "active",
    secretRef: "vault://billing/stripe/live",
    config: { note: "Subscriptions, overages, invoices, and webhooks." },
  },
  {
    key: "resend_prod",
    name: "Notifications",
    serviceType: "notifications",
    status: "active",
    secretRef: "vault://notify/resend/prod",
    config: { note: "Transactional email and lifecycle alerts." },
  },
];

async function upsertPermissions() {
  const existing = await db.select().from(adminPermissions);
  const byKey = new Map(existing.map((permission) => [permission.key, permission]));

  for (const permission of PERMISSIONS) {
    const current = byKey.get(permission.key);
    if (!current) {
      await db.insert(adminPermissions).values(permission);
    } else {
      await db
        .update(adminPermissions)
        .set({
          name: permission.name,
          description: permission.description,
          scope: permission.scope,
        })
        .where(eq(adminPermissions.id, current.id));
    }
  }
}

async function upsertRoles() {
  const existing = await db.select().from(adminRoles);
  const byKey = new Map(existing.map((role) => [role.key, role]));

  for (const role of ROLES) {
    const current = byKey.get(role.key);
    if (!current) {
      await db.insert(adminRoles).values({
        key: role.key,
        name: role.name,
        description: role.description,
      });
    } else {
      await db
        .update(adminRoles)
        .set({
          name: role.name,
          description: role.description,
          updatedAt: new Date(),
        })
        .where(eq(adminRoles.id, current.id));
    }
  }
}

async function syncRolePermissions() {
  const roles = await db.select().from(adminRoles);
  const permissions = await db.select().from(adminPermissions);
  const existingMappings = await db.select().from(rolePermissions);

  for (const role of ROLES) {
    const roleRow = roles.find((item) => item.key === role.key);
    if (!roleRow) continue;

    const targetPermissionIds = permissions
      .filter((permission) => role.permissionKeys.includes(permission.key))
      .map((permission) => permission.id);

    for (const permissionId of targetPermissionIds) {
      const alreadyMapped = existingMappings.find(
        (mapping) => mapping.roleId === roleRow.id && mapping.permissionId === permissionId,
      );

      if (!alreadyMapped) {
        await db.insert(rolePermissions).values({
          roleId: roleRow.id,
          permissionId,
        });
      }
    }
  }
}

async function upsertPlans() {
  const existingPlans = await db.select().from(plans);
  const existingFeatures = await db.select().from(planFeatures);
  const existingPrices = await db.select().from(planPrices);

  for (const plan of PLANS) {
    let planId = existingPlans.find((item) => item.key === plan.key)?.id;

    if (!planId) {
      const [created] = await db
        .insert(plans)
        .values({
          key: plan.key,
          name: plan.name,
          status: plan.status,
          billingModel: plan.billingModel,
          description: plan.description,
          metadata: plan.metadata,
        })
        .returning();
      planId = created.id;
    } else {
      await db
        .update(plans)
        .set({
          name: plan.name,
          status: plan.status,
          billingModel: plan.billingModel,
          description: plan.description,
          metadata: plan.metadata,
          updatedAt: new Date(),
        })
        .where(eq(plans.id, planId));
    }

    for (const feature of plan.features) {
      const current = existingFeatures.find((item) => item.planId === planId && item.key === feature.key);
      if (!current) {
        await db.insert(planFeatures).values({ planId, ...feature });
      } else {
        await db
          .update(planFeatures)
          .set({
            label: feature.label,
            featureType: feature.featureType,
            value: feature.value,
            sortOrder: feature.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(planFeatures.id, current.id));
      }
    }

    for (const price of plan.prices) {
      const current = existingPrices.find(
        (item) => item.planId === planId && item.market === price.market && item.billingCycle === price.billingCycle,
      );
      if (!current) {
        await db.insert(planPrices).values({ planId, ...price });
      } else {
        await db
          .update(planPrices)
          .set({
            currency: price.currency,
            amountMinor: price.amountMinor,
            isActive: price.isActive,
            updatedAt: new Date(),
          })
          .where(eq(planPrices.id, current.id));
      }
    }
  }
}

async function upsertAiProviders() {
  const existingProviders = await db.select().from(aiProviders);
  const existingModels = await db.select().from(aiModels);

  for (const provider of AI_PROVIDER_DEFS) {
    let providerId = existingProviders.find((item) => item.key === provider.key)?.id;

    if (!providerId) {
      const [created] = await db
        .insert(aiProviders)
        .values({
          key: provider.key,
          name: provider.name,
          providerType: provider.providerType,
          status: provider.status,
          baseUrl: provider.baseUrl,
          authMode: provider.authMode,
          secretRef: provider.secretRef,
          weight: provider.weight,
          config: provider.config,
        })
        .returning();
      providerId = created.id;
    } else {
      await db
        .update(aiProviders)
        .set({
          name: provider.name,
          providerType: provider.providerType,
          status: provider.status,
          baseUrl: provider.baseUrl,
          authMode: provider.authMode,
          secretRef: provider.secretRef,
          weight: provider.weight,
          config: provider.config,
          updatedAt: new Date(),
        })
        .where(eq(aiProviders.id, providerId));
    }

    for (const model of provider.models) {
      const current = existingModels.find((item) => item.providerId === providerId && item.key === model.key);
      if (!current) {
        await db.insert(aiModels).values({ providerId, ...model });
      } else {
        await db
          .update(aiModels)
          .set({
            name: model.name,
            status: model.status,
            inputCostPerMillion: model.inputCostPerMillion,
            outputCostPerMillion: model.outputCostPerMillion,
            latencyTier: model.latencyTier,
            qualityTier: model.qualityTier,
            config: model.config,
            updatedAt: new Date(),
          })
          .where(eq(aiModels.id, current.id));
      }
    }
  }
}

async function upsertRoutingRules() {
  const models = await db.select().from(aiModels);
  const existingRules = await db.select().from(aiRoutingRules);

  for (const rule of ROUTING_RULE_DEFS) {
    const primaryModel = models.find((model) => model.key === rule.primaryModelKey);
    const fallbackModel = models.find((model) => model.key === rule.fallbackModelKey);
    const current = existingRules.find((item) => item.key === rule.key);

    if (!current) {
      await db.insert(aiRoutingRules).values({
        key: rule.key,
        name: rule.name,
        isActive: rule.isActive,
        priority: rule.priority,
        matchConfig: rule.matchConfig,
        primaryModelId: primaryModel?.id ?? null,
        fallbackModelId: fallbackModel?.id ?? null,
        routingConfig: rule.routingConfig,
      });
    } else {
      await db
        .update(aiRoutingRules)
        .set({
          name: rule.name,
          isActive: rule.isActive,
          priority: rule.priority,
          matchConfig: rule.matchConfig,
          primaryModelId: primaryModel?.id ?? null,
          fallbackModelId: fallbackModel?.id ?? null,
          routingConfig: rule.routingConfig,
          updatedAt: new Date(),
        })
        .where(eq(aiRoutingRules.id, current.id));
    }
  }
}

async function upsertServices() {
  const existing = await db.select().from(serviceIntegrations);

  for (const service of SERVICE_DEFS) {
    const current = existing.find((item) => item.key === service.key);
    if (!current) {
      await db.insert(serviceIntegrations).values(service);
    } else {
      await db
        .update(serviceIntegrations)
        .set({
          name: service.name,
          serviceType: service.serviceType,
          status: service.status,
          secretRef: service.secretRef,
          config: service.config,
          updatedAt: new Date(),
        })
        .where(eq(serviceIntegrations.id, current.id));
    }
  }
}

export async function ensureSuperAdminAssignment(email?: string) {
  if (!email) return;

  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.key, "super_admin")).limit(1);

  if (!user || !role) {
    return;
  }

  const [existing] = await db
    .select()
    .from(userAdminAssignments)
    .where(
      and(
        eq(userAdminAssignments.userId, user.id),
        eq(userAdminAssignments.roleId, role.id),
        eq(userAdminAssignments.isActive, true),
        isNull(userAdminAssignments.revokedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(userAdminAssignments).values({
      userId: user.id,
      roleId: role.id,
      assignedBy: user.id,
    });
  }
}

export async function ensureAdminSystemSeeded(options?: { superAdminEmail?: string }) {
  await upsertPermissions();
  await upsertRoles();
  await syncRolePermissions();
  await upsertPlans();
  await upsertAiProviders();
  await upsertRoutingRules();
  await upsertServices();
  await ensureSuperAdminAssignment(options?.superAdminEmail ?? "nurprodev@gmail.com");
}
