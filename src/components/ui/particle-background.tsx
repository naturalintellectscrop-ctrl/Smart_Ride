'use client';

import React, { useEffect, useRef, useCallback } from 'react';

// ============================================
// FUTURISTIC PARTICLE BACKGROUND
// ============================================
// Premium animated background inspired by:
// Uber + Linear + futuristic fintech dashboards
// ============================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  colors?: string[];
  connectionDistance?: number;
  speed?: number;
}

const DEFAULT_COLORS = [
  '#00FF88', // Neon green
  '#00FFF3', // Cyan
  '#FF6B35', // Orange
  '#A855F7', // Purple
];

export function ParticleBackground({
  className = '',
  particleCount = 50,
  colors = DEFAULT_COLORS,
  connectionDistance = 150,
  speed = 0.3,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  const createParticle = useCallback((width: number, height: number): Particle => {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, [colors, speed]);

  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: particleCount }, () => 
      createParticle(width, height)
    );
  }, [particleCount, createParticle]);

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.opacity;
    ctx.fill();
    
    // Glow effect
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  const drawConnections = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          const opacity = (1 - distance / connectionDistance) * 0.3;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = particles[i].color;
          ctx.globalAlpha = opacity;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
  };

  const updateParticle = (particle: Particle, width: number, height: number) => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap around edges
    if (particle.x < 0) particle.x = width;
    if (particle.x > width) particle.x = 0;
    if (particle.y < 0) particle.y = height;
    if (particle.y > height) particle.y = 0;

    // Subtle mouse interaction
    const dx = mouseRef.current.x - particle.x;
    const dy = mouseRef.current.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 100) {
      particle.vx -= dx * 0.00005;
      particle.vy -= dy * 0.00005;
    }
  };

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    particlesRef.current.forEach(particle => {
      updateParticle(particle, width, height);
      drawParticle(ctx, particle);
    });

    // Draw connections
    drawConnections(ctx, particlesRef.current);

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    initParticles(canvas.width, canvas.height);
  }, [initParticles]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    handleResize();
    animate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleResize, animate, handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

// ============================================
// AMBIENT GRADIENT OVERLAY
// ============================================
export function AmbientGradient() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(0, 230, 118, 0.15), transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(64, 196, 255, 0.12), transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.08), transparent 60%)
        `,
        zIndex: 1,
      }}
    />
  );
}

// ============================================
// GLASSMORPHISM CARD WRAPPER
// ============================================
export function GlassCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div 
      className={`relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl ${className}`}
      style={{
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset,
          0 0 80px rgba(0, 255, 136, 0.05)
        `,
      }}
    >
      {/* Inner glow */}
      <div 
        className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.1), transparent 70%)',
          transform: 'translate(30%, -30%)',
        }}
      />
      {children}
    </div>
  );
}

// ============================================
// NEON BORDER GLOW
// ============================================
export function NeonBorder({ 
  children,
  color = '#00FF88',
  className = '',
}: { 
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-50 blur-sm"
        style={{ 
          background: `linear-gradient(135deg, ${color}, transparent, ${color})`,
        }}
      />
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

export default ParticleBackground;
