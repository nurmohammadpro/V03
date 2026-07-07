import { FastifyReply } from "fastify";
import winston from "winston";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "INTERNAL_ERROR",
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, "Too many requests", "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(
  error: unknown,
  reply: FastifyReply,
  logger?: winston.Logger,
) {
  const requestId = (reply.request as any).id;

  if (isAppError(error)) {
    logger?.warn("[AppError]", {
      requestId,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    });

    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      details: error.details,
      requestId,
    });
  }

  if (error instanceof Error) {
    logger?.error("[UnhandledError]", {
      requestId,
      message: error.message,
      stack: error.stack,
    });

    return reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId,
    });
  }

  logger?.error("[UnknownError]", { requestId, error });

  return reply.status(500).send({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    requestId,
  });
}

export function createErrorHandler(logger: winston.Logger) {
  return (error: unknown, reply: FastifyReply) => {
    handleError(error, reply, logger);
  };
}
