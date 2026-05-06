import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/Charts";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import {
  FolderKanban,
  Activity,
  BarChart3,
  Users,
} from "lucide-react";
import { useAdminStats, useAdminUsers, useActivityFeed } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

function formatCurrency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function AdminOverview() {
  const { stats, loading, bootstrap, totalAdmins } = useAdminStats();
  const { users, loading: usersLoading } = useAdminUsers();
  const { activities, loading: activitiesLoading } = useActivityFeed();

  return (
    <AdminShell
      title="Admin"
      subtitle="Usage, accounts, generation load, and system health."
    >
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
                  Operations
                </p>
                <h2 className="mt-2 text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] sm:text-[16px]">
                  Platform status at a glance.
                </h2>
                <p className="mt-2 max-w-[54ch] text-sm text-[var(--app-text-muted)]">
                  Monitor load, quality, and account activity without dashboard noise.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Active subscriptions</p>
                <p className="mt-3 text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">
                  {stats.activeSubscriptions}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">seeded paid or trial plans</p>
              </div>
              <div className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Queue depth</p>
                <p className="mt-3 text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">
                  {stats.queueDepth}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">jobs waiting for workers</p>
              </div>
              <div className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">API uptime</p>
                <p className="mt-3 text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">
                  {stats.apiUptime}%
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">last 30 days</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
              <p className="text-sm font-normal text-[var(--app-text)]">Operational summary</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                {bootstrap?.actor.email || "Admin actor"} currently has {totalAdmins} active admin assignment{totalAdmins === 1 ? "" : "s"} across the system.
              </p>
            </div>
            <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
              <p className="text-sm font-normal text-[var(--app-text)]">Current risk</p>
              <p className="mt-2 text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">
                {stats.errorRate}%
              </p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">error rate across builder actions</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            change={stats.userGrowth}
            loading={loading}
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            title="Total Projects"
            value={stats.totalProjects.toLocaleString()}
            change={stats.projectGrowth}
            loading={loading}
            icon={<FolderKanban className="w-4 h-4" />}
          />
          <StatCard
            title="Generations Today"
            value={stats.generationsToday.toLocaleString()}
            change={stats.generationGrowth}
            loading={loading}
            icon={<Activity className="w-4 h-4" />}
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(stats.revenue)}
            change={stats.revenueGrowth}
            loading={loading}
            icon={<BarChart3 className="w-4 h-4" />}
          />
        </section>

        <section className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Active Users", value: stats.activeUsers, color: "" },
            { label: "Suspended", value: stats.suspendedUsers, color: "" },
            { label: "API Uptime", value: `${stats.apiUptime}%`, color: "text-[var(--app-success)]" },
            { label: "Queue Depth", value: stats.queueDepth, color: "" },
          ].map((s) => (
            <div
              key={s.label}
                className="rounded-[8px] bg-[var(--app-panel)] p-4 backdrop-blur-xl"
              >
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{s.label}</p>
              <p className={cn("text-[20px] font-medium tracking-[-0.03em] text-[var(--app-text)]", s.color)}>
                {s.value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <TrendChart
            title="Revenue (30 days)"
            data={stats.revenueTrend}
            variant="area"
            color="var(--app-success)"
            formatValue={(v) => `$${v}`}
            loading={loading}
          />
          <TrendChart
            title="User Growth (30 days)"
            data={stats.userTrend}
            variant="bar"
            color="var(--app-accent)"
            loading={loading}
          />
        </section>

        <UsersTable users={users} loading={usersLoading} />

        <ActivityFeed
          activities={activities}
          loading={activitiesLoading}
          title="Platform activity"
        />
      </div>
    </AdminShell>
  );
}
