'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { AuthParticleField } from './AuthParticleField';

interface AuthShellProps {
  title: string;
  subtitle: string;
  homeHref?: string;
  footerNote?: string;
  children: React.ReactNode;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function AuthShell({
  title,
  subtitle,
  homeHref = '/',
  footerNote = 'Smart Ride',
  children,
}: AuthShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0C0E] px-4 py-12 text-white">
      <AuthParticleField />
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={container}
      >
        <motion.div variants={item} className="mb-8 text-center">
          <Link href={homeHref} className="inline-flex">
            <div className="h-14 w-14 overflow-hidden rounded-2xl">
              <Image
                src="/icon.png"
                alt="Smart Ride"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-white/50">{subtitle}</p>
        </motion.div>

        <motion.div
          variants={item}
          className="rounded-2xl border border-white/10 bg-[#111214] p-7"
        >
          {children}
        </motion.div>

        <motion.div variants={item} className="mt-6 text-center">
          <Link
            href={homeHref}
            className="text-sm text-white/40 transition-colors hover:text-white"
          >
            Back to Smart Ride
          </Link>
          <p className="mt-3 text-xs text-white/25">{footerNote}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
