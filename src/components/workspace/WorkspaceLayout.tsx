import { useRef, useCallback, useState } from "react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import FileTree from "./FileTree";
import CodeEditor from "./CodeEditor";

export default function WorkspaceLayout() {
  const layout = useWorkspaceStore((s) => s.layout);
  const setLeftPanelWidth = useWorkspaceStore((s) => s.setLeftPanelWidth);
  const toggleFileTree = useWorkspaceStore((s) => s.toggleFileTree);
  const isFileTreeOpen = useWorkspaceStore((s) => s.layout.isFileTreeOpen);
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFileLanguage = useWorkspaceStore((s) => s.activeFileLanguage);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setLeftPanelWidth(pct);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [setLeftPanelWidth]
  );

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden relative"
      style={{ userSelect: isDragging ? "none" : "auto" }}
    >
      {/* Left Panel */}
      <div
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ width: `${layout.leftPanelWidth}%` }}
      >
        <div className="flex flex-col h-full">
          {isFileTreeOpen && (
            <div className="max-h-[40%] overflow-auto border-b border-border">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                Files
              </div>
              <FileTree />
            </div>
          )}
          <div
            id="workspace-chat-pane"
            className="flex-1 flex flex-col overflow-hidden"
          />
        </div>
      </div>

      {/* Resizable divider */}
      <div
        onMouseDown={handleMouseDown}
        className="shrink-0 cursor-col-resize transition-[background] duration-[var(--duration-fast)]"
        style={{
          width: 4,
          background: isDragging ? "var(--primary)" : "var(--border)",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.background = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.background = "var(--border)";
        }}
      />

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs bar */}
        <div className="flex items-center gap-1 px-2 bg-surface border-b border-border min-h-[36px]">
          <button
            onClick={toggleFileTree}
            title="Toggle file tree"
            className="bg-transparent border border-border text-muted-foreground px-2 py-0.5 rounded text-xs cursor-pointer hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {isFileTreeOpen ? "<<" : ">>"}
          </button>
          {activeFileContent && (
            <div className="text-[13px] text-foreground px-3 py-1 bg-surface-active rounded-t-md">
              {useWorkspaceStore.getState().activeFilePath ?? "untitled"}
            </div>
          )}
          <div className="flex-1" />
          <div className="text-[11px] text-muted-foreground px-2">
            {activeFileLanguage ?? ""}
          </div>
        </div>

        {/* CodeMirror */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor />
        </div>
      </div>
    </div>
  );
}
