import { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { UniverseBackground } from '@/components/UniverseBackground';
import { Navbar } from '@/components/Navbar';
import { PromptHero } from '@/components/PromptHero';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Link, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const readyStateDone = document.readyState === "complete";
    const minimumTimer = window.setTimeout(() => {
      if (readyStateDone || document.readyState === "complete") {
        setShowIntro(false);
      }
    }, 900);

    const maximumTimer = window.setTimeout(() => setShowIntro(false), 2400);
    const handleLoad = () => {
      window.setTimeout(() => setShowIntro(false), 250);
    };

    window.addEventListener("load", handleLoad, { once: true });
    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  const handlePromptSubmit = (prompt: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsPromptLoading(true);
    console.log('Prompt submitted:', prompt);

    setTimeout(() => {
      setIsPromptLoading(false);
      toast.success('App creation started! Redirecting to editor...');
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {!showIntro ? <UniverseBackground /> : null}

      <div
        className={`pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[#05070b] transition-opacity duration-700 ${
          showIntro ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(111,179,255,0.22),transparent_18%),radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_38%)]" />
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(116,178,255,0.2),rgba(116,178,255,0.06)_32%,transparent_68%)] blur-2xl" />
        <div className={`relative flex flex-col items-center gap-5 transition-all duration-700 ${showIntro ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-white/10 animate-[ping_2.4s_ease-out_infinite]" />
            <span className="absolute inset-[10px] rounded-full border border-[#7bb1ff]/25 animate-[pulse_2s_ease-in-out_infinite]" />
            <span className="absolute inset-[22px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22),rgba(121,176,255,0.14)_45%,rgba(6,8,12,0.08)_72%)] blur-[2px]" />
            <span className="absolute inset-[30px] rounded-full border border-white/12" />
            <span className="absolute h-2.5 w-2.5 rounded-full bg-white/80 shadow-[0_0_28px_rgba(160,208,255,0.75)]" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">AI app builder</p>
            <p className="text-sm font-light text-white/58">Preparing your workspace</p>
          </div>
        </div>
      </div>

      <div className="relative w-full h-screen flex flex-col" style={{ zIndex: "var(--z-content)" }}>
        <Navbar
          logo={
            <link href="/" className="flex items-center">
              <img src="/v03.svg" alt="v03.tech" className="h-5 w-auto md:h-8" />
            </link>
          }
          children={
            <div className="hidden items-center gap-5 md:flex">
              <a href="/pricing" className="text-sm font-light text-white/55 transition-colors hover:text-white">
                Pricing
              </a>
            </div>
          }
          actions={
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-9 w-9 rounded-[10px] border-[var(--app-border-strong)] bg-[var(--app-panel)] text-[var(--app-text-muted)] shadow-none transition-colors hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
              aria-label="User menu"
            >
              <User className="h-4 w-4" />
            </Button>
          }
        />

        <PromptHero onSubmit={handlePromptSubmit} isLoading={isPromptLoading} />

        <Footer links={[{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }, { label: "Refund", href: "/refund" }]} />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
