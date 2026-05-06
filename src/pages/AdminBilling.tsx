import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminStats, useSubscriptionPlans, useUpdateAdminPlan } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminBilling() {
  const { stats } = useAdminStats();
  const { plans } = useSubscriptionPlans();
  const updatePlan = useUpdateAdminPlan();

  async function handleTogglePlanStatus(planId: string, status: string) {
    const nextStatus = status === "active" ? "archived" : "active";

    try {
      await updatePlan.mutateAsync({ planId, body: { status: nextStatus } });
      toast.success(`Plan moved to ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update plan.");
    }
  }

  return (
    <AdminShell title="Subscriptions" subtitle="Plans, pricing, feature packaging, and payer-side health.">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, note: "Current monthly run rate" },
            { label: "Active payers", value: stats.activeSubscriptions, note: "Users on paid or trial plans" },
            { label: "Suspended", value: stats.suspendedUsers, note: "Accounts blocked from plan usage" },
            { label: "Growth", value: `${stats.revenueGrowth}%`, note: "Month-over-month revenue change" },
          ].map((item) => (
            <div key={item.label} className="rounded-[8px] bg-[var(--app-panel)] p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{item.label}</p>
              <p className="mt-3 text-[20px] text-[var(--app-text)]">{item.value}</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">{item.note}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[8px] bg-[var(--app-panel)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--app-text)]">Plan catalog</p>
              <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--app-text-muted)]">
                This is the packaging layer the admin team will own: features, market-wise pricing, and plan status before the billing provider sync is wired in.
              </p>
            </div>
            <span className="text-xs text-[var(--app-text-dim)]">{plans.length} plans</span>
          </div>

          <div className="mt-5 space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--app-text)]">{plan.name}</p>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--app-text-dim)]">{plan.status}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleTogglePlanStatus(plan.id, plan.status)}
                      className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                    >
                      {plan.status === "active" ? "Archive" : "Activate"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Features</p>
                    <div className="mt-3 space-y-2">
                      {plan.features.map((feature) => (
                        <div key={feature.id} className="flex items-center justify-between gap-3 text-sm text-[var(--app-text-muted)]">
                          <span>{feature.label}</span>
                          <span className="text-[var(--app-text)]">{feature.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Pricing</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {plan.prices.length > 0 ? (
                        plan.prices.map((price) => (
                          <div key={price.id} className="rounded-[8px] bg-[var(--app-panel)] p-3">
                            <p className="text-sm text-[var(--app-text)]">
                              {price.market === "bd" ? "Bangladesh" : "International"}
                            </p>
                            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                              {price.currency} {price.amount.toLocaleString()} / {price.billingCycle.replace("_", " ")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[8px] bg-[var(--app-panel)] p-3 text-sm text-[var(--app-text-muted)]">
                          No paid pricing for this plan.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
