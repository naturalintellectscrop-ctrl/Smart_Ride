import React from 'react';

export function RouteMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="479" height="479" rx="23.5" stroke="white" strokeOpacity="0.08" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line
          key={`v-${i}`}
          x1={i * 48}
          y1="0"
          x2={i * 48}
          y2="480"
          stroke="white"
          strokeOpacity="0.045"
        />
      ))}
      {Array.from({ length: 11 }).map((_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 48}
          x2="480"
          y2={i * 48}
          stroke="white"
          strokeOpacity="0.045"
        />
      ))}
      <path
        d="M64 336 C 120 336, 132 240, 192 224 C 252 208, 264 128, 336 112"
        stroke="#00D97E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <circle cx="64" cy="336" r="6" fill="#0B0C0E" stroke="#00D97E" strokeWidth="2" />
      <circle cx="336" cy="112" r="6" fill="#00D97E" />
      <circle cx="336" cy="112" r="12" fill="#00D97E" fillOpacity="0.18" />
    </svg>
  );
}
