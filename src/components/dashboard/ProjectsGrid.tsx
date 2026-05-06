import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import type { Project } from "@/lib/types";
import { useDeleteProject } from "@/hooks/useProjects";
import { toast } from "sonner";

interface ProjectsGridProps {
  projects: Project[];
  loading?: boolean;
}

function ProjectSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-3 w-24 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [, navigate] = useLocation();
  const deleteProject = useDeleteProject();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    deleteProject.mutate(project.id, {
      onSuccess: () => toast.success("Project deleted"),
      onError: () => toast.error("Failed to delete project"),
    });
    setMenuOpen(false);
  }

  return (
    <Card
      className="group hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer relative"
      onClick={() => navigate(`/workspace/${project.id}`)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg shrink-0 group-hover:scale-110 transition-transform">
              {project.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{project.name}</CardTitle>
              <Badge variant="outline" className="mt-1 text-[10px] font-normal px-1.5 py-0">
                {project.framework}
              </Badge>
            </div>
          </div>
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-44 bg-card border border-border rounded-xl shadow-xl py-1">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/workspace/${project.id}`);
                      setMenuOpen(false);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Open
                  </button>
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Archive className="w-4 h-4" /> Archive
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Created {new Date(project.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </CardContent>
    </Card>
  );
}

const FRAMEWORK_FILTERS = ["All", "React", "Next.js", "Vue", "Svelte", "Python"] as const;
type SortKey = "name" | "createdAt";

export function ProjectsGrid({ projects, loading }: ProjectsGridProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...projects];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Framework filter
    if (filter !== "All") {
      list = list.filter((p) => p.framework === filter);
    }

    // Sort
    list.sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : a.createdAt;
      const bVal = sortKey === "name" ? b.name : b.createdAt;
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return list;
  }, [projects, search, filter, sortKey, sortAsc]);

  if (loading) {
    return <ProjectSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
          {FRAMEWORK_FILTERS.map((fw) => (
            <button
              key={fw}
              onClick={() => setFilter(fw)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                filter === fw
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {fw}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
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
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortKey === "createdAt" ? (sortAsc ? "Oldest" : "Newest") : sortAsc ? "A-Z" : "Z-A"}
        </Button>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">
            {search ? "🔍" : "🚀"}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {search ? "No matching projects" : "No projects yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {search
              ? "Try a different search term"
              : "Create your first project to get started"}
          </p>
          {!search && (
            <p className="text-xs text-muted-foreground">
              Click the "Create New Project" button above
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
