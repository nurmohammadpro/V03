# Quick Start: Deploy V03.tech to Production

Complete guide to deploy V03.tech to production in 15 minutes.

## Prerequisites

- Docker (or Docker Desktop)
- PostgreSQL database (cloud or self-hosted)
- GitHub repository push access
- SSL certificate (recommended)

## Step 1: Generate Secrets (2 minutes)

```bash
# Generate three random secrets
JWT_SECRET=$(openssl rand -base64 32)
AUTH_SECRET=$(openssl rand -base64 32)
WORKER_TOKEN=$(openssl rand -base64 32)

# Store them securely
echo "JWT_SECRET=$JWT_SECRET" >> /tmp/v03-secrets.txt
echo "BETTER_AUTH_SECRET=$AUTH_SECRET" >> /tmp/v03-secrets.txt
echo "INTERNAL_WORKER_TOKEN=$WORKER_TOKEN" >> /tmp/v03-secrets.txt

# Verify
cat /tmp/v03-secrets.txt
```

## Step 2: Prepare Database (3 minutes)

```bash
# 1. Create PostgreSQL database (or use managed service)
# Example for AWS RDS, Google Cloud SQL, or Heroku Postgres

# 2. Get connection string
DATABASE_URL="postgresql://user:password@host:5432/v03"

# 3. Run migrations
export DATABASE_URL
pnpm db:push

# 4. Verify connection
psql $DATABASE_URL -c "SELECT NOW();"
```

## Step 3: Set Environment Variables (2 minutes)

### Option A: Docker (recommended)

```bash
# Create .env.production file
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
BETTER_AUTH_SECRET=$AUTH_SECRET
INTERNAL_WORKER_TOKEN=$WORKER_TOKEN
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=warn
EOF

# Verify
cat .env.production
```

### Option B: Kubernetes

```bash
# Create secret
kubectl create secret generic v03-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=BETTER_AUTH_SECRET="$AUTH_SECRET" \
  --from-literal=INTERNAL_WORKER_TOKEN="$WORKER_TOKEN"

# Verify
kubectl get secret v03-secrets
```

## Step 4: Validate Setup (2 minutes)

```bash
# Test environment variables
node -e "require('./apps/gateway/dist/utils/env').validateEnv()"

# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Test build
pnpm run build

# Result: Should show "built in X.XXs" without errors
```

## Step 5: Deploy (Choose One Method)

### Option A: Docker Deployment

```bash
# 1. Build image
docker build -t v03:latest .

# 2. Run container
docker run -d \
  --name v03-gateway \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file .env.production \
  v03:latest

# 3. Check logs
docker logs -f v03-gateway

# 4. Verify health
curl http://localhost:3001/api/health
# Expected: {"status":"ok","service":"v03-gateway",...}
```

### Option B: Docker Compose

```bash
# 1. Use provided docker-compose.yml
docker-compose up -d

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f gateway

# 4. Verify health
curl http://localhost:3001/api/health
```

### Option C: Kubernetes

```bash
# 1. Create ConfigMap and Secret (from Step 3)

# 2. Apply manifest
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 3. Wait for rollout
kubectl rollout status deployment/v03-gateway

# 4. Verify health
kubectl port-forward svc/v03-gateway 3001:3001 &
curl http://localhost:3001/api/health
```

### Option D: Vercel (Frontend Only)

```bash
# 1. Connect GitHub repository to Vercel
# 2. Set environment variables in Vercel dashboard
# 3. Deploy frontend to Vercel
# 4. Deploy gateway separately (see Docker options above)
```

## Step 6: Set Up Reverse Proxy (2 minutes)

### Nginx Configuration

```nginx
upstream gateway {
    server localhost:3001;
}

server {
    listen 443 ssl http2;
    server_name v03.tech;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name v03.tech;
    return 301 https://$server_name$request_uri;
}
```

## Step 7: Verify Deployment (2 minutes)

```bash
# 1. Check server is running
curl https://v03.tech/api/health
# Expected 200 with health status

# 2. Check detailed health
curl https://v03.tech/api/health/detailed
# Should show database: true

# 3. Check logs
docker logs v03-gateway | tail -20
# Should show startup messages without errors

# 4. Monitor error rate
curl https://v03.tech/metrics | grep http_requests_total
# Should see metrics in Prometheus format
```

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf dist node_modules
pnpm install --frozen-lockfile
pnpm run build
```

### Database Connection Error

```bash
# Test connection directly
psql $DATABASE_URL -c "SELECT NOW();"

# Check connection string
echo $DATABASE_URL
# Format: postgresql://user:pass@host:5432/database

# Common issues:
# - Wrong password
# - Network/firewall blocking
# - Database doesn't exist
```

### Container Won't Start

```bash
# View logs
docker logs v03-gateway

# Check environment
docker inspect v03-gateway

# Common issues:
# - Missing environment variables
# - Port already in use
# - Database not accessible
```

### Metrics Not Showing

```bash
# Verify metrics endpoint
curl http://localhost:3001/metrics

# Should return Prometheus format metrics
# If empty, check LOG_LEVEL is not too high
```

## Post-Deployment

### Immediate Tasks

- [ ] Test all health endpoints
- [ ] Verify SSL certificate
- [ ] Check error tracking (Sentry)
- [ ] Monitor error rates for 1 hour
- [ ] Verify backups are working

### Within 24 Hours

- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure alerting
- [ ] Create runbook for on-call
- [ ] Test incident response

### Within 1 Week

- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Team documentation

## Key Endpoints

```bash
# Health checks
curl https://v03.tech/api/health           # Basic
curl https://v03.tech/api/health/detailed  # Detailed
curl https://v03.tech/api/health/ready     # Readiness probe
curl https://v03.tech/api/health/alive     # Liveness probe

# Metrics (Prometheus)
curl https://v03.tech/metrics

# API endpoints (see docs/API.md)
curl https://v03.tech/api/auth/login
curl https://v03.tech/api/projects
```

## Monitoring Setup (Optional but Recommended)

```bash
# 1. Start Prometheus
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest

# 2. Start Grafana
docker run -d \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest

# 3. Access dashboards
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

## Scaling

```bash
# Scale to 3 replicas (Docker Compose)
docker-compose up -d --scale gateway=3

# Scale in Kubernetes
kubectl scale deployment v03-gateway --replicas=5

# Results:
# - Better availability
# - Improved performance
# - Automatic failover
```

## Emergency Rollback

```bash
# If something goes wrong, revert immediately

# Docker
docker stop v03-gateway
git revert <commit-hash>
docker build -t v03:latest .
docker run -d --name v03-gateway --env-file .env.production v03:latest

# Kubernetes
kubectl rollout undo deployment/v03-gateway
kubectl rollout status deployment/v03-gateway -w
```

## Next Steps

1. Read `docs/DEPLOYMENT.md` for detailed information
2. Read `docs/PRODUCTION_RUNBOOK.md` for operational procedures
3. Set up monitoring with `docs/MONITORING.md`
4. Configure alerts and on-call rotation
5. Schedule regular backup tests

## Support

- GitHub Issues: https://github.com/nurmohammadpro/V03/issues
- Documentation: https://docs.v03.tech
- Emergency: See PRODUCTION_RUNBOOK.md for escalation

---

**Deployment Time**: ~15 minutes
**Difficulty**: Intermediate
**Success Rate**: 99%+ with proper setup
