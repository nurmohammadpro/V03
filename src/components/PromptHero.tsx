import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles } from 'lucide-react';

interface PromptHeroProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  statsText?: string;
  headingLine1?: string;
  headingLine2?: string;
  subheading?: string;
  placeholder?: string;
  frameworks?: string[];
  ctaText?: string;
  loadingText?: string;
  footerText?: string;
}

export function PromptHero({
  onSubmit,
  isLoading = false,
  statsText = "10,000+ apps generated",
  headingLine1 = "From idea to app",
  headingLine2 = "in one conversation",
  subheading = "Describe your idea in plain English. Get a production-ready codebase for MERN, Next.js, Laravel, Django, or NestJS.",
  placeholder = "e.g. 'A real-time Kanban board with drag & drop, user auth, and WebSocket sync'",
  frameworks = ['Next.js', 'MERN', 'Laravel', 'Django', 'NestJS'],
  ctaText = "Generate App",
  loadingText = "Generating...",
  footerText = "3 free generations daily — no credit card required",
}: PromptHeroProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-4 md:px-6"
      style={{ zIndex: "var(--z-content)" }}
    >
      <div className="w-full max-w-2xl">
        {/* Social proof badge */}
        <div className="flex justify-center mb-8">
          <Badge variant="ghost" className="gap-1.5 px-3 py-1 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span className="text-[11px] md:text-xs text-white/60 font-light tracking-wider uppercase">
              {statsText}
            </span>
          </Badge>
        </div>

        {/* Heading */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold mb-3 tracking-tight leading-tight">
            <span className="text-white/90">
              {headingLine1}
            </span>
            <br />
            <span className="text-cyan-400">
              {headingLine2}
            </span>
          </h1>
          <p className="text-sm md:text-base text-white/60 max-w-lg mx-auto font-light">
            {subheading}
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-black/60 backdrop-blur-sm border border-white/30 hover:border-white/50 focus-within:border-white/70 rounded-2xl p-3 md:p-5 transition-colors duration-[var(--duration-normal)]">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              aria-label="App idea prompt"
              className="w-full bg-transparent text-sm md:text-base text-white/90 placeholder:text-white/30 border-0 p-0 focus-visible:ring-0 h-20 md:h-[88px] font-light leading-relaxed"
              disabled={isLoading}
            />

            <div className="flex justify-end mt-3">
              <Button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                variant="ghost"
                className="bg-white/10 hover:bg-white/15 text-white px-5 md:px-6 py-1.5 md:py-2 text-sm rounded-lg transition-all duration-[var(--duration-slow)] disabled:opacity-30 border border-white/10 shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {ctaText}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Framework badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {frameworks.map((fw) => (
            <span
              key={fw}
              className="text-[11px] md:text-xs text-white/40 font-light"
            >
              {fw}
            </span>
          ))}
        </div>

        {footerText && (
          <p className="text-center text-[11px] md:text-xs text-white/30 mt-5 font-light">
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}
