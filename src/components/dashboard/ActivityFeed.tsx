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
    <div className={cn("rounded-xl border border-white/5 bg-[#0F141A]", className)}>
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-[#E6EDF3] flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
          </span>
          {title}
        </h3>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="animate-pulse space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-7 h-7 rounded-lg bg-[#1F2937]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-44 bg-[#1F2937] rounded" />
                  <div className="h-3 w-20 bg-[#1F2937] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No recent activity
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {display.map((item) => {
              const Icon = ACTIVITY_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-[#111827] transition-colors group"
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white",
                      ACTIVITY_COLORS[item.type]
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#D1D5DB]">{item.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#6B7280]">
                        {timeAgo(item.timestamp)}
                      </span>
                      {item.userEmail && (
                        <>
                          <span className="text-xs text-[#6B7280]">·</span>
                          <span className="text-xs text-[#6B7280] truncate">
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
