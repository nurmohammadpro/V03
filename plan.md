# v03.tech — Master Implementation Plan

**Status:** Planning Complete | Ready for Phase 1 Implementation
**Last Updated:** 2025-04-17
**Version:** 2.0 (Aligned with tech master spec v2.0)

---

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Vision** | Invisible UI around powerful AI app generator |
| **Architecture** | Hybrid: Fastify Gateway (Node.js) + FastAPI AI Worker (Python) |
| **Frameworks** | Next.js, MERN, Laravel, Django, NestJS, MEAN |
| **Tiers** | Free (3/day), Pro ($19/mo), Teams ($49/mo/seat) |
| **Current Phase** | Phase 1 - Foundation & Chat (Weeks 1-4) |
| **Target Launch** | Week 20 (5 months total) |

---

## Phase 1: Foundation & Chat (Weeks 1-4)

### Goal
Working Claude-like chat interface that generates raw code text with streaming responses.

### Week 1: Infrastructure Setup
- [ ] Monorepo initialization (Turborepo, shared types package)
- [ ] Fastify gateway scaffolding
  - [ ] Basic server setup on port 3000
  - [ ] Route structure setup
  - [ ] Middleware chain foundation
  - [ ] Drizzle ORM integration
- [ ] PostgreSQL schema migration
  - [ ] All tables from tech spec Section 5
  - [ ] Indexes and foreign keys
  - [ ] Initial migration script
- [ ] Redis integration (Upstash)
  - [ ] Client configuration
  - [ ] Key pattern definitions
  - [ ] Basic get/set operations

### Week 2: Authentication System
- [ ] OTP send endpoint
  - [ ] Email validation
  - [ ] Cloudflare Turnstile integration
  - [ ] 6-digit code generation
  - [ ] Redis storage with 5min TTL
  - [ ] Resend email integration
- [ ] OTP verify endpoint
  - [ ] Hash comparison
  - [ ] JWT generation (HttpOnly, SameSite=Strict)
  - [ ] JWT rotation logic
  - [ ] Redis session blocklist
- [ ] Frontend auth flow
  - [ ] Landing page (from mockup)
  - [ ] Auth modal (OTP input, auto-focus, auto-submit)
  - [ ] Timer countdown with resend
  - [ ] Success/error states with animations

### Week 3: Chat Interface
- [ ] Frontend chat UI
  - [ ] Chat pane with message bubbles
  - [ ] Sidebar with project history
  - [ ] Prompt bar with framework selector
  - [ ] Credit counter in header
- [ ] First-run onboarding
  - [ ] Starter prompt cards
  - [ ] Framework auto-selection
  - [ ] Empty state guidance
- [ ] Backend chat foundation
  - [ ] `/api/projects` CRUD endpoints
  - [ ] `/api/chat/stream` SSE skeleton
  - [ ] Credit check middleware
  - [ ] Redlock integration for atomic deduction

### Week 4: AI Integration & Streaming
- [ ] Python FastAPI worker
  - [ ] Basic server on port 8000
  - [ ] Anthropic client integration
  - [ ] OpenAI fallback structure
  - [ ] Internal gRPC/HTTP stream from gateway
- [ ] Streaming implementation
  - [ ] SSE event types (init, text_delta, done)
  - [ ] Client-side stream handling
  - [ ] Streaming cursor animation
  - [ ] Credit refund on error
- [ ] Basic prompt classifier
  - [ ] Keyword filtering
  - [ ] Input sanitization
  - [ ] XML boundary tag wrapping

### Exit Criteria
✓ User can sign up via OTP
✓ User sees chat interface with framework selector
✓ User can send prompt and receive streaming code response
✓ Credits are deducted atomically
✓ Failed generations refund credits

---

## Phase 2: Workspace Transition (Weeks 5-8)

### Goal
Turn streaming text into visual application with live preview.

### Week 5: Framework Templates
- [ ] Template system structure
  - [ ] `/templates/` directory in Python worker
  - [ ] Template loader service
  - [ ] Version-specific template files
- [ ] Framework templates (5 frameworks)
  - [ ] Next.js template (v14, v15)
  - [ ] MERN template
  - [ ] Laravel template (v11)
  - [ ] Django template
  - [ ] NestJS template
- [ ] Template injection logic
  - [ ] Dynamic system prompt assembly
  - [ ] Framework-specific instructions
  - [ ] Version pinning in package.json templates

### Week 6: File Extraction & Validation
- [ ] XML file parser
  - [ ] Streaming XML detection
  - [ ] `<file path="...">` extraction
  - [ ] File tree assembly
- [ ] Tree-sitter integration
  - [ ] Language detection
  - [ ] AST parsing per file
  - [ ] Syntax error detection
- [ ] Correction loop
  - [ ] Automatic re-prompt on errors
  - [ ] Max 2 retries
  - [ ] Error reporting to user

### Week 7: Workspace UI
- [ ] Layout morphing
  - [ ] Full chat → 50/50 split transition
  - [ ] CSS transition animation
  - [ ] Mobile responsive tabbed view
- [ ] CodeMirror integration
  - [ ] Read-only syntax highlighting
  - [ ] File tree explorer
  - [ ] Language detection
  - [ ] Search functionality (Pro)
- [ ] WebContainers integration
  - [ ] Iframe setup
  - [ ] File tree loading
  - [ ] Auto npm install + dev
  - [ ] Preview URL display

### Week 8: Security & Reliability
- [ ] Semgrep integration
  - [ ] Security rule configuration
  - [ ] Post-generation scanning
  - [ ] Finding storage in metadata
  - [ ] UI warning strip
- [ ] Stream reconnection
  - [ ] Last-Event-ID handling
  - [ ] Redis checkpoint storage
  - [ ] Client reconnection logic
- [ ] Context summarization
  - [ ] Turn counting
  - [ ] Summary generation at 5+ turns
  - [ ] Token cost reduction

### Exit Criteria
✓ User generates code and sees file tree
✓ Live preview loads in WebContainers
✓ Code is syntax-validated and security-linted
✓ Dropped streams reconnect successfully
✓ Mobile users see tabbed layout

---

## Phase 3: Polish & Monetization (Weeks 9-12)

### Goal
Make it a real SaaS with payments and premium features.

### Week 9: Stripe Integration
- [ ] Stripe setup
  - [ ] Product creation (Free, Pro, Teams)
  - [ ] Pricing configuration
  - [ ] Webhook endpoint
- [ ] Subscription lifecycle
  - [ ] Checkout flow
  - [ ] Customer portal
  - [ ] Plan upgrade/downgrade
- [ ] Webhook handlers
  - [ ] subscription.created
  - [ ] subscription.updated
  - [ ] invoice.payment_succeeded
  - [ ] invoice.payment_failed
  - [ ] charge.refunded

### Week 10: Premium Features
- [ ] Export ZIP
  - [ ] archiver integration
  - [ ] In-memory ZIP generation
  - [ ] Stream to browser
- [ ] Share links
  - [ ] UUID token generation
  - [ ] SSR share page
  - [ ] OG image generation (@vercel/og)
- [ ] GitHub integration
  - [ ] OAuth flow
  - [ ] Token storage (encrypted)
  - [ ] Push-to-repo feature

### Week 11: Feature Gating & UX
- [ ] Tier-based UI
  - [ ] Lock icons for free users
  - [ ] Upgrade modal
  - [ ] Feature checklist
- [ ] Credit counter
  - [ ] Amber pulse at low credits
  - [ ] Usage panel
  - [ ] Upgrade CTA
- [ ] Settings page
  - [ ] Billing management
  - [ ] GitHub connection
  - [ ] Account deletion (GDPR)

### Week 12: Feedback & Reliability
- [ ] Generation feedback
  - [ ] Thumbs up/down UI
  - [ ] Optional comment input
  - [ ] Feedback storage
- [ ] Circuit breaker
  - [ ] Anthropic → OpenAI fallback
  - [ ] Health monitoring
  - [ ] Status endpoint
- [ ] Prompt library
  - [ ] Curated starter prompts
  - [ ] Community read view
  - [ ] Template cards

### Exit Criteria
✓ Pro plan purchasable via Stripe
✓ Premium features work and are properly gated
✓ Users can export, share, and push to GitHub
✓ Settings page allows account management
✓ System degrades gracefully on AI provider issues

---

## Phase 4: Framework Expansion (Weeks 13-16)

### Goal
Expand and refine framework quality for all supported stacks.

### Week 13: Template Refinement
- [ ] Quality testing all templates
- [ ] Version selector UI
- [ ] Template versioning system
- [ ] Monthly audit process setup

### Week 14: Advanced Editing
- [ ] Inline AI editing (Pro)
  - [ ] CodeMirror selection context menu
  - [ ] Mini prompt bar
  - [ ] Diff visualization
  - [ ] Accept/reject workflow

### Week 15: Community Features
- [ ] Prompt library publish
  - [ ] User-submitted templates
  - [ ] Upvoting system
  - [ ] Explore page
- [ ] Version snapshots
  - [ ] Timeline UI
  - [ ] Restore functionality
  - [ ] Unlimited history for Pro

### Week 16: Scale & Performance
- [ ] Load testing
  - [ ] 500 concurrent SSE connections
  - [ ] AI worker autoscaling
- [ ] Internal admin dashboard
  - [ ] Feedback trends
  - [ ] Generation success rate
  - [ ] Framework performance

### Exit Criteria
✓ All frameworks produce high-quality output
✓ Infrastructure handles target load
✓ Community prompt library is active
✓ Inline editing works seamlessly

---

## Phase 5: Teams & Launch (Weeks 17-20)

### Goal
B2B tier and public launch.

### Week 17: Teams Tier
- [ ] Teams schema
- [ ] Team workspace UI
- [ ] Member management
- [ ] Shared credit pools

### Week 18: Public API
- [ ] API key management
- [ ] `/v1/generate` endpoint
- [ ] Job polling endpoint
- [ ] Webhook support

### Week 19: Launch Prep
- [ ] Marketing site
- [ ] Waitlist transition
- [ ] Press kit
- [ ] Demo video

### Week 20: Launch
- [ ] Product Hunt launch
- [ ] Monitoring all KPIs
- [ ] Rapid iteration based on feedback

### Exit Criteria
✓ Teams tier fully functional
✓ Public API documented and working
✓ Marketing site live
✓ Public launch completed

---

## Success Metrics

| KPI | Target | Current |
|-----|--------|---------|
| Activation Rate | >70% | - |
| Generation Success Rate | >85% | - |
| Preview Load Rate | >90% | - |
| Free-to-Pro Conversion | >5% | - |
| Time-to-Value | <3 min | - |
| Day-7 Retention | >30% | - |

---

## Blockers & Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| WebContainers compatibility | Monitored | Graceful fallback implemented |
| Credit race conditions | Addressed | Redlock + atomic Lua script |
| AI provider outages | Planned | Circuit breaker + OpenAI fallback |
| High inference costs | Managed | Context summarization |

---

## Next Actions (Phase 1, Week 1)

1. Initialize Turborepo monorepo
2. Set up Fastify gateway basic server
3. Create PostgreSQL schema migration
4. Configure Redis (Upstash) client
5. Set up Drizzle ORM with schema definitions
