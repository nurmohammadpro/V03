import Fastify, { FastifyRequest } from "fastify";
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
import "dotenv/config";

const app = Fastify({
  logger: true,
  trustProxy: true, // trust X-Forwarded-For from nginx for correct rate-limiting IPs
});

async function start() {
  if (process.env.BOOTSTRAP_ADMIN_SYSTEM === "true") {
    await ensureAdminSystemSeeded({
      superAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "nurprodev@gmail.com",
    });
  }

  // ── Global Rate Limiting ─────────────────────────────
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

  // ── Security Headers (CSP, XSS, clickjacking) ───────
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; object-src 'none'; base-uri 'self'");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });

  // ── CSRF Protection (origin check for state-changing requests) ─
  app.addHook("onRequest", async (request, reply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

    // Allow internal AI worker calls via internal token header
    if (request.headers["x-internal-token"]) return;

    const origin = (request.headers.origin as string | undefined)?.replace(/\/$/, "") ?? "";
    const referer = (request.headers.referer as string | undefined) ?? "";

    // Allow requests with no origin/referer (API clients, curl, mobile apps)
    if (!origin && !referer) return;

    const allowedOriginsForCsrf = [
      process.env.CORS_ORIGIN || "https://v03.tech",
      "http://localhost:5173",
      "http://localhost:4173",
    ].filter(Boolean).map((o) => o.replace(/\/$/, ""));

    const isAllowed = allowedOriginsForCsrf.some(
      (allowed) => origin === allowed || referer.startsWith(allowed + "/"),
    );

    if (!isAllowed) {
      return reply.status(403).send({ error: "CSRF validation failed" });
    }
  });

  // ── CORS (tightened) ─────────────────────────────────
  const allowedOrigins = [
    process.env.CORS_ORIGIN || "https://v03.tech",
    "http://localhost:5173",
    "http://localhost:4173",
  ].filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // Cookies
  await app.register(cookie);

  // Routes
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

  // Health check
  app.get("/api/health", async () => ({ status: "ok", service: "v03-gateway", version: "1.0.0" }));

  registerPreviewWebsocketProxy(app.server);

  try {
    await runnerQueue.rehydrateFromDb();
  } catch (err) {
    app.log.warn({ err }, "runner queue rehydrate failed");
  }

  setInterval(() => {
    cleanupGatewayArtifacts().catch((err) => app.log.warn({ err }, "cleanup gateway artifacts failed"));
  }, 60_000).unref?.();

  setInterval(() => {
    stopExpiredPreviews().catch((err) => app.log.warn({ err }, "stop expired previews failed"));
  }, 30_000).unref?.();

  const port = parseInt(process.env.PORT || "3001", 10);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
