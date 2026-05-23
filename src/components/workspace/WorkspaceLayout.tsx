import { useWorkspaceStore } from "../../stores/workspaceStore";
import CodeEditor from "./CodeEditor";
import WorkspacePreview from "./WorkspacePreview";
import { Button } from "../ui/button";
import { Code2, Eye, FileText, Save } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo } from "react";

export default function WorkspaceLayout() {
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);
  const files = useWorkspaceStore((s) => s.files);
  const isFileDirty = useWorkspaceStore((s) => s.isFileDirty);
  const isFileSaving = useWorkspaceStore((s) => s.isFileSaving);
  const saveActiveFile = useWorkspaceStore((s) => s.saveActiveFile);
  const outputTab = useWorkspaceStore((s) => s.outputTab);
  const setOutputTab = useWorkspaceStore((s) => s.setOutputTab);

  return (
    <div className="flex flex-col h-full w-full">
      <Tabs.Root value={outputTab} onValueChange={(v) => setOutputTab(v as any)} className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-[42px] items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
          <Tabs.List className="flex items-center gap-1 rounded-[10px] bg-[var(--app-panel)] p-1">
            <Tabs.Trigger
              value="preview"
              className="inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs text-[var(--app-text-muted)] data-[state=active]:bg-[var(--app-surface)] data-[state=active]:text-[var(--app-text)]"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Tabs.Trigger>
            <Tabs.Trigger
              value="code"
              className="inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs text-[var(--app-text-muted)] data-[state=active]:bg-[var(--app-surface)] data-[state=active]:text-[var(--app-text)]"
            >
              <Code2 className="h-4 w-4" />
              Code
            </Tabs.Trigger>
            <Tabs.Trigger
              value="logs"
              className="inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs text-[var(--app-text-muted)] data-[state=active]:bg-[var(--app-surface)] data-[state=active]:text-[var(--app-text)]"
            >
              <FileText className="h-4 w-4" />
              Logs
            </Tabs.Trigger>
          </Tabs.List>

          {activeFilePath ? (
            <div className="ml-2 hidden items-center gap-2 rounded-[7px] bg-[var(--app-panel)] px-2.5 py-1 text-xs text-[var(--app-text-muted)] md:flex">
              <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
              <span className="font-normal text-[var(--app-text)]">{activeFilePath.split("/").pop()}</span>
            </div>
          ) : null}

          <div className="flex-1" />

          {activeFilePath ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-[8px] border-0 bg-[var(--app-panel)] px-2.5 text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              onClick={() => void saveActiveFile()}
              disabled={!isFileDirty || isFileSaving}
            >
              <Save className="h-4 w-4" />
              <span className="ml-2 text-xs">{isFileSaving ? "Saving..." : isFileDirty ? "Save" : "Saved"}</span>
            </Button>
          ) : null}

          {activeFileLanguage ? (
            <span className="ml-3 hidden text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:inline">
              {activeFileLanguage}
            </span>
          ) : null}
        </div>

        <Tabs.Content value="preview" className="min-h-0 flex-1">
          <WorkspacePreview />
        </Tabs.Content>
        <Tabs.Content value="code" className="min-h-0 flex-1">
          <CodeEditor />
        </Tabs.Content>
        <Tabs.Content value="logs" className="min-h-0 flex-1">
          <WorkspaceLogs />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function WorkspaceLogs() {
  const previewUrl = useWorkspaceStore((s) => s.previewUrl);
  const previewLogs = useWorkspaceStore((s) => s.previewLogs);
  const refreshPreviewLogs = useWorkspaceStore((s) => s.refreshPreviewLogs);

  useEffect(() => {
    if (!previewUrl) return;
    void refreshPreviewLogs();
    const timer = window.setInterval(() => void refreshPreviewLogs(), 2000);
    return () => window.clearInterval(timer);
  }, [previewUrl, refreshPreviewLogs]);

  if (!previewUrl) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-6 text-sm text-[var(--app-text-muted)]">
        Start a preview to view logs.
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--app-bg-alt)] p-3">
      <div className="h-full overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-black">
        <pre className="h-full overflow-auto p-4 text-[12px] leading-6 text-white/80">
          {previewLogs || "Waiting for logs..."}
        </pre>
      </div>
    </div>
  );
}
