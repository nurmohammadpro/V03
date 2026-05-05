# v03.tech — Implementation Roadmap

## Phase 1: Foundation & Auth (CURRENT)
- [ ] 1.1 Set up PostgreSQL for v03 (container)
- [ ] 1.2 Set up Redis for v03 (container)
- [ ] 1.3 Scaffold Fastify API gateway
  - [ ] Drizzle ORM + schema (users, projects, credits)
  - [ ] Auth routes (OTP send, OTP verify)
  - [ ] JWT + refresh token flow
- [ ] 1.4 Create Dashboard page (project list + create)
- [ ] 1.5 Wire landing page to real auth
- [ ] 1.6 Dockerize gateway + deploy

## Phase 2: Chat & Workspace
- [ ] 2.1 Chat pane UI + SSE stream handler
- [ ] 2.2 Project workspace layout (50/50 split)
- [ ] 2.3 CodeMirror 6 integration
- [ ] 2.4 File tree explorer
- [ ] 2.5 Python FastAPI AI worker
- [ ] 2.6 Claude integration + streaming
- [ ] 2.7 Prompt safety classifier

## Phase 3: Preview & Sandbox
- [ ] 3.1 Docker sandbox manager service
- [ ] 3.2 Resource limits + isolation
- [ ] 3.3 Traefik routing for preview URLs
- [ ] 3.4 Auto-expiry + cleanup
- [ ] 3.5 WebContainers fallback

## Phase 4: Monetization & Polish
- [ ] 4.1 Stripe integration
- [ ] 4.2 Credit system UI
- [ ] 4.3 Export ZIP / Share links
- [ ] 4.4 GitHub push integration
- [ ] 4.5 Settings page
- [ ] 4.6 Teams tier

## Phase 5: Launch
- [ ] 5.1 Admin panel (usage stats, users)
- [ ] 5.2 Monitoring + alerts
- [ ] 5.3 Load testing
- [ ] 5.4 Public API (Teams)
- [ ] 5.5 Marketing site
- [ ] 5.6 Launch
