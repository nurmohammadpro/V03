import { cn } from "@/lib/utils";
import {
  UserPlus,
  FolderPlus,
  Zap,
  Rocket,
  AlertCircle,
  Download,
  Activity,
  LucideIcon,
} from "lucide-react";
import type { Activity as ActivityItem } from "@/lib/types";

const ACTIVITY_ICONS: Record<ActivityItem["type"], LucideIcon> = {
  user_register: UserPlus,
  project_create: FolderPlus,
  generation_complete: Zap,
  deploy: Rocket,
  export: Download,
  error: AlertCircle,
};

const ACTIVITY_COLORS: Record<ActivityItem["type"], string> = {
  user_register: "bg-[#22C55E]",
  project_create: "bg-[#3B82F6]",
  generation_complete: "bg-[#A855F7]",
  deploy: "bg-[#06B6D4]",
  export: "bg-[#F59E0B]",
  error: "bg-[#EF4444]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  title?: string;
  maxItems?: number;
  className?: string;
}

export function ActivityFeed({
  activities,
  loading,
  title = "Recent Activity",
  maxItems = 10,
  className,
}: ActivityFeedProps) {
  const display = activities.slice(0, maxItems);

  return (
    <div className={cn("rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl", className)}>
      <div className="border-b border-[var(--app-border)] px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-normal text-[var(--app-text)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--app-success)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--app-success)]" />
          </span>
          {title}
        </h3>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="animate-pulse space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-7 w-7 rounded-xl bg-[var(--app-surface)]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-44 rounded bg-[var(--app-surface)]" />
                  <div className="h-3 w-20 rounded bg-[var(--app-surface)]" />
                </div>
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--app-text-muted)]">
            <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No recent activity
          </p>
        ) : (
          <div className="divide-y divide-[var(--app-border)]">
            {display.map((item) => {
              const Icon = ACTIVITY_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-[8px] px-2 py-2.5 transition-colors hover:bg-[var(--app-surface-subtle)]"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-white",
                      ACTIVITY_COLORS[item.type]
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-[var(--app-text)]">{item.message}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-[var(--app-text-muted)]">
                        {timeAgo(item.timestamp)}
                      </span>
                      {item.userEmail && (
                        <>
                          <span className="text-xs text-[var(--app-text-dim)]">·</span>
                          <span className="truncate text-xs text-[var(--app-text-muted)]">
                            {item.userEmail}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
