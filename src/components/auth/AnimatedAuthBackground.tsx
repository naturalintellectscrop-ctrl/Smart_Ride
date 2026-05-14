'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// ==========================================
// Types
// ==========================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

interface AnimatedAuthBackgroundProps {
  className?: string;
  particleCount?: number;
  connectionDistance?: number;
  showAmbientGradients?: boolean;
}

// ==========================================
// Particle Colors - Smart Ride Brand
// ==========================================

const PARTICLE_COLORS = [
  '#00FF88', // Neon green (primary)
  '#00FFF3', // Cyan
  '#F97316', // Orange
  '#8B5CF6', // Purple
];

// ==========================================
// Component
// ==========================================

export function AnimatedAuthBackground({
  className,
  particleCount = 45,
  connectionDistance = 150,
  showAmbientGradients = true,
}: AnimatedAuthBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // ==========================================
  // Initialize Particles
  // ==========================================

  function createParticles(width: number, height: number): Particle[] {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      });
    }
    
    return particles;
  }

  // ==========================================
  // Initialize & Animation
  // ==========================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    dimensionsRef.current = { width, height };

    // Initialize particles
    particlesRef.current = createParticles(width, height);

    // Animation function
    function renderFrame() {
      const currentWidth = dimensionsRef.current.width;
      const currentHeight = dimensionsRef.current.height;
      const particles = particlesRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, currentWidth, currentHeight);

      // Update & Draw Particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = currentWidth;
        if (particle.x > currentWidth) particle.x = 0;
        if (particle.y < 0) particle.y = currentHeight;
        if (particle.y > currentHeight) particle.y = 0;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Connection Lines
      ctx.globalAlpha = 1;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.15;
            
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      
      animationRef.current = requestAnimationFrame(renderFrame);
    }

    // Start animation
    renderFrame();

    // Handle resize
    function handleResize() {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      dimensionsRef.current = { width: newWidth, height: newHeight };
      particlesRef.current = createParticles(newWidth, newHeight);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, connectionDistance]);

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className={cn("fixed inset-0 overflow-hidden", className)}>
      {/* Ambient Gradient Overlays */}
      {showAmbientGradients && (
        <>
          {/* Primary green gradient - top left */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(0, 255, 136, 0.25), transparent 50%)',
            }}
          />
          {/* Cyan gradient - bottom right */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 70% 80%, rgba(0, 255, 243, 0.18), transparent 50%)',
            }}
          />
          {/* Purple accent - center right */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 85% 40%, rgba(139, 92, 246, 0.12), transparent 40%)',
            }}
          />
          {/* Orange accent - bottom left */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 15% 70%, rgba(249, 115, 22, 0.1), transparent 35%)',
            }}
          />
        </>
      )}

      {/* Dark base gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0D0D12 0%, #0F0F18 50%, #0D0D12 100%)',
        }}
      />

      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Noise texture overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          zIndex: 2,
        }}
      />
    </div>
  );
}

export default AnimatedAuthBackground;
