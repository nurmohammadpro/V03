import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);

const app = Fastify({ logger: true });

function requireDocker() {
  if (process.env.RUNNER_DISABLE_DOCKER === "true") {
    throw new Error("Docker is disabled for this runner");
  }
}

function getWorkRoot() {
  return path.join(tmpdir(), "v03-runner");
}

async function makeRunDir(runId: string) {
  const root = getWorkRoot();
  await mkdir(root, { recursive: true });
  const runDir = path.join(root, runId);
  await rm(runDir, { recursive: true, force: true });
  await mkdir(runDir, { recursive: true });
  return runDir;
}

async function writeDockerfile(dir: string, mode: "build" | "dev") {
  const dockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \\
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \\
    elif [ -f yarn.lock ]; then corepack enable && yarn --frozen-lockfile; \\
    else npm i; fi
COPY . .
ENV HOST=0.0.0.0
ENV PORT=3000
${mode === "build" ? "RUN npm run build" : ""}
EXPOSE 3000
CMD ["sh", "-lc", "${mode === "build" ? "npm start || npm run preview || npm run serve" : "npm run dev -- --host 0.0.0.0 --port 3000 || npm start"}"]
`.trimStart();

  await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
}

async function dockerBuild(dir: string, tag: string) {
  requireDocker();
  await execFileAsync("docker", ["build", "-t", tag, "."], { cwd: dir, maxBuffer: 10 * 1024 * 1024 });
}

async function dockerRunDetached(tag: string) {
  requireDocker();
  const { stdout } = await execFileAsync(
    "docker",
    ["run", "-d", "-p", "0:3000", "--rm", tag],
    { maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}

async function dockerInspectPort(containerId: string) {
  requireDocker();
  const { stdout } = await execFileAsync(
    "docker",
    ["port", containerId, "3000/tcp"],
    { maxBuffer: 1024 * 1024 },
  );
  const line = stdout.trim().split("\n")[0] || "";
  const match = line.match(/:(\d+)$/);
  if (!match) {
    throw new Error("Failed to read container port mapping");
  }
  return parseInt(match[1], 10);
}

async function dockerLogs(containerId: string, tail = 200) {
  requireDocker();
  const { stdout } = await execFileAsync(
    "docker",
    ["logs", "--tail", String(tail), containerId],
    { maxBuffer: 5 * 1024 * 1024 },
  );
  return stdout;
}

async function dockerStop(containerId: string) {
  requireDocker();
  await execFileAsync("docker", ["stop", containerId], { maxBuffer: 1024 * 1024 });
}

app.register(cors, { origin: true, credentials: true });
app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.addContentTypeParser(
  ["application/gzip", "application/octet-stream"],
  { parseAs: "buffer" },
  async (_req: unknown, body: unknown) => body as Buffer,
);

app.get("/health", async () => ({ status: "ok", service: "runner", version: "1.0.0" }));

app.post("/runs", async (request, reply) => {
  const parts = request.parts();

  let mode: "build" | "dev" = "dev";
  let runId = cryptoRandomId();
  let bundle: { buffer: Buffer; filename: string } | null = null;

  for await (const part of parts) {
    if (part.type === "file") {
      if (part.fieldname !== "bundle") {
        continue;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      bundle = { buffer: Buffer.concat(chunks), filename: part.filename };
      continue;
    }

    if (part.fieldname === "mode" && typeof part.value === "string") {
      mode = part.value === "build" ? "build" : "dev";
    }
    if (part.fieldname === "runId" && typeof part.value === "string" && part.value.trim()) {
      runId = part.value.trim();
    }
  }

  if (!bundle) {
    return reply.status(400).send({ error: "bundle is required (multipart field 'bundle')" });
  }

  const runDir = await makeRunDir(runId);

  const bundlePath = path.join(runDir, "bundle.tgz");
  await writeFile(bundlePath, bundle.buffer);

  try {
    await execFileAsync("tar", ["-xzf", bundlePath, "-C", runDir], { maxBuffer: 1024 * 1024 });
  } catch (err: any) {
    request.log.warn({ err }, "failed to extract tarball");
    return reply.status(400).send({ error: "Failed to extract bundle" });
  }

  await writeDockerfile(runDir, mode);

  const tag = `v03-run-${runId}`;
  try {
    await dockerBuild(runDir, tag);
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag);
    const hostPort = await dockerInspectPort(containerId);

    return reply.status(201).send({
      runId,
      containerId,
      status: "running",
      url: `http://localhost:${hostPort}`,
      ports: { "3000/tcp": hostPort },
    });
  } catch (err: any) {
    request.log.warn({ err }, "docker run failed");
    return reply.status(500).send({ error: "Docker run failed" });
  }
});

// Raw tar.gz upload (preferred for gateway integration)
app.post("/runs/raw", async (request, reply) => {
  const query = request.query as { mode?: string; runId?: string };
  const mode: "build" | "dev" = query.mode === "build" ? "build" : "dev";
  const runId = query.runId?.trim() || cryptoRandomId();

  const buffer = request.body as Buffer | undefined;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return reply.status(400).send({ error: "Request body must be a tar.gz buffer" });
  }

  const runDir = await makeRunDir(runId);
  const bundlePath = path.join(runDir, "bundle.tgz");
  await writeFile(bundlePath, buffer);

  try {
    await execFileAsync("tar", ["-xzf", bundlePath, "-C", runDir], { maxBuffer: 1024 * 1024 });
  } catch (err: any) {
    request.log.warn({ err }, "failed to extract tarball");
    return reply.status(400).send({ error: "Failed to extract bundle" });
  }

  await writeDockerfile(runDir, mode);

  const tag = `v03-run-${runId}`;
  try {
    await dockerBuild(runDir, tag);
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag);
    const hostPort = await dockerInspectPort(containerId);

    return reply.status(201).send({
      runId,
      containerId,
      status: "running",
      url: `http://localhost:${hostPort}`,
      ports: { "3000/tcp": hostPort },
    });
  } catch (err: any) {
    request.log.warn({ err }, "docker run failed");
    return reply.status(500).send({ error: "Docker run failed" });
  }
});

app.get("/runs/:id/logs", async (request, reply) => {
  const { id } = request.params as { id: string };
  const query = request.query as { tail?: string };
  const tail = query.tail ? Math.min(2000, Math.max(1, parseInt(query.tail, 10) || 200)) : 200;

  try {
    const logs = await dockerLogs(id, tail);
    return reply.send({ containerId: id, logs });
  } catch (err: any) {
    request.log.warn({ err }, "docker logs failed");
    return reply.status(500).send({ error: "Failed to fetch logs" });
  }
});

app.delete("/runs/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    await dockerStop(id);
    return reply.send({ ok: true });
  } catch (err: any) {
    request.log.warn({ err }, "docker stop failed");
    return reply.status(500).send({ error: "Failed to stop run" });
  }
});

function cryptoRandomId() {
  return crypto.randomBytes(10).toString("hex");
}

const port = parseInt(process.env.PORT || "3002", 10);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
