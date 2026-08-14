'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RideLoaderProps {
  variant?: 'bike' | 'car';
  size?: number;
  label?: string;
  className?: string;
}

function Wheel({ cx, cy, r, spin }: { cx: number; cy: number; r: number; spin: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
      <motion.g
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        animate={spin ? { rotate: 360 } : undefined}
        transition={spin ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : undefined}
      >
        <circle cx={cx} cy={cy} r={2} fill="currentColor" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 2} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 2) * 0.87}
          y2={cy + (r - 2) * 0.5}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx - (r - 2) * 0.87}
          y2={cy + (r - 2) * 0.5}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </motion.g>
    </g>
  );
}

/**
 * A branded vehicle loading animation (boda or car) in place of the generic
 * circling-arc spinner, for full-page loading states. Wheels spin, the body
 * bounces gently, a ground shadow breathes in sync, and a few trailing dashes
 * suggest forward motion — all transform/opacity only, and all of it collapses
 * to a static parked vehicle under prefers-reduced-motion.
 */
export function RideLoader({ variant = 'bike', size = 96, label = 'Loading', className }: RideLoaderProps) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;

  return (
    <div className={className} role="status" aria-label={label}>
      <svg width={size} height={size * 0.6} viewBox="0 0 120 72" fill="none" aria-hidden="true">
        {/* Ground shadow */}
        <motion.ellipse
          cx="60"
          cy="64"
          rx="42"
          ry="4"
          fill="currentColor"
          opacity={0.18}
          animate={animate ? { opacity: [0.22, 0.1, 0.22], scaleX: [1, 0.86, 1] } : undefined}
          transition={animate ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '60px 64px' }}
        />

        {/* Speed trail */}
        {[0, 1, 2].map((i) => (
          <motion.line
            key={i}
            x1={2}
            y1={38 + i * 6}
            x2={2 + 10 - i * 2}
            y2={38 + i * 6}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0}
            animate={animate ? { opacity: [0, 0.45, 0], x: [0, -6, -6] } : undefined}
            transition={
              animate
                ? { duration: 0.9, repeat: Infinity, ease: 'easeOut', delay: i * 0.15 }
                : undefined
            }
          />
        ))}

        {/* Vehicle body + wheels, bouncing as one unit */}
        <motion.g
          animate={animate ? { y: [0, -3, 0] } : undefined}
          transition={animate ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {variant === 'car' ? (
            <path
              d="M14,50 L14,42 Q14,36 20,36 L34,36 L42,22 Q45,18 50,18 L78,18 Q84,18 88,24 L96,36 L106,36 Q112,36 112,42 L112,50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M30,54 L34,40 L46,30 L58,40 L74,40 L90,54 M74,40 L92,18 M86,17 L98,15"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {variant === 'bike' && <circle cx="92" cy="20" r="2" fill="currentColor" />}

          <Wheel cx={variant === 'car' ? 30 : 30} cy={54} r={variant === 'car' ? 12 : 13} spin={animate} />
          <Wheel cx={variant === 'car' ? 90 : 90} cy={54} r={variant === 'car' ? 12 : 13} spin={animate} />
        </motion.g>
      </svg>
    </div>
  );
}
