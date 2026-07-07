# V03.tech Production Runbook

Operational procedures for V03.tech production environment.

## On-Call Rotation

- **On-call escalation**: Slack channel `#v03-oncall`
- **Escalation policy**: Primary → Secondary → Manager
- **Response SLA**: 5 minutes for critical issues

## Incident Severity Levels

| Level | Impact | Response | Resolution |
|-------|--------|----------|-----------|
| **P0** | Complete outage, data loss | Immediate (5 min) | 1 hour target |
| **P1** | Significant degradation | 15 minutes | 4 hours target |
| **P2** | Minor degradation | 1 hour | 24 hours target |
| **P3** | Cosmetic/non-urgent | Best effort | 1 week target |

## Common Issues & Solutions

### Issue: High Error Rate (>5%)

**Detection:**
```bash
# Check recent errors
curl http://v03.prod/api/health/detailed | jq '.checks'
tail -f /var/log/v03/error.log
```

**Diagnosis Steps:**
1. Check database connectivity
2. Review error logs for patterns
3. Check for recent deployments
4. Monitor system resources

**Solutions:**

```bash
# 1. Check database
psql $DATABASE_URL -c "SELECT NOW();"

# 2. Increase replicas (k8s)
kubectl scale deployment v03-gateway --replicas=5

# 3. Clear cache if applicable
redis-cli -h $REDIS_HOST FLUSHDB

# 4. Restart pods if needed
kubectl delete pod -l app=v03-gateway

# 5. If deploying rollback
git revert <commit-hash>
kubectl set image deployment/v03-gateway \
  gateway=ghcr.io/nurmohammadpro/v03:stable
```

### Issue: Database Connection Pool Exhausted

**Detection:**
```bash
curl http://v03.prod/api/health/detailed | jq '.checks.poolStats'
# Should show: totalConnections close to max (20)
```

**Quick Fix:**
```bash
# Temporary: Restart gateway service
docker restart v03-gateway
# or
kubectl rollout restart deployment/v03-gateway
```

**Long-term:**
```bash
# Analyze slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Increase pool size
export DATABASE_CONNECTION_POOL_SIZE=30
kubectl set env deployment/v03-gateway DATABASE_CONNECTION_POOL_SIZE=30
```

### Issue: High Memory Usage (>80%)

**Detection:**
```bash
curl http://v03.prod/api/health/detailed | jq '.checks.memory'
```

**Investigation:**
```bash
# Check Node.js process
ps aux | grep node
docker stats
kubectl top pod

# Enable heap dump
node --expose-gc apps/gateway/dist/server.js
# Send SIGUSR2 to trigger dump
kill -USR2 <pid>
```

**Solutions:**

1. **Increase container memory** (short-term):
   ```bash
   kubectl set resources deployment/v03-gateway -c=gateway \
     --limits=memory=2Gi \
     --requests=memory=1Gi
   ```

2. **Find memory leaks** (long-term):
   - Check for unclosed connections
   - Look for circular references
   - Review recent code changes

### Issue: Slow Response Times (p99 > 1s)

**Investigation:**
```bash
# Check logs for slow endpoints
grep "duration:" /var/log/v03/combined.log | sort -t= -k2 -rn | head -20

# Check database query performance
psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check system load
top
iostat -x 1
```

**Solutions:**

1. **Add database indexes:**
   ```sql
   -- Example: index on frequently filtered column
   CREATE INDEX CONCURRENTLY idx_projects_user_id ON projects(user_id);
   ```

2. **Optimize queries:**
   - Use EXPLAIN ANALYZE
   - Join reduction
   - Query result caching

3. **Scale horizontally:**
   ```bash
   kubectl scale deployment v03-gateway --replicas=5
   ```

## Deployment Procedures

### Deploying Code Changes

```bash
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Make changes and test locally
pnpm dev

# 3. Commit and push
git add .
git commit -m "feat: add awesome feature"
git push origin feat/my-feature

# 4. Create pull request
# (CI/CD runs tests and security scans)

# 5. Code review and merge to main

# 6. Automatic deployment triggers
# (via GitHub Actions to staging, then production)

# 7. Monitor deployment
kubectl rollout status deployment/v03-gateway -w
```

### Rollback Procedure

```bash
# 1. Identify problematic commit
git log --oneline -10

# 2. Revert changes
git revert <commit-hash>

# 3. Push and redeploy
git push origin main

# 4. Verify rollback
curl https://v03.prod/api/health/detailed
```

### Emergency Rollback (without git)

```bash
# 1. Switch to previous image
kubectl set image deployment/v03-gateway \
  gateway=ghcr.io/nurmohammadpro/v03:stable-previous

# 2. Monitor rollout
kubectl rollout status deployment/v03-gateway -w

# 3. Verify
curl https://v03.prod/api/health
```

## Maintenance Tasks

### Daily

- [ ] Monitor error rates (target: <1%)
- [ ] Check database size growth
- [ ] Review slow query logs
- [ ] Verify backup completion

### Weekly

- [ ] Review log aggregation
- [ ] Check certificate expiration (< 30 days warning)
- [ ] Analyze top errors and fix
- [ ] Update security patches

### Monthly

- [ ] Full system backup test
- [ ] Disaster recovery drill
- [ ] Performance baseline review
- [ ] Capacity planning assessment

### Quarterly

- [ ] Security audit
- [ ] Database optimization
- [ ] Dependency updates
- [ ] Architecture review

## Alerting Rules

### Critical Alerts (Page On-Call)

```yaml
- Alert: OutageDetected
  Threshold: Error rate > 10%
  Duration: 2 minutes
  Action: Page PagerDuty

- Alert: DatabaseDown
  Threshold: Connection fails
  Duration: 1 minute
  Action: Page PagerDuty

- Alert: DiskSpaceHigh
  Threshold: > 85% full
  Duration: Immediate
  Action: Page PagerDuty
```

### Warning Alerts (Slack Notification)

```yaml
- Alert: HighErrorRate
  Threshold: Error rate > 5%
  Duration: 5 minutes
  Channel: #v03-alerts

- Alert: SlowRequests
  Threshold: p99 > 1s
  Duration: 10 minutes
  Channel: #v03-alerts

- Alert: HighMemory
  Threshold: > 80%
  Duration: 5 minutes
  Channel: #v03-alerts
```

## Contact Information

- **Slack Channel**: #v03-oncall
- **PagerDuty**: v03-oncall@pagerduty.com
- **Email**: oncall@v03.tech
- **Emergency Hotline**: +1-XXX-XXX-XXXX

## Post-Incident

1. **Document incident** in #v03-incidents
2. **Assign owner** for RCA (Root Cause Analysis)
3. **Create action items** to prevent recurrence
4. **Update runbook** with new procedures
5. **Schedule postmortem** within 48 hours

### RCA Template

```markdown
# Incident: [Title]

## Timeline
- 12:00 UTC: Issue detected
- 12:05 UTC: On-call paged
- 12:15 UTC: Root cause identified
- 12:30 UTC: Fix deployed
- 12:35 UTC: Verified resolved

## Root Cause
[What actually happened]

## Contributing Factors
[What led to this situation]

## Impact
- Duration: 35 minutes
- Users affected: ~5000
- Data loss: None

## Resolution
[How we fixed it]

## Action Items
- [ ] Implement alerting for X
- [ ] Add monitoring for Y
- [ ] Documentation update
- [ ] Code change to prevent

## Prevention
[How we prevent this in future]
```

## Useful Commands

### Kubernetes

```bash
# Check deployment status
kubectl get deployment v03-gateway

# View logs
kubectl logs -f deployment/v03-gateway --tail=100

# Describe pod for events
kubectl describe pod <pod-name>

# Get metrics
kubectl top nodes
kubectl top pod

# Exec into container
kubectl exec -it <pod-name> -- /bin/sh

# Port forward
kubectl port-forward svc/v03-gateway 3001:3001
```

### Docker

```bash
# View logs
docker logs -f <container-id>

# Get stats
docker stats

# Execute command
docker exec <container-id> /bin/sh

# Inspect container
docker inspect <container-id>
```

### Database

```bash
# Connect
psql $DATABASE_URL

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND query_start < now() - interval '10 minutes';

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## References

- **Status Page**: https://status.v03.tech
- **Documentation**: https://docs.v03.tech
- **GitHub Issues**: https://github.com/nurmohammadpro/V03/issues
- **Internal Wiki**: [Link to internal wiki]
