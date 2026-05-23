import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

type PaletteItem =
  | { type: "file"; id: string; label: string; path: string }
  | { type: "action"; id: string; label: string; run: () => void };

function flattenFilePaths(nodes: { type: "file" | "directory"; path: string; children?: any[] }[]): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === "file") out.push(n.path);
    if (Array.isArray(n.children)) n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out.sort((a, b) => a.localeCompare(b));
}

export function CommandPalette() {
  const files = useWorkspaceStore((s) => s.files);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const startPreview = useWorkspaceStore((s) => s.startPreview);
  const stopPreview = useWorkspaceStore((s) => s.stopPreview);
  const previewUrl = useWorkspaceStore((s) => s.previewUrl);
  const saveActiveFile = useWorkspaceStore((s) => s.saveActiveFile);
  const isFileDirty = useWorkspaceStore((s) => s.isFileDirty);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: PaletteItem[] = useMemo(() => {
    const base: PaletteItem[] = [
      {
        type: "action",
        id: "preview",
        label: previewUrl ? "Stop preview" : "Start preview",
        run: () => void (previewUrl ? stopPreview() : startPreview()),
      },
      {
        type: "action",
        id: "save",
        label: isFileDirty ? "Save file" : "Save file (no changes)",
        run: () => void saveActiveFile(),
      },
    ];

    const paths = flattenFilePaths(files);
    for (const p of paths) {
      base.push({ type: "file", id: `file:${p}`, label: p.split("/").pop() || p, path: p });
    }
    return base;
  }, [files, isFileDirty, previewUrl, saveActiveFile, startPreview, stopPreview]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      if (item.type === "action") return item.label.toLowerCase().includes(q);
      return item.path.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() !== "p") return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
  }, [open]);

  const runItem = async (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.type === "action") {
      item.run();
      setOpen(false);
      return;
    }
    await setActiveFile(item.path);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[18%] z-[210] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[14px] border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--app-text-dim)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  void runItem(filtered[activeIndex]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Go to file…  (Cmd/Ctrl+P)"
              className="w-full bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-dim)]"
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--app-text-muted)]">No matches</div>
            ) : (
              filtered.slice(0, 80).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void runItem(item)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    index === activeIndex ? "bg-[var(--app-surface)] text-[var(--app-text)]" : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate">{item.label}</div>
                    {item.type === "file" ? (
                      <div className="truncate text-xs text-[var(--app-text-dim)]">{item.path}</div>
                    ) : (
                      <div className="text-xs text-[var(--app-text-dim)]">Action</div>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    {item.type === "file" ? "File" : "Action"}
                  </span>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

