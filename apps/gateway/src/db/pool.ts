import { Pool, PoolConfig } from "postgres";
import { getEnv } from "../utils/env";
import { getLogger } from "../utils/logger";

let pool: Pool | null = null;

export function createConnectionPool(): Pool {
  const env = getEnv();
  const logger = getLogger();

  const config: PoolConfig = {
    max: env.DATABASE_CONNECTION_POOL_SIZE,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT,
    connectionTimeoutMillis: 30000,
  };

  logger.info("Creating database connection pool", {
    maxConnections: config.max,
    idleTimeout: config.idleTimeoutMillis,
  });

  const newPool = new Pool(
    {
      url: env.DATABASE_URL,
    },
    config,
  );

  newPool.on("error", (err) => {
    logger.error("Unexpected error on idle client", { error: err.message });
  });

  return newPool;
}

export function getConnectionPool(): Pool {
  if (!pool) {
    pool = createConnectionPool();
  }
  return pool;
}

export async function testDatabaseConnection(): Promise<boolean> {
  const logger = getLogger();
  try {
    const connection = getConnectionPool();
    const result = await connection.query("SELECT NOW()");
    if (result.length > 0) {
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
  if (pool) {
    logger.info("Closing database connection pool");
    await pool.end();
    pool = null;
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
