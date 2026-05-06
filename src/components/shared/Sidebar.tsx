import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface SidebarProps {
  brand?: React.ReactNode;
  navItems: NavItem[];
  userFooter?: React.ReactNode;
  className?: string;
}

export function Sidebar({ brand, navItems, userFooter, className }: SidebarProps) {
  return (
    <aside className={cn("w-64 border-r border-border bg-card p-6 flex flex-col gap-6", className)}>
      {brand ?? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            v
          </div>
          <span className="font-semibold text-lg">v03</span>
        </div>
      )}

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
              item.active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>

      {userFooter && (
        <div className="mt-auto pt-4 border-t border-border">
          {userFooter}
        </div>
      )}
    </aside>
  );
}
