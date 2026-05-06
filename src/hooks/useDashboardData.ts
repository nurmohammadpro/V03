import { useState } from "react";
import type { AdminStats, User, Activity } from "@/lib/types";

// ── Admin Stats ─────────────────────────────────────
const TREND_CACHE: { [key: string]: { date: string; value: number }[] } = {};

function generateTrend(key: string, days: number, base: number, variance: number) {
  if (TREND_CACHE[key]) return TREND_CACHE[key];
  const result: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const value = Math.max(0, base + Math.round((Math.random() - 0.5) * variance));
    result.push({ date: d.toISOString().slice(0, 10), value });
  }
  TREND_CACHE[key] = result;
  return result;
}

export function useAdminStats() {
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Simulated API delay
  if (!loading && !TREND_CACHE["revenue"]) {
    // pre-generate on first call
  }

  const stats: AdminStats = {
    totalUsers: 1234,
    totalProjects: 456,
    generationsToday: 89,
    revenue: 12430,
    activeUsers: 892,
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

  return { stats, loading, error };
}

// ── Admin Users ─────────────────────────────────────
const MOCK_USERS: User[] = [
  { id: "1", email: "alice@example.com", name: "Alice", role: "admin", status: "active", createdAt: "2026-01-15", lastActive: "2026-05-06", projectsCount: 12 },
  { id: "2", email: "bob@example.com", name: "Bob", role: "user", status: "active", createdAt: "2026-02-20", lastActive: "2026-05-05", projectsCount: 5 },
  { id: "3", email: "charlie@example.com", name: "Charlie", role: "user", status: "suspended", createdAt: "2026-03-10", lastActive: "2026-04-28", projectsCount: 2 },
  { id: "4", email: "diana@example.com", name: "Diana", role: "user", status: "active", createdAt: "2026-04-01", lastActive: "2026-05-06", projectsCount: 8 },
  { id: "5", email: "eve@example.com", name: "Eve", role: "user", status: "pending", createdAt: "2026-05-06", lastActive: undefined, projectsCount: 0 },
  { id: "6", email: "frank@example.com", name: "Frank", role: "user", status: "active", createdAt: "2026-03-22", lastActive: "2026-05-04", projectsCount: 3 },
  { id: "7", email: "grace@example.com", name: "Grace", role: "admin", status: "active", createdAt: "2026-01-05", lastActive: "2026-05-06", projectsCount: 15 },
];

export function useAdminUsers() {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  return { users: MOCK_USERS, loading, error };
}

// ── Activity Feed ────────────────────────────────────
const MOCK_ACTIVITIES: Activity[] = [
  { id: "a1", type: "user_register", message: "New user registered", userId: "5", userEmail: "eve@example.com", timestamp: new Date(Date.now() - 120_000).toISOString() },
  { id: "a2", type: "project_create", message: 'Project created: "E-commerce App"', timestamp: new Date(Date.now() - 900_000).toISOString() },
  { id: "a3", type: "generation_complete", message: "Generation completed (React + Tailwind)", timestamp: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "a4", type: "deploy", message: 'Deployed "Blog Engine" to production', timestamp: new Date(Date.now() - 7_200_000).toISOString() },
  { id: "a5", type: "error", message: "Build failed: Type error in App.tsx", timestamp: new Date(Date.now() - 14_400_000).toISOString() },
  { id: "a6", type: "export", message: 'Exported "Admin Panel" as ZIP', timestamp: new Date(Date.now() - 86_400_000).toISOString() },
];

export function useActivityFeed() {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  return { activities: MOCK_ACTIVITIES, loading, error };
}

// ── User Stats ──────────────────────────────────────
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
