import type { AdminPermission, AdminRole, AiRoutingRule, AuthActor, ServiceIntegration } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const token = localStorage.getItem("v03_token");
  if (token) {
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, config);
  } catch {
    throw new Error("Gateway is unavailable. Start the API server or verify the API base URL.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  sendOtp: (email: string) =>
    request<{ ok: boolean; message: string }>("/api/auth/send-otp", {
      method: "POST",
      body: { email },
    }),

  verifyOtp: (email: string, code: string) =>
    request<{
      ok: boolean;
      token: string;
      user: AuthActor;
    }>("/api/auth/verify-otp", {
      method: "POST",
      body: { email, code },
    }),

  getMe: () => request<{ user: AuthActor }>("/api/auth/me"),

  // Projects
  getProjects: () =>
    request<{ projects: Array<{ id: string; name: string; framework: string; createdAt: string }> }>(
      "/api/projects"
    ),

  createProject: (name: string, framework?: string) =>
    request<{ project: { id: string; name: string; framework: string; createdAt: string } }>(
      "/api/projects",
      { method: "POST", body: { name, framework } }
    ),

  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),

  // Admin
  getAdminBootstrap: () =>
    request<{
      actor: AuthActor;
      summary: {
        totalUsers: number;
        totalProjects: number;
        totalPlans: number;
        totalProviders: number;
        activeSubscriptions: number;
        totalAdmins: number;
      };
    }>("/api/admin/bootstrap"),

  getAdminUsers: () =>
    request<{
      users: Array<{
        id: string;
        email: string;
        fullName: string | null;
        role: "admin" | "user";
        status: string;
        plan: string;
        createdAt: string;
        updatedAt: string;
        avatarUrl: string | null;
        metadata: Record<string, unknown>;
        projectsCount: number;
      }>;
    }>("/api/admin/users"),

  getAdminPlans: () =>
    request<{
      plans: Array<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        status: string;
        billingModel: string;
        metadata: Record<string, unknown>;
        features: Array<{
          id: string;
          key: string;
          label: string;
          featureType: string;
          value: string | null;
        }>;
        prices: Array<{
          id: string;
          market: string;
          currency: string;
          billingCycle: string;
          amountMinor: number;
          isActive: boolean;
        }>;
      }>;
    }>("/api/admin/plans"),

  updateAdminPlan: (id: string, body: { status?: string; name?: string; description?: string }) =>
    request<{
      plan: {
        id: string;
        status: string;
        name: string;
        description: string | null;
      };
    }>(`/api/admin/plans/${id}`, {
      method: "PATCH",
      body,
    }),

  replaceAdminPlanFeatures: (
    id: string,
    features: Array<{
      key: string;
      label: string;
      featureType?: string;
      value?: string | null;
      sortOrder?: number;
    }>,
  ) =>
    request<{
      features: Array<{
        id: string;
        key: string;
        label: string;
        featureType: string;
        value: string | null;
      }>;
    }>(`/api/admin/plans/${id}/features`, {
      method: "PUT",
      body: { features },
    }),

  replaceAdminPlanPrices: (
    id: string,
    prices: Array<{
      market: string;
      currency: string;
      billingCycle: string;
      amountMinor: number;
      isActive?: boolean;
    }>,
  ) =>
    request<{
      prices: Array<{
        id: string;
        market: string;
        currency: string;
        billingCycle: string;
        amountMinor: number;
        isActive: boolean;
      }>;
    }>(`/api/admin/plans/${id}/prices`, {
      method: "PUT",
      body: { prices },
    }),

  getAiProviders: () =>
    request<{
      providers: Array<{
        id: string;
        key: string;
        name: string;
        providerType: string;
        status: string;
        baseUrl: string | null;
        authMode: string;
        secretRef: string | null;
        weight: number;
        config: Record<string, unknown>;
        models: Array<{
          id: string;
          providerId: string;
          key: string;
          name: string;
          status: string;
          inputCostPerMillion: number | null;
          outputCostPerMillion: number | null;
          latencyTier: string | null;
          qualityTier: string | null;
        }>;
      }>;
    }>("/api/admin/ai/providers"),

  getAiRoutingRules: () =>
    request<{ rules: AiRoutingRule[] }>("/api/admin/ai/routing-rules"),

  updateAiProvider: (id: string, body: { status?: string; weight?: number }) =>
    request<{
      provider: {
        id: string;
        status: string;
        weight: number;
      };
    }>(`/api/admin/ai/providers/${id}`, {
      method: "PATCH",
      body,
    }),

  updateAiRoutingRule: (id: string, body: { isActive?: boolean; priority?: number }) =>
    request<{
      rule: {
        id: string;
        isActive: boolean;
        priority: number;
      };
    }>(`/api/admin/ai/routing-rules/${id}`, {
      method: "PUT",
      body,
    }),

  getServiceIntegrations: () =>
    request<{ services: ServiceIntegration[] }>("/api/admin/services"),

  updateServiceIntegration: (id: string, body: { status?: string; note?: string }) =>
    request<{
      service: {
        id: string;
        status: string;
      };
    }>(`/api/admin/services/${id}`, {
      method: "PATCH",
      body,
    }),

  getAdminRbac: () =>
    request<{ roles: AdminRole[]; permissions: AdminPermission[] }>("/api/admin/rbac/roles"),

  updateAdminUserStatus: (id: string, status: string) =>
    request<{
      user: {
        id: string;
        status: string;
      };
    }>(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  updateAdminUserPlan: (id: string, planKey: string, billingCycle = "monthly") =>
    request<{
      user: {
        id: string;
        plan: string;
      };
      subscription: {
        id: string;
        status: string;
        billingCycle: string;
      };
    }>(`/api/admin/users/${id}/plan`, {
      method: "PATCH",
      body: { planKey, billingCycle, status: "active" },
    }),

  assignAdminRole: (id: string, roleId: string) =>
    request<{
      assignment: {
        id: string;
        userId: string;
        roleId: string;
      };
    }>(`/api/admin/users/${id}/roles`, {
      method: "POST",
      body: { roleId },
    }),

  // Health
  health: () => request<{ status: string; service: string; version: string }>("/api/health"),
};

export default api;
