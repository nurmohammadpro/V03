# v03.tech — Deployment & Architecture Plan

## ✅ Phase 0: Landing Page (DONE)

### Currently Deployed
- **URL:** https://v03.tech
- **Stack:** React 19 + Vite 5 + TailwindCSS 4 + TypeScript
- **Hosting:** Docker (nginx) on VPS behind Traefik
- **SSL:** Let's Encrypt via Traefik (auto-renewal)
- **Infrastructure:** Dokploy + Traefik managing reverse proxy

### What's On The Page
- [x] Animated universe background (Canvas-based, low CPU)
- [x] Transparent floating navbar with v03.tech logo
- [x] Hero section with centered prompt input + "Create App" button
- [x] Auth modal (Manus OAuth + email/password placeholder)
- [x] Transparent footer (Pricing, Terms, Privacy, Refund)
- [x] Cinematic vignette overlay
- [x] Responsive design (all viewports)
- [x] HTTP → HTTPS redirect

## 🚧 Phase 1: Foundation & Chat (Weeks 1-4)

### Step 1: Authentication Backend
- Build Fastify API gateway (`/root/V03/apps/gateway/`)
- Set up PostgreSQL + Drizzle ORM (user, projects, credits schema)
- OTP-based passwordless auth (email → 6-digit code → JWT)
- Integrate with Manus OAuth flow present in the frontend

### Step 2: Chat Interface & AI Streaming
- SSE endpoint at `/api/chat/stream`
- Python FastAPI AI worker (Anthropic Claude + OpenAI fallback)
- Credit system with Redis (3 free/day, unlimited Pro)
- Redlock for atomic credit deduction
- Prompt safety classifier

### Step 3: Monorepo Restructure
```
V03/
├── apps/
│   ├── web/             ← Landing + app UI (React/Vite)
│   ├── gateway/         ← Fastify API
│   └── ai-worker/       ← Python FastAPI
├── packages/
│   └── types/           ← Shared types
├── infra/               ← Docker configs
└── package.json         ← Workspace root
```

## 🔒 Phase 2: Workspace & Preview (Weeks 5-8)

### Code Generation Pipeline
1. User submits prompt → Fastify gateway
2. Gateway checks credits → forwards to AI worker
3. AI worker injects framework template → calls Claude
4. Streaming response parsed by XML file extractor
5. Tree-sitter validates AST (auto-correct up to 2 retries)
6. Semgrep security linting
7. `workspace_ready` event sent to client

### Workspace UI
- 50/50 split layout: Chat (left) + Code/Preview (right)
- CodeMirror 6 for syntax-highlighted code
- File tree explorer
- Version timeline

## 🏖️ Sandbox Preview Architecture (CRITICAL)

**Goal:** Allow users to preview generated apps in a temporary, isolated environment.

### Option A (Recommended): Docker Container Sandbox
```
┌─────────────────────────────────────────────────────────────────────┐
│                        Request Flow                                   │
│                                                                       │
│  User generates app → workspace_ready event                            │
│                      → Sandbox Manager spins up container              │
│                      → Attaches to v03-sandbox network                 │
│                      → Traefik route: https://preview-{id}.v03.tech   │
│                      → 15-minute auto-expiry TTL                       │
│                      → Auto-destroyed after expiry                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Python service watches for `workspace_ready` events
- Spawns Docker containers per project with:
  - **Resource limits:** 256MB RAM, 0.5 CPU, 256MB disk
  - **Read-only root filesystem** (except /tmp and /app)
  - **No network access** (except to npm registry via internal proxy)
  - **Timeout:** 15 minutes max, auto-kill
- Container runs the generated code (npm install + npm run dev or equivalent)
- Internal nginx routes `/` → container port
- `docker rm -f` on expiry

**Security measures:**
| Measure | Implementation |
|---------|---------------|
| Container isolation | Docker user namespace remapping |
| No network | `--network none` (or internal-only) |
| Read-only FS | `--read-only --tmpfs /tmp --tmpfs /app/.npm` |
| CPU/Memory limits | `--cpus=0.5 --memory=256m` |
| Timeout | 15 min TTL, grace SIGTERM + SIGKILL |
| No privileged | `--security-opt no-new-privileges` |
| Seccomp | Default Docker seccomp profile |
| Disk limits | `--storage-opt size=256m` |
| Rate limit | Max 5 concurrent containers per user |

### Option B: StackBlitz WebContainers (Browser-based)
- No server-side sandbox needed
- Runs entirely in the browser via ServiceWorker
- Limitations: COEP/COOP headers required, Firefox not supported
- **Use as fallback** when Docker sandbox is unavailable

### Recommended: Hybrid Approach
1. **Primary:** Docker container sandbox (server-side, full control)
2. **Fallback:** WebContainers (browser-only, zero infrastructure cost)
3. **Last resort:** Read-only syntax view (works for everyone)

## 📦 Phase 3: Monetization (Weeks 9-12)

- Stripe integration (Free/Pro/Teams tiers)
- ZIP export, share links, GitHub push
- Feature gating (lock icons, upgrade modal)
- Credit counter UI

## 🏢 Phase 4: Teams & Launch (Weeks 13-16)

- Teams tier (shared projects, member management)
- Public API (Teams endpoint)
- Marketing site refinement
- Product Hunt launch

## 🔧 VPS Resource Planning

| Service | RAM | CPU | Disk |
|---------|-----|-----|------|
| Landing page (nginx) | 50MB | — | 26MB |
| PostgreSQL | 512MB | 1 | 5GB+ |
| Redis | 128MB | 0.5 | — |
| Fastify gateway | 256MB | 1 | — |
| AI worker (Python) | 1GB | 2 | — |
| Sandbox container (per user) | 256MB | 0.5 | 256MB |
| **Available** | **7.8GB** | **2 vCPUs** | **80GB** |

**Current capacity:** Can run ~5-8 sandbox containers concurrently before hitting swap.

**Scaling plan:**
- Short-term: Swap to 4GB at VPS provider
- Medium-term: Dedicated sandbox nodes (cheap $5-10 VMs)
- Long-term: Kubernetes cluster

## 🚨 Immediate Next Steps

1. [ ] Set up PostgreSQL database on VPS
2. [ ] Scaffold Fastify gateway with auth routes
3. [ ] Integrate auth with landing page (OTP flow)
4. [ ] Set up Redis for session/credit management
5. [ ] Build Python AI worker with Claude integration
6. [ ] Implement streaming chat endpoint
7. [ ] Deploy sandbox container manager
8. [ ] Wire up framework templates

## 📊 Monorepo Structure

```bash
# Clone and setup
git clone git@github.com:nurmohammadpro/V03.git
cd V03

# Current: Landing page at root (Phase 0)
npm run dev     # local dev
npm run build   # production build

# Future: Monorepo
cd apps/gateway && npm run dev   # API gateway
cd apps/ai-worker && uvicorn ...  # AI worker
```
