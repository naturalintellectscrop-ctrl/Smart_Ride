'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface JourneyWaypoint {
  id: string;
  label: string;
}

interface JourneyRailProps {
  waypoints: JourneyWaypoint[];
}

/**
 * Persistent left-edge wayfinding rail: tracks which homepage section is
 * currently in view and lets you jump to any of them. Distinct from the
 * top ScrollProgressBar (raw scroll %) and HowItWorks' internal rail
 * (scoped to its own 4 steps) — this one spans the whole page.
 */
export function JourneyRail({ waypoints }: JourneyRailProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const elements = waypoints
      .map((w) => ({ id: w.id, el: document.getElementById(w.id) }))
      .filter((entry): entry is { id: string; el: HTMLElement } => entry.el !== null);

    if (elements.length === 0) return;

    const indexById = new Map(waypoints.map((w, i) => [w.id, i]));
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        if (visible.size === 0) return;
        const lowestIndex = Math.min(...Array.from(visible).map((id) => indexById.get(id) ?? 0));
        setActiveIndex(lowestIndex);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    elements.forEach(({ el }) => observer.observe(el));
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [waypoints]);

  return (
    <nav
      aria-label="Page sections"
      className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center lg:flex"
    >
      {waypoints.map((waypoint, i) => {
        const passed = i < activeIndex;
        const active = i === activeIndex;
        return (
          <React.Fragment key={waypoint.id}>
            {i > 0 && (
              <span
                className={cn(
                  'h-5 w-px',
                  passed ? 'bg-mkt-accent' : 'bg-mkt-border',
                  !reduceMotion && 'transition-colors duration-300',
                )}
                aria-hidden="true"
              />
            )}
            <a
              href={`#${waypoint.id}`}
              aria-label={waypoint.label}
              title={waypoint.label}
              className={cn(
                'group relative flex items-center justify-center rounded-full',
                active ? 'size-3' : 'size-2',
                !reduceMotion && 'transition-all duration-300',
              )}
            >
              <span
                className={cn(
                  'block rounded-full',
                  active
                    ? 'size-3 bg-mkt-accent ring-2 ring-mkt-accent/30 ring-offset-2 ring-offset-mkt-bg'
                    : passed
                      ? 'size-2 bg-mkt-accent'
                      : 'size-2 border border-mkt-fg-faint/50 bg-transparent',
                  !reduceMotion && 'transition-all duration-300',
                )}
              />
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-mkt-bg-raised px-2.5 py-1 text-xs font-medium text-mkt-fg opacity-0 shadow-sm ring-1 ring-mkt-border transition-opacity group-hover:opacity-100">
                {waypoint.label}
              </span>
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
