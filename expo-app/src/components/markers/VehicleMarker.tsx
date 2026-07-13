// ============================================
// SMART RIDE — ANIMATED VEHICLE MAP MARKER
// ============================================
// Renders a provider's vehicle illustration directly on the map (the vehicle
// IS the marker — no pin, no circle) via Mapbox MarkerView, which mounts real
// RN views so Reanimated can drive Uber/Bolt-style motion:
//   • position interpolated between GPS updates (no jumping)
//   • rotation eased to the travel heading (shortest path), vehicle points along
//   • subtle scale-up while moving; larger + glow when assigned
//   • state restyles the art (grayscale offline, darker on-trip, faded poor-GPS)
// The art is vector (react-native-svg) so it stays crisp at every zoom.
//
// Realistic load: /riders/nearby caps results (≤8), for which MarkerView is
// smooth. For thousands of symbols a ShapeSource+SymbolLayer (iconRotate) path
// would be used instead — documented in the marker system notes.
// ============================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { VEHICLE_ART, VEHICLE_PALETTES, GRAYSCALE_PALETTE, VehicleArtKind, VehiclePalette } from './VehicleArt';

export type VehicleMarkerState = 'available' | 'assigned' | 'on_trip' | 'offline' | 'poor_gps';

interface VehicleMarkerProps {
  kind: VehicleArtKind;
  latitude: number;
  longitude: number;
  heading?: number | null;
  state?: VehicleMarkerState;
  /** Set true when the position actually changed since last update (drives the moving scale-up). */
  moving?: boolean;
  size?: number;
}

const POS_DURATION = 900; // ms to glide to a new GPS fix
const ROT_DURATION = 450; // ms to swing to a new heading

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Blend a hex colour toward slate-black for the darker "on trip" look.
function darken(hex: string, amt = 0.22): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.round(lerp(parseInt(h.slice(0, 2), 16), 11, amt));
  const g = Math.round(lerp(parseInt(h.slice(2, 4), 16), 18, amt));
  const b = Math.round(lerp(parseInt(h.slice(4, 6), 16), 32, amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function paletteFor(kind: VehicleArtKind, state: VehicleMarkerState): VehiclePalette {
  if (state === 'offline') return GRAYSCALE_PALETTE;
  const base = VEHICLE_PALETTES[kind];
  if (state === 'on_trip') {
    return { body: darken(base.body), bodyDark: darken(base.bodyDark), accent: darken(base.accent), glass: darken(base.glass, 0.15), wheel: base.wheel };
  }
  return base;
}

/** Interpolate the rendered coordinate toward each new GPS fix (rAF, ~caps at 60fps). */
function useGlidedCoordinate(targetLng: number, targetLat: number): [number, number] {
  const [coord, setCoord] = useState<[number, number]>([targetLng, targetLat]);
  const fromRef = useRef<[number, number]>([targetLng, targetLat]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = coord; // glide from wherever we are now
    startRef.current = 0;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / POS_DURATION);
      const e = easeInOut(p);
      const lng = lerp(fromRef.current[0], targetLng, e);
      const lat = lerp(fromRef.current[1], targetLat, e);
      setCoord([lng, lat]);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLng, targetLat]);

  return coord;
}

// Loaded lazily so the module never touches the native SDK at import time.
let MapboxGL: any = null;
try {
  MapboxGL = require('@rnmapbox/maps').default;
} catch {
  MapboxGL = null;
}

export function VehicleMarker({
  kind,
  latitude,
  longitude,
  heading,
  state = 'available',
  moving = false,
  size = 46,
}: VehicleMarkerProps) {
  const coord = useGlidedCoordinate(longitude, latitude);
  const rotation = useSharedValue(heading ?? 0);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const Art = VEHICLE_ART[kind];
  const palette = useMemo(() => paletteFor(kind, state), [kind, state]);

  // Rotate to heading along the shortest arc (avoids 359°→0° spin-around).
  useEffect(() => {
    if (heading == null || !Number.isFinite(heading)) return;
    const cur = rotation.value;
    const delta = ((heading - cur + 540) % 360) - 180;
    rotation.value = withTiming(cur + delta, { duration: ROT_DURATION, easing: Easing.out(Easing.quad) });
  }, [heading, rotation]);

  // Scale: assigned is larger; moving gives a subtle lift.
  useEffect(() => {
    const base = state === 'assigned' ? 1.18 : 1;
    scale.value = withTiming(moving ? base * 1.06 : base, { duration: 300 });
  }, [state, moving, scale]);

  // Assigned: soft pulsing glow ring.
  useEffect(() => {
    if (state === 'assigned') {
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.35, { duration: 900 })), -1, true);
    } else {
      glow.value = withTiming(0, { duration: 250 });
    }
  }, [state, glow]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    opacity: state === 'poor_gps' ? 0.5 : 1,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.5, transform: [{ scale: 0.9 + glow.value * 0.25 }] }));

  if (!MapboxGL?.MarkerView) return null;

  return (
    <MapboxGL.MarkerView coordinate={coord} anchor={{ x: 0.5, y: 0.5 }} allowOverlap allowOverlapWithPuck>
      <View style={[styles.wrap, { width: size + 18, height: size + 18 }]} pointerEvents="none">
        {state === 'assigned' && (
          <Animated.View style={[styles.glow, { width: size, height: size, borderRadius: size / 2 }, glowStyle]} />
        )}
        <Animated.View style={artStyle}>
          <Art size={size} palette={palette} />
        </Animated.View>
      </View>
    </MapboxGL.MarkerView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(22, 163, 74, 0.45)',
    shadowColor: '#16A34A',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default VehicleMarker;
