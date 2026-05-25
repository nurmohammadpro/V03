# Builder
FROM node:20-bookworm AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Docker CLI (runner talks to host docker via mounted socket)
RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/dockerfiles ./src/dockerfiles

ENV PORT=3002
EXPOSE 3002

CMD ["node", "dist/server.js"]

