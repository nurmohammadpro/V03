import { create } from "zustand";
import type { ChatMessage } from "../lib/sse";
import api from "@/lib/api";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface LayoutState {
  leftPanelWidth: number; // percentage (0-100)
  isFileTreeOpen: boolean;
}

interface WorkspaceState {
  projectId: string | null;

  // Files
  files: FileNode[];
  activeFilePath: string | null;
  activeFileContent: string | null;
  activeFileLanguage: string | null;
  isFileDirty: boolean;
  isFileSaving: boolean;

  // Chat
  messages: ChatMessage[];
  selectedFramework: string;
  isGenerating: boolean;

  // Preview
  previewId: string | null;
  previewUrl: string | null;
  previewMode: "build" | "dev";
  isPreviewStarting: boolean;
  previewLogs: string;
  isPreviewReady: boolean;
  previewIsPublic: boolean;

  // UI
  outputTab: "preview" | "code" | "logs";

  // Layout
  layout: LayoutState;

  // Actions
  setFiles: (files: FileNode[]) => void;
  setProjectId: (projectId: string) => void;
  refreshFileTree: () => Promise<void>;
  restorePreviewForProject: () => Promise<void>;
  setActiveFile: (path: string) => Promise<void>;
  setActiveFileContent: (content: string) => void;
  saveActiveFile: () => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  appendToLastAssistantMessage: (delta: string) => void;
  setSelectedFramework: (fw: string) => void;
  setIsGenerating: (v: boolean) => void;
  setLeftPanelWidth: (w: number) => void;
  toggleFileTree: () => void;
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  restartPreview: () => Promise<void>;
  refreshPreviewLogs: () => Promise<void>;
  refreshPreviewStatus: () => Promise<void>;
  setPreviewMode: (mode: "build" | "dev") => void;
  rotatePreviewLink: () => Promise<void>;
  setPreviewPublic: (isPublic: boolean) => Promise<void>;
  setOutputTab: (tab: "preview" | "code" | "logs") => void;
  reset: () => void;
}

const initialLayout: LayoutState = {
  leftPanelWidth: 50,
  isFileTreeOpen: true,
};

const initialState = {
  projectId: null,
  files: [],
  activeFilePath: null,
  activeFileContent: null,
  activeFileLanguage: null,
  isFileDirty: false,
  isFileSaving: false,
  messages: [],
  selectedFramework: "Next.js",
  isGenerating: false,
  previewId: null,
  previewUrl: null,
  previewMode: "build" as const,
  isPreviewStarting: false,
  previewLogs: "",
  isPreviewReady: false,
  previewIsPublic: false,
  outputTab: "preview" as const,
  layout: initialLayout,
};

function inferLanguage(path: string | null) {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) return "typescript";
  if (["json"].includes(ext)) return "json";
  if (["py"].includes(ext)) return "python";
  if (["php"].includes(ext)) return "php";
  if (["html", "htm"].includes(ext)) return "html";
  if (["css", "scss", "less"].includes(ext)) return "css";
  if (["md"].includes(ext)) return "markdown";
  return "plaintext";
}

function buildTreeFromPaths(items: Array<{ path: string; fileType: "file" | "dir" }>): FileNode[] {
  type Dir = { name: string; path: string; type: "directory"; children: Map<string, Dir | FileNode> };
  const root: Dir = { name: "", path: "", type: "directory", children: new Map() };

  for (const item of items) {
    const parts = item.path.split("/").filter(Boolean);
    let current = root;
    let accPath = "";
    parts.forEach((part, index) => {
      accPath = accPath ? `${accPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      const key = accPath;
      const existing = current.children.get(key);

      if (isLast && item.fileType === "file") {
        if (!existing || (existing as any).type !== "file") {
          current.children.set(key, { name: part, path: accPath, type: "file" });
        }
        return;
      }

      if (!existing || (existing as any).type === "file") {
        const dir: Dir = { name: part, path: accPath, type: "directory", children: new Map() };
        current.children.set(key, dir as any);
        current = dir;
        return;
      }

      current = existing as Dir;
    });
  }

  function toArray(dir: Dir): FileNode[] {
    const nodes = [...dir.children.values()].map((node) => {
      if ((node as any).type === "directory") {
        const d = node as Dir;
        return { name: d.name, path: d.path, type: "directory" as const, children: toArray(d) };
      }
      return node as FileNode;
    });

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  return toArray(root);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  setFiles: (files) => set({ files }),

  setProjectId: (projectId) =>
    set((state) =>
      state.projectId === projectId
        ? { projectId }
        : {
            projectId,
            previewId: null,
            previewUrl: null,
            previewLogs: "",
            isPreviewStarting: false,
            isPreviewReady: false,
            previewIsPublic: false,
          },
    ),

  refreshFileTree: async () => {
    const projectId = get().projectId;
    if (!projectId) return;
    const res = await api.getProjectTree(projectId);
    const tree = buildTreeFromPaths(
      res.files.map((f) => ({ path: f.path, fileType: (f.fileType === "dir" ? "dir" : "file") as any })),
    );
    set({ files: tree });
  },

  restorePreviewForProject: async () => {
    const projectId = get().projectId;
    if (!projectId) return;

    const res = await api.getProjectActivePreview(projectId);
    const preview = res.preview;

    if (!preview) {
      set({
        previewId: null,
        previewUrl: null,
        previewLogs: "",
        isPreviewStarting: false,
        isPreviewReady: false,
        previewIsPublic: false,
      });
      return;
    }

    const runnerRef = (preview.runnerRef || {}) as Record<string, unknown>;
    const mode = runnerRef.mode === "dev" ? "dev" : "build";
    set({
      previewId: preview.id,
      previewUrl: preview.url,
      previewMode: mode,
      previewLogs: "",
      isPreviewStarting: false,
      isPreviewReady: preview.status === "ready",
      previewIsPublic: runnerRef.isPublic === true,
      outputTab: "preview",
    });
  },

  setActiveFile: async (path) => {
    const projectId = get().projectId;
    if (!projectId) return;
    const res = await api.getProjectFile(projectId, path);
    set({
      activeFilePath: res.path,
      activeFileContent: res.content ?? "",
      activeFileLanguage: inferLanguage(res.path),
      isFileDirty: false,
      outputTab: "code",
    });
  },

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content, isStreaming: false };
          break;
        }
      }
      return { messages: msgs };
    }),

  appendToLastAssistantMessage: (delta) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = {
            ...msgs[i],
            content: msgs[i].content + delta,
            isStreaming: true,
          };
          break;
        }
      }
      return { messages: msgs };
    }),

  setSelectedFramework: (fw) => set({ selectedFramework: fw }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setLeftPanelWidth: (w) =>
    set((state) => ({
      layout: { ...state.layout, leftPanelWidth: Math.max(20, Math.min(80, w)) },
    })),
  toggleFileTree: () =>
    set((state) => ({
      layout: { ...state.layout, isFileTreeOpen: !state.layout.isFileTreeOpen },
    })),

  setActiveFileContent: (content) => set({ activeFileContent: content, isFileDirty: true }),

  saveActiveFile: async () => {
    const projectId = get().projectId;
    const path = get().activeFilePath;
    const content = get().activeFileContent;
    if (!projectId || !path || content == null) return;
    set({ isFileSaving: true });
    try {
      await api.putProjectFile(projectId, path, content, `Edit ${path}`);
      set({ isFileDirty: false });
      await get().refreshFileTree();
    } finally {
      set({ isFileSaving: false });
    }
  },

  startPreview: async () => {
    const projectId = get().projectId;
    if (!projectId) return;
    set({ isPreviewStarting: true });
    try {
      const mode = get().previewMode;
      const res = await api.startPreview(projectId, mode);
      set({
        previewId: res.previewId,
        previewUrl: res.url,
        previewLogs: "",
        isPreviewReady: false,
        previewIsPublic: false,
        outputTab: "preview",
      });
      await get().refreshPreviewStatus();
    } finally {
      set({ isPreviewStarting: false });
    }
  },

  stopPreview: async () => {
    const previewId = get().previewId;
    if (!previewId) return;
    await api.stopPreview(previewId);
    set({ previewId: null, previewUrl: null, previewLogs: "", isPreviewReady: false, previewIsPublic: false });
  },

  restartPreview: async () => {
    const previewId = get().previewId;
    if (previewId) {
      await api.stopPreview(previewId).catch(() => {});
    }
    await get().startPreview();
  },

  refreshPreviewLogs: async () => {
    const previewId = get().previewId;
    if (!previewId) return;
    const res = await api.getPreviewLogs(previewId, 400);
    set({ previewLogs: res.logs ?? "" });
  },

  refreshPreviewStatus: async () => {
    const previewId = get().previewId;
    if (!previewId) return;
    const res = await api.getPreview(previewId);
    const status = res.preview?.status || "running";
    const runnerRef = (res.preview?.runnerRef || {}) as any;
    const isPublic = runnerRef?.isPublic === true;
    set({ isPreviewReady: status === "ready", previewIsPublic: isPublic });
  },

  setPreviewMode: (mode) => set({ previewMode: mode }),

  rotatePreviewLink: async () => {
    const previewId = get().previewId;
    if (!previewId) return;
    const res = await api.rotatePreviewToken(previewId);
    if (res?.url) set({ previewUrl: res.url });
  },

  setPreviewPublic: async (isPublic) => {
    const previewId = get().previewId;
    if (!previewId) return;
    await api.updatePreviewSharing(previewId, { isPublic });
    set({ previewIsPublic: isPublic });
  },
  setOutputTab: (tab) => set({ outputTab: tab }),

  reset: () => set(initialState),
}));
