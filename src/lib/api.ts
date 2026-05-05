const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

  const response = await fetch(`${API_BASE}${path}`, config);

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
    request<{ ok: boolean; token: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: { email, code },
    }),

  getMe: () => request<{ user: { email: string } }>("/api/auth/me"),

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

  // Health
  health: () => request<{ status: string; service: string; version: string }>("/api/health"),
};

export default api;
