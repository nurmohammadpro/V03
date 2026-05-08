import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountPopupProps {
  name: string;
  email: string;
  badge?: React.ReactNode;
  avatar: React.ReactNode;
  onSignOut: () => void | Promise<void>;
  className?: string;
}

export function AccountPopup({
  name,
  email,
  badge,
  avatar,
  onSignOut,
  className,
}: AccountPopupProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {open && (
        <div className="absolute inset-x-0 bottom-[calc(100%+10px)] z-30 overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          <div className="rounded-[8px] bg-[var(--app-panel)] px-3 py-3">
            <p className="truncate text-[13px] font-normal text-[var(--app-text)]">{name}</p>
            <p className="mt-1 truncate text-[11px] text-[var(--app-text-dim)]">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm font-normal text-[var(--app-danger)] transition-colors hover:bg-[var(--app-danger-soft)]"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-[8px] px-0 py-1 text-left"
      >
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-normal text-[var(--app-text)]">{name}</p>
          <p className="truncate text-[11px] text-[var(--app-text-dim)]">{email}</p>
        </div>
        {badge}
        <span className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "rotate-180")} />
        </span>
      </button>
    </div>
  );
}
