import { FastifyInstance } from "fastify";
import db from "../db";
import { projects, projectSnapshots } from "../db/schema";
import { eq } from "drizzle-orm";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";

type FrameworkKind = "nextjs" | "react-vite" | "mern" | "django" | "laravel" | "nestjs";

function defaultsForFramework(kind: FrameworkKind) {
  switch (kind) {
    case "react-vite":
      return {
        framework: "React (Vite)",
        frameworkKind: "react-vite",
        runtimeKind: "node",
        templateKey: "react-vite",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm run preview -- --host 0.0.0.0 --port 3000",
        devCommand: "npm run dev -- --host 0.0.0.0 --port 3000",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "mern":
      return {
        framework: "MERN",
        frameworkKind: "mern",
        runtimeKind: "node",
        templateKey: "mern",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm start",
        devCommand: "npm run dev",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "django":
      return {
        framework: "Django",
        frameworkKind: "django",
        runtimeKind: "python",
        templateKey: "django",
        templateVersion: "1",
        installCommand: "pip install -r requirements.txt",
        buildCommand: "python -m compileall .",
        startCommand: "gunicorn config.wsgi:application --bind 0.0.0.0:8000",
        devCommand: "python manage.py runserver 0.0.0.0:8000",
        defaultPort: 8000,
        healthcheckPath: "/",
      } as const;
    case "laravel":
      return {
        framework: "Laravel",
        frameworkKind: "laravel",
        runtimeKind: "php",
        templateKey: "laravel",
        templateVersion: "1",
        installCommand: "composer install --no-interaction --prefer-dist",
        buildCommand: "php artisan config:cache",
        startCommand: "php artisan serve --host 0.0.0.0 --port 8000",
        devCommand: "php artisan serve --host 0.0.0.0 --port 8000",
        defaultPort: 8000,
        healthcheckPath: "/",
      } as const;
    case "nestjs":
      return {
        framework: "NestJS",
        frameworkKind: "nestjs",
        runtimeKind: "node",
        templateKey: "nestjs",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm run start:prod",
        devCommand: "npm run start:dev",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
    case "nextjs":
    default:
      return {
        framework: "Next.js",
        frameworkKind: "nextjs",
        runtimeKind: "node",
        templateKey: "nextjs-app-router",
        templateVersion: "1",
        installCommand: "npm ci",
        buildCommand: "npm run build",
        startCommand: "npm start",
        devCommand: "npm run dev -- --host 0.0.0.0 --port 3000",
        defaultPort: 3000,
        healthcheckPath: "/",
      } as const;
  }
}

export async function projectRoutes(app: FastifyInstance) {
  // All project routes require auth
  app.addHook("onRequest", requireAuthenticated);

  // GET /api/projects
  app.get("/api/projects", async (request, reply) => {
    const actor = getRequestActor(request);
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, actor.userId));
    return reply.send({ projects: result });
  });

  // POST /api/projects
  app.post("/api/projects", async (request, reply) => {
    const actor = getRequestActor(request);
    const { name, frameworkKind } = request.body as { name?: string; frameworkKind?: FrameworkKind };
    if (!name) {
      return reply.status(400).send({ error: "Name is required" });
    }

    const defaults = defaultsForFramework(frameworkKind ?? "nextjs");

    const [project] = await db
      .insert(projects)
      .values({
        userId: actor.userId,
        name,
        ...defaults,
      })
      .returning();

    return reply.status(201).send({ project });
  });

  // GET /api/projects/:id
  app.get("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return reply.send({ project });
  });

  // DELETE /api/projects/:id
  app.delete("/api/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.delete(projects).where(eq(projects.id, id));
    return reply.send({ ok: true });
  });
}
