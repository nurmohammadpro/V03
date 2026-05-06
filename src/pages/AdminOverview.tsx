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
  LayoutDashboard,
  FolderKanban,
  Settings,
  RefreshCw,
  Download,
  UserPlus,
  Gauge,
  Activity,
  BarChart3,
  Shield,
  HardDrive,
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
        active: false,
        icon: <FolderKanban className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        label: "Overview",
        href: "/admin/overview",
        active: true,
        icon: <Gauge className="w-4 h-4" />,
      },
      {
        label: "Users",
        href: "/admin/users",
        active: false,
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        active: false,
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: "Activity",
        href: "/admin/activity",
        active: false,
        icon: <Activity className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        active: false,
        icon: <Settings className="w-4 h-4" />,
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
    <div className="min-h-screen bg-[#05070A] text-[#E6EDF3] relative">
      {/* Body vignette is handled by body::before in CSS */}

      <Sidebar
        navSections={NAV_SECTIONS}
        userFooter={
          <div className="flex items-center gap-3 py-1">
            <Avatar size="sm">
              <AvatarFallback className="bg-[#1F2937] text-[#9BA7B4]">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#E6EDF3] truncate">
                {user?.email?.split("@")[0] || "Admin"}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                {user?.email || "admin@v03.tech"}
              </p>
            </div>
            <Badge className="text-[10px] px-1.5 py-0 bg-[#3B82F6]/10 text-[#3B82F6] border-0 font-medium">
              Admin
            </Badge>
          </div>
        }
      />

      {/* Main — offset by 260px sidebar */}
      <main className="ml-[260px] min-h-screen overflow-y-auto relative z-[1]">
        <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#E6EDF3] tracking-tight">
                Admin Overview
              </h1>
              <p className="text-sm text-[#9BA7B4] mt-0.5">
                Platform analytics and management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-[#111827] p-0.5 rounded-lg">
                {(["7d", "30d", "90d"] as const).map((range) => (
                  <button
                    key={range}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200",
                      dateRange === range
                        ? "bg-[#1F2937] text-[#E6EDF3]"
                        : "text-[#6B7280] hover:text-[#9BA7B4]"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-[#9BA7B4] border-white/5 hover:bg-[#1F2937]">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="text-[#9BA7B4] border-white/5 hover:bg-[#1F2937]">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>
              <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
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
          </div>

          {/* ── Secondary Stats ── */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            {[
              { label: "Active Users", value: stats.activeUsers, color: "" },
              { label: "API Uptime", value: `${stats.apiUptime}%`, color: "text-[#22C55E]" },
              { label: "Error Rate", value: `${stats.errorRate}%`, color: "" },
              { label: "Queue Depth", value: stats.queueDepth, color: "" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/5 bg-[#0F141A] p-4"
              >
                <p className="text-xs text-[#6B7280] mb-1">{s.label}</p>
                <p className={cn("text-lg font-semibold text-[#E6EDF3]", s.color)}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Charts Row ── */}
          <div className="grid gap-6 md:grid-cols-2">
            <TrendChart
              title="Revenue (30 days)"
              data={stats.revenueTrend}
              variant="area"
              color="#22C55E"
              formatValue={(v) => `$${v}`}
              loading={loading}
            />
            <TrendChart
              title="User Growth (30 days)"
              data={stats.userTrend}
              variant="bar"
              color="#3B82F6"
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
