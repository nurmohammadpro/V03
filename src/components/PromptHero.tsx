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
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-light mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Build Anything
            </span>
          </h1>
          <p className="text-lg md:text-xl text-blue-200/60 font-light">
            Describe your app idea and let AI bring it to life
          </p>
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            {/* Input container - solid black with subtle border */}
            <div className="relative bg-black/70 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 md:p-6 transition-none">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app idea... e.g., 'A real-time collaboration tool for remote teams'"
                aria-label="App idea prompt"
                className="w-full bg-transparent text-lg md:text-xl text-white/90 placeholder-blue-300/40 resize-none focus:outline-none h-24 md:h-28 font-light"
                disabled={isLoading}
              />

              {/* Submit button */}
              <div className="flex justify-end mt-4">
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-500/80 to-cyan-400/80 hover:from-blue-500 hover:to-cyan-400 text-white font-medium px-6 md:px-8 py-2 md:py-3 rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create App
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Hint text */}
        <p className="text-center text-sm md:text-base text-blue-300/40 mt-6 md:mt-8 font-light">
          Sign in to save your creations and collaborate with your team
        </p>
      </div>
    </div>
  );
}
