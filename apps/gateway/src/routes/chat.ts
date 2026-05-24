import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const AI_WORKER_URL = process.env.AI_WORKER_URL || "http://localhost:8001";

interface ChatRequestBody {
  prompt: string;
  framework?: string;
  projectId?: string;
}

export async function chatRoutes(app: FastifyInstance) {
  // POST /api/chat/stream - stream code generation from AI worker
  app.post(
    "/api/chat/stream",
    async (req: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      const { prompt, framework = "Next.js", projectId = "new" } = req.body;

      if (!prompt || !prompt.trim()) {
        return reply.status(400).send({ error: "prompt is required" });
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      try {
        // Try to proxy to AI worker
        const controller = new AbortController();
        req.raw.on("close", () => controller.abort());

        const workerResponse = await fetch(`${AI_WORKER_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, framework, project_id: projectId }),
          signal: controller.signal,
        });

        if (!workerResponse.ok || !workerResponse.body) {
          throw new Error(`AI worker responded with ${workerResponse.status}`);
        }

        // Stream the SSE events from the AI worker to the client
        const reader = workerResponse.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          reply.raw.write(chunk);

          // Clean up on disconnect
          if (req.raw.destroyed) {
            controller.abort();
            break;
          }
        }
      } catch (err: any) {
        // AI worker unavailable - report as SSE error and end.
        const message = String(err?.message || "AI worker unavailable");
        console.warn("AI worker unavailable:", message);
        const errorData = JSON.stringify({ error: "AI worker unavailable", message });
        reply.raw.write(`event: error\ndata: ${errorData}\n\n`);
      } finally {
        if (!reply.raw.destroyed) {
          reply.raw.end();
        }
      }
    }
  );

  // Non-streaming chat endpoint
  app.post(
    "/api/chat",
    async (req: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      const { prompt, framework = "Next.js", projectId = "new" } = req.body;

      if (!prompt || !prompt.trim()) {
        return reply.status(400).send({ error: "prompt is required" });
      }

      try {
        const workerResponse = await fetch(`${AI_WORKER_URL}/generate/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, framework, project_id: projectId }),
        });

        if (!workerResponse.ok) {
          throw new Error(`AI worker responded with ${workerResponse.status}`);
        }

        const data = await workerResponse.json();
        return reply.send(data);
      } catch (err: any) {
        const message = String(err?.message || "AI worker unavailable");
        console.warn("AI worker unavailable for sync:", message);
        return reply.status(502).send({ error: "AI worker unavailable", message });
      }
    }
  );
}
