import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppShell } from "@/components/shared/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/Charts";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  BellRing,
  FolderKanban,
  Settings,
  RefreshCw,
  Download,
  UserPlus,
  Gauge,
  Activity,
  BarChart3,
  Users,
} from "lucide-react";
import { useAdminStats, useAdminUsers, useActivityFeed } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Projects",
        href: "/dashboard",
        icon: <FolderKanban className="w-4 h-4" />,
        description: "User-facing workspace view",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        label: "Overview",
        href: "/admin/overview",
        icon: <Gauge className="w-4 h-4" />,
        description: "Platform health and usage",
      },
    ],
  },
];

function formatCurrency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

export default function AdminOverview() {
  const { user } = useAuth();
  const { stats, loading } = useAdminStats();
  const { users, loading: usersLoading } = useAdminUsers();
  const { activities, loading: activitiesLoading } = useActivityFeed();
  const [dateRange] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <AppShell
      title="Admin Overview"
      subtitle="Operational visibility for usage, accounts, generation load, and system health."
      badge={
        <Badge className="rounded-full border-0 bg-[var(--app-danger-soft)] px-2.5 py-1 text-[11px] font-normal text-[var(--app-danger)]">
          Internal
        </Badge>
      }
      navSections={NAV_SECTIONS}
      headerActions={
        <>
          <div className="flex gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-normal transition-colors duration-200",
                  dateRange === range
                    ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="rounded-full bg-[var(--app-accent)] text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite
          </Button>
        </>
      }
      userFooter={
        <div className="flex items-center gap-3 py-1">
          <Avatar size="sm">
            <AvatarFallback className="bg-[var(--app-surface)] text-[var(--app-text-muted)]">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[var(--app-text)]">
              {user?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="truncate text-[11px] text-[var(--app-text-dim)]">
              {user?.email || "admin@v03.tech"}
            </p>
          </div>
          <Badge className="rounded-full border-0 bg-[var(--app-accent-soft)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-accent)]">
            Admin
          </Badge>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
                  Platform pulse
                </p>
                <h2 className="mt-3 max-w-[14ch] text-[32px] font-medium tracking-[-0.05em] text-[var(--app-text)] sm:text-[38px]">
                  Keep usage clear and intervention quiet.
                </h2>
                <p className="mt-3 max-w-[58ch] text-sm text-[var(--app-text-muted)]">
                  Separate the admin surface from the builder experience. This view is for operations, growth, and system quality.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <BellRing className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Live users</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {stats.activeUsers}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">currently active</p>
              </div>
              <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Queue depth</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {stats.queueDepth}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">jobs waiting for workers</p>
              </div>
              <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">API uptime</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {stats.apiUptime}%
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">last 30 days</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <p className="text-sm font-medium text-[var(--app-text)]">Operational summary</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                Usage is trending upward while the error rate remains contained. This dashboard is tuned for intervention, not decoration.
              </p>
            </div>
            <div className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <p className="text-sm font-medium text-[var(--app-text)]">Current risk</p>
              <p className="mt-2 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
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
            { label: "API Uptime", value: `${stats.apiUptime}%`, color: "text-[var(--app-success)]" },
            { label: "Error Rate", value: `${stats.errorRate}%`, color: "" },
            { label: "Queue Depth", value: stats.queueDepth, color: "" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl"
            >
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{s.label}</p>
              <p className={cn("text-[24px] font-medium tracking-[-0.04em] text-[var(--app-text)]", s.color)}>
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
    </AppShell>
  );
}
