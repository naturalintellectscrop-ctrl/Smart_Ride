'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SOSButtonProps {
  /** Callback when SOS is activated (after 3-second hold) */
  onActivate: () => void;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the SOS label */
  showLabel?: boolean;
  /** Display variant */
  variant?: 'floating' | 'inline';
  /** Whether SOS is currently active */
  isActive?: boolean;
  /** Hold duration in ms (default: 3000) */
  holdDuration?: number;
  /** Additional class name */
  className?: string;
  /** Position for floating variant */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

// ============================================================================
// SOS Button Component
// ============================================================================

export function SOSButton({
  onActivate,
  size = 'small',
  showLabel = false,
  variant = 'floating',
  isActive = false,
  holdDuration = 3000,
  className,
  position = 'bottom-right',
}: SOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressStartTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sizeConfig = {
    small: { button: 'w-[60px] h-[60px]', icon: 'h-6 w-6', text: 'text-[10px]' },
    medium: { button: 'w-16 h-16', icon: 'h-7 w-7', text: 'text-xs' },
    large: { button: 'w-20 h-20', icon: 'h-9 w-9', text: 'text-sm' },
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  const config = sizeConfig[size];

  // Animate progress during hold
  const animateProgress = useCallback(() => {
    if (!pressStartTime.current) return;
    const elapsed = Date.now() - pressStartTime.current;
    const pct = Math.min((elapsed / holdDuration) * 100, 100);
    setProgress(pct);

    if (pct >= 100) {
      onActivate();
      setIsPressed(false);
      setProgress(0);
      pressStartTime.current = null;
      return;
    }

    animationFrame.current = requestAnimationFrame(animateProgress);
  }, [holdDuration, onActivate]);

  const handlePressStart = useCallback(() => {
    if (isActive) {
      onActivate();
      return;
    }
    setIsPressed(true);
    pressStartTime.current = Date.now();
    animationFrame.current = requestAnimationFrame(animateProgress);
  }, [isActive, onActivate, animateProgress]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
    setProgress(0);
    pressStartTime.current = null;
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Inline variant
  if (variant === 'inline') {
    return (
      <button
        onClick={isActive ? onActivate : handlePressStart}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200',
          isActive
            ? 'bg-red-500/20 border border-red-500/40 text-red-400'
            : 'bg-[#1A1A24] border border-white/10 text-white/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400',
          className
        )}
      >
        <Shield className="h-4 w-4" />
        <span className="font-semibold text-sm">
          {isActive ? 'SOS ACTIVE' : 'SOS'}
        </span>
      </button>
    );
  }

  // Floating variant
  return (
    <div
      className={cn(
        'fixed z-50',
        positionClasses[position],
        className
      )}
    >
      <div className="relative">
        {/* Pulsing rings when active */}
        {isActive && (
          <>
            <div className="absolute inset-[-8px] rounded-full bg-red-500/20 animate-ping" />
            <div className="absolute inset-[-4px] rounded-full bg-red-500/30 animate-pulse" />
          </>
        )}

        {/* Pulse animation when pressed */}
        {isPressed && !isActive && (
          <>
            <div className="absolute inset-[-6px] rounded-full bg-red-500/25 animate-ping" />
            <div className="absolute inset-[-3px] rounded-full bg-red-500/35 animate-pulse" />
          </>
        )}

        {/* Progress ring */}
        <svg
          className={cn(
            config.button,
            'absolute inset-0 -rotate-90'
          )}
          viewBox="0 0 60 60"
        >
          <circle
            cx="30"
            cy="30"
            r="27"
            fill="none"
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth="3"
          />
          <circle
            cx="30"
            cy="30"
            r="27"
            fill="none"
            stroke="#EF4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 27}`}
            strokeDashoffset={`${2 * Math.PI * 27 * (1 - progress / 100)}`}
            className="transition-none"
          />
        </svg>

        {/* Main button */}
        <button
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          className={cn(
            config.button,
            'relative rounded-full flex items-center justify-center transition-all duration-200',
            'border-2 shadow-lg select-none touch-none',
            isActive
              ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500/60 shadow-red-500/40'
              : isPressed
                ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-400/60 shadow-red-500/40 scale-110'
                : 'bg-gradient-to-br from-red-500 to-red-600 border-red-400/30 shadow-red-500/20 hover:shadow-red-500/40',
          )}
          aria-label={isActive ? 'SOS Active - Tap to view' : 'Hold 3 seconds to activate SOS'}
        >
          {isActive ? (
            <AlertTriangle className={cn(config.icon, 'text-white animate-pulse')} />
          ) : (
            <Shield className={cn(config.icon, 'text-white', isPressed && 'animate-pulse')} />
          )}
        </button>

        {/* Label */}
        {showLabel && (
          <span className={cn(
            'absolute -bottom-5 left-1/2 -translate-x-1/2 font-bold whitespace-nowrap',
            config.text,
            isActive ? 'text-red-400' : 'text-red-500/70'
          )}>
            {isActive ? 'ACTIVE' : 'SOS'}
          </span>
        )}

        {/* Hold indicator */}
        {isPressed && !isActive && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-red-400 font-medium animate-pulse">
              Hold {Math.max(0, Math.ceil((holdDuration - (progress / 100) * holdDuration) / 1000))}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SOS Status Badge - for active trip overlay
// ============================================================================

export function SOSStatusBadge({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 backdrop-blur-md text-white rounded-full shadow-lg shadow-red-500/30 animate-pulse border border-red-400/30">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-bold tracking-wide">SOS ACTIVE</span>
      </div>
    </div>
  );
}

export default SOSButton;
