import Fastify, { FastifyRequest } from "fastify";
import helmet from "helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { chatRoutes } from "./routes/chat";
import { adminRoutes } from "./routes/admin";
import { adminMetricsRoutes } from "./routes/adminMetrics";
import { dashboardRoutes } from "./routes/dashboard";
import { fileRoutes } from "./routes/files";
import { envRoutes } from "./routes/env";
import { auditRoutes } from "./routes/audit";
import { generationRoutes } from "./routes/generations";
import { buildRoutes } from "./routes/builds";
import { previewHostProxyRoutes } from "./routes/previewHostProxy";
import { previewProxyRoutes } from "./routes/previewProxy";
import { registerPreviewWebsocketProxy } from "./routes/previewProxyWs";
import { internalAiRoutes } from "./routes/internalAi";
import { couponRoutes } from "./routes/coupons";
import { githubRoutes } from "./routes/github";
import { ensureAdminSystemSeeded } from "./db/bootstrap";
import { runnerQueue } from "./runner/runnerQueue";
import { cleanupGatewayArtifacts } from "./runner/exportProjectToTarGz";
import { stopExpiredPreviews } from "./runner/previewTtl";
import { registerHealthRoutes } from "./routes/health";
import { validateEnv, getEnv } from "./utils/env";
import { initializeLogger, getLogger } from "./utils/logger";
import { testDatabaseConnection, closeConnectionPool } from "./db/pool";
import { registerErrorHandler } from "./middleware/errorHandler";
import { registerLoggingMiddleware } from "./middleware/logging";
import "dotenv/config";

async function start() {
  try {
    // ── Step 1: Validate environment ────────────────────
    console.log("[v03] Validating environment variables...");
    validateEnv();
    const env = getEnv();
    
    // ── Step 2: Initialize logger ──────────────────────
    console.log("[v03] Initializing logger...");
    const logger = initializeLogger();

    // ── Step 3: Test database connection ───────────────
    logger.info("Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected && env.NODE_ENV === "production") {
      throw new Error("Failed to connect to database on startup. This is required in production.");
    }

    // ── Step 4: Create Fastify instance ────────────────
    const app = Fastify({
      trustProxy: true,
      requestIdLogLabel: "reqId",
      disableRequestLogging: false,
      logger: logger,
    });

    // ── Step 5: Register security middleware ───────────
    logger.info("Registering security middleware...");
    
    // Helmet for security headers
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
          frameSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginEmbedderPolicy: false,
    });

    // Global Rate Limiting
    await app.register(rateLimit, {
      max: 300,
      timeWindow: "1 minute",
      keyGenerator: (request: FastifyRequest) => request.ip,
      errorResponseBuilder: (request: FastifyRequest, context: any) => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${context.after}`,
      }),
    });

    // CSRF Protection
    app.addHook("onRequest", async (request, reply) => {
      if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

      // Allow internal AI worker calls via internal token header
      if (request.headers["x-internal-token"]) {
        if (request.headers["x-internal-token"] !== env.INTERNAL_WORKER_TOKEN) {
          return reply.status(401).send({ error: "Invalid internal token" });
        }
        return;
      }

      const origin = (request.headers.origin as string | undefined)?.replace(/\/$/, "") ?? "";
      const referer = (request.headers.referer as string | undefined) ?? "";

      // Allow requests with no origin/referer (API clients, curl, mobile apps)
      if (!origin && !referer) return;

      const allowedOriginsForCsrf = [
        env.CORS_ORIGIN || "https://v03.tech",
        "http://localhost:5173",
        "http://localhost:4173",
      ].filter(Boolean).map((o) => o.replace(/\/$/, ""));

      const isAllowed = allowedOriginsForCsrf.some(
        (allowed) => origin === allowed || referer.startsWith(allowed + "/"),
      );

      if (!isAllowed) {
        logger.warn("CSRF validation failed", { origin, referer });
        return reply.status(403).send({ error: "CSRF validation failed" });
      }
    });

    // CORS
    const allowedOrigins = [
      env.CORS_ORIGIN || "https://v03.tech",
      "http://localhost:5173",
      "http://localhost:4173",
    ].filter(Boolean);

    await app.register(cors, {
      origin: allowedOrigins,
      credentials: true,
    });

    // Cookies
    await app.register(cookie);

    // ── Step 5b: Register error handler and logging ─────
    logger.info("Registering error handling and logging...");
    await registerErrorHandler(app);
    await registerLoggingMiddleware(app);

    // ── Step 6: Register routes ────────────────────────
    logger.info("Registering routes...");
    await app.register(registerHealthRoutes);
    await app.register(authRoutes);
    await app.register(dashboardRoutes);
    await app.register(projectRoutes);
    await app.register(fileRoutes);
    await app.register(envRoutes);
    await app.register(auditRoutes);
    await app.register(generationRoutes);
    await app.register(buildRoutes);
    await app.register(internalAiRoutes);
    await app.register(couponRoutes);
    await app.register(githubRoutes);
    await app.register(previewHostProxyRoutes);
    await app.register(previewProxyRoutes);
    await app.register(chatRoutes);
    await app.register(adminRoutes);
    await app.register(adminMetricsRoutes);

    // ── Step 7: Register background jobs ───────────────
    logger.info("Initializing background jobs...");
    
    if (env.BOOTSTRAP_ADMIN_SYSTEM === "true") {
      await ensureAdminSystemSeeded({
        superAdminEmail: env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "nurprodev@gmail.com",
      });
    }

    registerPreviewWebsocketProxy(app.server);

    try {
      await runnerQueue.rehydrateFromDb();
    } catch (err) {
      logger.warn("Runner queue rehydrate failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const cleanupInterval = setInterval(() => {
      cleanupGatewayArtifacts().catch((err) =>
        logger.warn("Cleanup gateway artifacts failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }, 60_000);
    cleanupInterval.unref?.();

    const previewTtlInterval = setInterval(() => {
      stopExpiredPreviews().catch((err) =>
        logger.warn("Stop expired previews failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }, 30_000);
    previewTtlInterval.unref?.();

    // ── Step 8: Graceful shutdown ──────────────────────
    const signals = ["SIGTERM", "SIGINT"];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        await app.close();
        await closeConnectionPool();
        process.exit(0);
      });
    }

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught exception", { error: err });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason, promise });
      process.exit(1);
    });

    // ── Step 9: Start server ───────────────────────────
    const port = env.PORT;
    const host = env.HOST;
    
    await app.listen({ port, host });
    logger.info(`Server listening on ${host}:${port}`, {
      environment: env.NODE_ENV,
      version: "1.0.0",
    });
  } catch (err) {
    console.error("[v03] FATAL ERROR:", err);
    process.exit(1);
  }
}

start();
