import { cn } from "@/lib/utils";

interface NavbarProps {
  logo?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Navbar({ logo, children, actions, className }: NavbarProps) {
  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 md:px-8 md:py-6",
        className
      )}
      style={{ zIndex: "var(--z-navbar)" }}
    >
      <div className="flex items-center gap-6">
        {logo ?? (
          <a href="/" className="flex items-center">
            <img
              src="/v03.svg"
              alt="v03.tech"
              className="h-5 w-auto md:h-5"
            />
          </a>
        )}
        {children}
      </div>

      {actions}
    </nav>
  );
}
