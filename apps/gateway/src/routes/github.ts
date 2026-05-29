import { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import db from "../db";
import { users, projects } from "../db/schema";
import { getRequestActor, requireAuthenticated } from "../middleware/auth";
import { encryptSecret, decryptSecret } from "../secrets/crypto";
import { exportProjectToTarGz } from "../runner/exportProjectToTarGz";
import { execFile } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI =
  process.env.GITHUB_REDIRECT_URI ||
  (process.env.PUBLIC_BASE_URL || "http://localhost:3001") + "/api/auth/github/callback";

const GITHUB_SCOPES = ["repo", "user:email"].join(" ");

function getPublicBase(request: any) {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const proto = request.headers["x-forwarded-proto"] ?? "http";
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  return `${proto}://${host}`;
}

function encryptGitHubToken(plainToken: string) {
  return encryptSecret(plainToken);
}

function decryptGitHubToken(encrypted: string) {
  return decryptSecret(encrypted);
}

async function getGitHubToken(userId: string): Promise<string | null> {
  const [user] = await db.select({ metadata: users.metadata }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const meta = (user.metadata as Record<string, unknown>) || {};
  const encrypted = meta.githubTokenEnc as string | undefined;
  if (!encrypted) return null;
  try {
    return decryptGitHubToken(encrypted);
  } catch {
    return null;
  }
}

async function setGitHubToken(userId: string, token: string | null) {
  const [user] = await db.select({ metadata: users.metadata }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;
  const meta = { ...(user.metadata as Record<string, unknown>) } as Record<string, unknown>;
  if (token) {
    meta.githubTokenEnc = encryptGitHubToken(token);
  } else {
    delete meta.githubTokenEnc;
  }
  await db.update(users).set({ metadata: meta, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function githubRoutes(app: FastifyInstance) {
  // ── GitHub OAuth URL ──────────────────────────────────
  app.get("/api/auth/github/url", async (request, reply) => {
    const actor = await (async () => {
      try {
        return getRequestActor(request);
      } catch {
        return null;
      }
    })();

    const state = crypto.randomBytes(16).toString("hex");
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", GITHUB_CLIENT_ID);
    url.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
    url.searchParams.set("scope", GITHUB_SCOPES);
    url.searchParams.set("state", state);

    return reply.send({ url: url.toString(), state });
  });

  // ── GitHub OAuth Callback ─────────────────────────────
  app.get("/api/auth/github/callback", async (request, reply) => {
    const query = request.query as { code?: string; state?: string; error?: string };
    if (query.error || !query.code) {
      return reply.redirect(`${getPublicBase(request)}/dashboard?github=error`);
    }

    // Pass the code back to the frontend via redirect.
    // The frontend will exchange it via POST /api/auth/github/token
    // which runs through the authenticated middleware.
    return reply.redirect(`${getPublicBase(request)}/dashboard?github_code=${encodeURIComponent(query.code)}`);
  });

  // ── Store GitHub token (called from frontend after OAuth redirect) ─
  app.post("/api/auth/github/token", async (request, reply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) return authResult;

    const actor = getRequestActor(request);
    const body = request.body as { code?: string };

    if (!body.code) {
      return reply.status(400).send({ error: "Missing authorization code" });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: body.code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      return reply.status(502).send({ error: "GitHub token exchange failed" });
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return reply.status(400).send({ error: tokenData.error || "No access token returned" });
    }

    // Fetch GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
    });
    if (!userRes.ok) {
      return reply.status(502).send({ error: "Failed to verify GitHub identity" });
    }
    const ghUser = (await userRes.json()) as { login: string; id: number; avatar_url?: string };

    // Store encrypted token
    await setGitHubToken(actor.userId, tokenData.access_token);
    
    // Also store GitHub username in metadata
    const [user] = await db.select({ metadata: users.metadata }).from(users).where(eq(users.id, actor.userId)).limit(1);
    const meta = { ...(user?.metadata as Record<string, unknown>) } as Record<string, unknown>;
    meta.githubLogin = ghUser.login;
    meta.githubAvatarUrl = ghUser.avatar_url ?? null;
    await db.update(users).set({ metadata: meta, updatedAt: new Date() }).where(eq(users.id, actor.userId));

    return reply.send({ ok: true, login: ghUser.login, avatarUrl: ghUser.avatar_url ?? null });
  });

  // ── Check GitHub connection status ─────────────────────
  app.get("/api/auth/github/status", async (request, reply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) return authResult;

    const actor = getRequestActor(request);
    const [user] = await db.select({ metadata: users.metadata }).from(users).where(eq(users.id, actor.userId)).limit(1);
    const meta = (user?.metadata as Record<string, unknown>) || {};
    const hasToken = !!meta.githubTokenEnc;
    const login = meta.githubLogin as string | undefined;
    const avatarUrl = meta.githubAvatarUrl as string | undefined;

    return reply.send({ connected: hasToken, login: login ?? null, avatarUrl: avatarUrl ?? null });
  });

  // ── Disconnect GitHub ────────────────────────────────
  app.post("/api/auth/github/disconnect", async (request, reply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) return authResult;

    const actor = getRequestActor(request);
    await setGitHubToken(actor.userId, null);

    // Remove GitHub metadata
    const [user] = await db.select({ metadata: users.metadata }).from(users).where(eq(users.id, actor.userId)).limit(1);
    if (user) {
      const meta = { ...(user.metadata as Record<string, unknown>) } as Record<string, unknown>;
      delete meta.githubLogin;
      delete meta.githubAvatarUrl;
      await db.update(users).set({ metadata: meta, updatedAt: new Date() }).where(eq(users.id, actor.userId));
    }

    return reply.send({ ok: true });
  });

  // ── Push project to GitHub ────────────────────────────
  app.post("/api/projects/:id/github/push", async (request, reply) => {
    const authResult = await requireAuthenticated(request, reply);
    if (authResult) return authResult;

    const actor = getRequestActor(request);
    const { id } = request.params as { id: string };
    const body = request.body as { repoName?: string; description?: string; isPrivate?: boolean };
    const repoName = body.repoName || `v03-project-${id.slice(0, 8)}`;

    // Verify project access
    const [project] = await db
      .select({ userId: projects.userId, name: projects.name })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!project) return reply.status(404).send({ error: "Project not found" });
    if (!actor.isAdmin && project.userId !== actor.userId) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Get GitHub token
    const token = await getGitHubToken(actor.userId);
    if (!token) {
      return reply.status(400).send({ error: "GitHub not connected. Connect your GitHub account first." });
    }

    // Export the project
    let tarPath: string;
    try {
      const result = await exportProjectToTarGz(id);
      tarPath = result.tarPath;
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to export project" });
    }

    // Create working directory
    const workDir = path.join(tmpdir(), "v03-github-push", id);
    await rm(workDir, { recursive: true, force: true });
    await mkdir(workDir, { recursive: true });

    try {
      // Copy the tarball and extract
      const bundlePath = path.join(workDir, "bundle.tgz");
      await execFileAsync("cp", [tarPath, bundlePath]);
      await execFileAsync("tar", ["-xzf", bundlePath, "-C", workDir]);
      await rm(bundlePath, { force: true });

      // Remove .v03 meta directory from the export
      await rm(path.join(workDir, ".v03"), { recursive: true, force: true }).catch(() => {});

      // Check if there are actual files
      const { stdout: fileCount } = await execFileAsync("find", [workDir, "-type", "f"], { maxBuffer: 1024 * 1024 });
      const files = fileCount.trim().split("\n").filter(Boolean);
      if (files.length === 0) {
        return reply.status(400).send({ error: "No files to push" });
      }

      // Fetch GitHub username first
      const username = await getGhUsername(token);

      // Create the GitHub repo
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: repoName,
          description: body.description || `Generated by V03 — ${project.name || "Untitled project"}`,
          private: body.isPrivate ?? true,
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.json().catch(() => ({}));
        const errMsg = (errBody as any).message || `GitHub API error ${createRes.status}`;
        
        // If repo already exists, that's fine — we'll push to it
        if (createRes.status !== 422) {
          return reply.status(502).send({ error: errMsg });
        }
      }

      // Initialize git repo and push
      await execFileAsync("git", ["init"], { cwd: workDir });
      await execFileAsync("git", ["checkout", "-b", "main"], { cwd: workDir });
      await execFileAsync("git", ["config", "user.email", actor.email], { cwd: workDir });
      await execFileAsync("git", ["config", "user.name", actor.fullName || actor.email], { cwd: workDir });
      await execFileAsync("git", ["add", "-A"], { cwd: workDir });
      await execFileAsync("git", ["commit", "-m", "Initial commit from V03", "--allow-empty"], {
        cwd: workDir,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      });

      // Check if remote already exists (repo was pre-existing)
      try {
        await execFileAsync("git", ["remote", "add", "origin", `https://x-access-token:${token}@github.com/${username}/${repoName}.git`], {
          cwd: workDir,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        });
      } catch {
        // Remote may already exist; update it
        await execFileAsync("git", ["remote", "set-url", "origin", `https://x-access-token:${token}@github.com/${username}/${repoName}.git`], {
          cwd: workDir,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        });
      }

      await execFileAsync("git", ["push", "-u", "origin", "main", "--force"], {
        cwd: workDir,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        maxBuffer: 10 * 1024 * 1024,
      });

      const repoUrl = `https://github.com/${username}/${repoName}`;

      return reply.status(201).send({
        ok: true,
        repoUrl,
        repoName,
        commitMessage: "Initial commit from V03",
      });
    } catch (err: any) {
      return reply.status(500).send({ error: `Push failed: ${err.message}` });
    } finally {
      // Clean up working directory
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  });
}

async function getGhUsername(token: string): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = (await res.json()) as { login: string };
  return data.login;
}
