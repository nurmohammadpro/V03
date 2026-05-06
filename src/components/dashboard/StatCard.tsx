import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  className?: string;
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] bg-[#111827] px-2 py-0.5 rounded-full">
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
          ? "text-[#22C55E] bg-[#22C55E]/10"
          : "text-[#EF4444] bg-[#EF4444]/10"
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
      <div className={cn("rounded-xl border border-white/5 bg-[#0F141A] p-5 animate-pulse", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#1F2937]" />
          <div className="w-14 h-5 rounded-full bg-[#1F2937]" />
        </div>
        <div className="h-7 w-24 bg-[#1F2937] rounded mb-2" />
        <div className="h-4 w-20 bg-[#1F2937] rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-[#0F141A] p-5 transition-all duration-200",
        "hover:border-white/10 hover:bg-[#111827]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
          {icon}
        </div>
        {change !== undefined && <TrendBadge change={change} />}
      </div>
      <p className="text-2xl font-semibold text-[#E6EDF3] tracking-tight">{value}</p>
      <p className="text-sm text-[#6B7280] mt-1">{title}</p>
    </div>
  );
}
