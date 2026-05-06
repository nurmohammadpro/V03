import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  { id: "React", icon: "⚛️", desc: "SPA with Vite" },
  { id: "Next.js", icon: "▲", desc: "Full-stack React" },
  { id: "Vue", icon: "💚", desc: "Progressive SPA" },
  { id: "Svelte", icon: "🧡", desc: "Lightweight" },
  { id: "Python", icon: "🐍", desc: "Flask / FastAPI" },
  { id: "Node.js", icon: "📦", desc: "Express API" },
];

const TEMPLATES = [
  { name: "E-commerce Store", frameworks: ["React", "Next.js"], icon: "🛒" },
  { name: "Admin Dashboard", frameworks: ["React", "Vue"], icon: "📊" },
  { name: "Blog Engine", frameworks: ["Next.js", "Svelte"], icon: "✍️" },
  { name: "API Boilerplate", frameworks: ["Node.js", "Python"], icon: "🔌" },
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [step, setStep] = useState<"template" | "configure">("template");
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("React");
  const [, navigate] = useLocation();
  const createProject = useCreateProject();

  function handleSelectTemplate(template: (typeof TEMPLATES)[0]) {
    setName(template.name);
    setFramework(template.frameworks[0]);
    setStep("configure");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        framework,
      });
      toast.success("Project created!");
      onOpenChange(false);
      navigate(`/workspace/${project.id}`);
    } catch {
      toast.error("Failed to create project");
    }
  }

  function handleClose() {
    setStep("template");
    setName("");
    setFramework("React");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "New Project" : "Configure Project"}
          </DialogTitle>
          <DialogDescription>
            {step === "template"
              ? "Start from a template or configure manually"
              : "Give your project a name and choose a framework"}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => handleSelectTemplate(template)}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
              >
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.frameworks.join(", ")}
                  </p>
                </div>
              </button>
            ))}
            <button
              onClick={() => setStep("configure")}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all col-span-2"
            >
              <span className="text-xl">⚙️</span>
              <p className="text-sm text-muted-foreground">Configure manually</p>
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Project Name
              </label>
              <Input
                placeholder="My Awesome App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Framework
              </label>
              <Tabs
                value={framework}
                onValueChange={setFramework}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 h-auto p-1">
                  {FRAMEWORKS.map((fw) => (
                    <TabsTrigger
                      key={fw.id}
                      value={fw.id}
                      className={cn(
                        "flex flex-col gap-0.5 py-2 data-[state=active]:shadow-sm",
                        framework === fw.id && "border-primary/30"
                      )}
                    >
                      <span className="text-base leading-none">{fw.icon}</span>
                      <span className="text-[10px] font-normal">{fw.id}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "configure" && (
            <Button
              variant="ghost"
              onClick={() => setStep("template")}
              disabled={createProject.isPending}
            >
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={createProject.isPending}>
            Cancel
          </Button>
          {step === "configure" && (
            <Button onClick={handleCreate} disabled={!name.trim() || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
