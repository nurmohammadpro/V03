import { Suspense, useCallback, useEffect, useMemo } from "react";
import React from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const MonacoEditor = React.lazy(() => import("@monaco-editor/react"));

function inferMonacoLanguage(path: string | null) {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx"].includes(ext)) return "typescript";
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript";
  if (["json"].includes(ext)) return "json";
  if (["py"].includes(ext)) return "python";
  if (["php"].includes(ext)) return "php";
  if (["html", "htm"].includes(ext)) return "html";
  if (["css", "scss", "less"].includes(ext)) return "css";
  if (["md"].includes(ext)) return "markdown";
  return "plaintext";
}

export default function CodeEditor() {
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);
  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const setActiveFileContent = useWorkspaceStore((s) => s.setActiveFileContent);
  const saveActiveFile = useWorkspaceStore((s) => s.saveActiveFile);
  const isFileSaving = useWorkspaceStore((s) => s.isFileSaving);

  const language = useMemo(() => inferMonacoLanguage(activeFilePath), [activeFilePath]);

  const onChange = useCallback(
    (value: string | undefined) => {
      setActiveFileContent(value ?? "");
    },
    [setActiveFileContent],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void saveActiveFile();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveActiveFile]);

  if (!activeFilePath) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-6 text-sm text-[var(--app-text-muted)]">
        Select a file from the tree to start editing.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-[var(--app-text-muted)]">
            Loading editor…
          </div>
        }
      >
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language={language}
          value={activeFileContent ?? ""}
          onChange={onChange}
          options={{
            readOnly: isFileSaving,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </Suspense>
    </div>
  );
}
