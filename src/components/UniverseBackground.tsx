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

    const initStars = () => {
      starsRef.current = [];
      for (let i = 0; i < 350; i++) {
        const r = Math.random();
        let radius: number;
        if (r < 0.6) radius = Math.random() * 0.6 + 0.1;
        else if (r < 0.85) radius = Math.random() * 1 + 0.6;
        else if (r < 0.95) radius = Math.random() * 1.5 + 1.6;
        else radius = Math.random() * 2 + 3;
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius,
          opacity: Math.random() * 0.5 + 0.1,
          twinkleSpeed: Math.random() * 0.03 + 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 1 + 0.2,
        opacity: Math.random() * 0.2 + 0.02,
      }));
    };

    const initNebulas = () => {
      nebulasRef.current = [
        {
          x: canvas.width * 0.5, y: canvas.height * 0.5,
          radius: Math.max(canvas.width, canvas.height) * 0.4,
          color: 'rgba(30, 40, 60,',
          opacity: 0.15,
          driftX: 0.05, driftY: 0.03,
        },
        {
          x: canvas.width * 0.25, y: canvas.height * 0.3,
          radius: Math.max(canvas.width, canvas.height) * 0.18,
          color: 'rgba(60, 70, 90,',
          opacity: 0.06,
          driftX: -0.03, driftY: 0.05,
        },
        {
          x: canvas.width * 0.75, y: canvas.height * 0.7,
          radius: Math.max(canvas.width, canvas.height) * 0.15,
          color: 'rgba(40, 50, 70,',
          opacity: 0.04,
          driftX: 0.04, driftY: -0.02,
        },
      ];
    };

    initStars();
    initParticles();
    initNebulas();

    const drawNebulas = () => {
      nebulasRef.current.forEach((nebula) => {
        nebula.x += nebula.driftX * 0.2;
        nebula.y += nebula.driftY * 0.2;
        if (nebula.x < -nebula.radius) nebula.x = canvas.width + nebula.radius;
        if (nebula.x > canvas.width + nebula.radius) nebula.x = -nebula.radius;
        if (nebula.y < -nebula.radius) nebula.y = canvas.height + nebula.radius;
        if (nebula.y > canvas.height + nebula.radius) nebula.y = -nebula.radius;

        const gradient = ctx.createRadialGradient(
          nebula.x, nebula.y, 0,
          nebula.x, nebula.y, nebula.radius
        );
        gradient.addColorStop(0, `${nebula.color}${nebula.opacity})`);
        gradient.addColorStop(0.5, `${nebula.color}${nebula.opacity * 0.3})`);
        gradient.addColorStop(1, `${nebula.color}0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
    };

    const drawStars = () => {
      starsRef.current.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.5 + 0.5;
        const finalOpacity = star.opacity * (0.3 + twinkle * 0.7);

        let color: string;
        if (star.radius > 2.5) color = `rgba(200, 210, 230, ${finalOpacity})`;
        else if (star.radius > 1.2) color = `rgba(180, 190, 210, ${finalOpacity})`;
        else color = `rgba(220, 225, 235, ${finalOpacity})`;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.radius > 1.8) {
          const glow = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.radius * 3
          );
          glow.addColorStop(0, `rgba(200, 210, 230, ${finalOpacity * 0.1})`);
          glow.addColorStop(1, 'rgba(200, 210, 230, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    const drawParticles = () => {
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.fillStyle = `rgba(180, 190, 210, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const animate = () => {
      timeRef.current += 1;
      ctx.fillStyle = 'rgba(2, 3, 10, 0.12)';
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
        background: 'rgb(1, 2, 8)',
        zIndex: "var(--z-canvas)",
      }}
    />
  );
}
