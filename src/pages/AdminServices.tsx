import { AdminShell } from "@/components/admin/AdminShell";
import { Cloud, Database, HardDrive, ShieldCheck } from "lucide-react";

const serviceCards = [
  {
    title: "Storage",
    value: "68%",
    note: "Workspace artifacts and export cache usage.",
    icon: HardDrive,
  },
  {
    title: "Runtime",
    value: "12 active",
    note: "Preview and background runtime surfaces.",
    icon: Cloud,
  },
  {
    title: "Database",
    value: "Healthy",
    note: "Primary operational persistence and backup path.",
    icon: Database,
  },
  {
    title: "Safeguards",
    value: "Enabled",
    note: "Quota, auth, and abuse-protection controls.",
    icon: ShieldCheck,
  },
];

export default function AdminServices() {
  return (
    <AdminShell
      title="Other Services"
      subtitle="Storage, runtime, persistence, and supporting service surfaces."
    >
      <div className="space-y-6">
        <section className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
          <p className="text-sm font-medium text-[var(--app-text)]">Service surfaces</p>
          <p className="mt-2 max-w-[56ch] text-sm font-light leading-6 text-[var(--app-text-muted)]">
            Review supporting infrastructure around the core generation product, including storage pressure, runtime surfaces, and protection controls.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceCards.map((card) => (
            <div key={card.title} className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                <card.icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-medium text-[var(--app-text)]">{card.title}</p>
              <p className="mt-2 text-[20px] font-medium tracking-[-0.03em] text-[var(--app-text)]">{card.value}</p>
              <p className="mt-2 text-sm font-light leading-6 text-[var(--app-text-muted)]">{card.note}</p>
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
