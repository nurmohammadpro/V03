# Build stage (frontend + gateway)
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build frontend (Vite)
RUN npm run build

# Build gateway (TypeScript)
WORKDIR /app/apps/gateway
RUN npm ci
RUN npm run build

# Production stage (single container: nginx + gateway + ai-worker)
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx python3 python3-venv ca-certificates gettext-base \
  && rm -rf /var/lib/apt/lists/*

# Frontend + nginx config template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Gateway build
COPY --from=builder /app/apps/gateway/dist /app/apps/gateway/dist
COPY --from=builder /app/apps/gateway/package.json /app/apps/gateway/package.json
COPY --from=builder /app/apps/gateway/package-lock.json /app/apps/gateway/package-lock.json
WORKDIR /app/apps/gateway
RUN npm ci --omit=dev

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

ENV API_UPSTREAM=http://127.0.0.1:3001
ENV PORT=3001
ENV AI_WORKER_URL=http://127.0.0.1:8001

EXPOSE 80

ENTRYPOINT ["/app/docker/entrypoint.sh"]
