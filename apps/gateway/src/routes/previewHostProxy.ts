import type { FastifyInstance } from "fastify";
import db from "../db";
import { previewInstances } from "../db/schema";
import { eq } from "drizzle-orm";
import { Readable } from "node:stream";

function joinPath(prefix: string, rest: string) {
  const a = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const b = rest.startsWith("/") ? rest : `/${rest}`;
  return `${a}${b}`;
}

function extractPreviewIdFromHost(hostHeader: string | undefined, previewDomain: string) {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const domain = previewDomain.toLowerCase();
  if (!host.endsWith(`.${domain}`)) return null;
  const sub = host.slice(0, host.length - domain.length - 1);
  // Use left-most label as preview id. (Keep it simple for now.)
  const previewId = sub.split(".")[0] || null;
  return previewId;
}

export async function previewHostProxyRoutes(app: FastifyInstance) {
  const previewDomain = process.env.PREVIEW_DOMAIN?.trim();
  if (!previewDomain) return;

  const handler = async (request: any, reply: any) => {
    const connectionHeader = String(request.headers["connection"] ?? "").toLowerCase();
    const upgradeHeader = String(request.headers["upgrade"] ?? "").toLowerCase();
    if (connectionHeader.includes("upgrade") || upgradeHeader) {
      return reply.status(426).send("Upgrade handled elsewhere");
    }

    const previewId = extractPreviewIdFromHost(request.headers.host, previewDomain);
    if (!previewId) {
      return reply.callNotFound();
    }

    const [preview] = await db.select().from(previewInstances).where(eq(previewInstances.id, previewId)).limit(1);
    if (!preview) return reply.status(404).send("Preview not found");

    const runnerRef =
      typeof preview.runnerRef === "object" && preview.runnerRef ? (preview.runnerRef as Record<string, unknown>) : {};
    const upstreamBase = typeof runnerRef.url === "string" ? runnerRef.url : null;
    if (!upstreamBase) return reply.status(502).send("Preview upstream unavailable");

    const requireToken = (process.env.PREVIEW_REQUIRE_TOKEN ?? "true") === "true";
    const isPublic = (runnerRef.isPublic as any) === true;
    const expectedToken = typeof runnerRef.shareToken === "string" ? runnerRef.shareToken : null;
    const providedToken = typeof (request.query as any)?.t === "string" ? String((request.query as any).t) : null;
    const expiresAt = typeof runnerRef.shareTokenExpiresAt === "number" ? runnerRef.shareTokenExpiresAt : null;

    if (requireToken && !isPublic && expectedToken && providedToken !== expectedToken) {
      return reply.status(403).send("Invalid preview token");
    }
    if (requireToken && !isPublic && expectedToken && expiresAt && Date.now() > expiresAt) {
      return reply.status(410).send("Preview token expired");
    }

    const upstreamUrl = new URL(upstreamBase);
    upstreamUrl.pathname = joinPath(upstreamUrl.pathname, request.url.split("?")[0] || "/");
    upstreamUrl.search = request.raw.url?.includes("?") ? request.raw.url.split("?").slice(1).join("?") : "";

    const allowedRequestHeaders = new Set([
      "accept",
      "accept-language",
      "content-type",
      "user-agent",
      "referer",
      "origin",
      "cache-control",
    ]);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) continue;
      const lower = key.toLowerCase();
      if (!allowedRequestHeaders.has(lower)) continue;
      headers[key] = Array.isArray(value) ? value.join(",") : String(value);
    }

    const method = request.method;
    const body = method === "GET" || method === "HEAD" ? undefined : (request.raw as any);

    const res = await fetch(upstreamUrl, { method, headers, body, redirect: "manual" } as any);

    for (const [key, value] of res.headers.entries()) {
      if (key.toLowerCase() === "location") {
        // Keep host-based URLs when upstream redirects.
        reply.header("location", value);
        continue;
      }
      reply.header(key, value);
    }

    reply.status(res.status);
    if (!res.body) return reply.send();

    const nodeStream = Readable.fromWeb(res.body as any);
    return new Promise<void>((resolve, reject) => {
      nodeStream.on("error", reject);
      reply.raw.on("close", resolve);
      nodeStream.pipe(reply.raw);
    });
  };

  // Catch-all for preview subdomains (only triggers when PREVIEW_DOMAIN matches host)
  app.all("/*", handler);
}

