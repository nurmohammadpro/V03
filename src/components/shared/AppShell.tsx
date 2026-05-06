import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppShellProps {
  title: string;
  subtitle: string;
  navSections: NavSection[];
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
          "fixed inset-y-0 left-0 z-40 flex w-[288px] flex-col border-r border-[var(--app-border)] bg-[var(--app-panel)]/95 px-4 py-4 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] px-2">
              <img src="/v03.svg" alt="v03" className="h-4 w-auto" />
            </span>
            <div>
              <p className="text-[15px] font-medium tracking-[-0.02em] text-[var(--app-text)]">v03</p>
              <p className="text-xs text-[var(--app-text-dim)]">AI App Builder</p>
            </div>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Hide navigation"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pb-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--app-text-dim)]">
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
                        "flex items-center gap-3 rounded-[10px] px-3 py-3 transition-colors",
                        active
                          ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                          : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)]">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium tracking-[-0.02em]">{item.label}</span>
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
          <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3">
            {userFooter}
          </div>
        )}
      </aside>

      <main className="min-h-screen lg:pl-[288px]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-20 mb-6 flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_78%,transparent)] px-4 py-4 backdrop-blur-xl sm:px-5">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 h-9 w-9 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[22px] font-medium tracking-[-0.04em] text-[var(--app-text)] sm:text-[26px]">
                    {title}
                  </h1>
                  {badge}
                </div>
                <p className="mt-1 max-w-[60ch] text-sm font-normal text-[var(--app-text-muted)]">
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
