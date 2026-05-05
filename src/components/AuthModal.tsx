import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { getLoginUrl } from '@/const';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const handleOAuthSignIn = () => {
    setIsLoading(true);
    const loginUrl = getLoginUrl();
    window.location.href = loginUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-md" />
        <DialogContent className="w-full max-w-md bg-blue-950/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-normal text-center">
            <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Welcome to v03.tech
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-blue-900/50 border border-blue-500/20">
            <TabsTrigger
              value="signin"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-300 font-normal"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-300 font-normal"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-6">
            <p className="text-sm text-blue-200/70 text-center mb-4 font-normal">
              Sign in with your account to start building
            </p>

            <Button
              onClick={handleOAuthSignIn}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-normal py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In with Manus'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-500/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-blue-950/95 text-blue-300/50">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                className="bg-blue-900/30 border border-blue-500/30 text-white placeholder-blue-300/50 focus:border-blue-400/50"
              />
              <Input
                type="password"
                placeholder="Password"
                className="bg-blue-900/30 border border-blue-500/30 text-white placeholder-blue-300/50 focus:border-blue-400/50"
              />
              <Button
                disabled
                className="w-full bg-blue-600/50 text-blue-300 cursor-not-allowed font-normal"
              >
                Sign In
              </Button>
            </div>

            <p className="text-xs text-blue-300/50 text-center font-normal">
              Email/password coming soon. Use Manus OAuth for now.
            </p>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <p className="text-sm text-blue-200/70 text-center mb-4 font-normal">
              Create an account to start building amazing apps
            </p>

            <Button
              onClick={handleOAuthSignIn}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-normal py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing up...
                </>
              ) : (
                'Sign Up with Manus'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-500/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-blue-950/95 text-blue-300/50">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                className="bg-blue-900/30 border border-blue-500/30 text-white placeholder-blue-300/50 focus:border-blue-400/50"
              />
              <Input
                type="password"
                placeholder="Password"
                className="bg-blue-900/30 border border-blue-500/30 text-white placeholder-blue-300/50 focus:border-blue-400/50"
              />
              <Button
                disabled
                className="w-full bg-blue-600/50 text-blue-300 cursor-not-allowed font-normal"
              >
                Sign Up
              </Button>
            </div>

            <p className="text-xs text-blue-300/50 text-center font-normal">
              Email/password coming soon. Use Manus OAuth for now.
            </p>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-blue-300/40 text-center mt-6 font-normal">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
