import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-sm font-medium text-[var(--app-text)]">{title}</DialogTitle>
          <DialogDescription className="text-sm font-light leading-6 text-[var(--app-text-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 flex-row justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              tone === "danger"
                ? "rounded-[8px] bg-[var(--app-danger)] text-white hover:bg-[color-mix(in_srgb,var(--app-danger)_88%,white)]"
                : "rounded-[8px] bg-[var(--app-accent)] text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
            }
          >
            {loading ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
