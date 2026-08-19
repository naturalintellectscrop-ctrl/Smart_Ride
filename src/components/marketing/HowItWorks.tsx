'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Reveal } from './Reveal';

const steps = [
  {
    title: 'Choose your service',
    description:
      'Boda, car, food, groceries, pharmacy or a parcel: pick what you need from one app and one account.',
  },
  {
    title: 'See the fare before you commit',
    description:
      'The price you are shown is the price you pay. No haggling at the stage, no surprise once the trip ends.',
  },
  {
    title: 'Track it in real time',
    description:
      'Watch your rider or courier approach on the map, with their name, photo and vehicle details.',
  },
  {
    title: 'Pay how you already pay',
    description:
      'MTN MoMo, Airtel Money, cash, or your Smart Ride wallet balance, whichever suits the moment.',
  },
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.75', 'end 0.55'],
  });
  const railHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-2xl">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-mkt-border sm:left-5" aria-hidden="true" />
      {!reduceMotion && (
        <motion.div
          className="absolute left-4 top-2 w-px bg-mkt-accent sm:left-5"
          style={{ height: railHeight }}
          aria-hidden="true"
        />
      )}

      <ol className="space-y-10 sm:space-y-12">
        {steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.05} y={16}>
            <li className="relative pl-12 sm:pl-14">
              <span className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border-2 border-mkt-accent bg-mkt-bg text-sm font-semibold text-mkt-accent sm:size-10">
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold text-mkt-fg">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mkt-fg-muted">{step.description}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
