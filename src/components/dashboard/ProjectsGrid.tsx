import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Copy,
  Archive,
  FolderKanban,
} from "lucide-react";
import type { Project } from "@/lib/types";
import { useDeleteProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface ProjectsGridProps {
  projects: Project[];
  loading?: boolean;
}

function ProjectCardSkeleton() {
  return (
      <div className="animate-pulse rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-[8px] bg-[var(--app-surface)]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-28 rounded bg-[var(--app-surface)]" />
          <div className="h-3 w-14 rounded bg-[var(--app-surface)]" />
        </div>
      </div>
      <div className="h-3 w-20 rounded bg-[var(--app-surface)]" />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [, navigate] = useLocation();
  const deleteProject = useDeleteProject();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group relative cursor-pointer rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl transition-colors duration-200 hover:border-[var(--app-border-strong)] hover:bg-[var(--app-panel-2)]"
      onClick={() => navigate(`/workspace/${project.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-accent-soft)] text-sm font-medium text-[var(--app-accent)]">
            {project.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium tracking-[-0.02em] text-[var(--app-text)] transition-colors group-hover:text-[var(--app-accent)]">
              {project.name}
            </p>
            <Badge className="mt-1 border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-text-muted)]">
              {project.framework}
            </Badge>
          </div>
        </div>
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-[var(--app-text-dim)] opacity-0 transition-opacity hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-40 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] py-1 shadow-[var(--shadow-md)] backdrop-blur-xl">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/workspace/${project.id}`);
                    setMenuOpen(false);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface)]">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface)]">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
                <div className="my-1 border-t border-[var(--app-border)]" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--app-danger)] transition-colors hover:bg-[var(--app-danger-soft)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject.mutate(project.id, {
                      onSuccess: () => toast.success("Project deleted"),
                      onError: () => toast.error("Failed to delete project"),
                    });
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--app-text-muted)]">
        Created{" "}
        {new Date(project.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

const FRAMEWORKS = ["All", "React", "Next.js", "Vue", "Svelte", "Python"] as const;
type SortKey = "name" | "createdAt";

export function ProjectsGrid({ projects, loading }: ProjectsGridProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter !== "All") {
      list = list.filter((p) => p.framework === filter);
    }
    list.sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : a.createdAt;
      const bVal = sortKey === "name" ? b.name : b.createdAt;
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [projects, search, filter, sortKey, sortAsc]);

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-text-dim)]" />
          <Input
            placeholder="Search projects..."
            className="h-9 rounded-full border-[var(--app-border)] bg-[var(--app-panel)] pl-8 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-dim)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-0.5 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw}
              onClick={() => setFilter(fw)}
              className={cn(
                "rounded-full px-2.5 py-1.5 text-[11px] font-normal transition-colors",
                filter === fw
                  ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              )}
            >
              {fw}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (sortKey === "name") {
              setSortKey("createdAt");
              setSortAsc(false);
            } else if (sortAsc) {
              setSortKey("name");
              setSortAsc(false);
            } else {
              setSortAsc(true);
            }
          }}
          className="flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-[11px] font-normal text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortKey === "createdAt" ? (sortAsc ? "Oldest" : "Newest") : sortAsc ? "A-Z" : "Z-A"}
        </button>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-dim)]" />
          <h3 className="mb-1 text-sm font-medium text-[var(--app-text-muted)]">
            {search ? "No matching projects" : "No projects yet"}
          </h3>
          <p className="text-xs text-[var(--app-text-dim)]">
            {search ? "Try a different search term" : "Create your first project to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
