import { useState } from 'react';
import { UniverseLoader } from '@/components/UniverseLoader';
import { NeuralNetwork } from '@/components/NeuralNetwork';
import { Button } from '@/components/ui/button';

export default function LoaderDemo() {
  const [activeLoader, setActiveLoader] = useState<'universe' | 'neural' | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleUniverseComplete = () => {
    console.log('Universe loader completed!');
    setTimeout(() => setActiveLoader(null), 1000);
  };

  const handleNeuralComplete = () => {
    console.log('Neural network loader completed!');
    setTimeout(() => setActiveLoader(null), 1000);
  };

  return (
    <div className="relative w-full h-screen bg-[#05070b]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-3xl font-bold text-white mb-2">
            Loading Animation Showcase
          </h1>
          <p className="text-white/60 font-light">
            Universe-inspired homepage loading animations
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-32 left-0 right-0 z-50 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setActiveLoader('universe')}
              disabled={activeLoader !== null}
              className="bg-[#4c89f5] hover:bg-[#4c89f5]/80 text-white border-0"
            >
              Universe Loader (New)
            </Button>
            <Button
              onClick={() => setActiveLoader('neural')}
              disabled={activeLoader !== null}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Neural Network (Current)
            </Button>
            <Button
              onClick={() => setShowComparison(!showComparison)}
              disabled={activeLoader !== null}
              variant="ghost"
              className="text-white/60 hover:text-white"
            >
              {showComparison ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>
      </div>

      {/* Universe Loader */}
      {activeLoader === 'universe' && (
        <div className="fixed inset-0 z-[100]">
          <UniverseLoader onComplete={handleUniverseComplete} />
        </div>
      )}

      {/* Neural Network Loader */}
      {activeLoader === 'neural' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05070b]">
          <NeuralNetwork onComplete={handleNeuralComplete} />
        </div>
      )}

      {/* Default preview state */}
      {activeLoader === null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-2xl px-8">
            <div className="space-y-2">
              <h2 className="font-heading text-2xl text-white/80">
                Select a loading animation to preview
              </h2>
              <p className="text-white/40 font-light">
                Experience the journey from cosmic creation to galaxy formation
              </p>
            </div>

            {showComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="font-heading text-lg text-[#4c89f5] mb-3">Universe Loader</h3>
                  <ul className="space-y-2 text-sm text-white/60">
                    <li>• Big Bang singularity with energy waves</li>
                    <li>• 3D cosmic expansion with star field</li>
                    <li>• Spiral galaxy formation with rotation</li>
                    <li>• Nebula clouds and twinkling stars</li>
                    <li>• Progress indicator with phase labels</li>
                    <li>• Duration: ~3 seconds (configurable)</li>
                    <li>• Canvas-based with smooth animations</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h3 className="font-heading text-lg text-white/80 mb-3">Neural Network</h3>
                  <ul className="space-y-2 text-sm text-white/60">
                    <li>• 7 neural nodes with pulse animation</li>
                    <li>• 6 connection lines with draw effect</li>
                    <li>• Center hub with enhanced glow</li>
                    <li>• "Ready to build" completion text</li>
                    <li>• CSS-based animations</li>
                    <li>• Duration: ~3 seconds</li>
                    <li>• Lightweight DOM-based rendering</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="pt-8">
              <div className="inline-flex items-center gap-2 text-white/30 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#4c89f5] animate-pulse" />
                Both loaders use your theme colors: #4c89f5, #87a8df, #05070b
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background ambient effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4c89f5]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#87a8df]/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}