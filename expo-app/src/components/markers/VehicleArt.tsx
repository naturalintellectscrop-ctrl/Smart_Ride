// ============================================
// SMART RIDE — PREMIUM VEHICLE MARKER ART
// ============================================
// Custom vector illustrations (react-native-svg) in one consistent top-down
// "driving north" style so a single heading rotation makes any vehicle point
// along its direction of travel (Uber/Bolt style). The vehicle itself is the
// marker — no pins, no circles, no icon fonts, no emojis.
//
// Every illustration is palette-driven so marker STATE can restyle it without
// duplicate art: full colour (available), grayscale (offline), etc. The .svg
// source files in assets/markers mirror these shapes for reuse elsewhere.
// ============================================

import React from 'react';
import Svg, { Path, Rect, Circle, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface VehiclePalette {
  body: string;
  bodyDark: string;
  accent: string;
  glass: string;
  wheel: string;
}

export type VehicleArtKind = 'boda' | 'car' | 'delivery' | 'parcel';

// Brand-consistent default palettes (Smart Ride green / neutral car / parcel amber)
export const VEHICLE_PALETTES: Record<VehicleArtKind, VehiclePalette> = {
  boda: { body: '#16A34A', bodyDark: '#0F7A37', accent: '#8B5CF6', glass: '#D1FADF', wheel: '#1F2937' },
  car: { body: '#F8FAFC', bodyDark: '#CBD5E1', accent: '#16A34A', glass: '#7CC6FE', wheel: '#1F2937' },
  delivery: { body: '#16A34A', bodyDark: '#0F7A37', accent: '#F59E0B', glass: '#D1FADF', wheel: '#1F2937' },
  parcel: { body: '#F59E0B', bodyDark: '#B45309', accent: '#FFFFFF', glass: '#7CC6FE', wheel: '#1F2937' },
};

// Desaturated palette for the OFFLINE state (grayscale, still readable).
export const GRAYSCALE_PALETTE: VehiclePalette = {
  body: '#9CA3AF', bodyDark: '#6B7280', accent: '#6B7280', glass: '#D1D5DB', wheel: '#374151',
};

interface ArtProps {
  size?: number;
  palette: VehiclePalette;
  /** Soft contact shadow beneath the vehicle. */
  shadow?: boolean;
}

const SHADOW = 'rgba(15, 23, 42, 0.28)';

function ContactShadow() {
  return <Ellipse cx={32} cy={55} rx={15} ry={4.5} fill={SHADOW} />;
}

// ── Smart Boda — top-down motorcycle with rider ──
export function BodaArt({ size = 44, palette, shadow = true }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="bodaBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.body} />
          <Stop offset="1" stopColor={palette.bodyDark} />
        </LinearGradient>
      </Defs>
      {shadow && <ContactShadow />}
      {/* wheels */}
      <Rect x={27} y={8} width={10} height={12} rx={5} fill={palette.wheel} />
      <Rect x={27} y={42} width={10} height={14} rx={5} fill={palette.wheel} />
      {/* frame / tank / seat */}
      <Path d="M32 12 C24 16 23 24 24 34 C24.5 42 27 48 32 50 C37 48 39.5 42 40 34 C41 24 40 16 32 12 Z" fill="url(#bodaBody)" />
      {/* handlebars */}
      <Rect x={17} y={18} width={30} height={5} rx={2.5} fill={palette.bodyDark} />
      <Circle cx={17.5} cy={20.5} r={2.6} fill={palette.wheel} />
      <Circle cx={46.5} cy={20.5} r={2.6} fill={palette.wheel} />
      {/* rider helmet + visor */}
      <Circle cx={32} cy={31} r={8} fill={palette.bodyDark} />
      <Circle cx={32} cy={31} r={5.6} fill={palette.body} />
      <Path d="M27 29 A6 6 0 0 1 37 29 Z" fill={palette.glass} />
      {/* headlight */}
      <Circle cx={32} cy={13.5} r={2.4} fill="#FFF7CC" />
    </Svg>
  );
}

// ── Smart Car — top-down sedan ──
export function CarArt({ size = 46, palette, shadow = true }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="carBody" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.bodyDark} />
          <Stop offset="0.5" stopColor={palette.body} />
          <Stop offset="1" stopColor={palette.bodyDark} />
        </LinearGradient>
      </Defs>
      {shadow && <ContactShadow />}
      {/* wheels */}
      <Rect x={13} y={16} width={5} height={11} rx={2.5} fill={palette.wheel} />
      <Rect x={46} y={16} width={5} height={11} rx={2.5} fill={palette.wheel} />
      <Rect x={13} y={38} width={5} height={11} rx={2.5} fill={palette.wheel} />
      <Rect x={46} y={38} width={5} height={11} rx={2.5} fill={palette.wheel} />
      {/* body */}
      <Rect x={17} y={7} width={30} height={50} rx={11} fill="url(#carBody)" stroke={palette.bodyDark} strokeWidth={0.6} />
      {/* windshield (front) + rear window */}
      <Path d="M21 20 C25 15 39 15 43 20 L41 25 C38 22 26 22 23 25 Z" fill={palette.glass} />
      <Path d="M22 44 C26 47 38 47 42 44 L40 40 C37 42 27 42 24 40 Z" fill={palette.glass} />
      {/* roof panel */}
      <Rect x={24} y={27} width={16} height={11} rx={3} fill={palette.body} opacity={0.9} />
      {/* side mirrors */}
      <Rect x={15} y={22} width={3} height={4} rx={1.5} fill={palette.bodyDark} />
      <Rect x={46} y={22} width={3} height={4} rx={1.5} fill={palette.bodyDark} />
      {/* accent hood stripe */}
      <Rect x={30} y={9} width={4} height={5} rx={2} fill={palette.accent} />
    </Svg>
  );
}

// ── Delivery Rider — boda with a cargo box on the rear ──
export function DeliveryBikeArt({ size = 44, palette, shadow = true }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="delBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.body} />
          <Stop offset="1" stopColor={palette.bodyDark} />
        </LinearGradient>
      </Defs>
      {shadow && <ContactShadow />}
      <Rect x={27} y={8} width={10} height={12} rx={5} fill={palette.wheel} />
      <Rect x={27} y={44} width={10} height={14} rx={5} fill={palette.wheel} />
      <Path d="M32 12 C24 16 23 24 24 33 C24.5 40 27 45 32 47 C37 45 39.5 40 40 33 C41 24 40 16 32 12 Z" fill="url(#delBody)" />
      <Rect x={17} y={18} width={30} height={5} rx={2.5} fill={palette.bodyDark} />
      <Circle cx={32} cy={30} r={7.5} fill={palette.bodyDark} />
      <Circle cx={32} cy={30} r={5.2} fill={palette.body} />
      <Path d="M27.2 28.2 A5.6 5.6 0 0 1 36.8 28.2 Z" fill={palette.glass} />
      {/* cargo box on the rear */}
      <Rect x={23} y={45} width={18} height={15} rx={3} fill={palette.accent} stroke="#FFFFFF" strokeWidth={1.4} />
      <Rect x={30.5} y={45} width={3} height={15} fill="#FFFFFF" opacity={0.85} />
      <Rect x={23} y={51.5} width={18} height={2.4} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={32} cy={13.5} r={2.4} fill="#FFF7CC" />
    </Svg>
  );
}

// ── Parcel Vehicle — top-down delivery van ──
export function ParcelVanArt({ size = 48, palette, shadow = true }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="vanBody" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={palette.bodyDark} />
          <Stop offset="0.5" stopColor={palette.body} />
          <Stop offset="1" stopColor={palette.bodyDark} />
        </LinearGradient>
      </Defs>
      {shadow && <ContactShadow />}
      <Rect x={12} y={16} width={5} height={12} rx={2.5} fill={palette.wheel} />
      <Rect x={47} y={16} width={5} height={12} rx={2.5} fill={palette.wheel} />
      <Rect x={12} y={38} width={5} height={12} rx={2.5} fill={palette.wheel} />
      <Rect x={47} y={38} width={5} height={12} rx={2.5} fill={palette.wheel} />
      {/* body (longer than a car) */}
      <Rect x={15} y={6} width={34} height={52} rx={8} fill="url(#vanBody)" stroke={palette.bodyDark} strokeWidth={0.6} />
      {/* cab windshield at the front */}
      <Path d="M19 17 C24 12 40 12 45 17 L43 22 C39 19 25 19 21 22 Z" fill={palette.glass} />
      {/* cargo roof panel + seams */}
      <Rect x={19} y={26} width={26} height={28} rx={3} fill={palette.accent} opacity={0.9} />
      <Rect x={19} y={35} width={26} height={2} fill={palette.bodyDark} opacity={0.4} />
      <Rect x={19} y={44} width={26} height={2} fill={palette.bodyDark} opacity={0.4} />
      {/* side mirrors */}
      <Rect x={13} y={19} width={3} height={4} rx={1.5} fill={palette.bodyDark} />
      <Rect x={48} y={19} width={3} height={4} rx={1.5} fill={palette.bodyDark} />
    </Svg>
  );
}

export const VEHICLE_ART: Record<VehicleArtKind, React.ComponentType<ArtProps>> = {
  boda: BodaArt,
  car: CarArt,
  delivery: DeliveryBikeArt,
  parcel: ParcelVanArt,
};
