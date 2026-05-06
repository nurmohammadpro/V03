export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
  status: "active" | "suspended" | "pending";
  avatar?: string;
  createdAt: string;
  lastActive?: string;
  projectsCount?: number;
}

export interface Project {
  id: string;
  name: string;
  framework: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  status: "active" | "archived";
}

export interface Activity {
  id: string;
  type: "user_register" | "project_create" | "generation_complete" | "deploy" | "export" | "error";
  message: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  generationsToday: number;
  revenue: number;
  activeUsers: number;
  errorRate: number;
  apiUptime: number;
  queueDepth: number;
  userGrowth: number;
  projectGrowth: number;
  generationGrowth: number;
  revenueGrowth: number;
  userTrend: { date: string; value: number }[];
  revenueTrend: { date: string; value: number }[];
}

export interface UserStats {
  projectsCount: number;
  totalGenerations: number;
  generationsToday: number;
  dailyLimit: number;
  storageUsed: number;
  storageLimit: number;
}
