import type { AdminPermission, AdminRole, AiRoutingRule, AuthActor, ServiceIntegration } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function buildApiUrl(path: string) {
  const normalizedBase = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBase.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${normalizedBase}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

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

  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (token) {
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), config);
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
  getMe: () => request<{ user: AuthActor }>("/api/auth/me"),

  // Dashboard
  getDashboardStats: () =>
    request<{ stats: { projectsCount: number; totalGenerations: number; generationsToday: number; dailyLimit: number; storageUsed: number; storageLimit: number } }>(
      "/api/dashboard/stats",
    ),
  getActivityFeed: (limit = 30) =>
    request<{ activities: Array<any> }>(`/api/activity?limit=${limit}`),

  // Projects
  getProjects: () =>
    request<{ projects: Array<{ id: string; userId: string; name: string; framework: string | null; frameworkKind: string; createdAt: string }> }>(
      "/api/projects"
    ),

  createProject: (name: string, frameworkKind?: string) =>
    request<{ project: { id: string; userId: string; name: string; framework: string | null; frameworkKind: string; createdAt: string } }>(
      "/api/projects",
      { method: "POST", body: { name, frameworkKind } }
    ),

  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),

  archiveProject: (id: string, archived = true) =>
    request<{ project: { id: string; archivedAt: string | null } }>(`/api/projects/${id}/archive`, {
      method: "PATCH",
      body: { archived },
    }),

  duplicateProject: (id: string, name?: string) =>
    request<{ project: { id: string; name: string } }>(`/api/projects/${id}/duplicate`, {
      method: "POST",
      body: name ? { name } : {},
    }),

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

  getAdminMetrics: () =>
    request<{
      stats: import("@/lib/types").AdminStats;
    }>("/api/admin/metrics"),

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

  getAdminUserDetail: (id: string) =>
    request<{
      user: {
        id: string;
        email: string;
        fullName: string | null;
        status: string;
        plan: string;
        createdAt: string;
        updatedAt: string;
        avatarUrl: string | null;
        metadata: Record<string, unknown>;
      };
      adminAssignments: Array<{
        assignmentId: string;
        roleId: string;
        roleKey: string;
        roleName: string;
        assignedAt: string;
      }>;
      subscription: any | null;
      projectCount: number;
    }>(`/api/admin/users/${id}`),

  getAdminAuditLogs: (limit = 50) =>
    request<{
      logs: Array<{
        id: string;
        actorName: string;
        actorRole: string;
        action: string;
        targetType: string;
        targetName: string;
        timestamp: string;
      }>;
    }>(`/api/admin/audit-logs?limit=${limit}`),

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
        hasApiKey?: boolean;
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

  setAiProviderApiKey: (id: string, apiKey: string) =>
    request<{ ok: boolean }>(`/api/admin/ai/providers/${id}/api-key`, {
      method: "PUT",
      body: { apiKey },
    }),

  clearAiProviderApiKey: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/ai/providers/${id}/api-key`, {
      method: "DELETE",
    }),

  testAiProvider: (id: string, modelKey?: string) =>
    request<{ ok: boolean; status: number; error?: string }>(`/api/admin/ai/providers/${id}/test`, {
      method: "POST",
      body: modelKey ? { modelKey } : {},
    }),

  createAiProvider: (body: { key: string; name: string; providerType: string; baseUrl?: string; weight?: number; status?: string; config?: Record<string, unknown> }) =>
    request<{ provider: any }>(`/api/admin/ai/providers`, {
      method: "POST",
      body,
    }),

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

  // Workspace files
  getProjectTree: (projectId: string) =>
    request<{
      files: Array<{
        id: string;
        path: string;
        fileType: "file" | "dir";
        parentPath: string | null;
        updatedAt: string;
      }>;
    }>(`/api/projects/${projectId}/tree`),

  getProjectFile: (projectId: string, filePath: string) =>
    request<{
      path: string;
      sha256?: string;
      content: string;
      updatedAt?: string;
    }>(`/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`),

  putProjectFile: (projectId: string, filePath: string, content: string, message?: string) =>
    request<{ ok: boolean; path: string; sha256: string }>(
      `/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`,
      { method: "PUT", body: { content, message } },
    ),

  // Previews
  startPreview: (projectId: string, mode: "build" | "dev" = "build") =>
    request<{ previewId: string; status: string; url: string }>(`/api/projects/${projectId}/previews`, {
      method: "POST",
      body: { mode },
    }),

  stopPreview: (previewId: string) =>
    request<{ ok: boolean }>(`/api/previews/${previewId}`, { method: "DELETE" }),

  getPreviewLogs: (previewId: string, tail = 200) =>
    request<{ logs: string }>(`/api/previews/${previewId}/logs?tail=${tail}`),

  getPreview: (previewId: string) =>
    request<{ preview: { id: string; status: string; url: string | null; runnerRef: Record<string, unknown> } }>(
      `/api/previews/${previewId}`,
    ),

  rotatePreviewToken: (previewId: string) =>
    request<{ ok: boolean; url: string }>(`/api/previews/${previewId}/rotate-token`, { method: "POST" }),

  revokePreviewToken: (previewId: string) =>
    request<{ ok: boolean }>(`/api/previews/${previewId}/revoke`, { method: "POST" }),

  updatePreviewSharing: (previewId: string, input: { isPublic?: boolean; tokenTtlSeconds?: number | null }) =>
    request<{ ok: boolean }>(`/api/previews/${previewId}/sharing`, { method: "PATCH", body: input }),

  // Generations
  getProjectGenerations: (projectId: string) =>
    request<{
      runs: Array<{
        id: string;
        intent: string;
        targetPath: string | null;
        status: string;
        startedAt: string;
        finishedAt: string | null;
        summary: Record<string, unknown>;
      }>;
    }>(`/api/projects/${projectId}/generations`),

  // Env vars (write-only values)
  getProjectEnv: (projectId: string) =>
    request<{
      vars: Array<{ id: string; key: string; hasValue: boolean; updatedAt: string }>;
    }>(`/api/projects/${projectId}/env`),

  putProjectEnv: (projectId: string, vars: Array<{ key: string; value: string }>) =>
    request<{ ok: boolean; updated: number }>(`/api/projects/${projectId}/env`, { method: "PUT", body: { vars } }),

  deleteProjectEnv: (projectId: string, key: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/env?key=${encodeURIComponent(key)}`, { method: "DELETE" }),

  // Project audit
  getProjectAudit: (projectId: string, limit = 50) =>
    request<{
      events: Array<{
        id: string;
        action: string;
        metadata: Record<string, unknown>;
        actorUserId: string;
        createdAt: string;
      }>;
    }>(`/api/projects/${projectId}/audit?limit=${limit}`),
};

export default api;
