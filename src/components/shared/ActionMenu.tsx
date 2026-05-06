import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
};

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  label?: string;
  buttonContent?: React.ReactNode;
}

export function ActionMenu({
  items,
  className,
  buttonClassName,
  align = "right",
  label = "Open actions",
  buttonContent,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]",
          buttonClassName
        )}
      >
        {buttonContent ?? <MoreHorizontal className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-9 z-30 min-w-[168px] overflow-hidden rounded-[8px] bg-[var(--app-panel-2)] py-1 shadow-[var(--shadow-md)] backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                item.tone === "danger"
                  ? "text-[var(--app-danger)] hover:bg-[var(--app-danger-soft)]"
                  : "text-[var(--app-text)] hover:bg-[var(--app-surface)]",
                item.disabled ? "cursor-not-allowed opacity-40" : ""
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
