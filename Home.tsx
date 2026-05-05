import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { UniverseBackground } from '@/components/UniverseBackground';
import { Navbar } from '@/components/Navbar';
import { PromptHero } from '@/components/PromptHero';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { toast } from 'sonner';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  const handlePromptSubmit = (prompt: string) => {
    if (!isAuthenticated) {
      // Open auth modal if user is not authenticated
      setIsAuthModalOpen(true);
      return;
    }

    // Handle authenticated prompt submission
    setIsPromptLoading(true);
    console.log('Prompt submitted:', prompt);

    // Simulate API call
    setTimeout(() => {
      setIsPromptLoading(false);
      toast.success('App creation started! Redirecting to editor...');
      // Here you would redirect to the app editor
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Universe Background */}
      <UniverseBackground />

      {/* Content Layer */}
      <div className="relative z-10 w-full h-screen flex flex-col">
        {/* Navbar */}
        <Navbar onUserIconClick={() => setIsAuthModalOpen(true)} />

        {/* Hero Section */}
        <PromptHero onSubmit={handlePromptSubmit} isLoading={isPromptLoading} />

        {/* Footer */}
        <Footer />
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
