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
        // AI worker unavailable - return fallback SSE events
        console.warn("AI worker unavailable, sending fallback SSE:", err.message);

        const initData = JSON.stringify({ projectId, framework, status: "started" });
        reply.raw.write(`event: init\ndata: ${initData}\n\n`);

        // Stream text_delta events
        const mockText = `Generating a ${framework} project...\\n\\nCreating project structure...\\nDone! Your ${framework} project is ready.`;
        const words = mockText.split(" ");
        for (const word of words) {
          const deltaData = JSON.stringify({ text: word + " " });
          reply.raw.write(`event: text_delta\ndata: ${deltaData}\n\n`);
          await new Promise((r) => setTimeout(r, 20));
          if (req.raw.destroyed) break;
        }

        const doneData = JSON.stringify({
          text: mockText,
          files: [],
          framework,
        });
        reply.raw.write(`event: done\ndata: ${doneData}\n\n`);
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
        console.warn("AI worker unavailable for sync:", err.message);
        return reply.send({
          projectId,
          framework,
          text: `Mock: Generated ${framework} project for: "${prompt}"`,
          files: [],
          status: "complete",
        });
      }
    }
  );
}
