'use client';

import React from 'react';
import { motion, useScroll, useReducedMotion } from 'framer-motion';

/**
 * Thin fixed bar under the header tracking whole-page scroll progress.
 * Reinforces the "guided walkthrough" framing across every marketing page.
 */
export function ScrollProgressBar() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  if (reduceMotion) return null;

  return (
    <motion.div
      className="fixed left-0 top-0 z-[60] h-0.5 w-full origin-left bg-mkt-accent"
      style={{ scaleX: scrollYProgress }}
      aria-hidden="true"
    />
  );
}
