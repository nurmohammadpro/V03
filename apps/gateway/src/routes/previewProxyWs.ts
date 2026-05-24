import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import WebSocket, { WebSocketServer } from "ws";
import db from "../db";
import { previewInstances } from "../db/schema";
import { eq } from "drizzle-orm";

function parsePreviewIdFromUrl(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/^\/p\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

function getQueryParam(url: string, key: string) {
  const idx = url.indexOf("?");
  if (idx === -1) return null;
  const search = url.slice(idx + 1);
  const params = new URLSearchParams(search);
  return params.get(key);
}

export function registerPreviewWebsocketProxy(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      const previewId = parsePreviewIdFromUrl(req.url);
      if (!previewId) return;

      const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, previewId)).limit(1);
      if (!preview) {
        socket.destroy();
        return;
      }

      const runnerRef =
        typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};
      const upstreamBase = typeof runnerRef.url === "string" ? runnerRef.url : null;
      if (!upstreamBase) {
        socket.destroy();
        return;
      }

      const requireToken = (process.env.PREVIEW_REQUIRE_TOKEN ?? "true") === "true";
      const expectedToken = typeof runnerRef.shareToken === "string" ? runnerRef.shareToken : null;
      const expiresAt = typeof runnerRef.shareTokenExpiresAt === "number" ? runnerRef.shareTokenExpiresAt : null;
      const providedToken = req.url ? getQueryParam(req.url, "t") : null;

      if (requireToken && expectedToken && providedToken !== expectedToken) {
        socket.destroy();
        return;
      }
      if (requireToken && expectedToken && expiresAt && Date.now() > expiresAt) {
        socket.destroy();
        return;
      }

      const upstreamUrl = new URL(upstreamBase);
      // Preserve original path after /p/:previewId
      const remainder = req.url?.replace(/^\/p\/[^/]+/, "") || "/";
      upstreamUrl.pathname = remainder.split("?")[0] || "/";
      // forward the query string as-is, but remove the token param
      const params = new URLSearchParams((req.url?.split("?")[1] ?? "") as string);
      params.delete("t");
      upstreamUrl.search = params.toString() ? `?${params.toString()}` : "";

      // Upgrade to an in-process WS server for this socket
      wss.handleUpgrade(req, socket, head, (client) => {
        const upstream = new WebSocket(upstreamUrl.toString(), {
          headers: {
            // minimal header forwarding
            "user-agent": req.headers["user-agent"] || "",
            origin: req.headers.origin || "",
          },
        });

        const closeBoth = () => {
          try {
            client.close();
          } catch {}
          try {
            upstream.close();
          } catch {}
        };

        client.on("message", (data, isBinary) => {
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(data, { binary: isBinary });
          }
        });
        upstream.on("message", (data, isBinary) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data, { binary: isBinary });
          }
        });

        client.on("close", closeBoth);
        upstream.on("close", closeBoth);
        client.on("error", closeBoth);
        upstream.on("error", closeBoth);
      });
    } catch {
      socket.destroy();
    }
  });
}

