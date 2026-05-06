import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sidebar } from "@/components/shared/Sidebar";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjects";
import { useActivityFeed, useUserStats } from "@/hooks/useDashboardData";
import { FolderKanban, Gauge, Zap, HardDrive, Plus, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Projects",
    href: "/dashboard",
    active: true,
    icon: <FolderKanban className="w-5 h-5" />,
  },
  {
    label: "Admin",
    href: "/admin/overview",
    active: false,
    icon: <Gauge className="w-5 h-5" />,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { activities, loading: activitiesLoading } = useActivityFeed();
  const { stats: userStats, loading: statsLoading } = useUserStats();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        navItems={NAV_ITEMS}
        userFooter={
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <Avatar size="sm">
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{user?.email || "Guest"}</p>
              <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0">
                Pro
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
                Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create New Project
            </Button>
          </div>

          {/* ── Usage Stats ── */}
          {!statsLoading && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Daily Generations
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {userStats.generationsToday} / {userStats.dailyLimit}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStats.generationsToday / userStats.dailyLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" /> Storage
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {userStats.storageUsed}MB / {userStats.storageLimit}MB
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (userStats.storageUsed / userStats.storageLimit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" /> Total Projects
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {userStats.projectsCount}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (userStats.projectsCount / 20) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Welcome / Onboarding Banner ── */}
          {projects.length === 0 && !projectsLoading && (
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-6 lg:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <div className="relative">
                <Sparkles className="w-8 h-8 text-primary mb-3" />
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Welcome to v03
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg mb-4">
                  Create your first project to start building with AI. Choose a template
                  or start from scratch — we'll generate the code for you.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>
                  <Button variant="outline" onClick={() => setCreateOpen(true)}>
                    Browse Templates
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Projects Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
              {projects.length > 0 && (
                <p className="text-xs text-muted-foreground">
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

      {/* ── Create Project Dialog ── */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
