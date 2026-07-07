# V03.tech Monitoring Setup

Comprehensive guide for setting up monitoring, logging, and alerting for V03.tech.

## Overview

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and management
- **Node Exporter**: System metrics
- **Postgres Exporter**: Database metrics
- **ELK Stack**: Log aggregation (optional)

## Quick Start with Docker Compose

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-provisioning:/etc/grafana/provisioning

  node_exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter:latest
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://user:pass@db:5432/v03"

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
```

## Prometheus Setup

### Configuration

Prometheus is configured to scrape metrics from:

- **V03 Gateway** (`/metrics` endpoint)
- **Node Exporter** (system metrics)
- **Postgres Exporter** (database metrics)

See `monitoring/prometheus.yml` for details.

### Alerting Rules

Alert rules are defined in `monitoring/alerts.yml` and categorized by severity:

- **Critical**: Page on-call immediately
- **Warning**: Slack notification
- **Info**: Log entry

## Grafana Dashboards

### Default Dashboards

1. **Overview Dashboard**
   - Request rate
   - Error rate
   - Latency (p50, p95, p99)
   - System resources

2. **Application Dashboard**
   - HTTP requests by endpoint
   - Error distribution
   - Database query times
   - Memory/CPU usage

3. **Infrastructure Dashboard**
   - Node CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

4. **Database Dashboard**
   - Connection count
   - Query performance
   - Replication lag
   - Table sizes

### Creating Custom Dashboards

1. Open Grafana: http://localhost:3000
2. Login with admin/admin
3. Click "+" → "Dashboard"
4. Add panels with Prometheus queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Latency p99
histogram_quantile(0.99, http_request_duration_ms)

# Database connections
pg_stat_activity_count
```

## Alertmanager Configuration

Set up `monitoring/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  receiver: 'team-slack'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

    - match:
        severity: warning
      receiver: 'team-slack'

receivers:
  - name: 'team-slack'
    slack_configs:
      - channel: '#v03-alerts'
        title: 'Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

## Log Aggregation

### ELK Stack (Elasticsearch, Logstash, Kibana)

#### 1. Install ELK

```bash
docker run -d -p 9200:9200 -p 9300:9300 \
  -e discovery.type=single-node \
  docker.elastic.co/elasticsearch/elasticsearch:7.14.0

docker run -d -p 5601:5601 \
  docker.elastic.co/kibana/kibana:7.14.0
```

#### 2. Configure Logstash

```conf
input {
  file {
    path => "/var/log/v03/combined.log"
    start_position => "beginning"
    codec => "json"
  }
}

filter {
  if [level] == "ERROR" {
    mutate {
      add_tag => ["error"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "v03-logs-%{+YYYY.MM.dd}"
  }
}
```

#### 3. Access Kibana

Open http://localhost:5601 and create index pattern `v03-logs-*`

### Alternative: Cloud Logging Services

- **Datadog**: Enterprise monitoring
- **New Relic**: APM and monitoring
- **CloudWatch** (AWS): AWS-native logging
- **Stackdriver** (GCP): GCP-native logging

## Sentry Integration

### Setup

1. Create Sentry account at https://sentry.io
2. Create new project
3. Get DSN and add to environment:

```bash
SENTRY_DSN=https://key@sentry.io/project-id
```

### Automatic Error Tracking

Errors are automatically sent to Sentry via:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

app.addHook("onError", async (error) => {
  Sentry.captureException(error);
});
```

## Key Metrics to Monitor

### Application Metrics

| Metric | Target | Alert > |
|--------|--------|---------|
| Request rate | 100-1000 req/s | - |
| Error rate | < 1% | 5% |
| Latency p99 | < 500ms | 1000ms |
| Database connections | 10-20 | 80 |

### System Metrics

| Metric | Target | Alert > |
|--------|--------|---------|
| CPU usage | 40-60% | 80% |
| Memory usage | 50-70% | 85% |
| Disk usage | 50-70% | 85% |
| Network I/O | Varies | - |

### Business Metrics

| Metric | Target |
|--------|--------|
| Active users | Increase or stable |
| API calls/hour | Expected pattern |
| Generations/hour | Expected pattern |
| User retention | > 80% monthly |

## SLA Targets

- **Availability**: 99.9% uptime (< 43 minutes downtime/month)
- **Latency**: 500ms p50, 2s p99
- **Error rate**: < 1%
- **MTTR**: < 15 minutes
- **MTBF**: > 30 days

## Runbooks

See `docs/PRODUCTION_RUNBOOK.md` for operational procedures and incident response.

## Troubleshooting

### Prometheus not scraping metrics

```bash
# Check metrics endpoint
curl http://localhost:3001/metrics

# Check prometheus targets
curl http://localhost:9090/api/v1/targets
```

### Grafana not showing data

1. Verify Prometheus datasource: Configuration → Data Sources
2. Check Prometheus is scraping: http://localhost:9090/targets
3. Verify metrics exist: http://localhost:9090/graph

### Alerts not firing

1. Check alertmanager status: http://localhost:9093
2. Verify rules exist: http://localhost:9090/alerts
3. Check rule evaluation: Look for `rule_evaluation_failures` metric

## Best Practices

1. **Set realistic thresholds** - Alert fatigue reduces effectiveness
2. **Document runbooks** - Each alert should have a runbook
3. **Test alerts** - Regularly test alert response procedures
4. **Review metrics** - Monthly review of alert quality
5. **Automate remediation** - Auto-healing for common issues
6. **Maintain dashboards** - Keep dashboards up-to-date and useful

## Advanced Monitoring

### Custom Metrics

Add custom application metrics:

```typescript
import { getMetrics } from './utils/metrics';

const metrics = getMetrics();
metrics.registerCounter('custom_events_total', 'Custom events');
metrics.increment('custom_events_total', 1, { type: 'user_signup' });
```

### Distributed Tracing

Consider adding OpenTelemetry for distributed tracing:

```typescript
import { init } from '@opentelemetry/auto-instrumentations-node';
import { NodeTracerProvider } from '@opentelemetry/sdk-node';

const traceProvider = new NodeTracerProvider();
traceProvider.addSpanProcessor(new JaegerExporter());
```

## References

- Prometheus: https://prometheus.io/docs
- Grafana: https://grafana.com/docs
- Alertmanager: https://prometheus.io/docs/alerting/latest/overview
- Sentry: https://docs.sentry.io
