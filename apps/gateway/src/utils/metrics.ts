import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface Metric {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  help: string;
  labels?: string[];
  value?: number;
  values?: Map<string, number>;
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();

  registerCounter(name: string, help: string, labels?: string[]) {
    this.metrics.set(name, {
      name,
      type: "counter",
      help,
      labels,
      values: new Map(),
    });
  }

  registerGauge(name: string, help: string, labels?: string[]) {
    this.metrics.set(name, {
      name,
      type: "gauge",
      help,
      labels,
      values: new Map(),
    });
  }

  registerHistogram(name: string, help: string, labels?: string[]) {
    this.metrics.set(name, {
      name,
      type: "histogram",
      help,
      labels,
      values: new Map(),
    });
  }

  increment(name: string, value: number = 1, labels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Metrics] Unknown metric: ${name}`);
      return;
    }

    const key = labels ? JSON.stringify(labels) : "default";
    const current = (metric.values?.get(key) || 0) + value;
    metric.values?.set(key, current);
  }

  set(name: string, value: number, labels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Metrics] Unknown metric: ${name}`);
      return;
    }

    const key = labels ? JSON.stringify(labels) : "default";
    metric.values?.set(key, value);
  }

  observe(name: string, value: number, labels?: Record<string, string>) {
    this.increment(name, value, labels);
  }

  getMetrics(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      // Add help and type
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Add metrics
      if (metric.values) {
        for (const [labels, value] of metric.values) {
          if (labels === "default") {
            lines.push(`${metric.name} ${value}`);
          } else {
            const labelStr = labels.replace(/"/g, '\\"');
            lines.push(`${metric.name}{${labelStr}} ${value}`);
          }
        }
      } else {
        lines.push(`${metric.name} ${metric.value || 0}`);
      }
    }

    return lines.join("\n") + "\n";
  }
}

const collector = new MetricsCollector();

// Initialize standard metrics
collector.registerCounter("http_requests_total", "Total HTTP requests", ["method", "status"]);
collector.registerHistogram("http_request_duration_ms", "HTTP request duration in ms", ["method", "route"]);
collector.registerGauge("database_connections", "Number of database connections", ["state"]);
collector.registerGauge("nodejs_heap_used_bytes", "Node.js heap used");
collector.registerGauge("nodejs_rss_bytes", "Node.js RSS memory");
collector.registerCounter("errors_total", "Total errors", ["type", "code"]);

export function getMetrics() {
  // Update system metrics
  const memUsage = process.memoryUsage();
  collector.set("nodejs_heap_used_bytes", memUsage.heapUsed);
  collector.set("nodejs_rss_bytes", memUsage.rss);

  return collector;
}

export async function registerMetricsEndpoint(app: FastifyInstance) {
  app.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = getMetrics();
    return reply
      .type("text/plain")
      .send(metrics.getMetrics());
  });
}

export function recordHttpMetric(method: string, route: string, status: number, duration: number) {
  const metrics = getMetrics();
  metrics.increment("http_requests_total", 1, { method, status: String(status) });
  metrics.observe("http_request_duration_ms", duration, { method, route });

  if (status >= 400) {
    const errorType = status >= 500 ? "server_error" : "client_error";
    metrics.increment("errors_total", 1, { type: errorType, code: String(status) });
  }
}

export function recordDatabaseMetrics(state: "idle" | "active", count: number) {
  const metrics = getMetrics();
  metrics.set("database_connections", count, { state });
}
