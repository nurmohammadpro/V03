import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Sparkles } from 'lucide-react';

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
        {/* Social proof badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span className="text-[11px] md:text-xs text-white/60 font-light tracking-wider uppercase">
              10,000+ apps generated
            </span>
          </div>
        </div>

        {/* Heading - keep brand gradient for the wordmark */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-normal mb-3 tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-white/80 via-white to-cyan-200 bg-clip-text text-transparent">
              From idea to app
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent">
              in one conversation
            </span>
          </h1>
          <p className="text-sm md:text-base text-white/50 font-light max-w-lg mx-auto">
            Describe your idea in plain English. Get a production-ready codebase for MERN, Next.js, Laravel, Django, or NestJS.
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <div className="relative bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-3 md:p-5 transition-none">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 'A real-time Kanban board with drag & drop, user auth, and WebSocket sync'"
                aria-label="App idea prompt"
                className="w-full bg-transparent text-sm md:text-base text-white/90 placeholder:text-white/30 resize-none focus:outline-none h-20 md:h-[88px] font-light leading-relaxed"
                disabled={isLoading}
              />

              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="bg-white/10 hover:bg-white/15 text-white font-light px-5 md:px-6 py-1.5 md:py-2 text-sm rounded-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Generate App
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Framework badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {['Next.js', 'MERN', 'Laravel', 'Django', 'NestJS'].map((fw) => (
            <span
              key={fw}
              className="text-[11px] md:text-xs text-white/40 font-light"
            >
              {fw}
            </span>
          ))}
        </div>

        <p className="text-center text-[11px] md:text-xs text-white/30 mt-5 font-light">
          3 free generations daily — no credit card required
        </p>
      </div>
    </div>
  );
}
