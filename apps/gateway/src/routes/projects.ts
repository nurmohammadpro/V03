import { FastifyInstance } from "fastify";
import db from "../db";
import { projects, projectSnapshots } from "../db/schema";
import { eq } from "drizzle-orm";

export async function projectRoutes(app: FastifyInstance) {
  // All project routes require auth
  app.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // GET /api/projects
  app.get("/api/projects", async (request, reply) => {
    const user = request.user as any;
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.sub || "00000000-0000-0000-0000-000000000000"));
    return reply.send({ projects: result });
  });

  // POST /api/projects
  app.post("/api/projects", async (request, reply) => {
    const user = request.user as any;
    const { name, framework } = request.body as { name?: string; framework?: string };
    if (!name) {
      return reply.status(400).send({ error: "Name is required" });
    }

    const [project] = await db
      .insert(projects)
      .values({ userId: user.sub || "00000000-0000-0000-0000-000000000000", name, framework })
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
