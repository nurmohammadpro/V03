import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { UniverseBackground } from '@/components/UniverseBackground';
import { Navbar } from '@/components/Navbar';
import { PromptHero } from '@/components/PromptHero';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

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
      <UniverseBackground />

      <div className="relative w-full h-screen flex flex-col" style={{ zIndex: "var(--z-content)" }}>
        <Navbar
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
