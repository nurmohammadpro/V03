import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, CreditCard, Layers3 } from "lucide-react";
import { PublicPageLayout } from "@/components/public/PublicPageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Market = "international" | "bangladesh";
type Billing = "monthly" | "yearly" | "one-time";

type Tier = {
  name: string;
  badge?: string;
  note: string;
  usage: string;
  pacing: string;
  team: string;
  projects: string;
  cta: string;
  prices: Record<Market, Record<Billing, string>>;
  features: string[];
};

const tiers: Tier[] = [
  {
    name: "Starter",
    note: "For solo builders, students, and early product tests.",
    usage: "100 standard generations / month",
    pacing: "Suggested pace: 25 generations / week",
    team: "1 seat",
    projects: "5 projects",
    cta: "Start with Starter",
    prices: {
      international: { monthly: "$15", yearly: "$150", "one-time": "$39" },
      bangladesh: { monthly: "৳1,850", yearly: "৳18,500", "one-time": "৳4,800" },
    },
    features: ["Basic code export", "Cloud deployment", "Basic mobile generation", "Community support"],
  },
  {
    name: "Professional",
    badge: "Recommended",
    note: "For startups, agencies, and small teams shipping repeatedly.",
    usage: "800 standard generations / month",
    pacing: "Monthly quota with paid top-ups",
    team: "5 seats",
    projects: "25 projects",
    cta: "Choose Professional",
    prices: {
      international: { monthly: "$49", yearly: "$490", "one-time": "$249" },
      bangladesh: { monthly: "৳6,025", yearly: "৳60,250", "one-time": "৳30,600" },
    },
    features: [
      "GitHub and CI/CD export",
      "Advanced mobile generation",
      "Weekly backups",
      "Custom domain support",
      "Analytics dashboard",
      "Email support",
    ],
  },
  {
    name: "Enterprise",
    note: "For agencies and larger teams with sustained generation volume.",
    usage: "3,000 standard generations / month",
    pacing: "Monthly quota with top-ups or custom overage contract",
    team: "25 seats",
    projects: "Unlimited projects",
    cta: "Talk to sales",
    prices: {
      international: { monthly: "$199", yearly: "$1,990", "one-time": "$999" },
      bangladesh: { monthly: "৳24,500", yearly: "৳245,000", "one-time": "৳122,500" },
    },
    features: [
      "Full export capabilities",
      "High-volume mobile generation",
      "Daily backups",
      "Unlimited custom domains",
      "Advanced analytics",
      "SSO / SAML and priority support",
    ],
  },
];

const overagePacks = {
  international: [
    { label: "100 extra generations", price: "$6" },
    { label: "500 extra generations", price: "$25" },
    { label: "1,000 extra generations", price: "$45" },
  ],
  bangladesh: [
    { label: "100 extra generations", price: "৳750" },
    { label: "500 extra generations", price: "৳3,075" },
    { label: "1,000 extra generations", price: "৳5,535" },
  ],
};

const billingMeta: Record<Billing, { label: string; caption: string }> = {
  monthly: { label: "Monthly", caption: "Cancel anytime." },
  yearly: { label: "Yearly", caption: "17% to 20% discount for commitment." },
  "one-time": { label: "One-time pass", caption: "Fixed access window without renewal." },
};

const faqs = [
  {
    q: "What is a standard generation?",
    a: "It is v03's internal pricing unit for code output, mapped to a token budget rather than a raw API request count.",
  },
  {
    q: "Do paid plans refresh weekly?",
    a: "Free plan usage refreshes weekly. Starter keeps a monthly quota with weekly pacing guidance. Professional and Enterprise stay monthly with add-on packs.",
  },
  {
    q: "Why not unlimited AI generation?",
    a: "Code-generation cost varies too much. Hard unlimited plans make abuse easy and can turn loss-making quickly.",
  },
];

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-[8px] bg-white/5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[6px] px-3 py-2 text-sm font-light transition-colors",
            value === option.value ? "bg-white text-black" : "text-white/60 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Pricing() {
  const [market, setMarket] = useState<Market>("international");
  const [billing, setBilling] = useState<Billing>("monthly");

  const marketLabel = market === "international" ? "International" : "Bangladesh";

  return (
    <PublicPageLayout
      active="pricing"
      title="Pricing"
      subtitle="Simple plan structure, token-aware usage limits, weekly refresh only where it helps habit formation, and top-up packs for heavier product work."
    >
      <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
          <p className="text-sm font-medium text-white">Pricing model</p>
          <p className="mt-2 text-sm font-light leading-6 text-white/58">
            v03 prices around standard generations instead of raw API calls. That keeps entry pricing accessible while protecting higher plans from unstable code-generation cost.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Standard generation", value: "20k in + 30k out" },
            { label: "Estimated AI cost", value: "~$0.0112" },
            { label: "Free refresh", value: "Weekly" },
          ].map((item) => (
            <div key={item.label} className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.14em] text-white/35">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-3 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-white">{marketLabel}</p>
          <p className="mt-2 text-sm font-light text-white/52">
            {market === "international"
              ? "USD pricing for global checkout and card-based billing."
              : "Localized BDT pricing for stronger Bangladesh conversion."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <ToggleGroup
            value={market}
            onChange={setMarket}
            options={[
              { value: "international", label: "International" },
              { value: "bangladesh", label: "Bangladesh" },
            ]}
          />
          <ToggleGroup
            value={billing}
            onChange={setBilling}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
              { value: "one-time", label: "One-time" },
            ]}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={cn(
              "rounded-[8px] bg-black/20 p-5 backdrop-blur-xl",
              tier.badge ? "ring-1 ring-cyan-300/30" : ""
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{tier.name}</p>
                <p className="mt-2 text-sm font-light leading-6 text-white/55">{tier.note}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-white/5">
                <Layers3 className="h-4 w-4 text-white/68" />
              </div>
            </div>

            {tier.badge && (
              <Badge className="mt-4 rounded-[6px] border-0 bg-cyan-300 px-2 py-0.5 text-[11px] font-normal text-black">
                {tier.badge}
              </Badge>
            )}

            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-medium tracking-[-0.03em] text-white">
                  {tier.prices[market][billing]}
                </span>
                <span className="pb-0.5 text-sm font-light text-white/42">{billingMeta[billing].label}</span>
              </div>
              <p className="mt-2 text-sm font-light text-white/45">{billingMeta[billing].caption}</p>
            </div>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
              {[
                tier.usage,
                tier.pacing,
                `${tier.projects} • ${tier.team}`,
              ].map((line) => (
                <div key={line} className="rounded-[7px] bg-white/[0.03] px-3 py-2.5 text-sm font-light text-white/70">
                  {line}
                </div>
              ))}
            </div>

            <ul className="mt-5 space-y-2 border-t border-white/10 pt-5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-light leading-6 text-white/62">
                  <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-[4px] bg-cyan-300/12 text-cyan-100">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              className={cn(
                "mt-5 h-10 w-full rounded-[8px] text-sm",
                tier.badge ? "bg-cyan-300 text-black hover:bg-cyan-200" : "bg-white/8 text-white hover:bg-white/12"
              )}
            >
              <Link href="/">
                {tier.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.84fr_1.16fr]">
        <div className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-white/5">
              <CreditCard className="h-4 w-4 text-white/72" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Free and pacing</p>
              <p className="text-sm font-light text-white/50">Weekly refresh only where it improves habit formation.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
            <div className="rounded-[7px] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Free</p>
              <p className="mt-2 text-sm font-light leading-6 text-white/58">
                1 project, 20 standard generations per month, and a weekly refresh of 5 generations.
              </p>
            </div>
            <div className="rounded-[7px] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Starter</p>
              <p className="mt-2 text-sm font-light leading-6 text-white/58">
                Monthly quota stays intact. The product can still show a 25-generation weekly pace as guidance.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
          <p className="text-sm font-medium text-white">Top-up packs</p>
          <p className="mt-2 text-sm font-light text-white/50">
            Needed for Professional and Enterprise so heavier usage grows without collapsing margins.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {overagePacks[market].map((pack) => (
              <div key={pack.label} className="rounded-[7px] bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-white/35">Add-on</p>
                <p className="mt-2 text-lg font-medium text-white">{pack.price}</p>
                <p className="mt-2 text-sm font-light text-white/55">{pack.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {faqs.map((faq) => (
          <article key={faq.q} className="rounded-[8px] bg-black/20 p-5 backdrop-blur-xl">
            <p className="text-sm font-medium text-white">{faq.q}</p>
            <p className="mt-2 text-sm font-light leading-6 text-white/56">{faq.a}</p>
          </article>
        ))}
      </section>
    </PublicPageLayout>
  );
}
