import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

interface NavSection {
  title: string;
  items: readonly NavItem[];
}

interface AppShellProps {
  title: string;
  subtitle: string;
  navSections: readonly NavSection[];
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  userFooter?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  title,
  subtitle,
  navSections,
  badge,
  headerActions,
  userFooter,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  const brandHref = user?.isAdmin ? "/admin/overview" : "/dashboard";

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--app-overlay)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[288px] flex-col border-r border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_92%,var(--app-panel)_8%)] px-4 py-4 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Link href={brandHref} className="flex items-center">
            <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--app-panel-2)] px-2">
              <img src="/v03.svg" alt="v03" className="h-4 w-auto" />
            </span>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide navigation"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pb-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-normal uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    location === item.href ||
                    (item.href !== "/" && location.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors",
                        active
                          ? "bg-[var(--app-surface-subtle)] text-[var(--app-text)]"
                          : "text-[var(--app-text-muted)] hover:bg-[color-mix(in_srgb,var(--app-surface-subtle)_72%,transparent)] hover:text-[var(--app-text)]"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[var(--app-panel-2)]">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-normal tracking-[-0.02em]">{item.label}</span>
                        {item.description && (
                          <span className="block truncate text-xs text-[var(--app-text-dim)]">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {userFooter && (
          <div className="mt-2 rounded-[8px] bg-[var(--app-panel-2)]/75 p-3">
            {userFooter}
          </div>
        )}
      </aside>

      <main className="min-h-screen lg:pl-[288px]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-20 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-1 py-4 backdrop-blur-xl sm:px-2">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 h-9 w-9 rounded-[8px] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>

              <Link href={brandHref} className="flex items-center lg:hidden">
                <img src="/v03.svg" alt="v03" className="h-4 w-auto" />
              </Link>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] sm:text-[16px]">
                    {title}
                  </h1>
                  {badge}
                </div>
                <p className="mt-1 max-w-[60ch] text-[13px] font-normal text-[var(--app-text-muted)]">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {headerActions}
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
