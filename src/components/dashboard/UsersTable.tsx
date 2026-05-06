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
    <div className="animate-pulse flex items-center gap-4 py-3 px-4">
      <div className="w-7 h-7 rounded-full bg-[#1F2937]" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-32 bg-[#1F2937] rounded" />
        <div className="h-3 w-24 bg-[#1F2937] rounded" />
      </div>
      <div className="h-5 w-14 bg-[#1F2937] rounded-full" />
      <div className="h-5 w-14 bg-[#1F2937] rounded-full" />
      <div className="h-7 w-7 bg-[#1F2937] rounded" />
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
    <div className="rounded-xl border border-white/5 bg-[#0F141A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-[#E6EDF3]">User Management</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <Input
              placeholder="Search users..."
              className="pl-8 w-48 h-8 text-xs bg-[#111827] border-white/5 text-[#E6EDF3] placeholder:text-[#6B7280]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-0.5 bg-[#111827] p-0.5 rounded-lg">
            {(["all", "admin", "user"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize",
                  roleFilter === r
                    ? "bg-[#1F2937] text-[#E6EDF3]"
                    : "text-[#6B7280] hover:text-[#9BA7B4]"
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
          <div className="text-center py-12">
            <UsersRound className="w-10 h-10 text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">
              {search ? "No users match your search" : "No users yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_90px_80px_40px] gap-3 px-3 py-2 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span />
            </div>
            {filtered.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_90px_80px_40px] gap-3 items-center px-3 py-2.5 hover:bg-[#111827] rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-[#1F2937] text-[#9BA7B4] text-xs">
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#E6EDF3] truncate">
                      {user.name || "—"}
                    </p>
                    <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                  </div>
                </div>
                <div>
                  {user.role === "admin" ? (
                    <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] border-0 text-[11px] font-medium px-1.5 py-0.5">
                      <Shield className="w-3 h-3 mr-0.5 inline" /> Admin
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[#6B7280] border-white/5 text-[11px] font-medium px-1.5 py-0.5"
                    >
                      <ShieldOff className="w-3 h-3 mr-0.5 inline" /> User
                    </Badge>
                  )}
                </div>
                <div>
                  <Badge
                    className={cn(
                      "text-[11px] font-medium px-1.5 py-0.5 border",
                      STATUS_STYLES[user.status] || ""
                    )}
                    variant="outline"
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-[#6B7280] hover:text-[#E6EDF3] hover:bg-[#1F2937]"
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
