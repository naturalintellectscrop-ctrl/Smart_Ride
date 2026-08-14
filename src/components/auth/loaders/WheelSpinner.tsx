'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface WheelSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * A spinning wheel in place of the generic circling-arc spinner — same
 * footprint as a lucide icon so it drops into existing h-4 w-4 slots.
 */
export function WheelSpinner({ size = 16, className }: WheelSpinnerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" opacity="0.35" />
      <motion.g
        style={{ transformOrigin: '12px 12px' }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 0.7, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <line x1="12" y1="12" x2="12" y2="4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="12" y1="12" x2="17.5" y2="15.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="12" y1="12" x2="6.5" y2="15.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
