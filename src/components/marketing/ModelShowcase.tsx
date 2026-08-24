'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { Bike, Car, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModelKey = 'boda' | 'car';

const DRAG_PX_PER_TURN = 320;

/**
 * frameCount/wrap vary per vehicle: boda has a clean full 360 render, but
 * the car source model's livery texture is broken outside roughly a
 * 70-280deg arc (a mirrored decal reads as garbled text), so its unsafe
 * frames were deleted rather than shipped - see scripts/render-model-frames.js.
 * wrap:false clamps at both ends instead of jumping across the gap.
 */
const MODELS: Record<ModelKey, { label: string; icon: typeof Bike; frameCount: number; wrap: boolean }> = {
  boda: { label: 'Boda', icon: Bike, frameCount: 36, wrap: true },
  car: { label: 'Car', icon: Car, frameCount: 22, wrap: false },
};

function framePath(key: ModelKey, index: number) {
  return `/turntable/${key}/frame-${String(index).padStart(2, '0')}.webp`;
}

/**
 * Lightweight turntable: pre-rendered WebP stills per vehicle (~10-18KB
 * each, generated offline by scripts/render-model-frames.js from the
 * source .glb files in assets/3d-source/, which are not shipped to the
 * browser) swapped by scroll position or drag, instead of loading a live
 * 20-33MB 3D model. See project history for why the earlier gated-download
 * version was replaced: even opt-in, that cost is real on Uganda data.
 */
export function ModelShowcase() {
  const [active, setActive] = useState<ModelKey>('boda');
  const [frameIndex, setFrameIndex] = useState(() => Math.floor(MODELS.boda.frameCount / 2));
  const rootRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startFrame: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const frameCount = MODELS[active].frameCount;

  useEffect(() => {
    (Object.keys(MODELS) as ModelKey[]).forEach((key) => {
      for (let i = 0; i < MODELS[key].frameCount; i++) {
        const img = new window.Image();
        img.src = framePath(key, i);
      }
    });
  }, []);

  useEffect(() => {
    setFrameIndex(Math.floor(MODELS[active].frameCount / 2));
  }, [active]);

  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start end', 'end start'] });
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduceMotion || dragState.current) return;
    const clamped = Math.min(1, Math.max(0, v));
    setFrameIndex(Math.round(clamped * (frameCount - 1)));
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startFrame: frameIndex };
    },
    [frameIndex],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const { wrap } = MODELS[active];
      const delta = e.clientX - dragState.current.startX;
      const framesPerPixel = frameCount / DRAG_PX_PER_TURN;
      const next = Math.round(dragState.current.startFrame + delta * framesPerPixel);
      setFrameIndex(
        wrap ? ((next % frameCount) + frameCount) % frameCount : Math.min(frameCount - 1, Math.max(0, next)),
      );
    },
    [active, frameCount],
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

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
                onClick={() => setActive(key)}
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
          <Move className="size-3" />
          Scroll or drag to turn
        </span>
      </div>

      <div
        className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-b-2xl sm:aspect-video"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={framePath(active, Math.min(frameIndex, frameCount - 1))}
          alt={`Smart Ride ${MODELS[active].label}`}
          className="h-full w-full cursor-grab object-contain active:cursor-grabbing"
          draggable={false}
        />
      </div>
    </div>
  );
}
