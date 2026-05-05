import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

interface PromptHeroProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
}

export function PromptHero({ onSubmit, isLoading = false }: PromptHeroProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-10 px-4 md:px-6">
      <div className="w-full max-w-2xl">
        {/* Heading */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extralight mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Build Anything
            </span>
          </h1>
          <p className="text-base md:text-lg text-blue-200/60 font-extralight">
            Describe your app idea and let AI bring it to life
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <div className="relative bg-black/70 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-3 md:p-5 transition-none">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app idea... e.g., 'A real-time collaboration tool for remote teams'"
                aria-label="App idea prompt"
                className="w-full bg-transparent text-sm md:text-base text-white/90 placeholder:text-xs md:placeholder:text-sm placeholder-blue-300/40 resize-none focus:outline-none h-20 md:h-[88px] font-extralight"
                disabled={isLoading}
              />

              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500/80 to-cyan-400/80 hover:from-blue-500 hover:to-cyan-400 text-white font-extralight px-5 md:px-6 py-1.5 md:py-2 text-sm rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Create App
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        <p className="text-center text-xs md:text-sm text-blue-300/40 mt-5 md:mt-6 font-extralight">
          Sign in to save your creations and collaborate with your team
        </p>
      </div>
    </div>
  );
}
