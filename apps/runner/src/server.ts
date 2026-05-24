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
  const templateRoot = path.resolve(process.cwd(), "src", "dockerfiles");
  const render = (tmpl: string, vars: Record<string, string>) => {
    let out = tmpl;
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{{${k}}}`, v);
    }
    return out;
  };

  if (runtime === "python") {
    const internalPort = meta?.internalPort && Number.isFinite(meta.internalPort) ? meta.internalPort : 8000;
    const startCommand = meta?.startCommand || `python manage.py runserver 0.0.0.0:${internalPort}`;
    const buildCommand = meta?.buildCommand || "python -m compileall . || true";
    const installCommand = meta?.installCommand || "pip install --no-cache-dir -r requirements.txt";
    const tmpl = await readFile(path.join(templateRoot, "python.Dockerfile.tmpl"), "utf8");
    const dockerfile = render(tmpl, {
      INTERNAL_PORT: String(internalPort),
      INSTALL_CMD: installCommand,
      BUILD_STEP: mode === "build" ? `RUN ${buildCommand}` : "",
      RUN_SHELL: JSON.stringify(startCommand),
    });

    await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
    return { internalPort };
  }

  if (runtime === "php") {
    const internalPort = meta?.internalPort && Number.isFinite(meta.internalPort) ? meta.internalPort : 8000;
    const startCommand = meta?.startCommand || `php artisan serve --host 0.0.0.0 --port ${internalPort}`;
    const installCommand = meta?.installCommand || "composer install --no-interaction --prefer-dist";
    const tmpl = await readFile(path.join(templateRoot, "php.Dockerfile.tmpl"), "utf8");
    const dockerfile = render(tmpl, {
      INTERNAL_PORT: String(internalPort),
      INSTALL_SHELL: installCommand ? JSON.stringify(installCommand) : "''",
      RUN_SHELL: JSON.stringify(startCommand),
    });

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

  const tmpl = await readFile(path.join(templateRoot, "node.Dockerfile.tmpl"), "utf8");
  const dockerfile = render(tmpl, {
    INTERNAL_PORT: String(internalPort),
    INSTALL_SHELL: installShell || "''",
    BUILD_STEP: mode === "build" ? `RUN ${buildCommand}` : "",
    RUN_SHELL: JSON.stringify(runCommand),
  });

  await writeFile(path.join(dir, "Dockerfile"), dockerfile, "utf8");
  return { internalPort };
}

async function dockerImageExists(tag: string) {
  requireDocker();
  try {
    await execFileAsync("docker", ["image", "inspect", tag], { maxBuffer: 1024 * 1024 });
    return true;
  } catch {
    return false;
  }
}

async function dockerBuild(dir: string, tag: string, labels: Record<string, string>) {
  requireDocker();
  const labelArgs = Object.entries(labels).flatMap(([k, v]) => ["--label", `${k}=${v}`]);
  await execFileAsync("docker", ["build", "-t", tag, ...labelArgs, "."], {
    cwd: dir,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function dockerRunDetached(tag: string, internalPort: number, labels: Record<string, string>) {
  requireDocker();
  const labelArgs = Object.entries(labels).flatMap(([k, v]) => ["--label", `${k}=${v}`]);
  const { stdout } = await execFileAsync(
    "docker",
    ["run", "-d", "-p", `0:${internalPort}`, "--rm", "--label", "v03.runner=true", ...labelArgs, tag],
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

async function cleanupOldRuns() {
  const ttlSeconds = parseInt(process.env.RUNNER_TTL_SECONDS || "1800", 10);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;

  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["ps", "--filter", "label=v03.runner=true", "--format", "{{.ID}}"],
      { maxBuffer: 1024 * 1024 },
    );
    const ids = stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const id of ids) {
      try {
        const { stdout: startedOut } = await execFileAsync(
          "docker",
          ["inspect", "-f", "{{.State.StartedAt}}", id],
          { maxBuffer: 1024 * 1024 },
        );
        const startedAt = Date.parse(startedOut.trim());
        if (!Number.isFinite(startedAt)) continue;
        const ageSeconds = (Date.now() - startedAt) / 1000;
        if (ageSeconds > ttlSeconds) {
          await dockerStop(id);
        }
      } catch {
        // ignore per-container failures
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

async function cleanupOldImages() {
  const ttlSeconds = parseInt(process.env.RUNNER_IMAGE_CACHE_TTL_SECONDS || "86400", 10);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return;
  const maxImages = parseInt(process.env.RUNNER_IMAGE_CACHE_MAX || "50", 10);

  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["image", "ls", "--filter", "label=v03.runner.cache=true", "--format", "{{.Repository}}:{{.Tag}}"],
      { maxBuffer: 1024 * 1024 },
    );
    const tags = stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const inspected: Array<{ tag: string; createdAtMs: number }> = [];
    for (const tag of tags) {
      try {
        const { stdout: createdOut } = await execFileAsync(
          "docker",
          ["image", "inspect", "-f", "{{.Created}}", tag],
          { maxBuffer: 1024 * 1024 },
        );
        const createdAt = Date.parse(createdOut.trim());
        if (!Number.isFinite(createdAt)) continue;
        inspected.push({ tag, createdAtMs: createdAt });
      } catch {
        // ignore per-image failures
      }
    }

    const now = Date.now();
    const expired = inspected.filter((i) => (now - i.createdAtMs) / 1000 > ttlSeconds);
    for (const { tag } of expired) {
      try {
        await execFileAsync("docker", ["image", "rm", "-f", tag], { maxBuffer: 1024 * 1024 });
      } catch {
        // ignore
      }
    }

    if (Number.isFinite(maxImages) && maxImages > 0) {
      const remaining = inspected
        .filter((i) => !expired.some((e) => e.tag === i.tag))
        .sort((a, b) => a.createdAtMs - b.createdAtMs); // oldest first
      const overflow = remaining.length - maxImages;
      if (overflow > 0) {
        for (const { tag } of remaining.slice(0, overflow)) {
          try {
            await execFileAsync("docker", ["image", "rm", "-f", tag], { maxBuffer: 1024 * 1024 });
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore cleanup failures
  }
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

setInterval(() => void cleanupOldRuns(), 60_000).unref?.();
setInterval(() => void cleanupOldImages(), 5 * 60_000).unref?.();

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
  const bundleHash = crypto.createHash("sha256").update(bundle.buffer).digest("hex");

  try {
    await execFileAsync("tar", ["-xzf", bundlePath, "-C", runDir], { maxBuffer: 1024 * 1024 });
  } catch (err: any) {
    request.log.warn({ err }, "failed to extract tarball");
    return reply.status(400).send({ error: "Failed to extract bundle" });
  }

  const meta = await readProjectMeta(runDir);
  const runtime = meta?.runtimeKind || (await detectRuntime(runDir));
  const { internalPort } = await writeDockerfile(runDir, mode, runtime, meta);

  const tag = `v03-cache-${runtime}-${mode}-${bundleHash.slice(0, 24)}`;
  try {
    const exists = await dockerImageExists(tag);
    if (!exists) {
      await dockerBuild(runDir, tag, {
        "v03.runner.cache": "true",
        "v03.bundleHash": bundleHash,
        "v03.runtime": runtime,
        "v03.mode": mode,
      });
    }
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag, internalPort, {
      "v03.bundleHash": bundleHash,
      "v03.mode": mode,
    });
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
      bundleHash,
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
  const bundleHash = crypto.createHash("sha256").update(buffer).digest("hex");

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

  const tag = `v03-cache-${runtime}-${mode}-${bundleHash.slice(0, 24)}`;
  try {
    const exists = await dockerImageExists(tag);
    if (!exists) {
      await dockerBuild(runDir, tag, {
        "v03.runner.cache": "true",
        "v03.bundleHash": bundleHash,
        "v03.runtime": runtime,
        "v03.mode": mode,
      });
    }
  } catch (err: any) {
    request.log.warn({ err }, "docker build failed");
    return reply.status(500).send({ error: "Docker build failed" });
  }

  try {
    const containerId = await dockerRunDetached(tag, internalPort, {
      "v03.bundleHash": bundleHash,
      "v03.mode": mode,
    });
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
      bundleHash,
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
