import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { testDatabaseConnection, getPoolStats } from "../db/pool";
import { getEnv } from "../utils/env";
import { getLogger } from "../utils/logger";

export async function registerHealthRoutes(app: FastifyInstance) {
  const logger = getLogger();
  const env = getEnv();

  /**
   * Basic health check - returns 200 if server is running
   */
  app.get("/api/health", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: "ok",
      service: "v03-gateway",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * Detailed health check - includes database and service dependencies
   */
  app.get(
    "/api/health/detailed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const checks = {
        database: false,
        memory: {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
        },
        poolStats: {},
      };

      // Database check
      try {
        checks.database = await testDatabaseConnection();
      } catch (err) {
        logger.warn("Database health check failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Memory check
      const memUsage = process.memoryUsage();
      checks.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      };

      // Connection pool stats
      try {
        checks.poolStats = await getPoolStats();
      } catch (err) {
        logger.warn("Pool stats check failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const healthy = checks.database;
      const statusCode = healthy ? 200 : 503;

      return reply.status(statusCode).send({
        status: healthy ? "healthy" : "degraded",
        service: "v03-gateway",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        checks,
      });
    },
  );

  /**
   * Readiness check - returns 200 only if all critical services are ready
   */
  app.get(
    "/api/health/ready",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ready = await testDatabaseConnection();

      if (!ready) {
        return reply.status(503).send({
          status: "not_ready",
          message: "Service is not ready to accept traffic",
        });
      }

      return reply.send({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    },
  );

  /**
   * Liveness check - returns 200 if process is alive
   */
  app.get(
    "/api/health/alive",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        status: "alive",
        timestamp: new Date().toISOString(),
      });
    },
  );

  logger.info("Health check routes registered");
}
