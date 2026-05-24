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
  UserStats,
} from "@/lib/types";
import api from "@/lib/api";

function buildFlatTrend(days = 30, value = 0) {
  const out: Array<{ date: string; value: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), value });
  }
  return out;
}

export function useActivityFeed() {
  const query = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await api.getActivityFeed(50);
      return (res.activities ?? []) as Activity[];
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  return { activities: query.data ?? [], loading: query.isLoading };
}

export function useUserStats() {
  const query = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await api.getDashboardStats();
      return res.stats as UserStats;
    },
    staleTime: 10_000,
  });

  return { stats: (query.data ?? { projectsCount: 0, totalGenerations: 0, generationsToday: 0, dailyLimit: 0, storageUsed: 0, storageLimit: 0 }) as UserStats, loading: query.isLoading };
}

export function useAdminStats() {
  const bootstrapQuery = useQuery({
    queryKey: ["adminBootstrap"],
    queryFn: api.getAdminBootstrap,
    staleTime: 10_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: async () => (await api.getAdminMetrics()).stats,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const bootstrap = bootstrapQuery.data;
  const stats: AdminStats = metricsQuery.data ?? {
    totalUsers: bootstrap?.summary.totalUsers ?? 0,
    totalProjects: bootstrap?.summary.totalProjects ?? 0,
    generationsToday: 0,
    revenue: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    activeSubscriptions: bootstrap?.summary.activeSubscriptions ?? 0,
    errorRate: 0,
    apiUptime: 99.9,
    queueDepth: 0,
    userGrowth: 0,
    projectGrowth: 0,
    generationGrowth: 0,
    revenueGrowth: 0,
    userTrend: buildFlatTrend(30, 0),
    revenueTrend: buildFlatTrend(30, 0),
  };

  return {
    stats,
    loading: bootstrapQuery.isLoading || metricsQuery.isLoading,
    bootstrap,
    totalAdmins: bootstrap?.summary.totalAdmins ?? 0,
    refresh: async () => {
      await Promise.all([bootstrapQuery.refetch(), metricsQuery.refetch()]);
    },
  };
}

export function useAdminUsers() {
  const query = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await api.getAdminUsers();
      return res.users as unknown as User[];
    },
    staleTime: 10_000,
  });

  return { users: query.data ?? [], loading: query.isLoading };
}

export function useAdminUserProfile(userId: string | null) {
  const query = useQuery({
    queryKey: ["adminUserDetail", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("userId required");
      const res = await api.getAdminUserDetail(userId);

      const subscription = res.subscription
        ? {
            id: String(res.subscription.id ?? ""),
            planKey: String(res.subscription.planKey ?? res.user.plan ?? "free"),
            planName: String(res.subscription.planName ?? res.user.plan ?? "Free"),
            status: String(res.subscription.status ?? "active") as any,
            billingCycle: String(res.subscription.billingCycle ?? "monthly") as any,
            renewsAt: String(res.subscription.currentPeriodEnd ?? res.subscription.renewsAt ?? new Date().toISOString()),
            cancelAtPeriodEnd: Boolean(res.subscription.cancelAtPeriodEnd ?? false),
          }
        : undefined;

      const profile: UserProfile = {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName ?? res.user.email.split("@")[0],
        role: res.adminAssignments?.length ? "admin" : "user",
        status: res.user.status as any,
        plan: res.user.plan,
        createdAt: res.user.createdAt,
        lastActive: res.user.updatedAt,
        projectsCount: res.projectCount ?? 0,
        notes: [],
        usage: { generationsThisMonth: 0, storageUsedGb: 0, seats: 1 },
        subscription,
        adminAssignments:
          res.adminAssignments?.map((a) => ({
            id: a.assignmentId,
            userId: res.user.id,
            roleId: a.roleId,
            roleKey: a.roleKey,
            roleName: a.roleName,
            assignedAt: a.assignedAt,
          })) ?? [],
      };
      return profile;
    },
    staleTime: 10_000,
  });

  return { profile: query.data ?? null, loading: query.isLoading };
}

export function useSubscriptionPlans() {
  const query = useQuery({
    queryKey: ["adminPlans"],
    queryFn: async () => {
      const res = await api.getAdminPlans();
      const plans = (res.plans ?? []) as Array<any>;
      return plans.map((p) => ({
        id: String(p.id),
        key: String(p.key),
        name: String(p.name),
        description: String(p.description ?? ""),
        status: String(p.status) as any,
        billingModel: String(p.billingModel) as any,
        seatsIncluded: Number((p.metadata && p.metadata.seatsIncluded) || 1),
        features: Array.isArray(p.features)
          ? p.features.map((f: any) => ({
              id: String(f.id),
              key: String(f.key),
              label: String(f.label),
              featureType: (String(f.featureType ?? f.feature_type ?? "boolean") as any),
              value: String(f.value ?? ""),
            }))
          : [],
        prices: Array.isArray(p.prices)
          ? p.prices.map((pr: any) => ({
              id: String(pr.id),
              market: String(pr.market) as any,
              currency: String(pr.currency),
              billingCycle: String(pr.billingCycle) as any,
              amount: Number(pr.amountMinor ?? pr.amount_minor ?? 0) / 100,
              isActive: Boolean(pr.isActive ?? pr.is_active ?? true),
            }))
          : [],
      })) as SubscriptionPlan[];
    },
    staleTime: 10_000,
  });

  return { plans: query.data ?? [], loading: query.isLoading };
}

export function useAiProviders() {
  const query = useQuery({
    queryKey: ["aiProviders"],
    queryFn: async () => {
      const res = await api.getAiProviders();
      const providers = (res.providers ?? []) as Array<any>;
      return providers.map((p) => {
        const cfg = (p.config && typeof p.config === "object" ? p.config : {}) as Record<string, any>;
        return {
          id: String(p.id),
          key: String(p.key),
          name: String(p.name),
          providerType: String(p.providerType),
          status: String(p.status) as any,
          baseUrl: String(p.baseUrl ?? ""),
          authMode: String(p.authMode ?? "api_key") as any,
          secretRef: String(p.secretRef ?? ""),
          weight: Number(p.weight ?? 0),
          health: Number(cfg.health ?? 0),
          monthlySpend: Number(cfg.monthlySpend ?? 0),
          successRate: Number(cfg.successRate ?? 0),
          hasApiKey: Boolean(p.hasApiKey ?? false),
          models: Array.isArray(p.models) ? (p.models as any) : [],
        } as AiProvider;
      });
    },
    staleTime: 10_000,
  });

  return { providers: query.data ?? [], loading: query.isLoading };
}

export function useSetAiProviderApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (args: { providerId: string; apiKey: string }) => api.setAiProviderApiKey(args.providerId, args.apiKey),
    onSuccess: () => client.invalidateQueries({ queryKey: ["aiProviders"] }),
  });
}

export function useClearAiProviderApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (args: { providerId: string }) => api.clearAiProviderApiKey(args.providerId),
    onSuccess: () => client.invalidateQueries({ queryKey: ["aiProviders"] }),
  });
}

export function useTestAiProvider() {
  return useMutation({
    mutationFn: async (args: { providerId: string; modelKey?: string }) => api.testAiProvider(args.providerId, args.modelKey),
  });
}

export function useCreateAiProvider() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { key: string; name: string; providerType: string; baseUrl?: string; weight?: number; status?: string; config?: Record<string, unknown> }) =>
      api.createAiProvider(body),
    onSuccess: () => client.invalidateQueries({ queryKey: ["aiProviders"] }),
  });
}

export function useAiRoutingRules() {
  const query = useQuery({
    queryKey: ["aiRoutingRules"],
    queryFn: async () => {
      const res = await api.getAiRoutingRules();
      return res.rules as unknown as AiRoutingRule[];
    },
    staleTime: 10_000,
  });

  return { rules: query.data ?? [], loading: query.isLoading };
}

export function useServiceIntegrations() {
  const query = useQuery({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => {
      const res = await api.getServiceIntegrations();
      return (res.services ?? []) as unknown as ServiceIntegration[];
    },
    staleTime: 10_000,
  });

  return { services: query.data ?? [], loading: query.isLoading };
}

export function useAdminAuditLogs() {
  const query = useQuery({
    queryKey: ["adminAuditLogs"],
    queryFn: async () => {
      const res = await api.getAdminAuditLogs(100);
      return (res.logs ?? []) as AdminAuditLog[];
    },
    staleTime: 10_000,
  });

  return { logs: query.data ?? [], loading: query.isLoading };
}

export function useAdminRbac() {
  const query = useQuery({
    queryKey: ["adminRbac"],
    queryFn: api.getAdminRbac,
    staleTime: 10_000,
  });

  return { roles: (query.data?.roles ?? []) as AdminRole[], permissions: (query.data?.permissions ?? []) as AdminPermission[], loading: query.isLoading };
}

export function useUpdateAdminUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => api.updateAdminUserStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
}

export function useUpdateAdminUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, planKey }: { userId: string; planKey: string }) => api.updateAdminUserPlan(userId, planKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminUsers"] }),
  });
}

export function useAssignAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => api.assignAdminRole(userId, roleId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      qc.invalidateQueries({ queryKey: ["adminUserDetail", vars.userId] });
    },
  });
}

export function useUpdateAdminPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, body }: { planId: string; body: { status?: string; name?: string; description?: string } }) =>
      api.updateAdminPlan(planId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPlans"] }),
  });
}

export function useReplaceAdminPlanFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      features,
    }: {
      planId: string;
      features: Array<{ key: string; label: string; featureType?: string; value?: string | null; sortOrder?: number }>;
    }) => api.replaceAdminPlanFeatures(planId, features),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPlans"] }),
  });
}

export function useReplaceAdminPlanPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
      prices,
    }: {
      planId: string;
      prices: Array<{ market: string; currency: string; billingCycle: string; amountMinor: number; isActive?: boolean }>;
    }) => api.replaceAdminPlanPrices(planId, prices),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminPlans"] }),
  });
}

export function useUpdateAiProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, body }: { providerId: string; body: { status?: string; weight?: number } }) =>
      api.updateAiProvider(providerId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiProviders"] }),
  });
}

export function useUpdateAiRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, body }: { ruleId: string; body: { isActive?: boolean; priority?: number } }) =>
      api.updateAiRoutingRule(ruleId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aiRoutingRules"] }),
  });
}

export function useUpdateServiceIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, body }: { serviceId: string; body: { status?: string; note?: string } }) =>
      api.updateServiceIntegration(serviceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["serviceIntegrations"] }),
  });
}
