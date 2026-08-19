'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  amount?: number;
}

/**
 * Scroll-triggered entrance for section/row content. The page scrolls
 * normally, this only fades+lifts an element in once as it enters view.
 * Collapses to instant under prefers-reduced-motion.
 */
export function Reveal({ children, className, delay = 0, y = 20, amount = 0.25 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
