import { PublicPageLayout } from "@/components/public/PublicPageLayout";

const sections = [
  {
    title: "What v03 stores",
    body: [
      "v03 may store account identifiers, billing references, prompts, generated files, workspace metadata, project history, and operational logs needed to deliver the product and maintain quota integrity.",
      "Stored data should be limited to what is operationally useful for authentication, billing, generation workflows, debugging, abuse review, and product reliability.",
    ],
  },
  {
    title: "Why data is used",
    body: [
      "Data is used to authenticate access, manage subscriptions, run generation workflows, store outputs, enforce plan limits, improve reliability, and investigate abuse, charge issues, or platform failures.",
      "We may also use limited operational signals to monitor service health, queue pressure, and product usage patterns at a systems level.",
    ],
  },
  {
    title: "Model and provider flow",
    body: [
      "Prompts, file context, and generation payloads may be sent to upstream AI providers used by v03 to fulfill app and code generation requests.",
      "Provider handling should follow the active provider agreements, infrastructure settings, and any product-level restrictions around logging, retention, or abuse review.",
    ],
  },
  {
    title: "Security and retention",
    body: [
      "v03 should minimize retained data where possible, restrict internal access, and avoid keeping unnecessary sensitive payloads longer than operationally required.",
      "Retention periods may differ across billing records, workspace artifacts, logs, backups, and abuse-review data depending on operational, contractual, or legal needs.",
    ],
  },
  {
    title: "Cookies, sessions, and product analytics",
    body: [
      "v03 may use session tokens, authentication cookies, local state, and related technical storage needed for sign-in, workspace continuity, and secure application behavior.",
      "Product analytics should remain proportionate to operational needs and should avoid collecting unnecessary sensitive material from user-generated project content.",
    ],
  },
  {
    title: "User controls",
    body: [
      "Users should be able to manage account settings, billing, and project deletion workflows where exposed in-product.",
      "Administrative retention, fraud review, backup recovery, or legal obligations may still require some data to remain available after a user-initiated deletion event.",
    ],
  },
  {
    title: "International and provider considerations",
    body: [
      "Because v03 may depend on external infrastructure, payment providers, and model vendors, some data may be processed across multiple service environments or jurisdictions depending on the active deployment path.",
      "Where this happens, the platform should still limit disclosure to what is necessary to provide the requested service.",
    ],
  },
];

export default function Privacy() {
  return (
    <PublicPageLayout
      active="privacy"
      title="Privacy"
      subtitle="A compact overview of what platform data is handled, why it is used, and how user project activity flows through the service."
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
