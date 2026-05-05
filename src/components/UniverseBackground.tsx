import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  driftX: number;
  driftY: number;
}

export function UniverseBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nebulasRef = useRef<Nebula[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize stars with varied sizes (power-law distribution for realism)
    const initStars = () => {
      starsRef.current = [];
      // More small stars, fewer large ones
      for (let i = 0; i < 300; i++) {
        const r = Math.random();
        let radius: number;
        if (r < 0.6) {
          radius = Math.random() * 0.8 + 0.1; // tiny
        } else if (r < 0.85) {
          radius = Math.random() * 1.2 + 0.8; // small
        } else if (r < 0.95) {
          radius = Math.random() * 2 + 2; // medium
        } else {
          radius = Math.random() * 3 + 4; // large
        }
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          opacity: Math.random() * 0.6 + 0.2,
          twinkleSpeed: Math.random() * 0.03 + 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    // Initialize drifting particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.3 + 0.05,
      }));
    };

    // Initialize nebulas (large colorful blobs)
    const initNebulas = () => {
      nebulasRef.current = [
        {
          x: canvas.width * 0.5, y: canvas.height * 0.5,
          radius: Math.max(canvas.width, canvas.height) * 0.5,
          color: 'rgba(30, 58, 138,', opacity: 0.25,
          driftX: 0.1, driftY: 0.05,
        },
        {
          x: canvas.width * 0.3, y: canvas.height * 0.25,
          radius: Math.max(canvas.width, canvas.height) * 0.25,
          color: 'rgba(100, 150, 255,', opacity: 0.08,
          driftX: -0.05, driftY: 0.08,
        },
        {
          x: canvas.width * 0.7, y: canvas.height * 0.7,
          radius: Math.max(canvas.width, canvas.height) * 0.2,
          color: 'rgba(140, 50, 200,', opacity: 0.05,
          driftX: 0.08, driftY: -0.04,
        },
        {
          x: canvas.width * 0.2, y: canvas.height * 0.8,
          radius: Math.max(canvas.width, canvas.height) * 0.15,
          color: 'rgba(50, 200, 180,', opacity: 0.04,
          driftX: 0.06, driftY: -0.07,
        },
      ];
    };

    initStars();
    initParticles();
    initNebulas();

    // Draw nebulas
    const drawNebulas = () => {
      nebulasRef.current.forEach((nebula) => {
        // Drift slowly
        nebula.x += nebula.driftX * 0.2;
        nebula.y += nebula.driftY * 0.2;
        // Wrap around
        if (nebula.x < -nebula.radius) nebula.x = canvas.width + nebula.radius;
        if (nebula.x > canvas.width + nebula.radius) nebula.x = -nebula.radius;
        if (nebula.y < -nebula.radius) nebula.y = canvas.height + nebula.radius;
        if (nebula.y > canvas.height + nebula.radius) nebula.y = -nebula.radius;

        const gradient = ctx.createRadialGradient(
          nebula.x, nebula.y, 0,
          nebula.x, nebula.y, nebula.radius
        );
        gradient.addColorStop(0, `${nebula.color}${nebula.opacity})`);
        gradient.addColorStop(0.5, `${nebula.color}${nebula.opacity * 0.4})`);
        gradient.addColorStop(1, `${nebula.color}0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
    };

    // Draw stars with twinkling
    const drawStars = () => {
      starsRef.current.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5;
        const finalOpacity = star.opacity * (0.4 + twinkle * 0.6);

        // Larger stars get a warmer color, smaller ones are cool white
        let color: string;
        if (star.radius > 3) {
          color = `rgba(200, 220, 255, ${finalOpacity})`;
        } else if (star.radius > 1.5) {
          color = `rgba(180, 210, 255, ${finalOpacity})`;
        } else {
          color = `rgba(255, 255, 255, ${finalOpacity})`;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow on brighter stars
        if (star.radius > 2) {
          const glow = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.radius * 4
          );
          glow.addColorStop(0, `rgba(150, 200, 255, ${finalOpacity * 0.15})`);
          glow.addColorStop(1, 'rgba(150, 200, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    // Draw particles
    const drawParticles = () => {
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.fillStyle = `rgba(100, 180, 255, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Animation loop
    const animate = () => {
      timeRef.current += 1;

      // Dark, near-black background
      ctx.fillStyle = 'rgba(3, 5, 18, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawNebulas();
      drawStars();
      drawParticles();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{
        background: 'rgb(2, 4, 15)',
        zIndex: 0,
      }}
    />
  );
}
