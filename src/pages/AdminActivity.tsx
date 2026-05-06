import { AdminShell } from "@/components/admin/AdminShell";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useActivityFeed, useAdminAuditLogs } from "@/hooks/useDashboardData";

export default function AdminActivity() {
  const { activities, loading } = useActivityFeed();
  const { logs } = useAdminAuditLogs();

  return (
    <AdminShell
      title="Activity"
      subtitle="Recent platform events across user, generation, export, and failure flows."
    >
      <div className="space-y-6">
        <ActivityFeed activities={activities} loading={loading} title="Platform activity" maxItems={20} />
        <section className="rounded-[8px] bg-[var(--app-panel)] p-5">
          <p className="text-sm text-[var(--app-text)]">Admin audit trail</p>
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--app-text)]">{log.action}</p>
                  <span className="text-xs text-[var(--app-text-dim)]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
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
        </section>
      </div>
    </AdminShell>
  );
}
