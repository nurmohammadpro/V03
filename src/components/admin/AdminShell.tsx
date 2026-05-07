import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppShell } from "@/components/shared/AppShell";
import { AccountPopup } from "@/components/shared/AccountPopup";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, UserPlus } from "lucide-react";
import { ADMIN_NAV_SECTIONS } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function AdminShell({ title, subtitle, children, badge, headerActions }: AdminShellProps) {
  const { user, loading, logout } = useAuth();
  const [dateRange] = useState<"7d" | "30d" | "90d">("30d");
  const primaryRole = user?.roleKeys?.[0]?.replace(/_/g, " ") ?? "admin";

  const handleSignOut = async () => {
    await logout();
    window.location.replace("/");
  };

  useEffect(() => {
    if (loading || !user || user.isAdmin) return;
    window.location.replace("/dashboard");
  }, [loading, user]);

  if (loading || !user || !user.isAdmin) {
    return null;
  }

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      badge={
        badge ?? (
          <Badge className="rounded-[6px] border-0 bg-[var(--app-danger-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-danger)]">
            Internal
          </Badge>
        )
      }
      navSections={ADMIN_NAV_SECTIONS}
      headerActions={
        <>
          <div className="flex gap-1 rounded-[8px] bg-[var(--app-panel)] p-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                className={cn(
                  "rounded-[6px] px-3 py-1.5 text-xs font-normal transition-colors duration-200",
                  dateRange === range
                    ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="rounded-[8px] bg-[var(--app-accent)] text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite
          </Button>
          {headerActions}
        </>
      }
      userFooter={
        <AccountPopup
          name={user?.fullName || user?.email?.split("@")[0] || "Admin"}
          email={user?.email || "admin@v03.tech"}
          avatar={
            <Avatar size="sm">
              <AvatarFallback className="bg-[var(--app-surface)] text-[var(--app-text-muted)]">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
          }
          badge={
            <Badge className="rounded-[6px] border-0 bg-[var(--app-accent-soft)] px-2 py-0.5 text-[10px] font-normal text-[var(--app-accent)]">
              {primaryRole}
            </Badge>
          }
          onSignOut={handleSignOut}
        />
      }
    >
      {children}
    </AppShell>
  );
}
