import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { chatRoutes } from "./routes/chat";
import { adminRoutes } from "./routes/admin";
import { ensureAdminSystemSeeded } from "./db/bootstrap";
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
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (request, context) => ({
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
  await app.register(projectRoutes);
  await app.register(chatRoutes);
  await app.register(adminRoutes);

  // Health check
  app.get("/api/health", async () => ({ status: "ok", service: "v03-gateway", version: "1.0.0" }));

  const port = parseInt(process.env.PORT || "3001", 10);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
