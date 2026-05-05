import { create } from "zustand";
import type { ChatMessage } from "../lib/sse";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  content?: string;
  language?: string;
}

interface LayoutState {
  leftPanelWidth: number; // percentage (0-100)
  isFileTreeOpen: boolean;
}

interface WorkspaceState {
  // Files
  files: FileNode[];
  activeFilePath: string | null;
  activeFileContent: string | null;
  activeFileLanguage: string | null;

  // Chat
  messages: ChatMessage[];
  selectedFramework: string;
  isGenerating: boolean;

  // Layout
  layout: LayoutState;

  // Actions
  setFiles: (files: FileNode[]) => void;
  setActiveFile: (path: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  appendToLastAssistantMessage: (delta: string) => void;
  setSelectedFramework: (fw: string) => void;
  setIsGenerating: (v: boolean) => void;
  setLeftPanelWidth: (w: number) => void;
  toggleFileTree: () => void;
  setActiveFileContent: (content: string) => void;
  reset: () => void;
}

const initialLayout: LayoutState = {
  leftPanelWidth: 50,
  isFileTreeOpen: true,
};

const initialState = {
  files: [],
  activeFilePath: null,
  activeFileContent: null,
  activeFileLanguage: null,
  messages: [],
  selectedFramework: "Next.js",
  isGenerating: false,
  layout: initialLayout,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialState,

  setFiles: (files) => set({ files }),

  setActiveFile: (path) => {
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const n of nodes) {
        if (n.path === path && n.type === "file") return n;
        if (n.children) {
          const found = findFile(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const file = findFile(get().files);
    if (file) {
      set({
        activeFilePath: file.path,
        activeFileContent: file.content ?? "",
        activeFileLanguage: file.language ?? null,
      });
    }
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
  setActiveFileContent: (content) => set({ activeFileContent: content }),
  reset: () => set(initialState),
}));
