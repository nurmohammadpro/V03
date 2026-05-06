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
        className="flex items-center gap-1 py-0.5 pr-2 rounded-sm cursor-pointer text-[13px] whitespace-nowrap overflow-hidden text-ellipsis transition-colors"
        style={{
          paddingLeft: depth * 16 + 8,
          color: isActive ? "var(--primary-foreground)" : undefined,
          background: isActive ? "var(--surface-active)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <span className="text-[11px]">{getFileIcon(node.name)}</span>
        <span>{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 py-0.5 pr-2 cursor-pointer text-[13px] text-foreground font-medium"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        <span className="text-[10px] w-3 inline-block">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="text-[11px]">{getFolderIcon(node.name)}</span>
        <span>{node.name}</span>
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
      <div className="p-4 text-xs text-muted-foreground text-center">
        No files yet. Generate a project to see files here.
      </div>
    );
  }

  return (
    <div className="py-1">
      {files.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, string> = {
    ts: " 📠",
    tsx: "⚛️",
    js: "📝",
    jsx: "⚛️",
    py: "🐍",
    html: "🌐",
    css: "🎨",
    json: "📋",
    md: "📝",
    yml: "⚙️",
    yaml: "⚙️",
    dockerfile: "🐳",
    env: "🔒",
    gitignore: "🔑",
  };
  return iconMap[ext] ?? "📄";
}

function getFolderIcon(name: string): string {
  const folderMap: Record<string, string> = {
    src: "📁",
    components: "🪐",
    pages: "📖",
    public: "🌍",
    api: "🔗",
    lib: "🛠️",
    utils: "🛠️",
    styles: "🎨",
    assets: "💼",
    node_modules: "💵",
    dist: "📦",
    build: "📦",
    config: "⚙️",
  };
  return folderMap[name.toLowerCase()] ?? "📂";
}
