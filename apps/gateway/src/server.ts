import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import "dotenv/config";

const app = Fastify({ logger: true });

async function start() {
  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "v03-jwt-secret",
  });

  // Cookies
  await app.register(cookie);

  // Routes
  await app.register(authRoutes);
  await app.register(projectRoutes);

  // Health check
  app.get("/api/health", async () => ({ status: "ok", service: "v03-gateway", version: "1.0.0" }));

  const port = parseInt(process.env.PORT || "3001", 10);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
