import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type EnvVarRow = { id: string; key: string; hasValue: boolean; updatedAt: string };

function normalizeKey(key: string) {
  return key.trim().toUpperCase();
}

export function EnvVarsDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string | null }) {
  const { open, onOpenChange, projectId } = props;
  const [rows, setRows] = useState<EnvVarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.key.localeCompare(b.key)), [rows]);

  async function refresh() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getProjectEnv(projectId);
      setRows(res.vars ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function upsert() {
    if (!projectId) return;
    const key = normalizeKey(keyInput);
    if (!key) return;
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      toast.error("Env key must look like FOO_BAR");
      return;
    }
    if (!valueInput) {
      toast.error("Value is required");
      return;
    }
    setSaving(true);
    try {
      await api.putProjectEnv(projectId, [{ key, value: valueInput }]);
      setKeyInput("");
      setValueInput("");
      toast.success(`Saved ${key}`);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save env var");
    } finally {
      setSaving(false);
    }
  }

  async function remove(key: string) {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.deleteProjectEnv(projectId, key);
      toast.success(`Deleted ${key}`);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete env var");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-sm font-medium text-[var(--app-text)]">Environment variables</DialogTitle>
          <DialogDescription className="text-sm font-light leading-6 text-[var(--app-text-muted)]">
            Values are write-only for safety. Update by re-saving the key with a new value.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
            <input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="KEY"
              className="h-10 w-full rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-dim)]"
            />
            <input
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="Value (write-only)"
              className="h-10 w-full rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-dim)]"
            />
            <Button
              type="button"
              onClick={() => void upsert()}
              disabled={saving || !projectId}
              className="h-10 rounded-[8px] bg-[var(--app-accent)] px-4 text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>

          <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)]">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                Saved keys
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void refresh()}
                disabled={loading || !projectId}
                className="h-8 rounded-[8px] text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
              >
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {sortedRows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[var(--app-text-muted)]">
                No env vars set yet.
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto">
                {sortedRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--app-text)]">{row.key}</p>
                      <p className="mt-0.5 text-xs text-[var(--app-text-dim)]">Stored</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void remove(row.key)}
                      disabled={saving}
                      className="h-9 w-9 rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      aria-label={`Delete ${row.key}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

