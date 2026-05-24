export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "pending";
export type PlanStatus = "draft" | "active" | "archived";
export type BillingCycle = "weekly" | "monthly" | "yearly" | "one_time";
export type FeatureType = "boolean" | "limit" | "text";
export type ProviderStatus = "active" | "degraded" | "disabled";
export type ServiceStatus = "active" | "degraded" | "disabled";

export interface AuthActor {
  userId: string;
  email: string;
  fullName: string | null;
  plan: string;
  status: string;
  isAdmin: boolean;
  roleKeys: string[];
  permissionKeys: string[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  plan?: string;
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
  type:
    | "user_register"
    | "project_create"
    | "generation_complete"
    | "deploy"
    | "export"
    | "error"
    | "admin_action";
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
  suspendedUsers: number;
  activeSubscriptions: number;
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

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string;
  permissionIds: string[];
}

export interface AdminPermission {
  id: string;
  key: string;
  name: string;
  description: string;
  scope: "users" | "subscriptions" | "ai" | "services" | "rbac" | "analytics";
}

export interface AdminAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  assignedAt: string;
}

export interface UserProfile extends User {
  fullName: string;
  notes: string[];
  usage: {
    generationsThisMonth: number;
    storageUsedGb: number;
    seats: number;
  };
  subscription?: UserSubscriptionSummary;
  adminAssignments: AdminAssignment[];
}

export interface PlanFeature {
  id: string;
  key: string;
  label: string;
  featureType: FeatureType;
  value: string;
}

export interface PlanPrice {
  id: string;
  market: "global" | "bd";
  currency: string;
  billingCycle: BillingCycle;
  amount: number;
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  description: string;
  status: PlanStatus;
  billingModel: "subscription" | "credit_pack" | "hybrid";
  seatsIncluded: number;
  features: PlanFeature[];
  prices: PlanPrice[];
}

export interface UserSubscriptionSummary {
  id: string;
  planKey: string;
  planName: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  billingCycle: BillingCycle;
  renewsAt: string;
  cancelAtPeriodEnd: boolean;
}

export interface AiModel {
  id: string;
  providerId: string;
  key: string;
  name: string;
  status: ProviderStatus;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  latencyTier: "fast" | "balanced" | "slow";
  qualityTier: "economy" | "balanced" | "premium";
}

export interface AiProvider {
  id: string;
  key: string;
  name: string;
  providerType: string;
  status: ProviderStatus;
  baseUrl: string;
  authMode: "api_key" | "oauth" | "custom";
  secretRef: string;
  weight: number;
  health: number;
  monthlySpend: number;
  successRate: number;
  hasApiKey?: boolean;
  models: AiModel[];
}

export interface AiRoutingRule {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  priority: number;
  matchSummary: string;
  primaryModel: string;
  fallbackModel: string;
}

export interface ServiceIntegration {
  id: string;
  key: string;
  name: string;
  serviceType: "storage" | "runtime" | "billing" | "notifications" | "security";
  status: ServiceStatus;
  secretRef: string;
  note: string;
}

export interface AdminAuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetName: string;
  timestamp: string;
}
