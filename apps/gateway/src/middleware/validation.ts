import { FastifyRequest, FastifyReply } from "fastify";
import { z, ZodError } from "zod";

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: FastifyRequest,
  schema: z.ZodSchema<T>,
): Promise<{ valid: false; error: ZodError } | { valid: true; data: T }> {
  try {
    const data = schema.parse(request.body);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { valid: false, error };
    }
    throw error;
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export async function validateQueryParams<T>(
  request: FastifyRequest,
  schema: z.ZodSchema<T>,
): Promise<{ valid: false; error: ZodError } | { valid: true; data: T }> {
  try {
    const data = schema.parse(request.query);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { valid: false, error };
    }
    throw error;
  }
}

/**
 * Sends a validation error response
 */
export function sendValidationError(
  reply: FastifyReply,
  error: ZodError,
  statusCode: number = 400,
) {
  const formatted = error.errors.map((e) => ({
    path: e.path.join("."),
    message: e.message,
    code: e.code,
  }));

  return reply.status(statusCode).send({
    error: "Validation failed",
    details: formatted,
  });
}

/**
 * Middleware to ensure request has a valid Content-Type
 */
export async function validateContentType(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return reply.status(400).send({
        error: "Invalid Content-Type. Expected application/json",
      });
    }
  }
}

/**
 * Middleware to validate request size
 */
export async function validateRequestSize(
  request: FastifyRequest,
  reply: FastifyReply,
  maxSize: number = 10 * 1024 * 1024, // 10MB
) {
  const contentLength = request.headers["content-length"];
  if (contentLength && parseInt(contentLength) > maxSize) {
    return reply.status(413).send({
      error: `Request body too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    });
  }
}
