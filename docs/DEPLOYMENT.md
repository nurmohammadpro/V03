# V03.tech Deployment Guide

This guide covers deploying V03.tech to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Vercel Deployment](#vercel-deployment)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying to production, complete these steps:

- [ ] **Generate secrets**: Create unique JWT and auth secrets
  ```bash
  openssl rand -base64 32  # JWT_SECRET
  openssl rand -base64 32  # BETTER_AUTH_SECRET
  openssl rand -base64 32  # INTERNAL_WORKER_TOKEN
  ```

- [ ] **Database setup**: 
  - Provision production PostgreSQL database
  - Run migrations: `pnpm db:push`
  - Verify connection pool settings

- [ ] **Environment validation**: 
  - Copy `.env.example` to `.env.production`
  - Fill in all required variables
  - Test with `node -e "require('./apps/gateway/dist/utils/env').validateEnv()"`

- [ ] **Build verification**:
  - Run `pnpm build` locally
  - Verify no TypeScript errors: `pnpm tsc -b`
  - Test locally: `pnpm dev`

- [ ] **Security review**:
  - Enable HTTPS/TLS
  - Configure CORS properly
  - Review CSP headers
  - Enable rate limiting

- [ ] **Monitoring setup**:
  - Configure error tracking (Sentry)
  - Set up log aggregation
  - Configure alerting rules

## Environment Setup

### Required Variables

```bash
# Copy and customize for your environment
cp .env.example .env.production

# Essential (no defaults)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/v03
JWT_SECRET=<generate-with-openssl>
BETTER_AUTH_SECRET=<generate-with-openssl>

# Important
CORS_ORIGIN=https://v03.tech
PORT=3001

# Optional but recommended
LOG_LEVEL=warn
SENTRY_DSN=https://your-sentry-dsn
BOOTSTRAP_ADMIN_SYSTEM=true
BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@v03.tech
```

### Database Connection

For optimal performance, configure:

```bash
DATABASE_CONNECTION_POOL_SIZE=20  # Adjust based on load
DATABASE_IDLE_TIMEOUT=30000        # 30 seconds
```

## Docker Deployment

### Building the Image

```bash
# Build multi-stage image (optimized for production)
docker build -t v03:latest .

# With specific version tag
docker build -t ghcr.io/yourusername/v03:1.0.0 .
```

### Running the Container

```bash
docker run -d \
  --name v03-gateway \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@db:5432/v03" \
  -e JWT_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e LOG_LEVEL=warn \
  -v /var/log/v03:/var/log/v03 \
  -v /var/v03/storage:/var/v03/storage \
  v03:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: v03
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  gateway:
    build: .
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3001"
      - "80:80"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/v03
      JWT_SECRET: ${JWT_SECRET}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      LOG_LEVEL: warn
    volumes:
      - /var/log/v03:/var/log/v03
      - /var/v03/storage:/var/v03/storage
    restart: unless-stopped

volumes:
  postgres_data:
```

## Kubernetes Deployment

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: v03-config
  namespace: default
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  PORT: "3001"
```

### Secret

```bash
kubectl create secret generic v03-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  --from-literal=INTERNAL_WORKER_TOKEN="$(openssl rand -base64 32)"
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: v03-gateway
  namespace: default
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: v03-gateway
  template:
    metadata:
      labels:
        app: v03-gateway
    spec:
      containers:
      - name: gateway
        image: ghcr.io/yourusername/v03:latest
        ports:
        - containerPort: 3001
          name: http
        
        envFrom:
        - configMapRef:
            name: v03-config
        - secretRef:
            name: v03-secrets
        
        livenessProbe:
          httpGet:
            path: /api/health/alive
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        
        volumeMounts:
        - name: logs
          mountPath: /var/log/v03
        - name: storage
          mountPath: /var/v03/storage
      
      volumes:
      - name: logs
        emptyDir: {}
      - name: storage
        emptyDir: {}
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: v03-gateway
  namespace: default
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3001
    protocol: TCP
    name: http
  selector:
    app: v03-gateway
```

## Vercel Deployment

### Setup

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `pnpm build`
4. Set output directory: `dist`

### Environment Variables in Vercel

Add these via Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL = postgresql://...
JWT_SECRET = (generate new)
BETTER_AUTH_SECRET = (generate new)
CORS_ORIGIN = https://your-domain.com
NODE_ENV = production
LOG_LEVEL = warn
```

## Health Checks & Monitoring

### Health Check Endpoints

```bash
# Basic health (always healthy if server is running)
curl http://localhost:3001/api/health

# Detailed health (includes DB status)
curl http://localhost:3001/api/health/detailed

# Readiness (k8s readiness probe)
curl http://localhost:3001/api/health/ready

# Liveness (k8s liveness probe)
curl http://localhost:3001/api/health/alive
```

### Monitoring Dashboard

Set up monitoring for:

- **Application Metrics**:
  - Request latency (p50, p95, p99)
  - Error rate
  - Request volume
  - Database query time

- **System Metrics**:
  - CPU usage
  - Memory usage
  - Disk space
  - Connection count

- **Business Metrics**:
  - Active users
  - API calls per hour
  - Generation jobs completed

### Log Aggregation

Logs are written to `/var/log/v03/`:

- `combined.log` - All logs
- `error.log` - Errors only

Configure log forwarding to:

- ELK Stack
- Datadog
- New Relic
- CloudWatch (AWS)
- Stackdriver (GCP)

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check pool status
curl http://localhost:3001/api/health/detailed | jq '.checks.poolStats'

# Common issues:
# 1. Wrong credentials
# 2. Network/firewall blocking
# 3. Connection pool exhausted
```

### High Memory Usage

```bash
# Check Node.js heap
curl http://localhost:3001/api/health/detailed | jq '.checks.memory'

# Solutions:
# 1. Increase container memory limit
# 2. Reduce connection pool size
# 3. Check for memory leaks in logs
```

### Slow Requests

```bash
# Enable debug logging
LOG_LEVEL=debug node apps/gateway/dist/server.js

# Check for:
# 1. Slow database queries
# 2. Downstream API timeouts
# 3. Connection pool contention
```

### Deployment Failures

```bash
# Check logs
docker logs -f container-id

# Validate environment
node -e "require('./apps/gateway/dist/utils/env').validateEnv()"

# Test database
psql $DATABASE_URL -c "SELECT NOW()"
```

## Production Checklist

- [ ] Database backed up and tested restore
- [ ] All secrets in secure vault
- [ ] HTTPS/TLS enabled
- [ ] Rate limiting configured
- [ ] Error tracking set up (Sentry)
- [ ] Log aggregation configured
- [ ] Monitoring dashboards created
- [ ] Alerts configured for critical issues
- [ ] Runbook created for on-call
- [ ] Incident response plan documented
- [ ] Rollback procedure tested
- [ ] Performance baseline established
