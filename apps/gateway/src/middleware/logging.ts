import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../utils/logger";

export async function registerLoggingMiddleware(app: FastifyInstance) {
  const logger = getLogger();

  // Add request ID to each request
  app.addHook("onRequest", async (request: FastifyRequest) => {
    (request as any).startTime = Date.now();
  });

  // Log all requests with timing and status
  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - (request as any).startTime;
    const method = request.method;
    const url = request.url;
    const statusCode = reply.statusCode;
    const remoteAddress = request.ip;

    // Skip logging for health checks (they're noisy)
    if (url.includes("/api/health")) {
      return;
    }

    const logLevel =
      statusCode >= 500
        ? "error"
        : statusCode >= 400
          ? "warn"
          : statusCode >= 300
            ? "info"
            : "debug";

    const logData = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      remoteAddress,
      userAgent: request.headers["user-agent"],
    };

    if (logLevel === "error") {
      logger.error(`${method} ${url}`, logData);
    } else if (logLevel === "warn") {
      logger.warn(`${method} ${url}`, logData);
    } else if (logLevel === "debug") {
      logger.debug(`${method} ${url}`, logData);
    } else {
      logger.info(`${method} ${url}`, logData);
    }
  });

  logger.info("Request logging middleware registered");
}

/**
 * Log middleware for tracking specific operations
 */
export function createAuditLog(operation: string, details?: Record<string, any>) {
  const logger = getLogger();
  return {
    start: (context?: Record<string, any>) => {
      logger.debug(`[AUDIT] Starting: ${operation}`, context);
    },
    success: (context?: Record<string, any>) => {
      logger.info(`[AUDIT] Completed: ${operation}`, {
        ...details,
        ...context,
      });
    },
    failure: (error: Error, context?: Record<string, any>) => {
      logger.error(`[AUDIT] Failed: ${operation}`, {
        error: error.message,
        stack: error.stack,
        ...details,
        ...context,
      });
    },
  };
}

/**
 * Log sensitive data access (for compliance)
 */
export function logSensitiveDataAccess(
  userId: string,
  dataType: string,
  action: "read" | "write" | "delete",
  metadata?: Record<string, any>,
) {
  const logger = getLogger();
  logger.warn(`[SENSITIVE_DATA] ${action.toUpperCase()} ${dataType}`, {
    userId,
    action,
    dataType,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}
