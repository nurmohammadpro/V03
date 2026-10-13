import postgres from "postgres";
import { getEnv } from "../utils/env";
import { getLogger } from "../utils/logger";

let sql: ReturnType<typeof postgres> | null = null;

export function createConnectionPool(): ReturnType<typeof postgres> {
  const env = getEnv();
  const logger = getLogger();

  logger.info("Creating database connection pool", {
    maxConnections: env.DATABASE_CONNECTION_POOL_SIZE,
    idleTimeout: env.DATABASE_IDLE_TIMEOUT,
  });

  // DATABASE_RUNTIME_URL (when present) takes precedence, matching db/index.ts
  const connectionString = process.env.DATABASE_RUNTIME_URL || env.DATABASE_URL;

  // Supabase's transaction pooler (port 6543) does not support prepared statements
  const shouldDisablePrepare =
    process.env.DATABASE_DISABLE_PREPARE === "true" ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes(":6543/");

  const connection = postgres(connectionString, {
    prepare: !shouldDisablePrepare,
    // Supabase session-mode pooler allows only 15 clients per user (free
    // tier); cap well below it so several containers can coexist.
    max: Math.min(env.DATABASE_CONNECTION_POOL_SIZE, 5),
    // postgres.js measures idle_timeout in seconds; the env value is
    // expressed in milliseconds.
    idle_timeout: Math.round(env.DATABASE_IDLE_TIMEOUT / 1000),
    connect_timeout: 30,
  });

  return connection;
}

export function getConnectionPool(): ReturnType<typeof postgres> {
  if (!sql) {
    sql = createConnectionPool();
  }
  return sql;
}

export async function testDatabaseConnection(): Promise<boolean> {
  const logger = getLogger();

  // A single boot-time query can hang forever if the pooler stalls the
  // connection (TCP connect succeeds but TLS/auth never completes), so race
  // each attempt against a timeout and retry before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const connection = getConnectionPool();
    try {
      const result = await Promise.race([
        connection`SELECT NOW()`,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`query timed out (attempt ${attempt})`)), 15000),
        ),
      ]);
      if (result && result.length > 0) {
        logger.info("Database connection test successful");
        return true;
      }
    } catch (error) {
      logger.error("Database connection test failed", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

export async function closeConnectionPool(): Promise<void> {
  const logger = getLogger();
  if (sql) {
    logger.info("Closing database connection pool");
    await sql.end();
    sql = null;
  }
}

export async function getPoolStats() {
  const connection = getConnectionPool();
  return {
    totalConnections: (connection as any).totalCount || 0,
    idleConnections: (connection as any).idleCount || 0,
    waitingRequests: (connection as any).waitingCount || 0,
  };
}
