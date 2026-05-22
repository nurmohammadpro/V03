import { useEffect, useRef, useState } from 'react';

interface NeuralNetworkProps {
  onComplete?: () => void;
}

export function NeuralNetwork({ onComplete }: NeuralNetworkProps) {
  const [animate, setAnimate] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Start animation after a brief delay
    const startTimer = setTimeout(() => {
      setAnimate(true);
    }, 100);

    // Show "Ready" text after network completes
    const readyTimer = setTimeout(() => {
      setShowReady(true);
    }, 2500);

    // Trigger completion callback
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    timeoutRef.current = startTimer;
    return () => {
      clearTimeout(startTimer);
      clearTimeout(readyTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Neural Network Container */}
      <div className="relative w-[140px] h-[100px]">
        {/* Neural Nodes */}
        <div className={`neural-node absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '0s' }} />
        <div className={`neural-node absolute top-[20%] right-0 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '0.3s' }} />
        <div className={`neural-node absolute top-[60%] right-0 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '0.6s' }} />
        <div className={`neural-node absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '0.9s' }} />
        <div className={`neural-node absolute top-[60%] left-0 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '1.2s' }} />
        <div className={`neural-node absolute top-[20%] left-0 w-2 h-2 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '1.5s' }} />

        {/* Center Node */}
        <div className={`neural-node absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#4c89f5] rounded-full shadow-[0_0_15px_rgba(76,137,245,0.3)] ${animate ? 'animate-[node-pulse_2s_ease-in-out_infinite]' : ''}`} style={{ animationDelay: '0.45s' }} />

        {/* Neural Connections */}
        {animate && (
          <>
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent left-1/2 top-[30%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(-30deg)', animationDelay: '0.2s' }} />
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent right-[15%] top-[55%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(-60deg)', animationDelay: '0.5s' }} />
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent left-1/2 bottom-[25%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(30deg)', animationDelay: '0.8s' }} />
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent left-[15%] top-[55%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(60deg)', animationDelay: '1.1s' }} />
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent left-[25%] top-[35%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(20deg)', animationDelay: '1.4s' }} />
            <div className="neural-connection absolute h-[1px] bg-gradient-to-r from-transparent via-[rgba(76,137,245,0.4)] to-transparent right-[25%] top-[35%] w-0 origin-left animate-[connection-draw_0.5s_ease-out_forwards]" style={{ transform: 'rotate(-20deg)', animationDelay: '1.7s' }} />
          </>
        )}

        {/* Ready Text */}
        {showReady && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-heading text-sm font-semibold text-white/90 whitespace-nowrap animate-[fade-in_0.5s_ease-out_forwards]">
            Ready to build
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes node-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes connection-draw {
          0% {
            opacity: 0;
            width: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
