import { FastifyInstance } from "fastify";
import db from "../db";
import { previewInstances } from "../db/schema";
import { eq } from "drizzle-orm";
import { Readable } from "node:stream";

function joinPath(prefix: string, rest: string) {
  const a = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const b = rest.startsWith("/") ? rest : `/${rest}`;
  return `${a}${b}`;
}

function getPublicBaseUrl(request: any) {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const proto = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  return `${proto}://${host}`;
}

export async function previewProxyRoutes(app: FastifyInstance) {
  // Public, shareable preview URL:
  // GET/POST/... /p/:previewId/* -> proxy to runnerRef.url
  const handler = async (request: any, reply: any) => {
    const { previewId } = request.params as { previewId: string };
    const wildcard = (request.params as any)["*"] as string | undefined;

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, previewId)).limit(1);
    if (!preview) {
      return reply.status(404).send("Preview not found");
    }

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};
    const upstreamBase = typeof runnerRef.url === "string" ? runnerRef.url : null;
    if (!upstreamBase) {
      return reply.status(502).send("Preview upstream unavailable");
    }

    const requireToken = (process.env.PREVIEW_REQUIRE_TOKEN ?? "true") === "true";
    const expectedToken = typeof runnerRef.shareToken === "string" ? runnerRef.shareToken : null;
    const providedToken = typeof (request.query as any)?.t === "string" ? String((request.query as any).t) : null;

    if (requireToken && expectedToken && providedToken !== expectedToken) {
      return reply.status(403).send("Invalid preview token");
    }

    const upstreamUrl = new URL(upstreamBase);
    upstreamUrl.pathname = joinPath(upstreamUrl.pathname, wildcard ? `/${wildcard}` : "/");
    upstreamUrl.search = request.raw.url?.includes("?") ? request.raw.url.split("?").slice(1).join("?") : "";

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) continue;
      if (key.toLowerCase() === "host") continue;
      if (key.toLowerCase() === "connection") continue;
      if (key.toLowerCase() === "content-length") continue;
      headers[key] = Array.isArray(value) ? value.join(",") : String(value);
    }

    const method = request.method;
    const body =
      method === "GET" || method === "HEAD" ? undefined : (request.raw as any);

    const res = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    } as any);

    // Rewrite Location headers to stay on public URL
    const publicBase = getPublicBaseUrl(request);
    const proxyPrefix = `${publicBase}/p/${previewId}`;

    for (const [key, value] of res.headers.entries()) {
      if (key.toLowerCase() === "location") {
        try {
          const loc = new URL(value, upstreamBase);
          const rewritten = `${proxyPrefix}${loc.pathname}${loc.search}${loc.hash}`;
          reply.header("location", rewritten);
        } catch {
          reply.header("location", value);
        }
        continue;
      }
      if (key.toLowerCase() === "content-encoding") {
        // let node handle as-is; keep header
      }
      reply.header(key, value);
    }

    reply.status(res.status);
    if (!res.body) {
      return reply.send();
    }

    const nodeStream = Readable.fromWeb(res.body as any);
    return new Promise<void>((resolve, reject) => {
      nodeStream.on("error", reject);
      reply.raw.on("close", resolve);
      nodeStream.pipe(reply.raw);
    });
  };

  app.all("/p/:previewId", handler);
  app.all("/p/:previewId/", handler);
  app.all("/p/:previewId/*", handler);
}
