import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import CodeEditor from "./CodeEditor";
import WorkspacePreview from "./WorkspacePreview";
import { Code2, PlaySquare } from "lucide-react";

export default function WorkspaceLayout() {
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);
  const files = useWorkspaceStore((s) => s.files);
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");

  useEffect(() => {
    if (!files.length) {
      setViewMode("code");
      return;
    }

    if (!activeFileContent && files.length > 0) {
      setViewMode("preview");
    }
  }, [activeFileContent, files.length]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex min-h-[42px] items-center border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
        {activeFileContent && activeFilePath && (
          <div className="flex items-center gap-2 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] px-2.5 py-1 text-xs text-[var(--app-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
            <span className="font-medium text-[var(--app-text)]">{activeFilePath.split("/").pop()}</span>
          </div>
        )}
        {!activeFileContent && files.length > 0 && (
          <div className="text-xs text-[var(--app-text-muted)]">
            Select a file for source view, or stay in preview mode while the runtime surface is prepared.
          </div>
        )}
        <div className="flex-1" />
        <div className="mr-3 inline-flex items-center rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
          <button
            type="button"
            onClick={() => setViewMode("code")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] transition-colors ${
              viewMode === "code"
                ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] transition-colors ${
              viewMode === "preview"
                ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            <PlaySquare className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>
        {activeFileLanguage && (
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{activeFileLanguage}</span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {viewMode === "code" ? (
          <div className="min-h-0 flex-1">
            <CodeEditor />
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <WorkspacePreview />
          </div>
        )}
      </div>
    </div>
  );
}
