import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  FolderPlus,
  Zap,
  Rocket,
  AlertCircle,
  Download,
  LucideIcon,
} from "lucide-react";
import type { Activity } from "@/lib/types";

const ACTIVITY_ICONS: Record<Activity["type"], LucideIcon> = {
  user_register: UserPlus,
  project_create: FolderPlus,
  generation_complete: Zap,
  deploy: Rocket,
  export: Download,
  error: AlertCircle,
};

const ACTIVITY_COLORS: Record<Activity["type"], string> = {
  user_register: "bg-green-500",
  project_create: "bg-blue-500",
  generation_complete: "bg-purple-500",
  deploy: "bg-cyan-500",
  export: "bg-orange-500",
  error: "bg-red-500",
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
  activities: Activity[];
  loading?: boolean;
  title?: string;
  maxItems?: number;
  className?: string;
}

function ActivitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="w-2 h-2 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
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
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ActivitySkeleton />
        ) : display.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-1">
            {display.map((item) => {
              const Icon = ACTIVITY_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white",
                      ACTIVITY_COLORS[item.type]
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(item.timestamp)}
                      </span>
                      {item.userEmail && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">
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
      </CardContent>
    </Card>
  );
}
