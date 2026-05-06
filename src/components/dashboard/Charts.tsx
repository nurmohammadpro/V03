import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
  variant?: "area" | "bar" | "line";
  color?: string;
  height?: number;
  loading?: boolean;
  formatValue?: (v: number) => string;
}

export function TrendChart({
  data,
  title,
  variant = "area",
  color = "#3B82F6",
  height = 220,
  loading,
  formatValue,
}: TrendChartProps) {
  const gridColor = "rgba(255,255,255,0.04)";
  const tickColor = "#6B7280";
  const tooltipBg = "#0F141A";
  const tooltipBorder = "rgba(255,255,255,0.06)";

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#0F141A]">
        <div className="px-4 pt-4 pb-2">
          <div className="h-3.5 w-28 bg-[#1F2937] rounded animate-pulse" />
        </div>
        <div className="animate-pulse" style={{ height }}>
          <div className="h-full w-full bg-[#111827] mx-4 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#0F141A] overflow-hidden">
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-medium text-[#6B7280]">{title}</p>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {variant === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
            <defs>
              <linearGradient id={`cg-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={40}
            />
            <RechartTooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
                color: "#E6EDF3",
              }}
              formatter={(val) =>
                formatValue && typeof val === "number"
                  ? String(formatValue(val))
                  : String(val ?? "")
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#cg-${title.replace(/\s/g, "")})`}
            />
          </AreaChart>
        ) : variant === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <RechartTooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
                color: "#E6EDF3",
              }}
            />
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <RechartTooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
                color: "#E6EDF3",
              }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
