import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import {
  BarChart3,
  Blocks,
  FileText,
  Globe,
  Hexagon,
  Layers3,
  Package2,
  Sparkles,
} from "lucide-react";

const TEMPLATES = [
  {
    name: "E-commerce Store",
    frameworks: ["React", "Next.js"],
    icon: Globe,
    desc: "Product catalog, cart, checkout",
  },
  {
    name: "Admin Dashboard",
    frameworks: ["React", "Vue"],
    icon: BarChart3,
    desc: "Analytics, tables, CRUD",
  },
  {
    name: "Blog Engine",
    frameworks: ["Next.js", "Svelte"],
    icon: FileText,
    desc: "Markdown, CMS, RSS",
  },
  {
    name: "API Boilerplate",
    frameworks: ["Node.js", "Python"],
    icon: Layers3,
    desc: "REST, auth, database",
  },
];

const FRAMEWORKS = [
  { id: "nextjs", label: "Next.js", icon: Hexagon },
  { id: "react-vite", label: "React", icon: Blocks },
  { id: "mern", label: "MERN", icon: Layers3 },
  { id: "django", label: "Django", icon: FileText },
  { id: "laravel", label: "Laravel", icon: Globe },
  { id: "nestjs", label: "NestJS", icon: Package2 },
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [step, setStep] = useState<"template" | "configure">("template");
  const [name, setName] = useState("");
  const [frameworkKind, setFrameworkKind] = useState("nextjs");
  const [, navigate] = useLocation();
  const createProject = useCreateProject();

  function handleSelectTemplate(template: (typeof TEMPLATES)[0]) {
    setName(template.name);
    setFrameworkKind("nextjs");
    setStep("configure");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync({ name: name.trim(), frameworkKind });
      toast.success("Project created!");
      handleClose();
      navigate(`/workspace/${project.id}`);
    } catch {
      toast.error("Failed to create project");
    }
  }

  function handleClose() {
    setStep("template");
    setName("");
    setFrameworkKind("nextjs");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!createProject.isPending ? handleClose() : next)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-0 text-[var(--app-text)] backdrop-blur-xl"
      >
        {/* Header */}
        <DialogHeader className="border-b border-[var(--app-border)] px-5 py-4 text-left">
          <div>
            <DialogTitle className="text-sm font-medium text-[var(--app-text)]">
              {step === "template" ? "New Project" : "Configure Project"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs font-light text-[var(--app-text-muted)]">
              {step === "template"
                ? "Start from a template or configure manually"
                : "Name your project and pick a framework"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4">
          {step === "template" ? (
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleSelectTemplate(t)}
                  className="group flex flex-col items-start gap-2 border-b border-[var(--app-border)] px-1 py-3 text-left transition-colors hover:border-[var(--app-border-strong)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                    <t.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--app-text)] transition-colors group-hover:text-[var(--app-accent)]">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">{t.desc}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setStep("configure")}
                className="col-span-2 flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--app-border)] px-3 py-4 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
              >
                <Sparkles className="h-4 w-4" />
                <p className="text-xs">Configure manually</p>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-muted)]">
                  Project Name
                </label>
                <Input
                  placeholder="My Awesome App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel)] text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus-visible:border-[var(--app-accent)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-muted)]">
                  Framework
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FRAMEWORKS.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => setFrameworkKind(fw.id)}
                      className={`flex flex-col items-center gap-1 rounded-[10px] border p-3 transition-colors ${
                        frameworkKind === fw.id
                          ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]"
                          : "border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                      }`}
                    >
                      <fw.icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{fw.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] px-5 py-3">
          {step === "configure" && (
            <button
              onClick={() => setStep("template")}
              disabled={createProject.isPending}
              className="px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={createProject.isPending}
            className="px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
          >
            Cancel
          </button>
          {step === "configure" && (
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createProject.isPending}
              className="rounded-full bg-[var(--app-accent)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
