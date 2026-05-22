import { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { UniverseBackground } from '@/components/UniverseBackground';
import { Navbar } from '@/components/Navbar';
import { PromptHero } from '@/components/PromptHero';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
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
    }, 1000);

    const maximumTimer = window.setTimeout(() => setShowIntro(false), 3500);
    const handleLoad = () => {
      window.setTimeout(() => setShowIntro(false), 300);
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
        <NeuralNetwork onComplete={() => setShowIntro(false)} />
      </div>

      <div className="relative w-full h-screen flex flex-col" style={{ zIndex: "var(--z-content)" }}>
        <Navbar
          logo={
            <a href="/" className="flex items-center">
              <img src="/v03.svg" alt="v03.tech" className="h-5 w-auto md:h-8" />
            </a>
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
