import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { UniverseBackground } from '@/components/UniverseBackground';
import { Navbar } from '@/components/Navbar';
import { PromptHero } from '@/components/PromptHero';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
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
          actions={
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
            </div>
          }
        />

        <PromptHero onSubmit={handlePromptSubmit} isLoading={isPromptLoading} />

        <Footer />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
