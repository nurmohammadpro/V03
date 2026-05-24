import { useEffect, useState, useRef } from 'react';

interface UniverseLoaderProps {
  onComplete?: () => void;
  duration?: number;
}

interface ExpandingStar {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  size: number;
  targetOpacity: number;
  currentOpacity: number;
  twinklePhase: number;
  color: string;
  expansionProgress: number;
  expansionSpeed: number;
}

export function UniverseLoader({ onComplete, duration = 4000 }: UniverseLoaderProps) {
  const [phase, setPhase] = useState<'spark' | 'expansion' | 'complete' | 'finished'>('spark');
  const [showReady, setShowReady] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const starsRef = useRef<ExpandingStar[]>([]);
  const timeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create expanding stars from center (subtle big bang)
    const initExpandingStars = () => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const isMobile = canvas.width < 768;
      const maxDistance = Math.min(canvas.width, canvas.height) * (isMobile ? 0.35 : 0.25); // 70% mobile, 50% desktop

      const stars: ExpandingStar[] = [];

      // Center star (the singularity that remains)
      stars.push({
        startX: centerX,
        startY: centerY,
        targetX: centerX,
        targetY: centerY,
        currentX: centerX,
        currentY: centerY,
        size: 4,
        targetOpacity: 1,
        currentOpacity: 0,
        twinklePhase: 0,
        color: '#4c89f5',
        expansionProgress: 0,
        expansionSpeed: 0
      });

      // Create stars with increasing density based on distance from center
      // Inner circle (0-30% of maxDistance): fewer stars
      const innerStars = Math.floor(Math.random() * 5) + 8;
      for (let i = 0; i < innerStars; i++) {
        const angle = (i / innerStars) * Math.PI * 2 - Math.PI / 2;
        const distance = 30 + Math.random() * 30;
        stars.push({
          startX: centerX,
          startY: centerY,
          targetX: centerX + Math.cos(angle) * distance,
          targetY: centerY + Math.sin(angle) * distance,
          currentX: centerX,
          currentY: centerY,
          size: 2.5 + Math.random() * 0.5,
          targetOpacity: 0.85 + Math.random() * 0.1,
          currentOpacity: 0,
          twinklePhase: i * 0.5,
          color: '#87a8df',
          expansionProgress: 0,
          expansionSpeed: 0.003 + Math.random() * 0.001
        });
      }

      // Middle circle (30-60% of maxDistance): more stars
      const middleStars = Math.floor(Math.random() * 10) + 16;
      for (let i = 0; i < middleStars; i++) {
        const angle = (i / middleStars) * Math.PI * 2;
        const distance = 60 + Math.random() * 60;
        stars.push({
          startX: centerX,
          startY: centerY,
          targetX: centerX + Math.cos(angle) * distance,
          targetY: centerY + Math.sin(angle) * distance,
          currentX: centerX,
          currentY: centerY,
          size: 1.8 + Math.random() * 0.4,
          targetOpacity: 0.7 + Math.random() * 0.15,
          currentOpacity: 0,
          twinklePhase: i * 0.3,
          color: '#a8c7e8',
          expansionProgress: 0,
          expansionSpeed: 0.002 + Math.random() * 0.001
        });
      }

      // Outer circle (60-100% of maxDistance): most stars (density increases with distance)
      const outerStars = Math.floor(Math.random() * 30) + 70; // Many more stars in outer region
      for (let i = 0; i < outerStars; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 120 + Math.random() * (maxDistance - 120);
        stars.push({
          startX: centerX,
          startY: centerY,
          targetX: centerX + Math.cos(angle) * distance,
          targetY: centerY + Math.sin(angle) * distance,
          currentX: centerX,
          currentY: centerY,
          size: Math.random() * 1.5 + 0.5,
          targetOpacity: 0.5 + Math.random() * 0.3,
          currentOpacity: 0,
          twinklePhase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.6 ? '#ffffff' : '#87a8df',
          expansionProgress: 0,
          expansionSpeed: 0.001 + Math.random() * 0.002
        });
      }

      starsRef.current = stars;
    };

    initExpandingStars();

    // Phase transitions with minimum 1500ms duration
    const expansionTimer = setTimeout(() => setPhase('expansion'), 800);
    const minDurationTimer = setTimeout(() => setCanComplete(true), 1500); // Minimum 1500ms
    const readyTimer = setTimeout(() => {
      if (canComplete) {
        setShowReady(true);
        setPhase('complete');
        // Complete after showing ready text
        setTimeout(() => {
          setPhase('finished');
          onComplete?.();
        }, 300);
      }
    }, duration);

    // Animation loop
    const animate = () => {
      timeRef.current++;

      // Clear canvas
      ctx.fillStyle = '#05070b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Phase 1: The Spark - Draw singularity glow
      if (phase === 'spark') {
        const sparkProgress = Math.min(timeRef.current / 50, 1); // First ~800ms
        const pulsePhase = timeRef.current * 0.05;
        const pulse = Math.sin(pulsePhase) * 0.1 + 0.9;

        const glowSize = 30 * pulse * (1 + sparkProgress * 0.5);
        const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
        glowGradient.addColorStop(0, `rgba(76, 137, 245, ${0.8 * pulse})`);
        glowGradient.addColorStop(0.3, `rgba(76, 137, 245, ${0.4 * pulse})`);
        glowGradient.addColorStop(0.7, `rgba(135, 168, 223, ${0.15 * pulse})`);
        glowGradient.addColorStop(1, 'rgba(76, 137, 245, 0)');

        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Tiny bright center
        ctx.fillStyle = '#4c89f5';
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Phase 2 & beyond: Expanding stars
      if (phase === 'expansion' || phase === 'complete' || phase === 'finished') {
        // Continue drawing subtle center glow
        const centerGlowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
        centerGlowGradient.addColorStop(0, 'rgba(76, 137, 245, 0.15)');
        centerGlowGradient.addColorStop(0.5, 'rgba(76, 137, 245, 0.05)');
        centerGlowGradient.addColorStop(1, 'rgba(76, 137, 245, 0)');
        ctx.fillStyle = centerGlowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw expanding stars
        starsRef.current.forEach((star) => {
          // Expand star position with ease-out
          if (star.expansionProgress < 1 && star.expansionSpeed > 0) {
            star.expansionProgress += star.expansionSpeed;
            const easeProgress = 1 - Math.pow(1 - star.expansionProgress, 2); // Ease-out

            star.currentX = star.startX + (star.targetX - star.startX) * easeProgress;
            star.currentY = star.startY + (star.targetY - star.startY) * easeProgress;
          }

          // Fade in as star expands (200ms effect)
          const fadeInStart = Math.min(star.expansionProgress * 2, 1); // Start fading in at 50% expansion
          if (fadeInStart > 0) {
            star.currentOpacity = star.targetOpacity * Math.min(fadeInStart * 5, 1); // 200ms at 60fps
          }

          // Subtle twinkle
          star.twinklePhase += 0.015;
          const twinkle = Math.sin(star.twinklePhase) * 0.15 + 0.85;
          const finalOpacity = star.currentOpacity * twinkle;

          // Draw glow for larger stars
          if (star.size > 2 && finalOpacity > 0) {
            const gradient = ctx.createRadialGradient(star.currentX, star.currentY, 0, star.currentX, star.currentY, star.size * 3);
            gradient.addColorStop(0, `${star.color}${Math.floor(finalOpacity * 0.25).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, `${star.color}00`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(star.currentX, star.currentY, star.size * 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw star
          if (finalOpacity > 0) {
            ctx.fillStyle = star.color;
            ctx.globalAlpha = finalOpacity;
            ctx.beginPath();
            ctx.arc(star.currentX, star.currentY, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        });
      }

      // Create vignette effect (darker outer 30-50%)
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.5;
      const innerRadius = Math.min(canvas.width, canvas.height) * 0.35;

      const vignetteGradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, maxRadius);
      vignetteGradient.addColorStop(0, 'rgba(5, 7, 11, 0)');
      vignetteGradient.addColorStop(0.5, 'rgba(5, 7, 11, 0.3)');
      vignetteGradient.addColorStop(1, 'rgba(5, 7, 11, 0.7)');

      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(expansionTimer);
      clearTimeout(minDurationTimer);
      clearTimeout(readyTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onComplete, duration, phase, canComplete]);

  return (
    <div ref={containerRef} className="relative w-full h-screen flex items-center justify-center bg-[#05070b]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Ready text */}
      {showReady && phase !== 'finished' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 font-heading text-sm font-medium text-white/80 animate-[fade-in-up_0.6s_ease-out_forwards]">
          Universe ready
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
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