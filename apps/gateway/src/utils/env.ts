import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3001"),
  HOST: z.string().default("0.0.0.0"),

  // Security
  CORS_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters").optional(),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DATABASE_CONNECTION_POOL_SIZE: z.string().transform(Number).default("20"),
  DATABASE_IDLE_TIMEOUT: z.string().transform(Number).default("30000"),

  // Supabase (optional, for project preview)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),

  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),

  // Admin bootstrap (optional)
  BOOTSTRAP_ADMIN_SYSTEM: z.enum(["true", "false"]).default("false"),
  BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().optional(),

  // Storage
  STORAGE_TYPE: z.enum(["local", "s3", "gcs"]).default("local"),
  STORAGE_PATH: z.string().default("/tmp/v03-storage"),

  // GitHub
  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Internal token for worker calls
  INTERNAL_WORKER_TOKEN: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

export function validateEnv() {
  getEnv();
  console.log("[v03] Environment validation passed");
}
