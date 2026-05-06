import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Activity,
  AdminAuditLog,
  AdminPermission,
  AdminRole,
  AdminStats,
  AiProvider,
  AiRoutingRule,
  ServiceIntegration,
  SubscriptionPlan,
  User,
  UserProfile,
} from "@/lib/types";
import api from "@/lib/api";

const TREND_CACHE: Record<string, { date: string; value: number }[]> = {};

function generateTrend(key: string, days: number, base: number, variance: number) {
  if (TREND_CACHE[key]) return TREND_CACHE[key];
  const result: { date: string; value: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const value = Math.max(0, base + Math.round((Math.random() - 0.5) * variance));
    result.push({ date: d.toISOString().slice(0, 10), value });
  }

  TREND_CACHE[key] = result;
  return result;
}

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_free",
    key: "free",
    name: "Free",
    description: "Weekly refresh and limited project scope for evaluation.",
    status: "active",
    billingModel: "hybrid",
    seatsIncluded: 1,
    features: [
      { id: "free_feature_1", key: "weekly_generations", label: "Weekly generations", featureType: "limit", value: "5" },
      { id: "free_feature_2", key: "projects", label: "Active projects", featureType: "limit", value: "1" },
    ],
    prices: [],
  },
  {
    id: "plan_starter",
    key: "starter",
    name: "Starter",
    description: "Solo build plan with monthly usage and top-up support.",
    status: "active",
    billingModel: "subscription",
    seatsIncluded: 1,
    features: [
      { id: "starter_feature_1", key: "generations", label: "Standard generations", featureType: "limit", value: "100" },
      { id: "starter_feature_2", key: "exports", label: "Export access", featureType: "boolean", value: "Enabled" },
    ],
    prices: [
      { id: "starter_global_monthly", market: "global", currency: "USD", billingCycle: "monthly", amount: 15, isActive: true },
      { id: "starter_bd_monthly", market: "bd", currency: "BDT", billingCycle: "monthly", amount: 1850, isActive: true },
    ],
  },
  {
    id: "plan_pro",
    key: "professional",
    name: "Professional",
    description: "Higher usage and stronger operational limits for growing teams.",
    status: "active",
    billingModel: "subscription",
    seatsIncluded: 5,
    features: [
      { id: "pro_feature_1", key: "generations", label: "Standard generations", featureType: "limit", value: "800" },
      { id: "pro_feature_2", key: "priority_queue", label: "Priority queue", featureType: "boolean", value: "Enabled" },
    ],
    prices: [
      { id: "pro_global_monthly", market: "global", currency: "USD", billingCycle: "monthly", amount: 49, isActive: true },
      { id: "pro_bd_monthly", market: "bd", currency: "BDT", billingCycle: "monthly", amount: 6025, isActive: true },
    ],
  },
];

const MOCK_USERS: User[] = [
  { id: "1", email: "alice@example.com", name: "Alice Hasan", role: "admin", status: "active", plan: "professional", createdAt: "2026-01-15", lastActive: "2026-05-06", projectsCount: 12 },
  { id: "2", email: "bob@example.com", name: "Bob Karim", role: "user", status: "active", plan: "starter", createdAt: "2026-02-20", lastActive: "2026-05-05", projectsCount: 5 },
  { id: "3", email: "charlie@example.com", name: "Charlie Noor", role: "user", status: "suspended", plan: "starter", createdAt: "2026-03-10", lastActive: "2026-04-28", projectsCount: 2 },
  { id: "4", email: "diana@example.com", name: "Diana Akter", role: "user", status: "active", plan: "professional", createdAt: "2026-04-01", lastActive: "2026-05-06", projectsCount: 8 },
  { id: "5", email: "eve@example.com", name: "Eve Rahman", role: "user", status: "pending", plan: "free", createdAt: "2026-05-06", projectsCount: 0 },
  { id: "6", email: "frank@example.com", name: "Frank Das", role: "user", status: "active", plan: "enterprise", createdAt: "2026-03-22", lastActive: "2026-05-04", projectsCount: 3 },
  { id: "7", email: "grace@example.com", name: "Grace Ahmed", role: "admin", status: "active", plan: "enterprise", createdAt: "2026-01-05", lastActive: "2026-05-06", projectsCount: 15 },
];

const MOCK_USER_PROFILES: UserProfile[] = [
  {
    ...MOCK_USERS[1],
    fullName: "Bob Karim",
    notes: ["Requested a plan upgrade after hitting generation pacing limits.", "Support flagged two billing retries in April."],
    usage: { generationsThisMonth: 74, storageUsedGb: 6.2, seats: 1 },
    subscription: {
      id: "sub_bob",
      planKey: "starter",
      planName: "Starter",
      status: "active",
      billingCycle: "monthly",
      renewsAt: "2026-05-30",
      cancelAtPeriodEnd: false,
    },
    adminAssignments: [],
  },
  {
    ...MOCK_USERS[0],
    fullName: "Alice Hasan",
    notes: ["Platform owner with billing and AI controls."],
    usage: { generationsThisMonth: 112, storageUsedGb: 12.8, seats: 3 },
    subscription: {
      id: "sub_alice",
      planKey: "professional",
      planName: "Professional",
      status: "active",
      billingCycle: "monthly",
      renewsAt: "2026-05-24",
      cancelAtPeriodEnd: false,
    },
    adminAssignments: [
      {
        id: "assign_1",
        userId: "1",
        roleId: "role_super_admin",
        roleKey: "super_admin",
        roleName: "Super Admin",
        assignedAt: "2026-01-15T09:00:00.000Z",
      },
    ],
  },
];

const MOCK_PERMISSIONS: AdminPermission[] = [
  { id: "perm_users_read", key: "users.read", name: "Read users", description: "View user records and profile detail.", scope: "users" },
  { id: "perm_users_write", key: "users.write", name: "Manage users", description: "Suspend, activate, and change user state.", scope: "users" },
  { id: "perm_subs_read", key: "subscriptions.read", name: "Read subscriptions", description: "View plans, pricing, and subscription state.", scope: "subscriptions" },
  { id: "perm_subs_write", key: "subscriptions.write", name: "Manage subscriptions", description: "Create plans and change pricing.", scope: "subscriptions" },
  { id: "perm_ai_read", key: "ai.read", name: "Read AI config", description: "Inspect providers and routing.", scope: "ai" },
  { id: "perm_ai_write", key: "ai.write", name: "Manage AI config", description: "Change provider status, model mix, and routing.", scope: "ai" },
  { id: "perm_services_write", key: "services.write", name: "Manage services", description: "Update supporting service connections.", scope: "services" },
  { id: "perm_rbac_write", key: "rbac.write", name: "Manage RBAC", description: "Assign roles and manage permissions.", scope: "rbac" },
];

const MOCK_ROLES: AdminRole[] = [
  {
    id: "role_super_admin",
    key: "super_admin",
    name: "Super Admin",
    description: "Full cross-domain operational authority.",
    permissionIds: MOCK_PERMISSIONS.map((permission) => permission.id),
  },
  {
    id: "role_billing_admin",
    key: "billing_admin",
    name: "Billing Admin",
    description: "Owns plans, pricing, and payment-side support actions.",
    permissionIds: ["perm_subs_read", "perm_subs_write", "perm_users_read"],
  },
  {
    id: "role_ai_ops",
    key: "ai_ops",
    name: "AI Operations",
    description: "Owns provider health, routing, and cost-performance tuning.",
    permissionIds: ["perm_ai_read", "perm_ai_write", "perm_services_write"],
  },
];

const MOCK_AI_PROVIDERS: AiProvider[] = [
  {
    id: "provider_deepseek",
    key: "deepseek",
    name: "DeepSeek",
    providerType: "llm",
    status: "active",
    baseUrl: "https://api.deepseek.com",
    authMode: "api_key",
    secretRef: "vault://ai/deepseek/prod",
    weight: 60,
    health: 99.4,
    monthlySpend: 842,
    successRate: 98.7,
    models: [
      {
        id: "model_deepseek_v4_flash",
        providerId: "provider_deepseek",
        key: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        status: "active",
        inputCostPerMillion: 14,
        outputCostPerMillion: 28,
        latencyTier: "fast",
        qualityTier: "balanced",
      },
    ],
  },
  {
    id: "provider_openai",
    key: "openai",
    name: "OpenAI",
    providerType: "llm",
    status: "degraded",
    baseUrl: "https://api.openai.com",
    authMode: "api_key",
    secretRef: "vault://ai/openai/prod",
    weight: 25,
    health: 96.8,
    monthlySpend: 1240,
    successRate: 97.9,
    models: [
      {
        id: "model_gpt_fast",
        providerId: "provider_openai",
        key: "gpt-fast",
        name: "GPT Fast",
        status: "active",
        inputCostPerMillion: 50,
        outputCostPerMillion: 150,
        latencyTier: "fast",
        qualityTier: "premium",
      },
    ],
  },
  {
    id: "provider_anthropic",
    key: "anthropic",
    name: "Anthropic",
    providerType: "llm",
    status: "disabled",
    baseUrl: "https://api.anthropic.com",
    authMode: "api_key",
    secretRef: "vault://ai/anthropic/prod",
    weight: 15,
    health: 0,
    monthlySpend: 0,
    successRate: 0,
    models: [],
  },
];

const MOCK_AI_ROUTING_RULES: AiRoutingRule[] = [
  {
    id: "routing_default_builder",
    key: "default_builder",
    name: "Default builder flow",
    isActive: true,
    priority: 100,
    matchSummary: "All standard builder prompts under normal load.",
    primaryModel: "DeepSeek V4 Flash",
    fallbackModel: "GPT Fast",
  },
  {
    id: "routing_premium_retry",
    key: "premium_retry",
    name: "High-value retry flow",
    isActive: true,
    priority: 50,
    matchSummary: "Escalate failed premium prompts to higher quality model.",
    primaryModel: "GPT Fast",
    fallbackModel: "DeepSeek V4 Flash",
  },
];

const MOCK_SERVICES: ServiceIntegration[] = [
  {
    id: "service_storage",
    key: "r2_storage",
    name: "Artifact storage",
    serviceType: "storage",
    status: "active",
    secretRef: "vault://storage/r2/prod",
    note: "Workspace artifacts, exports, and backup object storage.",
  },
  {
    id: "service_billing",
    key: "stripe_live",
    name: "Billing gateway",
    serviceType: "billing",
    status: "active",
    secretRef: "vault://billing/stripe/live",
    note: "Subscriptions, overages, invoices, and webhooks.",
  },
  {
    id: "service_notifications",
    key: "resend_prod",
    name: "Notifications",
    serviceType: "notifications",
    status: "degraded",
    secretRef: "vault://notify/resend/prod",
    note: "Transactional email and lifecycle alerts.",
  },
];

const MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "audit_1",
    actorName: "Alice Hasan",
    actorRole: "Super Admin",
    action: "Suspended user",
    targetType: "user",
    targetName: "charlie@example.com",
    timestamp: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: "audit_2",
    actorName: "Grace Ahmed",
    actorRole: "AI Operations",
    action: "Adjusted provider weight",
    targetType: "ai_provider",
    targetName: "DeepSeek",
    timestamp: new Date(Date.now() - 4200_000).toISOString(),
  },
];

const MOCK_ACTIVITIES: Activity[] = [
  { id: "a1", type: "user_register", message: "New user registered", userId: "5", userEmail: "eve@example.com", timestamp: new Date(Date.now() - 120_000).toISOString() },
  { id: "a2", type: "project_create", message: 'Project created: "E-commerce App"', timestamp: new Date(Date.now() - 900_000).toISOString() },
  { id: "a3", type: "generation_complete", message: "Generation completed using DeepSeek routing.", timestamp: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "a4", type: "admin_action", message: "Plan pricing updated for Bangladesh market.", timestamp: new Date(Date.now() - 7_200_000).toISOString() },
  { id: "a5", type: "error", message: "Provider timeout spike detected on fallback path.", timestamp: new Date(Date.now() - 14_400_000).toISOString() },
  { id: "a6", type: "export", message: 'Exported "Admin Panel" as ZIP', timestamp: new Date(Date.now() - 86_400_000).toISOString() },
];

export function useAdminStats() {
  const query = useQuery({
    queryKey: ["admin-bootstrap"],
    queryFn: async () => {
      try {
        return await api.getAdminBootstrap();
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });

  const bootstrap = query.data;
  const totalUsers = bootstrap?.summary.totalUsers ?? 1234;
  const totalProjects = bootstrap?.summary.totalProjects ?? 456;
  const activeSubscriptions = bootstrap?.summary.activeSubscriptions ?? 384;
  const totalAdmins = bootstrap?.summary.totalAdmins ?? 2;

  const stats: AdminStats = {
    totalUsers,
    totalProjects,
    generationsToday: 89,
    revenue: 12430,
    activeUsers: Math.max(0, Math.round(totalUsers * 0.72)),
    suspendedUsers: Math.max(0, Math.round(totalUsers * 0.02)),
    activeSubscriptions,
    errorRate: 0.8,
    apiUptime: 99.97,
    queueDepth: 3,
    userGrowth: 12,
    projectGrowth: 8,
    generationGrowth: 23,
    revenueGrowth: 15,
    userTrend: generateTrend("users", 30, 40, 20),
    revenueTrend: generateTrend("revenue", 30, 400, 200),
  };

  return { stats, loading: query.isLoading, error: query.error instanceof Error ? query.error.message : null, bootstrap, totalAdmins };
}

export function useAdminUsers() {
  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      try {
        const res = await api.getAdminUsers();
        return res.users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.fullName ?? undefined,
          role: user.role,
          status: (user.status as User["status"]) ?? "active",
          plan: user.plan,
          avatar: user.avatarUrl ?? undefined,
          createdAt: user.createdAt,
          lastActive: user.updatedAt,
          projectsCount: user.projectsCount,
        }));
      } catch {
        return MOCK_USERS;
      }
    },
    staleTime: 30_000,
  });

  return { users: query.data ?? MOCK_USERS, loading: query.isLoading, error: query.error instanceof Error ? query.error.message : null };
}

export function useAdminUserProfiles() {
  const { users } = useAdminUsers();
  const profiles = MOCK_USER_PROFILES.map((profile) => {
    const matchingUser = users.find((user) => user.id === profile.id);
    return matchingUser
      ? {
          ...profile,
          ...matchingUser,
          fullName: matchingUser.name || profile.fullName,
        }
      : profile;
  });

  return { profiles, loading: false };
}

export function useSubscriptionPlans() {
  const query = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      try {
        const res = await api.getAdminPlans();
        return res.plans.map((plan) => ({
          id: plan.id,
          key: plan.key,
          name: plan.name,
          description: plan.description ?? "",
          status: (plan.status as SubscriptionPlan["status"]) ?? "draft",
          billingModel: (plan.billingModel as SubscriptionPlan["billingModel"]) ?? "subscription",
          seatsIncluded: Number(plan.metadata.seatsIncluded ?? 1),
          features: plan.features.map((feature) => ({
            id: feature.id,
            key: feature.key,
            label: feature.label,
            featureType: (feature.featureType as SubscriptionPlan["features"][number]["featureType"]) ?? "text",
            value: feature.value ?? "",
          })),
          prices: plan.prices.map((price) => ({
            id: price.id,
            market: price.market === "bd" ? "bd" : "global",
            currency: price.currency,
            billingCycle: (price.billingCycle as SubscriptionPlan["prices"][number]["billingCycle"]) ?? "monthly",
            amount: price.amountMinor,
            isActive: price.isActive,
          })),
        }));
      } catch {
        return MOCK_PLANS;
      }
    },
    staleTime: 30_000,
  });

  return { plans: query.data ?? MOCK_PLANS, loading: query.isLoading };
}

export function useAiProviders() {
  const query = useQuery({
    queryKey: ["admin-ai-providers"],
    queryFn: async () => {
      try {
        const res = await api.getAiProviders();
        return res.providers.map((provider) => ({
          id: provider.id,
          key: provider.key,
          name: provider.name,
          providerType: provider.providerType,
          status: (provider.status as AiProvider["status"]) ?? "active",
          baseUrl: provider.baseUrl ?? "",
          authMode: (provider.authMode as AiProvider["authMode"]) ?? "api_key",
          secretRef: provider.secretRef ?? "",
          weight: provider.weight,
          health: Number(provider.config.health ?? 0),
          monthlySpend: Number(provider.config.monthlySpend ?? 0),
          successRate: Number(provider.config.successRate ?? 0),
          models: provider.models.map((model) => ({
            id: model.id,
            providerId: model.providerId,
            key: model.key,
            name: model.name,
            status: (model.status as AiProvider["models"][number]["status"]) ?? "active",
            inputCostPerMillion: model.inputCostPerMillion ?? 0,
            outputCostPerMillion: model.outputCostPerMillion ?? 0,
            latencyTier: (model.latencyTier as AiProvider["models"][number]["latencyTier"]) ?? "balanced",
            qualityTier: (model.qualityTier as AiProvider["models"][number]["qualityTier"]) ?? "balanced",
          })),
        }));
      } catch {
        return MOCK_AI_PROVIDERS;
      }
    },
    staleTime: 30_000,
  });

  return { providers: query.data ?? MOCK_AI_PROVIDERS, loading: query.isLoading };
}

export function useAiRoutingRules() {
  const query = useQuery({
    queryKey: ["admin-ai-routing-rules"],
    queryFn: async () => {
      try {
        const res = await api.getAiRoutingRules();
        return res.rules;
      } catch {
        return MOCK_AI_ROUTING_RULES;
      }
    },
    staleTime: 30_000,
  });

  return { rules: query.data ?? MOCK_AI_ROUTING_RULES, loading: query.isLoading };
}

export function useServiceIntegrations() {
  const query = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      try {
        const res = await api.getServiceIntegrations();
        return res.services;
      } catch {
        return MOCK_SERVICES;
      }
    },
    staleTime: 30_000,
  });

  return { services: query.data ?? MOCK_SERVICES, loading: query.isLoading };
}

export function useAdminRbac() {
  const query = useQuery({
    queryKey: ["admin-rbac"],
    queryFn: async () => {
      try {
        return await api.getAdminRbac();
      } catch {
        return { roles: MOCK_ROLES, permissions: MOCK_PERMISSIONS };
      }
    },
    staleTime: 30_000,
  });

  return {
    roles: query.data?.roles ?? MOCK_ROLES,
    permissions: query.data?.permissions ?? MOCK_PERMISSIONS,
    loading: query.isLoading,
  };
}

export function useUpdateAdminUserStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) =>
      api.updateAdminUserStatus(userId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-bootstrap"] });
    },
  });
}

export function useUpdateAdminUserPlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, planKey }: { userId: string; planKey: string }) =>
      api.updateAdminUserPlan(userId, planKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });
}

export function useAssignAdminRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) =>
      api.assignAdminRole(userId, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-rbac"] });
      qc.invalidateQueries({ queryKey: ["admin-bootstrap"] });
    },
  });
}

export function useUpdateAdminPlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, body }: { planId: string; body: { status?: string; name?: string; description?: string } }) =>
      api.updateAdminPlan(planId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-bootstrap"] });
    },
  });
}

export function useUpdateAiProvider() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, body }: { providerId: string; body: { status?: string; weight?: number } }) =>
      api.updateAiProvider(providerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-providers"] });
      qc.invalidateQueries({ queryKey: ["admin-bootstrap"] });
    },
  });
}

export function useUpdateAiRoutingRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, body }: { ruleId: string; body: { isActive?: boolean; priority?: number } }) =>
      api.updateAiRoutingRule(ruleId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ai-routing-rules"] });
    },
  });
}

export function useUpdateServiceIntegration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, body }: { serviceId: string; body: { status?: string; note?: string } }) =>
      api.updateServiceIntegration(serviceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
    },
  });
}

export function useAdminAuditLogs() {
  const [loading] = useState(false);
  return { logs: MOCK_AUDIT_LOGS, loading };
}

export function useActivityFeed() {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  return { activities: MOCK_ACTIVITIES, loading, error };
}

export function useUserStats() {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  return {
    stats: {
      projectsCount: 3,
      totalGenerations: 47,
      generationsToday: 8,
      dailyLimit: 20,
      storageUsed: 12.5,
      storageLimit: 100,
    },
    loading,
    error,
  };
}
