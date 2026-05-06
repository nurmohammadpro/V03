import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: { date: string; value: number }[];
  loading?: boolean;
  className?: string;
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" />
        Flat
      </span>
    );
  }
  const isUp = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        isUp
          ? "text-green-600 dark:text-green-400 bg-green-500/10"
          : "text-red-600 dark:text-red-400 bg-red-500/10"
      )}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? "+" : ""}
      {change}%
    </span>
  );
}

export function StatCard({ title, value, change, icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted" />
            <div className="w-16 h-5 rounded-full bg-muted" />
          </div>
          <div className="h-8 w-24 bg-muted rounded mb-2" />
          <div className="h-4 w-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("group hover:shadow-lg hover:border-primary/20 transition-all", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {icon}
          </div>
          {change !== undefined && <TrendBadge change={change} />}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}
