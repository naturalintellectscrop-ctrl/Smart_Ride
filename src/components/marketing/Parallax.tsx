'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

/**
 * Moves children vertically at a fraction of scroll speed for a depth cue.
 * speed is the max px offset in either direction across the element's
 * scroll-through range. Renders children unwrapped under reduced motion.
 */
export function Parallax({ children, className, speed = 40 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
