import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/Charts";
import { CreditCard, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { useAdminStats } from "@/hooks/useDashboardData";

export default function AdminBilling() {
  const { stats, loading } = useAdminStats();

  return (
    <AdminShell
      title="Subscriptions"
      subtitle="Revenue, plan performance, and payment-side signals."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Revenue" value={`$${stats.revenue}`} change={stats.revenueGrowth} loading={loading} icon={<DollarSign className="w-4 h-4" />} />
          <StatCard title="Growth" value={`${stats.revenueGrowth}%`} loading={loading} icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard title="Active payers" value={Math.round(stats.totalUsers * 0.31)} loading={loading} icon={<CreditCard className="w-4 h-4" />} />
          <StatCard title="Invoices" value={Math.round(stats.totalUsers * 0.48)} loading={loading} icon={<Receipt className="w-4 h-4" />} />
        </section>
        <section className="grid gap-6 md:grid-cols-2">
          <TrendChart
            title="Revenue trend"
            data={stats.revenueTrend}
            variant="area"
            color="var(--app-success)"
            formatValue={(v) => `$${v}`}
            loading={loading}
          />
          <TrendChart
            title="User growth"
            data={stats.userTrend}
            variant="bar"
            color="var(--app-accent)"
            loading={loading}
          />
        </section>
      </div>
    </AdminShell>
  );
}
