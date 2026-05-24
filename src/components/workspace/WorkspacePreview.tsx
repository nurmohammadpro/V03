import { useEffect, useMemo } from "react";
import { useWorkspaceStore, type FileNode } from "@/stores/workspaceStore";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe, Link2, PlaySquare, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const previewUrl = useWorkspaceStore((s) => s.previewUrl);
  const previewMode = useWorkspaceStore((s) => s.previewMode);
  const isPreviewStarting = useWorkspaceStore((s) => s.isPreviewStarting);
  const isPreviewReady = useWorkspaceStore((s) => s.isPreviewReady);
  const previewIsPublic = useWorkspaceStore((s) => s.previewIsPublic);
  const startPreview = useWorkspaceStore((s) => s.startPreview);
  const stopPreview = useWorkspaceStore((s) => s.stopPreview);
  const restartPreview = useWorkspaceStore((s) => s.restartPreview);
  const refreshPreviewStatus = useWorkspaceStore((s) => s.refreshPreviewStatus);
  const setPreviewMode = useWorkspaceStore((s) => s.setPreviewMode);
  const rotatePreviewLink = useWorkspaceStore((s) => s.rotatePreviewLink);
  const setPreviewPublic = useWorkspaceStore((s) => s.setPreviewPublic);

  useEffect(() => {
    if (!previewUrl) return;
    void refreshPreviewStatus();
    const timer = window.setInterval(() => void refreshPreviewStatus(), 1500);
    return () => window.clearInterval(timer);
  }, [previewUrl, refreshPreviewStatus]);

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
        <div className="h-full overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-white">
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
          <div className="flex-1" />
          <div className="inline-flex overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] text-xs">
            <button
              type="button"
              disabled={Boolean(previewUrl) || isPreviewStarting}
              onClick={() => setPreviewMode("dev")}
              className={[
                "px-2.5 py-1.5 transition",
                previewMode === "dev" ? "bg-[var(--app-panel-2)] text-[var(--app-text)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
                Boolean(previewUrl) ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
              title="Dev preview (HMR)"
            >
              Dev
            </button>
            <button
              type="button"
              disabled={Boolean(previewUrl) || isPreviewStarting}
              onClick={() => setPreviewMode("build")}
              className={[
                "px-2.5 py-1.5 transition",
                previewMode === "build"
                  ? "bg-[var(--app-panel-2)] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
                Boolean(previewUrl) ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
              title="Build preview (production-like)"
            >
              Build
            </button>
          </div>
          {!previewUrl ? (
            <button
              type="button"
              onClick={() => void startPreview()}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
              disabled={isPreviewStarting}
            >
              <PlaySquare className="h-4 w-4" />
              {isPreviewStarting ? "Starting..." : "Start preview"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      await navigator.clipboard.writeText(previewUrl);
                      toast.success("Preview link copied");
                    } catch {
                      toast.error("Failed to copy link");
                    }
                  })();
                }}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
                title="Copy shareable URL"
              >
                <Link2 className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => void rotatePreviewLink().then(() => toast.success("Rotated link")).catch(() => toast.error("Failed to rotate link"))}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
                title="Rotate share token"
              >
                <RefreshCcw className="h-4 w-4" />
                Rotate
              </button>
              <button
                type="button"
                onClick={() => void setPreviewPublic(!previewIsPublic).then(() => toast.success(previewIsPublic ? "Public off" : "Public on")).catch(() => toast.error("Failed to update sharing"))}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
                title="Toggle public preview (no token)"
              >
                <Globe className="h-4 w-4" />
                {previewIsPublic ? "Public" : "Token"}
              </button>
              <button
                type="button"
                onClick={() => void restartPreview()}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => void stopPreview()}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4">
        {previewUrl ? (
          <div className="h-full overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-white">
            <div className="relative h-full w-full">
              <iframe title="Preview" src={previewUrl} className="h-full w-full border-0" />
              {!isPreviewReady ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="rounded-[12px] bg-[var(--app-panel)] px-4 py-3 text-sm text-[var(--app-text-muted)]">
                    Starting preview…
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
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
