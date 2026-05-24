import { AdminShell } from "@/components/admin/AdminShell";
import {
  useAiProviders,
  useAiRoutingRules,
  useAdminStats,
  useClearAiProviderApiKey,
  useCreateAiProvider,
  useSetAiProviderApiKey,
  useTestAiProvider,
  useUpdateAiProvider,
  useUpdateAiRoutingRule,
} from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import * as React from "react";
import { toast } from "sonner";

export default function AdminSystem() {
  const { stats } = useAdminStats();
  const { providers } = useAiProviders();
  const { rules } = useAiRoutingRules();
  const updateProvider = useUpdateAiProvider();
  const updateRule = useUpdateAiRoutingRule();
  const setApiKey = useSetAiProviderApiKey();
  const clearApiKey = useClearAiProviderApiKey();
  const testProvider = useTestAiProvider();
  const createProvider = useCreateAiProvider();
  const [keyModalOpen, setKeyModalOpen] = React.useState(false);
  const [keyModalProviderId, setKeyModalProviderId] = React.useState<string | null>(null);
  const [keyValue, setKeyValue] = React.useState("");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createKey, setCreateKey] = React.useState("");
  const [createName, setCreateName] = React.useState("");
  const [createBaseUrl, setCreateBaseUrl] = React.useState("");
  const [createDefaultModelKey, setCreateDefaultModelKey] = React.useState("");
  const [createChatPath, setCreateChatPath] = React.useState("/chat/completions");

  const keyModalProvider = providers.find((p) => p.id === keyModalProviderId) ?? null;

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

  function openKeyModal(providerId: string) {
    setKeyModalProviderId(providerId);
    setKeyValue("");
    setKeyModalOpen(true);
  }

  async function handleSaveKey() {
    if (!keyModalProvider) return;
    if (!keyValue.trim()) {
      toast.error("API key is required.");
      return;
    }
    try {
      await setApiKey.mutateAsync({ providerId: keyModalProvider.id, apiKey: keyValue.trim() });
      toast.success("API key saved.");
      setKeyModalOpen(false);
      setKeyValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save API key.");
    }
  }

  async function handleClearKey(providerId: string) {
    try {
      await clearApiKey.mutateAsync({ providerId });
      toast.success("API key cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear API key.");
    }
  }

  async function handleTestProvider(providerId: string) {
    try {
      const res = await testProvider.mutateAsync({ providerId });
      if (res.ok) toast.success("Provider test succeeded.");
      else toast.error(res.error || "Provider test failed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Provider test failed.");
    }
  }

  function openCreateModal() {
    setCreateKey("");
    setCreateName("");
    setCreateBaseUrl("");
    setCreateDefaultModelKey("");
    setCreateChatPath("/chat/completions");
    setCreateModalOpen(true);
  }

  async function handleCreateProvider() {
    const key = createKey.trim();
    const name = createName.trim();
    if (!key || !name) {
      toast.error("Provider key and name are required.");
      return;
    }
    try {
      await createProvider.mutateAsync({
        key,
        name,
        providerType: "llm",
        baseUrl: createBaseUrl.trim() || undefined,
        weight: 100,
        status: "active",
        config: {
          ...(createDefaultModelKey.trim() ? { defaultModelKey: createDefaultModelKey.trim() } : {}),
          ...(createChatPath.trim() ? { chatCompletionsPath: createChatPath.trim() } : {}),
        },
      });
      toast.success("Provider created.");
      setCreateModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create provider.");
    }
  }

  return (
    <AdminShell title="AI Management" subtitle="Providers, models, routing policy, and cost-quality control.">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" onClick={openCreateModal}>
            Add provider
          </Button>
        </div>
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
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-[var(--app-panel)] p-3">
                    <div className="text-sm text-[var(--app-text-muted)]">
                      API key:{" "}
                      <span className="text-[var(--app-text)]">{provider.hasApiKey ? "configured" : "not set"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openKeyModal(provider.id)}
                        className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      >
                        {provider.hasApiKey ? "Update key" : "Set key"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestProvider(provider.id)}
                        className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      >
                        Test
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleClearKey(provider.id)}
                        className="rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                        disabled={!provider.hasApiKey}
                      >
                        Clear
                      </Button>
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

      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{keyModalProvider?.name ? `Set API key — ${keyModalProvider.name}` : "Set API key"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-[var(--app-text)]">API key (write-only)</p>
            <Input
              id="providerApiKey"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="Paste API key…"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-[var(--app-text-muted)]">This value is stored encrypted and cannot be viewed later.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveKey}>
              Save key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add AI provider</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-[var(--app-text)]">Provider key</p>
              <Input value={createKey} onChange={(e) => setCreateKey(e.target.value)} placeholder="e.g. zai, openai, deepseek" spellCheck={false} />
              <p className="text-xs text-[var(--app-text-muted)]">Stable identifier used by ai-worker routing.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--app-text)]">Display name</p>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Z.ai (GLM)" spellCheck={false} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm text-[var(--app-text)]">Base URL</p>
              <Input value={createBaseUrl} onChange={(e) => setCreateBaseUrl(e.target.value)} placeholder="e.g. https://api.z.ai/api/paas/v4" spellCheck={false} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--app-text)]">Default model key</p>
              <Input value={createDefaultModelKey} onChange={(e) => setCreateDefaultModelKey(e.target.value)} placeholder="e.g. glm-4.6-coding-lite" spellCheck={false} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--app-text)]">Chat path</p>
              <Input value={createChatPath} onChange={(e) => setCreateChatPath(e.target.value)} placeholder="/chat/completions" spellCheck={false} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleCreateProvider}>
              Create provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
