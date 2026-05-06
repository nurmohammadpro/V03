import { AdminShell } from "@/components/admin/AdminShell";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useActivityFeed, useAdminStats } from "@/hooks/useDashboardData";
import { Bot, Cpu, Gauge, Layers3 } from "lucide-react";

export default function AdminSystem() {
  const { stats } = useAdminStats();
  const { activities, loading } = useActivityFeed();

  return (
    <AdminShell
      title="AI Management"
      subtitle="Providers, generation pressure, queue depth, and AI-side operational signals."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Queue depth", value: stats.queueDepth, icon: Gauge },
            { label: "Error rate", value: `${stats.errorRate}%`, icon: Layers3 },
            { label: "Provider health", value: `${stats.apiUptime}%`, icon: Bot },
            { label: "Workers", value: "12 online", icon: Cpu },
          ].map((item) => (
            <div key={item.label} className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <item.icon className="h-4 w-4" />
              </div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{item.label}</p>
              <p className="mt-3 text-[20px] font-medium tracking-[-0.03em] text-[var(--app-text)]">{item.value}</p>
            </div>
          ))}
        </section>
        <ActivityFeed activities={activities} loading={loading} title="AI activity" />
      </div>
    </AdminShell>
  );
}
