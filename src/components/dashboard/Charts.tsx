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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
  variant?: "area" | "bar" | "line";
  color?: string;
  height?: number;
  loading?: boolean;
  formatValue?: (v: number) => string;
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full w-full bg-muted rounded-lg" />
    </div>
  );
}

export function TrendChart({
  data,
  title,
  variant = "area",
  color = "var(--color-primary, hsl(221, 83%, 53%))",
  height = 250,
  loading,
  formatValue,
}: TrendChartProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ChartSkeleton height={height} />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {variant === "area" ? (
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, hsl(214, 32%, 91%))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground, hsl(215, 20%, 65%))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground, hsl(215, 20%, 65%))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                  width={45}
                />
                <RechartTooltip
                  contentStyle={{
                    background: "var(--color-card, hsl(0, 0%, 100%))",
                    border: "1px solid var(--color-border, hsl(214, 32%, 91%))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [formatValue ? formatValue(val) : val, title]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            ) : variant === "bar" ? (
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <RechartTooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <RechartTooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
