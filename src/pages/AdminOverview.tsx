import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sidebar } from "@/components/shared/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/Charts";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  Zap,
  DollarSign,
  Activity,
  RefreshCw,
  Download,
  UserPlus,
  Gauge,
} from "lucide-react";
import { useAdminStats, useAdminUsers, useActivityFeed } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Projects",
    href: "/dashboard",
    active: false,
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    label: "Admin",
    href: "/admin/overview",
    active: true,
    icon: <Gauge className="w-5 h-5" />,
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
    <div className="min-h-screen bg-background flex">
      <Sidebar
        navItems={NAV_ITEMS}
        userFooter={
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <Avatar size="sm">
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "A"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{user?.email || "Admin"}</p>
              <Badge className="mt-0.5 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                Admin
              </Badge>
            </div>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Admin Overview
              </h1>
              <p className="text-muted-foreground mt-1">
                Platform analytics and management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-xs">
                {(["7d", "30d", "90d"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {}}
                    className={cn(
                      "px-3 py-1.5 font-medium rounded-md transition-colors",
                      dateRange === range
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-1.5" />
                Invite
              </Button>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              change={stats.userGrowth}
              loading={loading}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Total Projects"
              value={stats.totalProjects.toLocaleString()}
              change={stats.projectGrowth}
              loading={loading}
              icon={<FolderKanban className="w-5 h-5" />}
            />
            <StatCard
              title="Generations Today"
              value={stats.generationsToday.toLocaleString()}
              change={stats.generationGrowth}
              loading={loading}
              icon={<Zap className="w-5 h-5" />}
            />
            <StatCard
              title="Revenue"
              value={formatCurrency(stats.revenue)}
              change={stats.revenueGrowth}
              loading={loading}
              icon={<DollarSign className="w-5 h-5" />}
            />
          </div>

          {/* ── Secondary Stats ── */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Active Users</p>
              <p className="text-xl font-bold text-foreground">{stats.activeUsers}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">API Uptime</p>
              <p className="text-xl font-bold text-green-500">{stats.apiUptime}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Error Rate</p>
              <p className="text-xl font-bold text-foreground">{stats.errorRate}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Queue Depth</p>
              <p className="text-xl font-bold text-foreground">{stats.queueDepth}</p>
            </div>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid gap-6 md:grid-cols-2">
            <TrendChart
              title="Revenue (30 days)"
              data={stats.revenueTrend}
              variant="area"
              color="hsl(142, 76%, 36%)"
              formatValue={(v) => `$${v}`}
              loading={loading}
            />
            <TrendChart
              title="User Growth (30 days)"
              data={stats.userTrend}
              variant="bar"
              color="hsl(221, 83%, 53%)"
              loading={loading}
            />
          </div>

          {/* ── Users Table ── */}
          <UsersTable users={users} loading={usersLoading} />

          {/* ── Activity Feed ── */}
          <ActivityFeed
            activities={activities}
            loading={activitiesLoading}
            title="Platform Activity"
          />
        </div>
      </main>
    </div>
  );
}
