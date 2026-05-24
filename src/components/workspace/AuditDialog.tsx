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

type AuditEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  actorUserId: string;
  createdAt: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function AuditDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string | null }) {
  const { open, onOpenChange, projectId } = props;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => events ?? [], [events]);

  async function refresh() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getProjectAudit(projectId, 100);
      setEvents(res.events ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-sm font-medium text-[var(--app-text)]">Audit log</DialogTitle>
          <DialogDescription className="text-sm font-light leading-6 text-[var(--app-text-muted)]">
            Tracks security-relevant actions like environment variable changes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Events</p>
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

          {rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--app-text-muted)]">No audit events yet.</div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {rows.map((e) => (
                <div key={e.id} className="grid grid-cols-1 gap-1 border-b border-[var(--app-border)] px-4 py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-3">
                  <div className="text-xs text-[var(--app-text-dim)]">{formatTime(e.createdAt)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--app-panel-2)] px-2 py-0.5 text-[10px] text-[var(--app-text-dim)]">
                        {e.action}
                      </span>
                      {"key" in e.metadata ? (
                        <span className="truncate text-sm text-[var(--app-text)]">{String((e.metadata as any).key)}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-[var(--app-text-muted)]">Actor: {e.actorUserId.slice(0, 8)}…</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

