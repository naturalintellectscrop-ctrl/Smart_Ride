'use client';

import { useState } from 'react';
import { AlertTriangle, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOSButtonProps {
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant?: 'floating' | 'inline';
}

export function SOSButton({ 
  onPress, 
  size = 'medium', 
  showLabel = false,
  variant = 'floating'
}: SOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20',
  };

  const iconSizes = {
    small: 'h-5 w-5',
    medium: 'h-7 w-7',
    large: 'h-9 w-9',
  };

  const handlePressStart = () => {
    setIsPressed(true);
    // 3 second hold to trigger
    const timer = setTimeout(() => {
      onPress();
      setIsPressed(false);
    }, 3000);
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={onPress}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
          "bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300"
        )}
      >
        <Shield className="h-5 w-5" />
        {showLabel && <span className="font-medium">SOS</span>}
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Pulse animation when pressed */}
      {isPressed && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          <div className="absolute inset-0 rounded-full bg-red-300 animate-pulse" />
        </>
      )}

      <button
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        className={cn(
          sizeClasses[size],
          "rounded-full flex items-center justify-center transition-all shadow-lg",
          "bg-gradient-to-br from-red-500 to-red-600",
          "active:scale-95",
          isPressed && "scale-110 from-red-600 to-red-700"
        )}
      >
        <AlertTriangle className={cn(
          iconSizes[size], 
          "text-white",
          isPressed && "animate-pulse"
        )} />
      </button>

      {/* Label */}
      {showLabel && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-red-600">
          SOS
        </span>
      )}

      {/* Hold indicator */}
      {isPressed && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-red-600 font-medium animate-pulse">
            Hold 3s to activate
          </span>
        </div>
      )}
    </div>
  );
}

// Quick SOS Modal Trigger Button
export function SOSButtonModal({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center",
        "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg",
        "hover:shadow-xl active:scale-95 transition-all"
      )}
    >
      <Shield className="h-6 w-6 text-white" />
    </button>
  );
}

// SOS Status Badge for active trips
export function SOSStatusBadge({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full shadow-lg animate-pulse">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-bold">SOS ACTIVE</span>
      </div>
    </div>
  );
}
