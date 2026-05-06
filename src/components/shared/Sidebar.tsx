import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  brand?: React.ReactNode;
  navSections?: NavSection[];
  navItems?: NavItem[]; // fallback for simple usage
  children?: React.ReactNode;
  userFooter?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  brand,
  navSections,
  navItems,
  children,
  userFooter,
  className,
}: SidebarProps) {
  // Build sections from either navSections or simple navItems
  const sections: NavSection[] = navSections ?? (navItems ? [{ items: navItems }] : []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-[260px] bg-[#0B0F14] border-r border-white/5 flex flex-col z-10",
        className
      )}
    >
      {/* Brand / Logo */}
      <div className="px-4 pt-5 pb-3">
        {brand ?? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-sm">
              v
            </div>
            <span className="text-[15px] font-semibold text-[#E6EDF3]">v03</span>
          </div>
        )}
      </div>

      {/* New Task Button */}
      <div className="px-3 mb-5">
        <button className="w-full bg-[#111827] hover:bg-[#1F2937] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] font-medium transition-colors duration-200 text-left">
          + New task
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-3 pb-1 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                    item.active
                      ? "bg-[#1F2937] text-[#E6EDF3]"
                      : "text-[#9BA7B4] hover:bg-[#1F2937] hover:text-[#E6EDF3]"
                  )}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        ))}

        {children && <div>{children}</div>}
      </nav>

      {/* User Footer */}
      {userFooter && (
        <div className="px-3 py-3 border-t border-white/5 mt-auto">
          {userFooter}
        </div>
      )}
    </aside>
  );
}
