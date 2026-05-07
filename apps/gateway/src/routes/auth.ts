import { FastifyInstance } from "fastify";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/me", async (request, reply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) {
      return authResult;
    }

    const actor = getRequestActor(request);
    return reply.send({ user: actor });
  });
}
