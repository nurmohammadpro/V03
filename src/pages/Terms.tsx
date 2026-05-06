import { PublicPageLayout } from "@/components/public/PublicPageLayout";

const sections = [
  {
    title: "Service access",
    body: [
      "v03 provides access to an AI-assisted app-building platform for prompt-driven application generation, project editing, file export, and related workflow tooling.",
      "Access is granted as a limited service license, not a transfer of platform ownership. We may adjust, suspend, or restrict access where required to protect service quality, security, legal compliance, or billing integrity.",
    ],
  },
  {
    title: "Accounts and workspace responsibility",
    body: [
      "Account holders are responsible for activity performed through their account, workspace, connected integrations, and team seats.",
      "You should keep access credentials secure, avoid sharing accounts outside authorized team usage, and promptly report any suspected unauthorized access or billing misuse.",
    ],
  },
  {
    title: "Plan limits and fair use",
    body: [
      "Paid access is governed by the included standard generations, seats, storage, export scope, and any published overage rules attached to the selected plan.",
      "v03 may rate-limit unusually large, abusive, or destabilizing workloads even on higher plans. This includes sustained automated use, attempts to bypass quota design, or workloads that materially threaten queue quality for other users.",
    ],
  },
  {
    title: "Generated output and user review",
    body: [
      "v03 helps accelerate software work, but generated output still requires human review before production use. You remain responsible for architecture choices, dependency selection, testing, security review, regulatory alignment, and deployment decisions.",
      "Generated code, content, and configuration may contain defects, omissions, or unsuitable assumptions. Platform assistance does not replace engineering judgment.",
    ],
  },
  {
    title: "Billing and renewals",
    body: [
      "Subscriptions renew according to the selected billing cycle unless canceled before the next billing event. One-time passes grant access only for the stated duration and do not automatically renew.",
      "Taxes, payment processing charges, currency conversion behavior, and region-specific billing handling may apply depending on payment method and market.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "You may not use the platform for unlawful activity, credential abuse, malware, bulk spam generation, data exfiltration, fraud, or deliberate attempts to bypass pricing, quota, access, or operational safeguards.",
      "You also may not use the service in a way that materially degrades platform stability, interferes with other users, or violates applicable upstream provider terms tied to model access.",
    ],
  },
  {
    title: "Suspension and termination",
    body: [
      "We may suspend or terminate access where necessary for abuse prevention, charge failure, policy violations, legal demands, or service-protection reasons.",
      "Where practical, access actions should be proportional to the issue involved, but immediate restriction may be required in higher-risk situations.",
    ],
  },
  {
    title: "Changes to the service",
    body: [
      "v03 may update product capabilities, plan packaging, UI, underlying provider mix, limits, and operational safeguards over time.",
      "Where a change materially affects active plan behavior, it should be reflected in current product and billing documentation.",
    ],
  },
];

export default function Terms() {
  return (
    <PublicPageLayout
      active="terms"
      title="Terms"
      subtitle="Simple operational terms for access, billing, usage limits, and responsibility around generated output."
    >
      <div className="grid gap-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
            <p className="text-sm font-medium text-white">{section.title}</p>
            <div className="mt-2 space-y-3 max-w-4xl">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm font-light leading-6 text-white/58">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PublicPageLayout>
  );
}
