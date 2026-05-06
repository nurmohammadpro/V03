import { PublicPageLayout } from "@/components/public/PublicPageLayout";

const sections = [
  {
    title: "Subscription refunds",
    body: [
      "Subscription charges are generally non-refundable once a billing cycle has started, except where required by law or where a clear billing error is confirmed.",
      "If a customer cancels after renewal, access typically remains available through the already-paid billing period unless a different handling rule is stated for that market or payment method.",
    ],
  },
  {
    title: "One-time passes",
    body: [
      "One-time access passes are intended for fixed-duration use and are usually not refundable after activation or meaningful usage has started.",
      "This is especially important for AI-backed usage where generation costs and infrastructure handling begin as soon as service consumption starts.",
    ],
  },
  {
    title: "Billing errors",
    body: [
      "If a duplicate charge, failed cancellation, or incorrect invoice is confirmed, v03 should correct the billing issue promptly and may issue a full or partial refund as appropriate.",
      "Charge corrections should be based on payment records, event timing, account state, and any confirmed platform-side failure.",
    ],
  },
  {
    title: "Service interruption and exceptions",
    body: [
      "If a serious service interruption, sustained platform failure, or product-side billing defect materially prevents access to a paid plan, refund or service-credit handling may be considered depending on severity and duration.",
      "Short-term degradation, partial feature instability, or model-quality dissatisfaction alone do not automatically create refund eligibility.",
    ],
  },
  {
    title: "Abuse, fraud, and misuse",
    body: [
      "Accounts suspended for abuse, policy violations, fraud, chargeback manipulation, or deliberate attempts to bypass pricing controls are not eligible for refund on that basis alone.",
      "Refund workflows are not intended to reverse clearly abusive or intentionally misused platform consumption.",
    ],
  },
  {
    title: "Support and review path",
    body: [
      "Refund requests should be reviewed against payment records, account activity, plan type, and timing of consumption relative to the charge.",
      "Clear transaction references, timestamps, and account context improve handling speed and reduce ambiguity during review.",
    ],
  },
];

export default function Refund() {
  return (
    <PublicPageLayout
      active="refund"
      title="Refund"
      subtitle="Compact billing and refund guidance for subscriptions, one-time passes, and charge-correction scenarios."
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
