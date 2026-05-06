import { useEffect, useRef } from "react";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { useWorkspaceStore } from "../../stores/workspaceStore";

function getLanguageExtension(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "js":
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "mjs":
    case "cjs":
    case "mts":
    case "cts":
      return javascript({ typescript: true });
    case "py":
      return python();
    case "html":
    case "htm":
      return html();
    case "css":
    case "scss":
    case "less":
      return [];
    case "json":
      return javascript({ jsx: false });
    default:
      return [];
  }
}

export default function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const activeFileContent = useWorkspaceStore((s) => s.activeFileContent);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);

  useEffect(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const content = activeFileContent ?? "";
    const filePath = activeFilePath ?? "untitled.ts";

    const langExt = getLanguageExtension(filePath);

    const state = EditorState.create({
      doc: content,
      extensions: [
        oneDark,
        EditorView.editable.of(false),
        keymap.of([]),
        placeholder("Select a file or generate a project..."),
        EditorView.lineWrapping,
        ...(Array.isArray(langExt) ? langExt : [langExt]),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [activeFileContent, activeFilePath]);

  return (
    <div
      ref={editorRef}
      className="h-full overflow-auto text-left"
    />
  );
}
