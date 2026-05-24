#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]]; then kill "${GATEWAY_PID}" 2>/dev/null || true; fi
  if [[ -n "${AI_WORKER_PID:-}" ]]; then kill "${AI_WORKER_PID}" 2>/dev/null || true; fi
  if [[ -n "${NGINX_PID:-}" ]]; then kill "${NGINX_PID}" 2>/dev/null || true; fi
}

trap cleanup EXIT INT TERM

mkdir -p /etc/nginx/templates
if [[ -f /etc/nginx/templates/default.conf.template ]]; then
  export API_UPSTREAM="${API_UPSTREAM:-http://127.0.0.1:3001}"
  export PREVIEW_DOMAIN="${PREVIEW_DOMAIN:-preview.v03.tech}"
  envsubst '${API_UPSTREAM} ${PREVIEW_DOMAIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Start ai-worker (FastAPI)
pushd /app/apps/ai-worker >/dev/null
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 &
AI_WORKER_PID=$!
popd >/dev/null

# Start gateway (Fastify)
pushd /app/apps/gateway >/dev/null
node dist/server.js &
GATEWAY_PID=$!
popd >/dev/null

# Start nginx in foreground
nginx -g 'daemon off;' &
NGINX_PID=$!

wait "$NGINX_PID"
