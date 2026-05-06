import { AdminShell } from "@/components/admin/AdminShell";
import { useAiProviders, useAiRoutingRules, useAdminStats, useUpdateAiProvider, useUpdateAiRoutingRule } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminSystem() {
  const { stats } = useAdminStats();
  const { providers } = useAiProviders();
  const { rules } = useAiRoutingRules();
  const updateProvider = useUpdateAiProvider();
  const updateRule = useUpdateAiRoutingRule();

  async function handleToggleProvider(providerId: string, status: string) {
    const nextStatus = status === "active" ? "disabled" : "active";

    try {
      await updateProvider.mutateAsync({ providerId, body: { status: nextStatus } });
      toast.success(`Provider moved to ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update provider.");
    }
  }

  async function handleAdjustWeight(providerId: string, nextWeight: number) {
    try {
      await updateProvider.mutateAsync({ providerId, body: { weight: nextWeight } });
      toast.success(`Provider weight set to ${nextWeight}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update weight.");
    }
  }

  async function handleToggleRule(ruleId: string, isActive: boolean) {
    try {
      await updateRule.mutateAsync({ ruleId, body: { isActive: !isActive } });
      toast.success(`Routing rule ${!isActive ? "enabled" : "disabled"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update routing rule.");
    }
  }

  return (
    <AdminShell title="AI Management" subtitle="Providers, models, routing policy, and cost-quality control.">
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Queue depth", value: stats.queueDepth, note: "Pending generation jobs" },
            { label: "Error rate", value: `${stats.errorRate}%`, note: "Generation path failures" },
            { label: "Uptime", value: `${stats.apiUptime}%`, note: "Provider-side availability blend" },
            { label: "Providers", value: providers.length, note: "Configured AI vendors" },
          ].map((item) => (
            <div key={item.label} className="rounded-[8px] bg-[var(--app-panel)] p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{item.label}</p>
              <p className="mt-3 text-[20px] text-[var(--app-text)]">{item.value}</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">{item.note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Provider mix</p>
            <div className="mt-4 space-y-3">
              {providers.map((provider) => (
                <div key={provider.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--app-text)]">{provider.name}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">{provider.baseUrl}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--app-text-dim)]">{provider.status}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleProvider(provider.id, provider.status)}
                        className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      >
                        {provider.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Weight</p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-sm text-[var(--app-text)]">{provider.weight}%</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdjustWeight(provider.id, Math.min(100, provider.weight + 5))}
                          className="h-7 rounded-[7px] border-0 bg-[var(--app-panel)] px-2 text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                        >
                          +5
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Health</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">{provider.health}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Success</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">{provider.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Spend</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">${provider.monthlySpend}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {provider.models.length > 0 ? (
                      provider.models.map((model) => (
                        <div key={model.id} className="flex items-center justify-between gap-3 text-sm text-[var(--app-text-muted)]">
                          <span>{model.name}</span>
                          <span className="text-[var(--app-text)]">
                            {model.latencyTier} / {model.qualityTier}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--app-text-muted)]">No active models assigned.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Routing rules</p>
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--app-text)]">{rule.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--app-text-dim)]">P{rule.priority}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleRule(rule.id, rule.isActive)}
                        className="rounded-[8px] border-0 bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      >
                        {rule.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{rule.matchSummary}</p>
                  <div className="mt-3 space-y-1 text-sm text-[var(--app-text-muted)]">
                    <p>Primary: <span className="text-[var(--app-text)]">{rule.primaryModel}</span></p>
                    <p>Fallback: <span className="text-[var(--app-text)]">{rule.fallbackModel}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
