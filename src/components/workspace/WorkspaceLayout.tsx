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
      className="workspace-layout"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        userSelect: isDragging ? "none" : "auto",
      }}
    >
      {/* Left Panel */}
      <div
        className="workspace-left"
        style={{
          width: `${layout.leftPanelWidth}%`,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #2a2a3a",
          overflow: "hidden",
        }}
      >
        {/* File tree toggle and chat pane will go here */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {isFileTreeOpen && (
            <div
              style={{
                maxHeight: "40%",
                overflow: "auto",
                borderBottom: "1px solid #2a2a3a",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#888",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: "1px solid #2a2a3a",
                }}
              >
                Files
              </div>
              <FileTree />
            </div>
          )}
          {/* Chat pane placeholder - will be wired in Workspace.tsx */}
          <div
            id="workspace-chat-pane"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          />
        </div>
      </div>

      {/* Resizable divider */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 4,
          cursor: "col-resize",
          background: isDragging ? "#5555ff" : "#2a2a3a",
          flexShrink: 0,
          transition: isDragging ? "none" : "background 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.background = "#5555ff";
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.background = "#2a2a3a";
        }}
      />

      {/* Right Panel */}
      <div
        className="workspace-right"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            background: "#1a1a2a",
            borderBottom: "1px solid #2a2a3a",
            minHeight: 36,
            gap: 4,
          }}
        >
          <button
            onClick={toggleFileTree}
            title="Toggle file tree"
            style={{
              background: "none",
              border: "1px solid #2a2a3a",
              color: "#888",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {isFileTreeOpen ? "<<" : ">>"}
          </button>
          {activeFileContent && (
            <div
              style={{
                fontSize: 13,
                color: "#ccc",
                padding: "4px 12px",
                background: "#2a2a3a",
                borderRadius: "4px 4px 0 0",
              }}
            >
              {useWorkspaceStore.getState().activeFilePath ?? "untitled"}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: 11,
              color: "#666",
              padding: "0 8px",
            }}
          >
            {activeFileLanguage ?? ""}
          </div>
        </div>

        {/* CodeMirror / Preview */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CodeEditor />
        </div>
      </div>
    </div>
  );
}
