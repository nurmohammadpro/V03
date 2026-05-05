import { useState } from "react";
import { useWorkspaceStore, type FileNode } from "../../stores/workspaceStore";

interface TreeNodeProps {
  node: FileNode;
  depth: number;
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const activeFilePath = useWorkspaceStore((s) => s.activeFilePath);

  const isActive = activeFilePath === node.path;

  if (node.type === "file") {
    return (
      <div
        onClick={() => setActiveFile(node.path)}
        style={{
          padding: "2px 8px 2px 0",
          paddingLeft: depth * 16 + 8,
          cursor: "pointer",
          fontSize: 13,
          color: isActive ? "#fff" : "#999",
          background: isActive ? "#2a2a4a" : "transparent",
          borderRadius: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "#222";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ fontSize: 11 }}>{getFileIcon(node.name)}</span>
        <span>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "2px 8px 2px 0",
          paddingLeft: depth * 16 + 4,
          cursor: "pointer",
          fontSize: 13,
          color: "#ccc",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10, width: 12, display: "inline-block" }}>
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span style={{ fontSize: 11 }}>{getFolderIcon(node.name)}</span>
        <span style={{ fontWeight: 500 }}>{node.name}</span>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

export default function FileTree() {
  const files = useWorkspaceStore((s) => s.files);

  if (!files || files.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          fontSize: 12,
          color: "#555",
          textAlign: "center",
        }}
      >
        No files yet. Generate a project to see files here.
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {files.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, string> = {
    ts: "\u00A0\uD83D\uDCE0",   // 📠 for TS
    tsx: "\u269B\uFE0F",        // ⚛ for React
    js: "\uD83D\uDCDD",        // 📝
    jsx: "\u269B\uFE0F",       // ⚛
    py: "\uD83D\uDC0D",        // 🐍
    html: "\uD83C\uDF10",      // 🌐
    css: "\uD83C\uDFA8",       // 🎨
    json: "\uD83D\uDCCB",      // 📋
    md: "\uD83D\uDCDD",        // 📝
    yml: "\u2699\uFE0F",       // ⚙
    yaml: "\u2699\uFE0F",      // ⚙
    dockerfile: "\uD83D\uDC33", // 🐳
    env: "\uD83D\uDD12",       // 🔒
    gitignore: "\uD83D\uDD11", // 🔑
  };
  return iconMap[ext] ?? "\uD83D\uDCC4"; // 📄
}

function getFolderIcon(name: string): string {
  const folderMap: Record<string, string> = {
    src: "\uD83D\uDCC1",         // 📁
    components: "\uD83E\uDE90",  // 🪐
    pages: "\uD83D\uDCD6",       // 📖
    public: "\uD83C\uDF0D",      // 🌍
    api: "\uD83D\uDD17",         // 🔗
    lib: "\uD83D\uDEE0\uFE0F",  // 🛠
    utils: "\uD83D\uDEE0\uFE0F", // 🛠
    styles: "\uD83C\uDFA8",      // 🎨
    assets: "\uD83D\uDCBC",      // 💼
    node_modules: "\uD83D\uDCB5", // 💵
    dist: "\uD83D\uDCE6",        // 📦
    build: "\uD83D\uDCE6",       // 📦
    config: "\u2699\uFE0F",     // ⚙
  };
  return folderMap[name.toLowerCase()] ?? "\uD83D\uDCC2"; // 📂
}
