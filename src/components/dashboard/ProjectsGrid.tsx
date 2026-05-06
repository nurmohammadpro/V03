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
    <div className="rounded-xl border border-white/5 bg-[#0F141A] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#1F2937]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-28 bg-[#1F2937] rounded" />
          <div className="h-3 w-14 bg-[#1F2937] rounded" />
        </div>
      </div>
      <div className="h-3 w-20 bg-[#1F2937] rounded" />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [, navigate] = useLocation();
  const deleteProject = useDeleteProject();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-white/5 bg-[#0F141A] p-4 transition-all duration-200 hover:border-white/10 hover:bg-[#111827] cursor-pointer group relative"
      onClick={() => navigate(`/workspace/${project.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 flex items-center justify-center text-[#3B82F6] font-bold text-base shrink-0">
            {project.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#E6EDF3] truncate group-hover:text-[#3B82F6] transition-colors">
              {project.name}
            </p>
            <Badge className="mt-1 text-[10px] font-normal px-1.5 py-0 bg-[#1F2937] text-[#9BA7B4] border-0">
              {project.framework}
            </Badge>
          </div>
        </div>
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-[#6B7280] hover:text-[#E6EDF3] hover:bg-[#1F2937] opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="absolute right-0 top-8 z-20 w-40 bg-[#0F141A] border border-white/5 rounded-xl shadow-xl py-1">
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#E6EDF3] hover:bg-[#1F2937] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/workspace/${project.id}`);
                    setMenuOpen(false);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#E6EDF3] hover:bg-[#1F2937] transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#E6EDF3] hover:bg-[#1F2937] transition-colors">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
                <div className="border-t border-white/5 my-1" />
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
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

      <p className="text-xs text-[#6B7280] mt-3">
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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <Input
            placeholder="Search projects..."
            className="pl-8 h-8 text-xs bg-[#111827] border-white/5 text-[#E6EDF3] placeholder:text-[#6B7280]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-0.5 bg-[#111827] p-0.5 rounded-lg">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw}
              onClick={() => setFilter(fw)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                filter === fw
                  ? "bg-[#1F2937] text-[#E6EDF3]"
                  : "text-[#6B7280] hover:text-[#9BA7B4]"
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
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#111827] text-[#6B7280] hover:text-[#9BA7B4] transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortKey === "createdAt" ? (sortAsc ? "Oldest" : "Newest") : sortAsc ? "A-Z" : "Z-A"}
        </button>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-10 h-10 text-[#6B7280] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#9BA7B4] mb-1">
            {search ? "No matching projects" : "No projects yet"}
          </h3>
          <p className="text-xs text-[#6B7280]">
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
