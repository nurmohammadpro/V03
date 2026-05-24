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
import { ensureAdminSystemSeeded } from "./db/bootstrap";
import { runnerQueue } from "./runner/runnerQueue";
import { cleanupGatewayArtifacts } from "./runner/exportProjectToTarGz";
import { stopExpiredPreviews } from "./runner/previewTtl";
import "dotenv/config";

const app = Fastify({ logger: true });

async function start() {
  if (process.env.BOOTSTRAP_ADMIN_SYSTEM === "true") {
    await ensureAdminSystemSeeded({
      superAdminEmail: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || "nurprodev@gmail.com",
    });
  }

  // ── Global Rate Limiting ─────────────────────────────
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request: FastifyRequest) => request.ip,
    errorResponseBuilder: (request: FastifyRequest, context: any) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}`,
    }),
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
