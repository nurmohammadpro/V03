import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, MoreHorizontal, Shield, ShieldOff, UsersRound } from "lucide-react";
import type { User } from "@/lib/types";

interface UsersTableProps {
  users: User[];
  loading?: boolean;
}

function UserStatusBadge({ status }: { status: User["status"] }) {
  const variants: Record<string, { label: string; class: string }> = {
    active: { label: "Active", class: "bg-green-500/10 text-green-600 dark:text-green-400" },
    suspended: { label: "Suspended", class: "bg-red-500/10 text-red-600 dark:text-red-400" },
    pending: { label: "Pending", class: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  };
  const v = variants[status];
  return (
    <Badge className={cn("font-medium whitespace-nowrap", v.class)} variant="outline">
      {v.label}
    </Badge>
  );
}

function UserRoleBadge({ role }: { role: User["role"] }) {
  if (role === "admin") {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 font-medium whitespace-nowrap">
        <Shield className="w-3 h-3 mr-1 inline-block" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-medium text-muted-foreground whitespace-nowrap">
      <ShieldOff className="w-3 h-3 mr-1 inline-block" />
      User
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export function UsersTable({ users, loading }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>User Management</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
              {(["all", "admin", "user"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                    roleFilter === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UsersRound className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No users match your search" : "No users yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[1fr_100px_90px_60px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span />
            </div>
            {filtered.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_100px_90px_60px] gap-4 items-center px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div>
                  <UserRoleBadge role={user.role} />
                </div>
                <div>
                  <UserStatusBadge status={user.status} />
                </div>
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
