import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, MoreHorizontal, Shield, ShieldOff, UsersRound } from "lucide-react";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UsersTableProps {
  users: User[];
  loading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  active: "text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20",
  suspended: "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20",
  pending: "text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/20",
};

function TableRowSkeleton() {
  return (
      <div className="flex animate-pulse items-center gap-4 px-4 py-3">
      <div className="h-7 w-7 rounded-full bg-[var(--app-surface)]" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-32 rounded bg-[var(--app-surface)]" />
        <div className="h-3 w-24 rounded bg-[var(--app-surface)]" />
      </div>
      <div className="h-5 w-14 rounded-full bg-[var(--app-surface)]" />
      <div className="h-5 w-14 rounded-full bg-[var(--app-surface)]" />
      <div className="h-7 w-7 rounded bg-[var(--app-surface)]" />
    </div>
  );
}

export function UsersTable({ users, loading }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        u.email.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--app-border)] bg-[var(--app-panel)] shadow-[var(--shadow-sm)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-4">
        <h3 className="text-sm font-medium text-[var(--app-text)]">User Management</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-text-dim)]" />
            <Input
              placeholder="Search users..."
              className="h-9 w-48 rounded-full border-[var(--app-border)] bg-[var(--app-panel)] pl-8 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-dim)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-0.5 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
            {(["all", "admin", "user"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-[11px] font-normal capitalize transition-colors",
                  roleFilter === r
                    ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                    : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <UsersRound className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-dim)]" />
            <p className="text-sm text-[var(--app-text-muted)]">
              {search ? "No users match your search" : "No users yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--app-border)]">
            {/* Column headers */}
            <div className="hidden gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:grid sm:grid-cols-[1fr_90px_80px_40px]">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span />
            </div>
            {filtered.map((user) => (
              <div
                key={user.id}
                className="group grid gap-3 rounded-[14px] px-3 py-3 transition-colors hover:bg-[var(--app-surface-subtle)] sm:grid-cols-[1fr_90px_80px_40px] sm:items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-[var(--app-surface)] text-xs text-[var(--app-text-muted)]">
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">
                      {user.name || "—"}
                    </p>
                    <p className="truncate text-xs text-[var(--app-text-muted)]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:hidden">Role</span>
                  {user.role === "admin" ? (
                    <Badge className="border-0 bg-[var(--app-accent-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-accent)]">
                      <Shield className="w-3 h-3 mr-0.5 inline" /> Admin
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]"
                    >
                      <ShieldOff className="w-3 h-3 mr-0.5 inline" /> User
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:hidden">Status</span>
                  <Badge
                    className={cn(
                      "border px-2 py-0.5 text-[11px] font-normal",
                      STATUS_STYLES[user.status] || ""
                    )}
                    variant="outline"
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
