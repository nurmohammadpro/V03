import { AdminShell } from "@/components/admin/AdminShell";
import {
  useAdminStats,
  useReplaceAdminPlanFeatures,
  useReplaceAdminPlanPrices,
  useSubscriptionPlans,
  useUpdateAdminPlan,
} from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export default function AdminBilling() {
  const { stats } = useAdminStats();
  const { plans } = useSubscriptionPlans();
  const updatePlan = useUpdateAdminPlan();
  const replaceFeatures = useReplaceAdminPlanFeatures();
  const replacePrices = useReplaceAdminPlanPrices();
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFeatures, setDraftFeatures] = useState<Array<{ key: string; label: string; featureType: string; value: string }>>([]);
  const [draftPrices, setDraftPrices] = useState<Array<{ market: string; currency: string; billingCycle: string; amount: string; isActive: boolean }>>([]);

  const editingPlan = useMemo(
    () => plans.find((plan) => plan.id === editingPlanId) ?? null,
    [plans, editingPlanId],
  );

  async function handleTogglePlanStatus(planId: string, status: string) {
    const nextStatus = status === "active" ? "archived" : "active";

    try {
      await updatePlan.mutateAsync({ planId, body: { status: nextStatus } });
      toast.success(`Plan moved to ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update plan.");
    }
  }

  function handleOpenEdit(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;

    setEditingPlanId(planId);
    setDraftName(plan.name);
    setDraftDescription(plan.description);
    setDraftFeatures(
      plan.features.map((feature) => ({
        key: feature.key,
        label: feature.label,
        featureType: feature.featureType,
        value: feature.value,
      })),
    );
    setDraftPrices(
      plan.prices.map((price) => ({
        market: price.market,
        currency: price.currency,
        billingCycle: price.billingCycle,
        amount: String(price.amount),
        isActive: price.isActive,
      })),
    );
  }

  async function handleSavePlan() {
    if (!editingPlan) return;

    try {
      await Promise.all([
        updatePlan.mutateAsync({
          planId: editingPlan.id,
          body: {
            name: draftName.trim(),
            description: draftDescription.trim(),
          },
        }),
        replaceFeatures.mutateAsync({
          planId: editingPlan.id,
          features: draftFeatures.map((feature, index) => ({
            key: feature.key.trim(),
            label: feature.label.trim(),
            featureType: feature.featureType,
            value: feature.value.trim(),
            sortOrder: index,
          })),
        }),
        replacePrices.mutateAsync({
          planId: editingPlan.id,
          prices: draftPrices.map((price) => ({
            market: price.market,
            currency: price.currency.trim(),
            billingCycle: price.billingCycle,
            amountMinor: Math.round((Number(price.amount) || 0) * 100),
            isActive: price.isActive,
          })),
        }),
      ]);
      toast.success("Plan details updated.");
      setEditingPlanId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save plan.");
    }
  }

  function updateFeatureRow(index: number, field: "key" | "label" | "featureType" | "value", value: string) {
    setDraftFeatures((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function updatePriceRow(
    index: number,
    field: "market" | "currency" | "billingCycle" | "amount",
    value: string,
  ) {
    setDraftPrices((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function addFeatureRow() {
    setDraftFeatures((current) => [...current, { key: "", label: "", featureType: "text", value: "" }]);
  }

  function addPriceRow() {
    setDraftPrices((current) => [...current, { market: "global", currency: "USD", billingCycle: "monthly", amount: "", isActive: true }]);
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
                      onClick={() => handleOpenEdit(plan.id)}
                      className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                    >
                      Edit
                    </Button>
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

      <Dialog open={Boolean(editingPlan)} onOpenChange={(open) => !open && setEditingPlanId(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-lg rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm font-medium text-[var(--app-text)]">Edit plan</DialogTitle>
            <DialogDescription className="text-sm font-light leading-6 text-[var(--app-text-muted)]">
              Update the plan metadata, feature rows, and market-wise prices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                Plan name
              </label>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                Description
              </label>
              <Textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                className="min-h-[120px] rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text)]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                  Features
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addFeatureRow}
                  className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                >
                  Add feature
                </Button>
              </div>
              <div className="space-y-3">
                {draftFeatures.map((feature, index) => (
                  <div key={`${feature.key}-${index}`} className="grid gap-2 rounded-[8px] bg-[var(--app-panel)] p-3 md:grid-cols-4">
                    <Input
                      value={feature.label}
                      onChange={(event) => updateFeatureRow(index, "label", event.target.value)}
                      placeholder="Label"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={feature.key}
                      onChange={(event) => updateFeatureRow(index, "key", event.target.value)}
                      placeholder="Key"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={feature.featureType}
                      onChange={(event) => updateFeatureRow(index, "featureType", event.target.value)}
                      placeholder="Type"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={feature.value}
                      onChange={(event) => updateFeatureRow(index, "value", event.target.value)}
                      placeholder="Value"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                  Pricing
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPriceRow}
                  className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                >
                  Add price
                </Button>
              </div>
              <div className="space-y-3">
                {draftPrices.map((price, index) => (
                  <div key={`${price.market}-${price.billingCycle}-${index}`} className="grid gap-2 rounded-[8px] bg-[var(--app-panel)] p-3 md:grid-cols-4">
                    <Input
                      value={price.market}
                      onChange={(event) => updatePriceRow(index, "market", event.target.value)}
                      placeholder="Market"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={price.currency}
                      onChange={(event) => updatePriceRow(index, "currency", event.target.value)}
                      placeholder="Currency"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={price.billingCycle}
                      onChange={(event) => updatePriceRow(index, "billingCycle", event.target.value)}
                      placeholder="Billing cycle"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                    <Input
                      value={price.amount}
                      onChange={(event) => updatePriceRow(index, "amount", event.target.value)}
                      placeholder="Amount"
                      className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingPlanId(null)}
              className="rounded-[8px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePlan}
              disabled={updatePlan.isPending || replaceFeatures.isPending || replacePrices.isPending}
              className="rounded-[8px] bg-[var(--app-accent)] text-white hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,white)]"
            >
              {updatePlan.isPending || replaceFeatures.isPending || replacePrices.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
