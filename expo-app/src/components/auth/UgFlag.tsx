// ============================================
// SMART RIDE MOBILE - UGANDA FLAG
// ============================================
// Drawn with react-native-svg, NOT the flag emoji: Android ships no flag
// glyphs in its system font, so an emoji flag renders as the two letters "UG"
// in a box on most Android devices.
// ============================================

import React, { useId } from 'react';
import Svg, { Rect, Circle, Path, G, ClipPath, Defs } from 'react-native-svg';

interface UgFlagProps {
  size?: number;
}

/** 3:2 flag, clipped to a rounded rectangle. */
export function UgFlag({ size = 22 }: UgFlagProps) {
  const w = size;
  const h = (size * 2) / 3;
  // The clip path id must be unique per instance. The phone field chip and the
  // country picker row can be mounted at the same time, and a duplicate SVG id
  // resolves against whichever definition was registered first.
  const clipId = `ug-clip-${useId()}`;

  return (
    <Svg width={w} height={h} viewBox="0 0 36 24" accessibilityLabel="Uganda">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y="0" width="36" height="24" rx="3" ry="3" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x="0" y="0" width="36" height="4" fill="#000000" />
        <Rect x="0" y="4" width="36" height="4" fill="#FCDC04" />
        <Rect x="0" y="8" width="36" height="4" fill="#D90000" />
        <Rect x="0" y="12" width="36" height="4" fill="#000000" />
        <Rect x="0" y="16" width="36" height="4" fill="#FCDC04" />
        <Rect x="0" y="20" width="36" height="4" fill="#D90000" />
        {/* Central white disc with a simplified crested crane mark. */}
        <Circle cx="18" cy="12" r="5.4" fill="#FFFFFF" />
        <Path
          d="M15.4 13.6c0-1.6 1.2-2.9 2.7-2.9s2.7 1.3 2.7 2.9c0 .6-.5 1.1-1.1 1.1h-3.2c-.6 0-1.1-.5-1.1-1.1z"
          fill="#D90000"
        />
        <Circle cx="17.4" cy="9.9" r="1.5" fill="#D90000" />
        <Path d="M16.1 9.6l-2.1-.7 2.1-.7z" fill="#FCDC04" />
      </G>
    </Svg>
  );
}
