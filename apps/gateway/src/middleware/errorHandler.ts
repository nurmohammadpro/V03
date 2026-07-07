import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getLogger } from "../utils/logger";
import { isAppError } from "../utils/errors";

export async function registerErrorHandler(app: FastifyInstance) {
  const logger = getLogger();

  // Global error handler
  app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).id || `req-${Date.now()}`;
    const method = request.method;
    const url = request.url;

    // Handle AppError instances
    if (isAppError(error)) {
      logger.warn(`[AppError] ${error.code} - ${error.message}`, {
        requestId,
        method,
        url,
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
      });

      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
        requestId,
      });
    }

    // Handle validation errors from Fastify
    if ((error as any).statusCode === 400 && (error as any).validation) {
      logger.debug("[ValidationError]", {
        requestId,
        method,
        url,
        validation: (error as any).validation,
      });

      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: error.message,
        validation: (error as any).validation,
        requestId,
      });
    }

    // Handle not found errors
    if ((error as any).statusCode === 404) {
      logger.debug("[NotFound]", { requestId, method, url });
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Route not found",
        requestId,
      });
    }

    // Handle method not allowed
    if ((error as any).statusCode === 405) {
      logger.debug("[MethodNotAllowed]", {
        requestId,
        method,
        url,
        allowedMethods: (error as any).allowedMethods,
      });
      return reply.status(405).send({
        error: "METHOD_NOT_ALLOWED",
        message: `${method} method not allowed on this route`,
        requestId,
      });
    }

    // Log unhandled errors with full stack trace
    logger.error(`[UnhandledError] ${error.message}`, {
      requestId,
      method,
      url,
      statusCode: (error as any).statusCode || 500,
      error: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Send generic error response to client (don't leak stack traces in production)
    return reply.status((error as any).statusCode || 500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId,
      // Only include error details in development
      ...(process.env.NODE_ENV === "development" && {
        details: {
          message: error.message,
          stack: error.stack,
        },
      }),
    });
  });

  logger.info("Global error handler registered");
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  handler: (req: FastifyRequest, reply: FastifyReply) => Promise<any>,
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(req, reply);
    } catch (error) {
      throw error; // Let the global error handler catch it
    }
  };
}
