import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { getLoginUrl } from '@/const';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  providerName?: string;
  providerLogo?: React.ReactNode;
  onProviderSignIn?: () => void;
  legalText?: string;
  showEmailAuth?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  title = "Welcome to v03.tech",
  providerName = "Manus",
  providerLogo,
  onProviderSignIn,
  legalText = "By signing in, you agree to our Terms of Service and Privacy Policy",
  showEmailAuth = true,
}: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const handleOAuthSignIn = () => {
    if (onProviderSignIn) {
      setIsLoading(true);
      onProviderSignIn();
      return;
    }
    setIsLoading(true);
    window.location.href = getLoginUrl();
  };

  const tabClass = "data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 font-light";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-md" />
        <DialogContent className="w-full max-w-md bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[var(--shadow-xl)] animate-in fade-in zoom-in-95 duration-[var(--duration-slow)]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-normal text-center">
              <span className="bg-gradient-to-r from-white/80 to-cyan-300 bg-clip-text text-transparent">
                {title}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10">
              <TabsTrigger value="signin" className={tabClass}>
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className={tabClass}>
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <p className="text-sm text-white/50 text-center mb-4 font-light">
                Sign in with your account to start building
              </p>

              <Button
                onClick={handleOAuthSignIn}
                disabled={isLoading}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-light py-2 rounded-lg transition-all duration-[var(--duration-slow)] disabled:opacity-50 border border-white/10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    {providerLogo}
                    Sign In with {providerName}
                  </>
                )}
              </Button>

              {showEmailAuth && (
                <>
                  <Separator label="or" className="my-4" />

                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      className="bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-white/20"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      className="bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-white/20"
                    />
                    <Button
                      disabled
                      className="w-full bg-white/5 text-white/30 cursor-not-allowed font-light"
                    >
                      Sign In
                    </Button>
                  </div>

                  <p className="text-xs text-white/30 text-center font-light">
                    Email/password coming soon. Use {providerName} OAuth for now.
                  </p>
                </>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <p className="text-sm text-white/50 text-center mb-4 font-light">
                Create an account to start building amazing apps
              </p>

              <Button
                onClick={handleOAuthSignIn}
                disabled={isLoading}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-light py-2 rounded-lg transition-all duration-[var(--duration-slow)] disabled:opacity-50 border border-white/10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing up...
                  </>
                ) : (
                  <>
                    {providerLogo}
                    Sign Up with {providerName}
                  </>
                )}
              </Button>

              {showEmailAuth && (
                <>
                  <Separator label="or" className="my-4" />

                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      className="bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-white/20"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      className="bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-white/20"
                    />
                    <Button
                      disabled
                      className="w-full bg-white/5 text-white/30 cursor-not-allowed font-light"
                    >
                      Sign Up
                    </Button>
                  </div>

                  <p className="text-xs text-white/30 text-center font-light">
                    Email/password coming soon. Use {providerName} OAuth for now.
                  </p>
                </>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-xs text-white/20 text-center mt-6 font-light">
            {legalText}
          </p>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
