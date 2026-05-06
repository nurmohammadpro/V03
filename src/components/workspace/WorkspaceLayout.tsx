import { useWorkspaceStore } from "../../stores/workspaceStore";
import CodeEditor from "./CodeEditor";
import WorkspacePreview from "./WorkspacePreview";

export default function WorkspaceLayout({ viewMode }: { viewMode: "code" | "preview" }) {
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);
  const files = useWorkspaceStore((s) => s.files);

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
