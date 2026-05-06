import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sidebar } from "@/components/shared/Sidebar";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjects";
import { useActivityFeed, useUserStats } from "@/hooks/useDashboardData";
import {
  FolderKanban,
  Gauge,
  Zap,
  HardDrive,
  Plus,
  Sparkles,
  Clock,
  Star,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        active: true,
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
        active: false,
        icon: <Gauge className="w-4 h-4" />,
      },
    ],
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { activities, loading: activitiesLoading } = useActivityFeed();
  const { stats: userStats, loading: statsLoading } = useUserStats();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E6EDF3]">
      <Sidebar
        navSections={NAV_SECTIONS}
        userFooter={
          <div className="flex items-center gap-3 py-1">
            <Avatar size="sm">
              <AvatarFallback className="bg-[#1F2937] text-[#9BA7B4]">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#E6EDF3] truncate">
                {user?.email?.split("@")[0] || "Guest"}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                {user?.email || "guest@v03.tech"}
              </p>
            </div>
            <Badge className="text-[10px] px-1.5 py-0 border border-white/5 text-[#9BA7B4] font-medium">
              Pro
            </Badge>
          </div>
        }
      />

      <main className="ml-[260px] min-h-screen overflow-y-auto relative z-[1]">
        <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#E6EDF3] tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-[#9BA7B4] mt-0.5">
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>

          {/* ── Usage Stats ── */}
          {!statsLoading && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-[#0F141A] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#3B82F6]" /> Daily Generations
                  </span>
                  <span className="text-xs font-medium text-[#9BA7B4]">
                    {userStats.generationsToday} / {userStats.dailyLimit}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3B82F6] rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStats.generationsToday / userStats.dailyLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0F141A] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#22C55E]" /> Storage
                  </span>
                  <span className="text-xs font-medium text-[#9BA7B4]">
                    {userStats.storageUsed}MB / {userStats.storageLimit}MB
                  </span>
                </div>
                <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22C55E] rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStats.storageUsed / userStats.storageLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0F141A] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#A855F7]" /> Projects
                  </span>
                  <span className="text-xs font-medium text-[#9BA7B4]">
                    {userStats.projectsCount} total
                  </span>
                </div>
                <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#A855F7] rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (userStats.projectsCount / 20) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Onboarding Banner ── */}
          {projects.length === 0 && !projectsLoading && (
            <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0F141A] p-6 lg:p-8">
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#3B82F6]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative">
                <Sparkles className="w-6 h-6 text-[#3B82F6] mb-3" />
                <h2 className="text-lg font-semibold text-[#E6EDF3] mb-1">
                  Welcome to v03
                </h2>
                <p className="text-sm text-[#9BA7B4] max-w-lg mb-4">
                  Create your first project to start building with AI. Choose a template
                  or start from scratch — we&apos;ll generate the code for you.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(true)}
                    className="text-[#9BA7B4] border-white/5 hover:bg-[#1F2937]"
                  >
                    Browse Templates
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          {projects.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[13px] font-medium text-[#6B7280]">Quick:</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] text-[#9BA7B4] hover:bg-[#1F2937] hover:text-[#E6EDF3] transition-colors text-xs">
                <Clock className="w-3.5 h-3.5" /> Recent
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] text-[#9BA7B4] hover:bg-[#1F2937] hover:text-[#E6EDF3] transition-colors text-xs">
                <Star className="w-3.5 h-3.5" /> Favorites
              </button>
            </div>
          )}

          {/* ── Projects Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#E6EDF3]">Your Projects</h2>
              {projects.length > 0 && (
                <p className="text-xs text-[#6B7280]">
                  {projects.length} project{projects.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <ProjectsGrid projects={projects} loading={projectsLoading} />
          </div>

          {/* ── Activity Feed ── */}
          {activities.length > 0 && (
            <ActivityFeed
              activities={activities}
              loading={activitiesLoading}
              title="Recent Activity"
            />
          )}
        </div>
      </main>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
