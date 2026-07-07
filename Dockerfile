# ─────────────────────────────────────────────────────────────────────────────
# Build stage (frontend + gateway)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Determine and use appropriate package manager
COPY pnpm-lock.yaml package.json package-lock.json* yarn.lock* .npmrc* ./
RUN if [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci --legacy-peer-deps; fi

COPY . .

# Build frontend (Vite)
RUN npm run build || (if [ -f pnpm-lock.yaml ]; then pnpm build; elif [ -f yarn.lock ]; then yarn build; fi)

# Build gateway (TypeScript)
WORKDIR /app/apps/gateway
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile && pnpm build; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile && yarn build; \
    else npm ci && npm run build; fi

# ─────────────────────────────────────────────────────────────────────────────
# Production stage (single container: nginx + gateway + ai-worker)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

# Install production dependencies
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    nginx python3 python3-venv ca-certificates gettext-base \
    tini curl \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

# Create app user for security
RUN useradd -m -u 1001 appuser

# Create log directories
RUN mkdir -p /var/log/v03 /var/v03/storage /var/log/nginx && \
    chown -R appuser:appuser /var/log/v03 /var/v03/storage /var/log/nginx

# Frontend + nginx config template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Project templates used for bootstrapping new projects
COPY --from=builder /app/templates /app/templates

# Gateway build
COPY --from=builder /app/apps/gateway/dist /app/apps/gateway/dist
COPY --from=builder /app/apps/gateway/package.json /app/apps/gateway/package.json
COPY --from=builder /app/apps/gateway/package-lock.json /app/apps/gateway/package-lock.json
COPY --from=builder /app/apps/gateway/pnpm-lock.yaml* /app/apps/gateway/
WORKDIR /app/apps/gateway
RUN if [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile --prod; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    else npm ci --omit=dev; fi

# AI worker
WORKDIR /app/apps/ai-worker
COPY apps/ai-worker/requirements.txt /app/apps/ai-worker/requirements.txt
RUN python3 -m venv /opt/ai-worker-venv \
  && /opt/ai-worker-venv/bin/pip install --no-cache-dir -r /app/apps/ai-worker/requirements.txt

COPY apps/ai-worker/main.py /app/apps/ai-worker/main.py

# Entrypoint
WORKDIR /app
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1/api/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV API_UPSTREAM=http://127.0.0.1:3001
ENV PORT=3001
ENV AI_WORKER_URL=http://127.0.0.1:8001
ENV LOG_LEVEL=warn

# Security settings
ENV NODE_OPTIONS="--no-warnings"

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start services
CMD ["/app/docker/entrypoint.sh"]

# Metadata
LABEL maintainer="v03.tech"
LABEL description="V03.tech - AI App Generator Production Image"
LABEL version="1.0.0"

# Expose ports
EXPOSE 80 3001 8001
