import { useMemo } from "react";
import { useWorkspaceStore, type FileNode } from "@/stores/workspaceStore";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, PlaySquare, Sparkles } from "lucide-react";

function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenFiles(node.children) : [])]);
}

function inferFramework(files: FileNode[]): string {
  const paths = flattenFiles(files).map((file) => file.path.toLowerCase());
  if (paths.some((path) => path.includes("next.config") || path.includes("src/app/"))) return "Next.js";
  if (paths.some((path) => path.endsWith("app.jsx") || path.endsWith("app.tsx"))) return "React";
  if (paths.some((path) => path.includes("nestjs") || path.includes("app.module.ts"))) return "NestJS";
  if (paths.some((path) => path.endsWith(".php"))) return "Laravel";
  if (paths.some((path) => path.endsWith(".py"))) return "Django";
  return "App runtime";
}

function extractHeadline(content: string | null, fallback: string) {
  if (!content) return fallback;
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match?.[1]) return h1Match[1].replace(/<[^>]+>/g, "").trim();
  const returnMatch = content.match(/return\s+<h1[^>]*>(.*?)<\/h1>/i);
  if (returnMatch?.[1]) return returnMatch[1].replace(/<[^>]+>/g, "").trim();
  return fallback;
}

export default function WorkspacePreview() {
  const files = useWorkspaceStore((s) => s.files);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);

  const activeFileName = activeFilePath?.split("/").pop() ?? "preview";

  const previewModel = useMemo(() => {
    if (!files.length) {
      return { mode: "empty" as const };
    }

    const framework = inferFramework(files);

    if (activeFilePath?.match(/\.(html|htm)$/i) && activeFileContent) {
      return {
        mode: "html" as const,
        framework,
        srcDoc: activeFileContent,
      };
    }

    return {
      mode: "runtime" as const,
      framework,
      title: extractHeadline(activeFileContent, framework === "Next.js" ? "Generated app preview" : `${framework} project preview`),
      filesCount: flattenFiles(files).filter((file) => file.type === "file").length,
      sampleFiles: flattenFiles(files)
        .filter((file) => file.type === "file")
        .slice(0, 4)
        .map((file) => file.path),
    };
  }, [activeFileContent, activeFilePath, files]);

  if (previewModel.mode === "empty") {
    return (
      <div className="flex h-full items-center justify-center px-6 py-6">
        <div className="w-full max-w-[320px] border-b border-[var(--app-border)] pb-5 text-center">
          <PlaySquare className="mx-auto h-8 w-8 text-[var(--app-text-dim)]" />
          <p className="mt-3 text-sm text-[var(--app-text-muted)]">
            Preview will appear here once the workspace has generated files or a runtime is attached.
          </p>
        </div>
      </div>
    );
  }

  if (previewModel.mode === "html") {
    return (
      <div className="h-full bg-[var(--app-bg-alt)] p-3">
        <div className="h-full overflow-hidden rounded-[14px] border border-[var(--app-border)] bg-white">
          <iframe
            title="HTML preview"
            srcDoc={previewModel.srcDoc}
            className="h-full w-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg-alt)]">
      <div className="border-b border-[var(--app-border)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-text-muted)]">
            {previewModel.framework}
          </Badge>
          <Badge className="rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-text-muted)]">
            runtime slot
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="border-b border-[var(--app-border)] pb-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Runtime preview</p>
          <h3 className="mt-3 text-[22px] font-medium tracking-[-0.04em] text-[var(--app-text)]">
            {previewModel.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
            This panel is ready for Docker or sandbox runtime integration. Once the selected stack is installed and booted, this area should mount the live app rather than a mock artifact.
          </p>
        </div>

        <div className="divide-y divide-[var(--app-border)]">
          <div className="py-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Current source</p>
            <p className="mt-2 text-sm text-[var(--app-text)]">{activeFileName}</p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              Actual code is visible beside this panel, and the runtime slot is kept separate so it can execute independently.
            </p>
          </div>

          <div className="py-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Project scope</p>
            <p className="mt-2 text-sm text-[var(--app-text)]">{previewModel.filesCount} generated files available</p>
            <div className="mt-3 space-y-2">
              {previewModel.sampleFiles.map((path) => (
                <div key={path} className="flex items-center justify-between gap-3 text-xs text-[var(--app-text-muted)]">
                  <span className="truncate">{path}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)]" />
                </div>
              ))}
            </div>
          </div>

          <div className="py-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Next integration step</p>
            <div className="mt-3 inline-flex items-center gap-2 border-b border-[var(--app-border)] pb-2 text-sm text-[var(--app-text-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
              Mount runtime URL or container port into this preview surface.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
