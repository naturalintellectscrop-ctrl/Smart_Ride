'use client';

import React from 'react';
import Image from 'next/image';
import { EyeOff, Wifi } from 'lucide-react';
import { Reveal } from './Reveal';
import { Parallax } from './Parallax';
import { ModelShowcase } from './ModelShowcase';

const points = [
  {
    icon: EyeOff,
    title: 'Your number stays yours',
    description:
      'Calls and messages between you and your rider or courier route through a masked connection. Neither of you ever sees the other’s real phone number.',
  },
  {
    icon: Wifi,
    title: 'Built for Kampala’s network',
    description:
      'A dropped signal does not drop your trip. Ride and order updates queue on your phone and sync the moment your connection comes back.',
  },
];

/**
 * Deliberately dark regardless of the site's light/dark toggle: the source
 * illustration has a black background and the 3D previews render best
 * against it, so this band commits to one look on purpose.
 */
export function KampalaShowcase() {
  return (
    <section id="kampala" className="relative overflow-hidden bg-[#0b0c0e] py-20 sm:py-24">
      <Parallax speed={50} className="absolute inset-0">
        <div className="absolute inset-0 -top-16 opacity-40 sm:opacity-55">
          <Image
            src="/images/art-boda-rider.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      </Parallax>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c0e] via-[#0b0c0e]/85 to-[#0b0c0e]/40 sm:via-[#0b0c0e]/75 sm:to-[#0b0c0e]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c0e] via-transparent to-[#0b0c0e]/60" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00d97e]">
                Built here, for here
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Made for how Kampala actually connects
              </h2>
            </Reveal>

            <dl className="mt-10 space-y-8">
              {points.map((point, i) => (
                <Reveal key={point.title} delay={i * 0.08}>
                  <div className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#00d97e]/30 bg-[#00d97e]/10 text-[#00d97e]">
                      <point.icon className="size-4" />
                    </span>
                    <div>
                      <dt className="font-semibold text-white">{point.title}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-white/60">{point.description}</dd>
                    </div>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>

          <Reveal delay={0.1} x={24} y={0}>
            <ModelShowcase />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
