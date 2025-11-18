import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  char: string;
  size: number;
  opacity: number;
}

export const SingularityBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initializeParticles = () => {
      const particles: Particle[] = [];
      const count = Math.floor(window.innerWidth * window.innerHeight / 8000);
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          connections: [],
          char: Math.random() > 0.5 ? '1' : '0',
          size: 2 + Math.random() * 2,
          opacity: 0.1 + Math.random() * 0.3
        });
      }
      return particles;
    };

    const drawConnection = (p1: Particle, p2: Particle, distance: number) => {
      const opacity = (1 - distance / 100) * Math.min(p1.opacity, p2.opacity);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around screen edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.font = `${particle.size}px monospace`;
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
        ctx.fillText(particle.char, particle.x, particle.y);

        // Draw connections
        particlesRef.current.forEach((other, j) => {
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance < 100) {
            drawConnection(particle, other, distance);
          }
        });
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particlesRef.current = initializeParticles();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initializeParticles();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
}; 