import { Link } from "wouter";
import { UniverseBackground } from "@/components/UniverseBackground";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface PublicPageLayoutProps {
  active: "pricing" | "terms" | "privacy" | "refund";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: "pricing", label: "Pricing", href: "/pricing" },
] as const;

export function PublicPageLayout({ active, title, subtitle, children }: PublicPageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-white">
      <UniverseBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar
          className="bg-transparent"
          children={
            <div className="hidden items-center gap-5 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={
                    item.id === active
                      ? "text-sm font-normal text-white"
                      : "text-sm font-light text-white/55 transition-colors hover:text-white"
                  }
                >
                  {item.label}
                </Link>
              ))}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                className="rounded-[8px] bg-white/5 px-4 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link href="/">Back home</Link>
              </Button>
              <Button asChild className="rounded-[8px] bg-white text-black hover:bg-white/90">
                <Link href="/">Start free</Link>
              </Button>
            </div>
          }
        />

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 pt-28 sm:px-6 lg:px-8">
          <header className="border-b border-white/10 pb-6">
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="mt-2 max-w-3xl text-sm font-light leading-6 text-white/58">{subtitle}</p>
          </header>

          <div className="flex-1 pt-8">{children}</div>
        </main>

        <Footer
          fixed={false}
          links={[
            { label: "Terms", href: "/terms" },
            { label: "Privacy", href: "/privacy" },
            { label: "Refund", href: "/refund" },
          ]}
          className="mt-auto"
        />
      </div>
    </div>
  );
}
