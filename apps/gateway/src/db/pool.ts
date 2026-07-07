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

  const connection = postgres({
    host: env.DATABASE_URL,
    max: env.DATABASE_CONNECTION_POOL_SIZE,
    idle_timeout: env.DATABASE_IDLE_TIMEOUT,
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
  try {
    const connection = getConnectionPool();
    const result = await connection`SELECT NOW()`;
    if (result && result.length > 0) {
      logger.info("Database connection test successful");
      return true;
    }
  } catch (error) {
    logger.error("Database connection test failed", {
      error: error instanceof Error ? error.message : String(error),
    });
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
