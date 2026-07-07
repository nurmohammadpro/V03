import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    // Clear the cached env
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should validate required environment variables", () => {
    process.env.NODE_ENV = "production";
    process.env.PORT = "3001";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost/db";
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_SECRET = "y".repeat(32);

    // Dynamic import to get fresh module
    expect(() => {
      const { getEnv } = require("../env");
      getEnv();
    }).not.toThrow();
  });

  it("should fail with missing required variables", () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;

    expect(() => {
      const { getEnv } = require("../env");
      getEnv();
    }).toThrow("Environment validation failed");
  });

  it("should validate JWT_SECRET minimum length", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost/db";
    process.env.JWT_SECRET = "short"; // Too short

    expect(() => {
      const { getEnv } = require("../env");
      getEnv();
    }).toThrow("at least 32 characters");
  });

  it("should parse numeric values correctly", () => {
    process.env.PORT = "8080";
    process.env.DATABASE_CONNECTION_POOL_SIZE = "30";

    const { getEnv } = require("../env");
    const env = getEnv();

    expect(typeof env.PORT).toBe("number");
    expect(env.PORT).toBe(8080);
    expect(env.DATABASE_CONNECTION_POOL_SIZE).toBe(30);
  });

  it("should handle optional environment variables", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost/db";
    process.env.JWT_SECRET = "x".repeat(32);

    const { getEnv } = require("../env");
    const env = getEnv();

    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.CORS_ORIGIN).toBeUndefined();
  });

  it("should cache validated environment", () => {
    const { getEnv } = require("../env");

    const env1 = getEnv();
    const env2 = getEnv();

    expect(env1).toBe(env2); // Same reference (cached)
  });
});
