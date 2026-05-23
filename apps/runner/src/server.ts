import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import crypto from "node:crypto";
import { access } from "node:fs/promises";

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

type RuntimeKind = "node" | "python" | "php";

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectRuntime(dir: string): Promise<RuntimeKind> {
  if (await exists(path.join(dir, "package.json"))) return "node";
  if ((await exists(path.join(dir, "composer.json"))) || (await exists(path.join(dir, "artisan")))) return "php";
  if ((await exists(path.join(dir, "requirements.txt"))) || (await exists(path.join(dir, "manage.py")))) return "python";
  return "node";
}

type ProjectMeta = {
  runtimeKind?: RuntimeKind;
  frameworkKind?: string;
  internalPort?: number;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  devCommand?: string;
  healthcheckPath?: string;
};

async function readProjectMeta(dir: string): Promise<ProjectMeta | null> {
  const metaPath = path.join(dir, ".v03", "meta.json");
  if (!(await exists(metaPath))) return null;
  try {
    const raw = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ProjectMeta;
  } catch {
    return null;
  }
}

async function writeDockerfile(dir: string, mode: "build" | "dev", runtime: RuntimeKind, meta: ProjectMeta | null) {
  if (runtime === "python") {
    const internalPort = meta?.internalPort && Number.isFinite(meta.internalPort) ? meta.internalPort : 8000;
    const startCommand = meta?.startCommand || `python manage.py runserver 0.0.0.0:${internalPort}`;
    const buildCommand = meta?.buildCommand || "python -m compileall . || true";
    const installCommand = meta?.installCommand || "pip install --no-cache-dir -r requirements.txt";
    const dockerfile = `
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then ${installCommand}; fi
COPY . .
ENV PORT=${internalPort}
EXPOSE ${internalPort}
${mode === "build" ? `RUN ${buildCommand}` : ""}
CMD ["sh", "-lc", "${startCommand}"]
`.trimStart();

    await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
    return { internalPort };
  }

  if (runtime === "php") {
    const internalPort = meta?.internalPort && Number.isFinite(meta.internalPort) ? meta.internalPort : 8000;
    const startCommand = meta?.startCommand || `php artisan serve --host 0.0.0.0 --port ${internalPort}`;
    const installCommand = meta?.installCommand || "composer install --no-interaction --prefer-dist";
    const dockerfile = `
FROM php:8.3-cli
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git unzip curl && rm -rf /var/lib/apt/lists/*
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
COPY . .
RUN if [ -f composer.json ] && [ -n ${JSON.stringify(installCommand)} ]; then sh -lc ${JSON.stringify(
      installCommand,
    )}; fi
ENV PORT=${internalPort}
EXPOSE ${internalPort}
CMD ["sh", "-lc", "${startCommand}"]
`.trimStart();

    await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
    return { internalPort };
  }

  const internalPort = meta?.internalPort && Number.isFinite(meta.internalPort) ? meta.internalPort : 3000;
  const installCommand = meta?.installCommand || "";
  const buildCommand = meta?.buildCommand || "npm run build";
  const devCommand = meta?.devCommand || `npm run dev -- --host 0.0.0.0 --port ${internalPort}`;
  const startCommand = meta?.startCommand || "npm start || npm run preview || npm run serve";
  const installShell = installCommand ? JSON.stringify(installCommand) : "";
  const frameworkKind = meta?.frameworkKind || "";

  const runCommand =
    mode === "build"
      ? startCommand
      : frameworkKind === "mern"
        ? [
            // MERN dev: server on 3002, client on internalPort (proxy -> 3002)
            `export PORT=3002`,
            `node server/index.js &`,
            `npm --prefix client run dev -- --host 0.0.0.0 --port ${internalPort}`,
          ].join(" ")
        : devCommand;

  const dockerfile = `
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN if [ -n ${installShell} ]; then sh -lc ${installShell}; \\
    elif [ -f package-lock.json ]; then npm ci; \\
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \\
    elif [ -f yarn.lock ]; then corepack enable && yarn --frozen-lockfile; \\
    else npm i; fi
ENV HOST=0.0.0.0
ENV PORT=${internalPort}
${mode === "build" ? `RUN ${buildCommand}` : ""}
EXPOSE ${internalPort}
CMD ["sh", "-lc", "${runCommand}"]
`.trimStart();

  await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
  return { internalPort };
}

async function dockerBuild(dir: string, tag: string) {
  requireDocker();
  await execFileAsync("docker", ["build", "-t", tag, "."], { cwd: dir, maxBuffer: 10 * 1024 * 1024 });
}

async function dockerRunDetached(tag: string, internalPort: number) {
  requireDocker();
  const { stdout } = await execFileAsync(
    "docker",
    ["run", "-d", "-p", `0:${internalPort}`, "--rm", tag],
    { maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}

async function dockerInspectPort(containerId: string, internalPort: number) {
  requireDocker();
  const { stdout } = await execFileAsync(
    "docker",
    ["port", containerId, `${internalPort}/tcp`],
    { maxBuffer: 1024 * 1024 },
  );
  const line = stdout.trim().split("\n")[0] || "";
  const match = line.match(/:(\d+)$/);
  if (!match) {
    throw new Error("Failed to read container port mapping");
  }
  return parseInt(match[1], 10);
}

async function waitForReady(input: { url: string; path: string; timeoutMs?: number }) {
  const timeoutMs = input.timeoutMs ?? 30_000;
  const deadline = Date.now() + timeoutMs;
  const target = new URL(input.url);
  target.pathname = input.path.startsWith("/") ? input.path : `/${input.path}`;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(target, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return false;
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

  const meta = await readProjectMeta(runDir);
  const runtime = meta?.runtimeKind || (await detectRuntime(runDir));
  const { internalPort } = await writeDockerfile(runDir, mode, runtime, meta);

  const tag = `v03-run-${runId}`;
  try {
    await dockerBuild(runDir, tag);
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag, internalPort);
    const hostPort = await dockerInspectPort(containerId, internalPort);
    const ready = await waitForReady({
      url: `http://localhost:${hostPort}`,
      path: meta?.healthcheckPath || "/",
    });

    return reply.status(201).send({
      runId,
      containerId,
      status: ready ? "ready" : "running",
      url: `http://localhost:${hostPort}`,
      ports: { [`${internalPort}/tcp`]: hostPort },
      ready,
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

  const meta = await readProjectMeta(runDir);
  const runtime = meta?.runtimeKind || (await detectRuntime(runDir));
  const { internalPort } = await writeDockerfile(runDir, mode, runtime, meta);

  const tag = `v03-run-${runId}`;
  try {
    await dockerBuild(runDir, tag);
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag, internalPort);
    const hostPort = await dockerInspectPort(containerId, internalPort);
    const ready = await waitForReady({
      url: `http://localhost:${hostPort}`,
      path: meta?.healthcheckPath || "/",
    });

    return reply.status(201).send({
      runId,
      containerId,
      status: ready ? "ready" : "running",
      url: `http://localhost:${hostPort}`,
      ports: { [`${internalPort}/tcp`]: hostPort },
      ready,
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
