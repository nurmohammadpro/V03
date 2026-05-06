import { useState } from "react";
import { useWorkspaceStore, type FileNode } from "../../stores/workspaceStore";
import {
  Braces,
  ChevronRight,
  FileCode2,
  FileJson2,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Palette,
  Package2,
  Settings2,
  Shield,
} from "lucide-react";

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
      <button
        type="button"
        onClick={() => setActiveFile(node.path)}
        className={`flex w-full items-center gap-2 rounded-[8px] py-1.5 pr-2 text-left text-[13px] transition-colors ${
          isActive
            ? "bg-[var(--app-surface)] text-[var(--app-text)]"
            : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
        }`}
        style={{ paddingLeft: depth * 16 + 10 }}
      >
        <span className="text-[var(--app-text-dim)]">{getFileIcon(node.name)}</span>
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-[8px] py-1.5 pr-2 text-left text-[13px] font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-subtle)]"
        style={{ paddingLeft: depth * 16 + 6 }}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)] transition-transform ${
            expanded ? "rotate-90" : "rotate-0"
          }`}
        />
        <span className="text-[var(--app-text-dim)]">{getFolderIcon(node.name, expanded)}</span>
        <span className="truncate">{node.name}</span>
      </button>
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

function getFileIcon(name: string): React.ReactNode {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, React.ReactNode> = {
    ts: <Braces className="h-3.5 w-3.5" />,
    tsx: <FileCode2 className="h-3.5 w-3.5" />,
    js: <Braces className="h-3.5 w-3.5" />,
    jsx: <FileCode2 className="h-3.5 w-3.5" />,
    py: <FileCode2 className="h-3.5 w-3.5" />,
    html: <Globe className="h-3.5 w-3.5" />,
    css: <Palette className="h-3.5 w-3.5" />,
    json: <FileJson2 className="h-3.5 w-3.5" />,
    md: <FileText className="h-3.5 w-3.5" />,
    yml: <Settings2 className="h-3.5 w-3.5" />,
    yaml: <Settings2 className="h-3.5 w-3.5" />,
    dockerfile: <Package2 className="h-3.5 w-3.5" />,
    env: <Shield className="h-3.5 w-3.5" />,
    gitignore: <Shield className="h-3.5 w-3.5" />,
  };
  return iconMap[ext] ?? <FileText className="h-3.5 w-3.5" />;
}

function getFolderIcon(name: string, expanded: boolean): React.ReactNode {
  const folderMap: Record<string, React.ReactNode> = {
    src: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    components: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    pages: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    public: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    api: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    lib: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    utils: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    styles: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    assets: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    node_modules: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    dist: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    build: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
    config: expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />,
  };
  return folderMap[name.toLowerCase()] ?? (expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />);
}
