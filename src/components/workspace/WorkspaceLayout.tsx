import { useWorkspaceStore } from "../../stores/workspaceStore";
import CodeEditor from "./CodeEditor";
import WorkspacePreview from "./WorkspacePreview";

export default function WorkspaceLayout() {
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);
  const files = useWorkspaceStore((s) => s.files);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tabs bar */}
      <div className="flex min-h-[42px] items-center border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
        {activeFileContent && activeFilePath && (
          <div className="flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-2.5 py-1 text-xs text-[var(--app-text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
            <span className="font-medium text-[var(--app-text)]">{activeFilePath.split("/").pop()}</span>
          </div>
        )}
        {!activeFileContent && files.length > 0 && (
          <div className="text-xs text-[var(--app-text-muted)]">
            Select a file to inspect the source. Preview stays available on the right.
          </div>
        )}
        <div className="flex-1" />
        {activeFileLanguage && (
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{activeFileLanguage}</span>
        )}
      </div>

      <div className="grid flex-1 min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div className="min-h-0 border-b border-[var(--app-border)] xl:border-b-0 xl:border-r">
          <CodeEditor />
        </div>
        <div className="min-h-0">
          <WorkspacePreview />
        </div>
      </div>
    </div>
  );
}
