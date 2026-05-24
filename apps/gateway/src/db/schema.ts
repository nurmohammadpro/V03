import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  status: text("status").default("active").notNull(),
  plan: text("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  framework: text("framework"),
  frameworkKind: text("framework_kind").default("nextjs").notNull(), // nextjs | react-vite | mern | django | laravel | nestjs
  runtimeKind: text("runtime_kind").default("node").notNull(), // node | python | php
  templateKey: text("template_key").default("nextjs-app-router").notNull(),
  templateVersion: text("template_version").default("1").notNull(),
  installCommand: text("install_command").default("npm ci").notNull(),
  buildCommand: text("build_command").default("npm run build").notNull(),
  startCommand: text("start_command").default("npm start").notNull(),
  devCommand: text("dev_command").default("npm run dev").notNull(),
  defaultPort: integer("default_port").default(3000).notNull(),
  healthcheckPath: text("healthcheck_path").default("/").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    path: text("path").notNull(),
    fileType: text("file_type").default("file").notNull(), // file | dir
    parentPath: text("parent_path"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    projectPathUnique: uniqueIndex("project_files_project_path_unique").on(table.projectId, table.path),
    projectIdx: index("project_files_project_id_idx").on(table.projectId),
  }),
);

export const fileBlobs = pgTable("file_blobs", {
  sha256: text("sha256").primaryKey(),
  sizeBytes: integer("size_bytes").notNull(),
  isBinary: boolean("is_binary").default(false).notNull(),
  textContent: text("text_content"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectFileVersions = pgTable(
  "project_file_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectFileId: uuid("project_file_id").notNull().references(() => projectFiles.id),
    blobSha256: text("blob_sha256").notNull().references(() => fileBlobs.sha256),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    source: text("source").default("manual").notNull(), // manual | generation | import
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fileIdx: index("project_file_versions_file_id_idx").on(table.projectFileId),
  }),
);

export const projectSnapshots = pgTable("project_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  files: jsonb("files").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectEnvVars = pgTable(
  "project_env_vars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    key: text("key").notNull(),
    valueEnc: text("value_enc").notNull(), // encrypted JSON payload (base64 parts)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectKeyUnique: uniqueIndex("project_env_vars_project_key_unique").on(table.projectId, table.key),
    projectIdx: index("project_env_vars_project_id_idx").on(table.projectId),
  }),
);

export const projectAuditLogs = pgTable(
  "project_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
    action: text("action").notNull(), // env.set | env.delete | ...
    metadata: jsonb("metadata").default({}).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_audit_logs_project_id_idx").on(table.projectId),
    actorIdx: index("project_audit_logs_actor_user_id_idx").on(table.actorUserId),
  }),
);

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => adminRoles.id),
  permissionId: uuid("permission_id").notNull().references(() => adminPermissions.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAdminAssignments = pgTable("user_admin_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => adminRoles.id),
  isActive: boolean("is_active").default(true).notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").default("draft").notNull(),
  billingModel: text("billing_model").default("subscription").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planFeatures = pgTable("plan_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  featureType: text("feature_type").default("boolean").notNull(),
  value: text("value"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planPrices = pgTable("plan_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id),
  market: text("market").notNull(),
  currency: text("currency").notNull(),
  billingCycle: text("billing_cycle").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  planId: uuid("plan_id").references(() => plans.id),
  provider: text("provider").default("stripe").notNull(),
  providerSubscriptionId: text("provider_subscription_id"),
  status: text("status").default("active").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiProviders = pgTable("ai_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(),
  status: text("status").default("active").notNull(),
  baseUrl: text("base_url"),
  authMode: text("auth_mode").default("api_key").notNull(),
  secretRef: text("secret_ref"),
  weight: integer("weight").default(100).notNull(),
  config: jsonb("config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiModels = pgTable("ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => aiProviders.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  status: text("status").default("active").notNull(),
  inputCostPerMillion: integer("input_cost_per_million"),
  outputCostPerMillion: integer("output_cost_per_million"),
  latencyTier: text("latency_tier"),
  qualityTier: text("quality_tier"),
  config: jsonb("config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiRoutingRules = pgTable("ai_routing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(100).notNull(),
  matchConfig: jsonb("match_config").default({}).notNull(),
  primaryModelId: uuid("primary_model_id").references(() => aiModels.id),
  fallbackModelId: uuid("fallback_model_id").references(() => aiModels.id),
  routingConfig: jsonb("routing_config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    intent: text("intent").default("component").notNull(), // component | feature | app | fix | refactor
    targetPath: text("target_path"),
    framework: text("framework"),
    applyMode: text("apply_mode").default("propose").notNull(), // propose | auto_apply
    status: text("status").default("running").notNull(), // running | complete | failed | canceled | applied
    prompt: text("prompt").notNull(),
    providerId: uuid("provider_id").references(() => aiProviders.id),
    modelKey: text("model_key"),
    summary: jsonb("summary").default({}).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("generation_runs_project_id_idx").on(table.projectId),
    userIdx: index("generation_runs_user_id_idx").on(table.userId),
  }),
);

export const generationEvents = pgTable(
  "generation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull().references(() => generationRuns.id),
    seq: integer("seq").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runSeqUnique: uniqueIndex("generation_events_run_seq_unique").on(table.runId, table.seq),
    runIdx: index("generation_events_run_id_idx").on(table.runId),
  }),
);

export const generationFileOps = pgTable(
  "generation_file_ops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull().references(() => generationRuns.id),
    seq: integer("seq").notNull(),
    op: jsonb("op").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    runSeqUnique: uniqueIndex("generation_file_ops_run_seq_unique").on(table.runId, table.seq),
    runIdx: index("generation_file_ops_run_id_idx").on(table.runId),
  }),
);

export const serviceIntegrations = pgTable("service_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  serviceType: text("service_type").notNull(),
  status: text("status").default("active").notNull(),
  secretRef: text("secret_ref"),
  config: jsonb("config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const buildRuns = pgTable(
  "build_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    mode: text("mode").default("build").notNull(), // build | dev
    status: text("status").default("queued").notNull(), // queued | running | complete | failed | canceled
    runnerRef: jsonb("runner_ref").default({}).notNull(),
    logs: jsonb("logs").default([]).notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("build_runs_project_id_idx").on(table.projectId),
  }),
);

export const previewInstances = pgTable(
  "preview_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    status: text("status").default("starting").notNull(), // starting | running | stopped | failed
    url: text("url"),
    ports: jsonb("ports").default({}).notNull(),
    runnerRef: jsonb("runner_ref").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    projectIdx: index("preview_instances_project_id_idx").on(table.projectId),
  }),
);

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  actorRoleKey: text("actor_role_key").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata").default({}).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
