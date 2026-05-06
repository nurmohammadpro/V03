import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar } from "@/components/shared/Sidebar";

const MOCK_PROJECTS = [
  { id: "1", name: "My First App", framework: "React", createdAt: "2026-05-01" },
  { id: "2", name: "Blog Engine", framework: "Next.js", createdAt: "2026-05-03" },
  { id: "3", name: "Admin Panel", framework: "Vue", createdAt: "2026-05-04" },
];

const NAV_ITEMS = [
  {
    label: "Projects",
    href: "/dashboard",
    active: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    label: "Admin",
    href: "/admin/overview",
    active: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [projects] = useState(MOCK_PROJECTS);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        navItems={NAV_ITEMS}
        userFooter={
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <Avatar size="sm">
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <span className="truncate">{user?.email || "Guest"}</span>
          </div>
        }
      />

      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
              <p className="text-muted-foreground mt-1">Manage your v03 projects</p>
            </div>
            <Button>Create New Project</Button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Create your first project to get started</p>
              <Button>Create New Project</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:shadow-[var(--shadow-lg)] hover:border-primary/50 transition-all cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {project.name[0]}
                      </div>
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{project.framework}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Created {project.createdAt}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
