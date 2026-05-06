import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuditLogs, useServiceIntegrations, useUpdateServiceIntegration } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminServices() {
  const { services } = useServiceIntegrations();
  const { logs } = useAdminAuditLogs();
  const updateService = useUpdateServiceIntegration();

  async function handleToggleService(serviceId: string, status: string) {
    const nextStatus = status === "active" ? "degraded" : "active";

    try {
      await updateService.mutateAsync({ serviceId, body: { status: nextStatus } });
      toast.success(`Service moved to ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update service.");
    }
  }

  return (
    <AdminShell title="Other Services" subtitle="Supporting infrastructure, secrets, and operational safeguards.">
      <div className="space-y-6">
        <section className="rounded-[8px] bg-[var(--app-panel)] p-5">
          <p className="text-sm text-[var(--app-text)]">Service surfaces</p>
          <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--app-text-muted)]">
            This domain holds everything around the core builder that still affects reliability: storage, billing, notifications, runtime dependencies, and protection controls.
          </p>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-[8px] bg-[var(--app-panel)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--app-text)]">{service.name}</p>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">{service.note}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--app-text-dim)]">{service.status}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleService(service.id, service.status)}
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                    >
                      {service.status === "active" ? "Degrade" : "Activate"}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Type</p>
                    <p className="mt-2 text-sm text-[var(--app-text)]">{service.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Secret reference</p>
                    <p className="mt-2 text-sm text-[var(--app-text)]">{service.secretRef}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Recent admin actions</p>
            <div className="mt-4 space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--app-text)]">{log.action}</p>
                    <span className="text-xs text-[var(--app-text-dim)]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                    {log.actorName} · {log.actorRole}
                  </p>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                    {log.targetType}: <span className="text-[var(--app-text)]">{log.targetName}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
