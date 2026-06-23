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

export type ThemedColors = typeof COLORS;

/**
 * Resolve the full Stitch color set for the given mode.
 * Light = identical to the static COLORS. Dark = COLORS with dark overrides.
 */
export function makeThemedColors(isDark: boolean): ThemedColors {
  if (!isDark) return COLORS;
  // Spread resolves COLORS getters to light values, then DARK overrides the
  // tokens (including the derived aliases) with their dark equivalents.
  return { ...COLORS, ...DARK } as ThemedColors;
}
