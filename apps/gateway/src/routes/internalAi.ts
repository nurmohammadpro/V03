import { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import db from "../db";
import { aiProviderSecrets, aiProviders, aiModels } from "../db/schema";
import { decryptProviderSecret } from "../secrets/aiProviderCrypto";

function requireInternalToken(request: any, reply: any): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    reply.status(500).send({ error: "INTERNAL_API_TOKEN is not configured" });
    return false;
  }
  const provided =
    (request.headers["x-internal-token"] as string | undefined) ||
    (request.headers["x_internal_token"] as string | undefined);
  if (!provided || provided !== expected) {
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export async function internalAiRoutes(app: FastifyInstance) {
  app.get("/api/internal/ai/providers/:key", async (request, reply) => {
    if (!requireInternalToken(request, reply)) return;

    const { key } = request.params as { key: string };

    const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.key, key)).limit(1);
    if (!provider) return reply.status(404).send({ error: "Provider not found" });

    const [secret] = await db.select().from(aiProviderSecrets).where(eq(aiProviderSecrets.providerId, provider.id)).limit(1);
    if (!secret) return reply.status(404).send({ error: "Provider secret not configured" });

    const apiKey = decryptProviderSecret(secret.apiKeyEnc);

    const models = await db
      .select({ key: aiModels.key, status: aiModels.status })
      .from(aiModels)
      .where(and(eq(aiModels.providerId, provider.id), eq(aiModels.status, "active")));

    const config = (provider.config ?? {}) as Record<string, unknown>;
    const defaultModelKey =
      typeof config.defaultModelKey === "string" ? (config.defaultModelKey as string) : (models[0]?.key ?? null);
    const chatCompletionsPath = typeof config.chatCompletionsPath === "string" ? (config.chatCompletionsPath as string) : "/chat/completions";

    return reply.send({
      provider: {
        key: provider.key,
        name: provider.name,
        baseUrl: provider.baseUrl,
        authMode: provider.authMode,
        chatCompletionsPath,
        defaultModelKey,
      },
      apiKey,
    });
  });
}

