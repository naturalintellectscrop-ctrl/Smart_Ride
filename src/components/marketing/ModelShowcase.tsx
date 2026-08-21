'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { Bike, Car, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModelKey = 'boda' | 'car';

const MODELS: Record<ModelKey, { label: string; src: string; sizeLabel: string; icon: typeof Bike }> = {
  boda: { label: 'Boda', src: '/models/3d-boda.glb', sizeLabel: '33MB', icon: Bike },
  car: { label: 'Car', src: '/models/3d-car-icon.glb', sizeLabel: '20MB', icon: Car },
};

let modelViewerRegistered: Promise<unknown> | null = null;
function ensureModelViewer() {
  if (!modelViewerRegistered) {
    modelViewerRegistered = import('@google/model-viewer');
  }
  return modelViewerRegistered;
}

const ORBIT_START = -60;
const ORBIT_RANGE = 120;

/**
 * Opt-in 3D preview. Neither the model-viewer library nor either .glb
 * (20-33MB) is fetched until the visitor explicitly taps to load one,
 * so the page's default weight is unaffected. See project findings on
 * Uganda's variable mobile-data conditions for why this stays opt-in.
 *
 * Once loaded, the model doesn't auto-spin: scrolling past this card
 * turns it, so the same scroll that carries you through the journey
 * is what moves the boda/car — movement illustrated by navigating,
 * not a decorative constant rotation.
 */
export function ModelShowcase() {
  const [active, setActive] = useState<ModelKey>('boda');
  const [loaded, setLoaded] = useState<Partial<Record<ModelKey, boolean>>>({});
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Partial<Record<ModelKey, HTMLElement>>>({});
  const activeElRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start end', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduceMotion) return;
    const el = activeElRef.current;
    if (!el) return;
    const angle = ORBIT_START + v * ORBIT_RANGE;
    el.setAttribute('camera-orbit', `${angle.toFixed(1)}deg 70deg 105%`);
  });

  useEffect(() => {
    const el = elementsRef.current[active];
    if (!el || !containerRef.current) return;
    containerRef.current.replaceChildren(el);
    activeElRef.current = el;
  }, [active]);

  const handleLoad = async (key: ModelKey) => {
    setStatus('loading');
    setProgress(0);
    await ensureModelViewer();

    const el = document.createElement('model-viewer') as HTMLElement;
    el.setAttribute('src', MODELS[key].src);
    el.setAttribute('alt', `Smart Ride ${MODELS[key].label} 3D model`);
    el.setAttribute('camera-controls', '');
    el.setAttribute('camera-orbit', `${ORBIT_START}deg 70deg 105%`);
    el.setAttribute('shadow-intensity', '1');
    el.setAttribute('exposure', '0.9');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.setProperty('--poster-color', 'transparent');

    el.addEventListener('progress', (e) => {
      const detail = (e as unknown as CustomEvent<{ totalProgress: number }>).detail;
      setProgress(Math.round(detail.totalProgress * 100));
    });
    el.addEventListener('load', () => {
      setStatus('ready');
      setLoaded((prev) => ({ ...prev, [key]: true }));
    });
    el.addEventListener('error', () => setStatus('error'));

    elementsRef.current[key] = el;
    activeElRef.current = el;
    containerRef.current?.replaceChildren(el);
  };

  const activeLoaded = loaded[active];

  return (
    <div ref={rootRef} className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex gap-1.5">
          {(Object.keys(MODELS) as ModelKey[]).map((key) => {
            const Model = MODELS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActive(key);
                  setStatus(loaded[key] ? 'ready' : 'idle');
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  active === key ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80',
                )}
              >
                <Model.icon className="size-3.5" />
                {Model.label}
              </button>
            );
          })}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <RotateCw className="size-3" />
          Scroll or drag to turn
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-b-2xl sm:aspect-video">
        {!activeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-white/[0.02] to-transparent px-6 text-center">
            {status === 'loading' ? (
              <>
                <Loader2 className="size-6 animate-spin text-[#00d97e]" />
                <p className="text-sm text-white/70">Loading model... {progress}%</p>
              </>
            ) : status === 'error' ? (
              <p className="text-sm text-white/60">Could not load the model. Check your connection and try again.</p>
            ) : (
              <>
                {(() => {
                  const Icon = MODELS[active].icon;
                  return <Icon className="size-8 text-white/30" />;
                })()}
                <button
                  type="button"
                  onClick={() => handleLoad(active)}
                  className="rounded-xl bg-[#00d97e] px-5 py-2.5 text-sm font-semibold text-[#0b0c0e] transition-opacity hover:opacity-90"
                >
                  Load 3D model &middot; {MODELS[active].sizeLabel}
                </button>
                <p className="max-w-xs text-xs text-white/40">
                  Optional, and best on Wi-Fi. Nothing downloads until you tap this.
                </p>
              </>
            )}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
