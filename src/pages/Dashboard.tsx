import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppShell } from "@/components/shared/AppShell";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "@/hooks/useProjects";
import { useActivityFeed, useUserStats } from "@/hooks/useDashboardData";
import {
  ArrowRight,
  Blocks,
  FolderKanban,
  Gauge,
  HardDrive,
  Plus,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <FolderKanban className="w-4 h-4" />,
        description: "Projects, drafts, and builder context",
      },
      {
        label: "Workspace",
        href: "/workspace/new",
        icon: <Blocks className="w-4 h-4" />,
        description: "Prompt, code, and preview",
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
        description: "Platform-wide operations",
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
    <AppShell
      title="Client Dashboard"
      subtitle="A quieter control surface for ongoing app work, project drafts, and generation limits."
      badge={
        <Badge className="rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-2.5 py-1 text-[11px] font-normal text-[var(--app-text-muted)]">
          Workspace account
        </Badge>
      }
      headerActions={
        <Button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-[var(--app-accent)] px-4 text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
      navSections={NAV_SECTIONS}
      userFooter={
        <div className="flex items-center gap-3 py-1">
          <Avatar size="sm">
            <AvatarFallback className="bg-[var(--app-surface)] text-[var(--app-text-muted)]">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[var(--app-text)]">
              {user?.email?.split("@")[0] || "Guest"}
            </p>
            <p className="truncate text-[11px] text-[var(--app-text-dim)]">
              {user?.email || "guest@v03.tech"}
            </p>
          </div>
          <Badge className="rounded-full border-0 bg-[var(--app-accent-soft)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-accent)]">
            Pro
          </Badge>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
                  Builder status
                </p>
                <h2 className="mt-3 max-w-[14ch] text-[32px] font-medium tracking-[-0.05em] text-[var(--app-text)] sm:text-[38px]">
                  Keep the product loop focused.
                </h2>
                <p className="mt-3 max-w-[58ch] text-sm text-[var(--app-text-muted)]">
                  Open a project, continue generation, or start a new workspace without the noise of a generic SaaS dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-full border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                >
                  <Wand2 className="h-4 w-4" />
                  Resume Build
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-[var(--app-border)] bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                >
                  <ArrowRight className="h-4 w-4" />
                  Open Workspace
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Today</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {userStats.generationsToday}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">active generations</p>
              </div>
              <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Projects</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {userStats.projectsCount}
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">in your workspace</p>
              </div>
              <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Storage</p>
                <p className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  {userStats.storageUsed}MB
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">used out of {userStats.storageLimit}MB</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--app-text)]">Generation allowance</p>
                <span className="text-xs text-[var(--app-text-muted)]">
                  {userStats.generationsToday} / {userStats.dailyLimit}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--app-surface)]">
                <div
                  className="h-2 rounded-full bg-[var(--app-accent)]"
                  style={{
                    width: `${Math.min(100, (userStats.generationsToday / userStats.dailyLimit) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                Use the remaining quota for refinement passes instead of restarting prompts.
              </p>
            </div>

            <div className="rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--app-text)]">Recommended next action</p>
                  <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                    Continue from a real project context to keep prompt, code, and preview aligned.
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {!statsLoading && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                  <Zap className="h-4 w-4 text-[var(--app-accent)]" />
                  Daily generations
                </span>
                <span className="text-xs text-[var(--app-text-dim)]">
                  {userStats.generationsToday} / {userStats.dailyLimit}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--app-surface)]">
                <div
                  className="h-2 rounded-full bg-[var(--app-accent)]"
                  style={{
                    width: `${Math.min(100, (userStats.generationsToday / userStats.dailyLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                  <HardDrive className="h-4 w-4 text-[var(--app-success)]" />
                  Storage
                </span>
                <span className="text-xs text-[var(--app-text-dim)]">
                  {userStats.storageUsed}MB / {userStats.storageLimit}MB
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--app-surface)]">
                <div
                  className="h-2 rounded-full bg-[var(--app-success)]"
                  style={{
                    width: `${Math.min(100, (userStats.storageUsed / userStats.storageLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
                  <FolderKanban className="h-4 w-4 text-[var(--app-warning)]" />
                  Active projects
                </span>
                <span className="text-xs text-[var(--app-text-dim)]">{userStats.projectsCount} total</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--app-surface)]">
                <div
                  className="h-2 rounded-full bg-[var(--app-warning)]"
                  style={{ width: `${Math.min(100, (userStats.projectsCount / 20) * 100)}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {projects.length === 0 && !projectsLoading && (
          <section className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[56ch]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
                  Empty workspace
                </p>
                <h2 className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
                  Start from a focused project shell.
                </h2>
                <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                  Create your first project, then move straight into prompt, code, and preview without extra dashboard overhead.
                </p>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                className="rounded-full bg-[var(--app-accent)] px-4 text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--app-text)]">Your Projects</h2>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                Continue work in existing builders or open a clean starting point.
              </p>
            </div>
            {projects.length > 0 && (
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <ProjectsGrid projects={projects} loading={projectsLoading} />
        </section>

        {activities.length > 0 && (
          <ActivityFeed
            activities={activities}
            loading={activitiesLoading}
            title="Recent builder activity"
          />
        )}
      </div>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
