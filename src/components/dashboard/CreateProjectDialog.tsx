import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { X, Sparkles } from "lucide-react";

const TEMPLATES = [
  { name: "E-commerce Store", frameworks: ["React", "Next.js"], icon: "🛒", desc: "Product catalog, cart, checkout" },
  { name: "Admin Dashboard", frameworks: ["React", "Vue"], icon: "📊", desc: "Analytics, tables, CRUD" },
  { name: "Blog Engine", frameworks: ["Next.js", "Svelte"], icon: "✍️", desc: "Markdown, CMS, RSS" },
  { name: "API Boilerplate", frameworks: ["Node.js", "Python"], icon: "🔌", desc: "REST, auth, database" },
];

const FRAMEWORKS = [
  { id: "React", icon: "⚛️" },
  { id: "Next.js", icon: "▲" },
  { id: "Vue", icon: "💚" },
  { id: "Svelte", icon: "🧡" },
  { id: "Python", icon: "🐍" },
  { id: "Node.js", icon: "📦" },
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

  if (!open) return null;

  function handleSelectTemplate(template: (typeof TEMPLATES)[0]) {
    setName(template.name);
    setFramework(template.frameworks[0]);
    setStep("configure");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const project = await createProject.mutateAsync({ name: name.trim(), framework });
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
    setFramework("React");
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-[#0B0F14] border border-white/5 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-semibold text-[#E6EDF3]">
              {step === "template" ? "New Project" : "Configure Project"}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {step === "template"
                ? "Start from a template or configure manually"
                : "Name your project and pick a framework"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#E6EDF3] hover:bg-[#1F2937] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {step === "template" ? (
            <div className="grid grid-cols-2 gap-2.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleSelectTemplate(t)}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-white/5 hover:border-[#3B82F6]/30 hover:bg-[#111827] transition-all text-left group"
                >
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3] group-hover:text-[#3B82F6] transition-colors">
                      {t.name}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setStep("configure")}
                className="flex flex-col items-center justify-center gap-1.5 col-span-2 p-3.5 rounded-xl border border-dashed border-white/5 hover:border-[#3B82F6]/30 hover:bg-[#111827] transition-all"
              >
                <Sparkles className="w-5 h-5 text-[#6B7280]" />
                <p className="text-xs text-[#6B7280]">Configure manually</p>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#9BA7B4] mb-1.5 block">
                  Project Name
                </label>
                <Input
                  placeholder="My Awesome App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm bg-[#111827] border-white/5 text-[#E6EDF3] placeholder:text-[#6B7280] focus:border-[#3B82F6]/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#9BA7B4] mb-1.5 block">
                  Framework
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FRAMEWORKS.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => setFramework(fw.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        framework === fw.id
                          ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#E6EDF3]"
                          : "border-white/5 bg-[#111827] text-[#6B7280] hover:border-white/10 hover:text-[#9BA7B4]"
                      }`}
                    >
                      <span className="text-lg">{fw.icon}</span>
                      <span className="text-[10px] font-medium">{fw.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          {step === "configure" && (
            <button
              onClick={() => setStep("template")}
              disabled={createProject.isPending}
              className="px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#9BA7B4] transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={createProject.isPending}
            className="px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#9BA7B4] transition-colors"
          >
            Cancel
          </button>
          {step === "configure" && (
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createProject.isPending}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
