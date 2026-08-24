// ============================================
// SMART RIDE MOBILE - THEMED COLORS
// ============================================
// Returns the Stitch MD3 color set keyed exactly like the static COLORS object,
// but resolved for the current mode. This lets a screen keep ALL its existing
// `COLORS.x` references and simply source them from the theme:
//
//   const { isDark } = useTheme();
//   const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
//   const styles = useMemo(() => createStyles(COLORS), [COLORS]);
//
// LIGHT mode returns the exact same values as the static COLORS (no regression).
// DARK mode overrides the surface/text/primary tokens with proper MD3 dark
// values. "Fixed" tokens (primaryFixed, *FixedVariant, etc.) are identical in
// both modes per MD3 and are left as-is.
// ============================================

import { COLORS } from '../constants';

// Dark-mode overrides for the tokens that must change. Derived aliases (text,
// border, backgroundElevated, …) are set explicitly because COLORS resolves its
// getters at spread time.
const DARK: Record<string, string> = {
  // Surfaces & background
  background: '#191c1d',
  onBackground: '#e2e3e1',
  surface: '#191c1d',
  onSurface: '#e2e3e1',
  onSurfaceVariant: '#bfc9bf',
  surfaceDim: '#111413',
  surfaceBright: '#363a39',
  surfaceVariant: '#3f4941',
  surfaceContainerLowest: '#0e1110',
  surfaceContainerLow: '#1a1c1d',
  surfaceContainer: '#1e2120',
  surfaceContainerHigh: '#282b2a',
  surfaceContainerHighest: '#333634',
  inverseSurface: '#e2e3e1',
  inverseOnSurface: '#2e3132',

  // Outline
  outline: '#899389',
  outlineVariant: '#3f4941',

  // Primary (brightened for dark)
  primary: '#7cd9a4',
  onPrimary: '#00391f',
  primaryContainer: '#005231',
  onPrimaryContainer: '#98f6be',

  // Secondary
  secondary: '#4ae176',
  onSecondary: '#003914',
  secondaryContainer: '#005321',
  onSecondaryContainer: '#6bff8f',

  // Tertiary
  tertiary: '#c0c6db',
  onTertiaryContainer: '#e6ebff',

  // Error
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // Status
  success: '#4ae176',
  warning: '#f9cd8e',
  info: '#7cd9a4',

  // Derived aliases used across screens (getters in COLORS → set explicitly)
  text: '#e2e3e1',
  textSecondary: 'rgba(226, 227, 225, 0.7)',
  textMuted: '#899389',
  textDim: 'rgba(226, 227, 225, 0.4)',
  textDisabled: 'rgba(226, 227, 225, 0.38)',
  border: '#3f4941',
  borderLight: 'rgba(226, 227, 225, 0.12)',
  borderStrong: '#899389',
  backgroundElevated: '#242827',
  backgroundSurface: '#1e2120',
  backgroundSecondary: '#1e2120',
  onSurfaceMuted: '#899389',
  onSurfaceSecondary: '#bfc9bf',
  accent: '#7cd9a4',
};

/**
 * Derived surface tokens shared by the auth flow and the client tabs. They are
 * computed from the active palette rather than declared as literals so they
 * follow the theme.
 *
 * The `auth*` names came first and are kept as aliases so the auth screens keep
 * reading the way they were written; the generic names are what new client
 * surfaces should use.
 */
export interface SurfaceColors {
  /** Brand-tinted fill: icon tiles, gutters, selected states. */
  tintSurface: string;
  /** Card / field fill that sits on the page background. */
  cardSurface: string;
  /** Soft hairline for dividers inside a card. */
  hairlineSoft: string;

  /** Alias of tintSurface — the icon column on the left of a field card. */
  authGutter: string;
  /** Alias of hairlineSoft. */
  authHairline: string;
  /** Alias of cardSurface. */
  authCard: string;
  /** Backing panel for the hero illustration. Deliberately light in BOTH modes:
   *  the artwork is drawn for a light ground, so the plate travels with it. */
  authPlate: string;
  /** Soft circle behind the hero art, sitting on authPlate. */
  authPlateGlow: string;
}

/** @deprecated Use SurfaceColors. Kept so existing imports keep resolving. */
export type AuthColors = SurfaceColors;

export type ThemedColors = typeof COLORS & SurfaceColors;

function surfaceColors(base: typeof COLORS, isDark: boolean): SurfaceColors {
  const tintSurface = withAlpha(base.primary, isDark ? 0.14 : 0.06);
  const cardSurface = base.surfaceContainerLowest;
  const hairlineSoft = base.borderLight;
  return {
    tintSurface,
    cardSurface,
    hairlineSoft,
    authGutter: tintSurface,
    authHairline: hairlineSoft,
    authCard: cardSurface,
    // Fixed light mint in both modes — see the interface note above.
    authPlate: '#eef6f1',
    authPlateGlow: withAlpha(COLORS.primary, 0.1),
  };
}

/**
 * Resolve the full Stitch color set for the given mode.
 * Light = identical to the static COLORS. Dark = COLORS with dark overrides.
 */
export function makeThemedColors(isDark: boolean): ThemedColors {
  if (!isDark) return { ...COLORS, ...surfaceColors(COLORS, false) } as ThemedColors;
  // Spread resolves COLORS getters to light values, then DARK overrides the
  // tokens (including the derived aliases) with their dark equivalents.
  const dark = { ...COLORS, ...DARK } as typeof COLORS;
  return { ...dark, ...surfaceColors(dark, true) } as ThemedColors;
}

/**
 * Blend a token colour with an opacity, for tint backgrounds and hairline
 * borders. Screens used to hardcode `rgba(0, 95, 58, 0.08)` for these, which
 * pinned the tint to the *light* primary — in dark mode those surfaces kept a
 * light-theme wash. Deriving from the active token keeps them in step.
 *
 * Accepts `#rgb`, `#rrggbb` and `#rrggbbaa` (the trailing alpha is replaced).
 */
export function withAlpha(color: string, opacity: number): string {
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return color; // already rgba()/named — leave it alone
  const n = parseInt(hex, 16);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
