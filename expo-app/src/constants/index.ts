// SMART RIDE MOBILE - CONSTANTS

export const COLORS = {
  // Primary
  primary: '#005f3a',
  onPrimary: '#ffffff',
  primaryContainer: '#0e7a4d',
  onPrimaryContainer: '#a6ffc9',
  inversePrimary: '#7cd9a4',

  // Secondary
  secondary: '#006e2f',
  onSecondary: '#ffffff',
  secondaryContainer: '#6bff8f',
  onSecondaryContainer: '#007432',

  // Secondary Fixed
  secondaryFixed: '#6bff8f',
  secondaryFixedDim: '#4ae176',
  onSecondaryFixed: '#002109',
  onSecondaryFixedVariant: '#005321',

  // Primary Fixed
  primaryFixed: '#98f6be',
  primaryFixedDim: '#7cd9a4',
  onPrimaryFixed: '#002111',
  onPrimaryFixedVariant: '#005231',

  // Tertiary
  tertiary: '#4b5264',
  onTertiary: '#ffffff',
  tertiaryContainer: '#636a7c',
  onTertiaryContainer: '#e6ebff',
  tertiaryFixed: '#dce2f7',
  tertiaryFixedDim: '#c0c6db',
  onTertiaryFixed: '#141b2b',
  onTertiaryFixedVariant: '#404758',

  // Surface & Background
  background: '#f8f9fa',
  onBackground: '#191c1d',
  surface: '#f8f9fa',
  onSurface: '#191c1d',
  onSurfaceVariant: '#3f4941',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceVariant: '#e1e3e4',
  surfaceTint: '#014f31',

  // Surface Containers
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',

  // Inverse
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',

  // Outline
  outline: '#6f7a71',
  outlineVariant: '#bec9bf',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Brand-specific (Uganda)
  mtnYellow: '#FFCC00',
  airtelRed: '#FF0000',

  // Service-specific colors
  serviceBoda: '#005f3a',
  serviceCar: '#0e7a4d',
  serviceFood: '#006e2f',
  serviceShop: '#4b5264',
  serviceDelivery: '#4b5264',
  serviceHealth: '#ba1a1a',

  // Google Sign-In brand colors
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',

  // Legacy compatibility (map old keys to new values)
  get primaryDark() { return this.primaryContainer; },
  get primaryLight() { return this.primaryFixed; },
  get secondaryDark() { return this.secondary; },
  get secondaryLight() { return this.onSecondaryContainer; },
  get text() { return this.onSurface; },
  get textSecondary() { return this.onSurfaceVariant; },
  get textMuted() { return this.outline; },
  get textDim() { return this.outlineVariant; },
  get textDisabled() { return this.outlineVariant; },
  get border() { return this.outlineVariant; },
  get borderLight() { return 'rgba(190, 201, 191, 0.5)'; },
  get borderStrong() { return this.outline; },
  get backgroundElevated() { return this.surfaceContainerLowest; },
  get backgroundSurface() { return this.surfaceContainerLow; },
  get backgroundSecondary() { return this.surfaceContainer; },
  get success() { return this.secondary; },
  get warning() { return '#F59E0B'; },
  get info() { return this.tertiary; },
  get accent() { return this.secondaryFixed; },

  // Aliases used by some screens (e.g. location-picker.tsx) that were
  // previously missing and returned undefined, causing invisible text.
  // Map them to the closest Stitch Design System equivalents.
  get onSurfaceMuted() { return this.outline; },
  get onSurfaceSecondary() { return this.onSurfaceVariant; },
  get onSurfaceDim() { return this.outlineVariant; },
};

// ============================================
// TYPOGRAPHY (Stitch Design System)
// ============================================
export const TYPOGRAPHY = {
  displayLg: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.02 * 16 },
  // Auth headers (reset-password, change-password, role-selection) reference
  // displaySm; it was missing from the scale, so those styles resolved to
  // undefined. 28 matches the hardcoded value those screens were using.
  displaySm: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.02 * 14 },
  headlineLg: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headlineLgMobile: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  headlineMd: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLg: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.02 * 14 },
  labelMd: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
};

// ============================================
// SPACING (Stitch Design System)
// ============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  gutter: 12,
  md: 16,
  containerMargin: 16,
  lg: 24,
  xl: 32,
  xxl: 40, // editorial rhythm (welcome, trip complete, receipt)
  xxxl: 48,
};

// ============================================
// BORDER RADIUS (Stitch Design System)
// ============================================
export const RADIUS = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ============================================
// SHADOWS (Stitch Design System)
// ============================================
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  active: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  button: {
    shadowColor: '#005f3a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

// ============================================
// Gradients (Stitch Design System)
// ============================================
export const GRADIENTS = {
  primary: ['#005f3a', '#0e7a4d'],
  danger: ['#ba1a1a', '#93000a'],
  accent: ['#0e7a4d', '#005f3a'],
};

// Glass styles (for potential future dark mode)
export const GLASS = {
  background: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(190, 201, 191, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  elevated: 'rgba(255, 255, 255, 0.9)',
  light: {
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(0, 95, 58, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.08)',
    elevated: 'rgba(255, 255, 255, 0.9)',
  },
};

// ============================================
// MOTION — Smart Ride Design Language
// ============================================
// One shared motion vocabulary so every animation across the app reads as
// the same product: short, meaningful, elegant. Import these instead of
// hand-picking durations/springs per screen.
//
//   Reanimated:  withTiming(1, { duration: MOTION.duration.base, easing: MOTION.easing.standard })
//                withSpring(1, MOTION.spring.press)
//   Layout:      LayoutAnimation.configureNext(MOTION.layout.easeInOut)
//
// Timing scale (ms). Interactions stay ≤ ~250ms so the UI feels instant;
// larger surfaces (sheets, screens) get a touch more room to breathe.
export const MOTION = {
  duration: {
    instant: 90,   // toggles, chips, press feedback
    fast: 150,     // small state changes, fades
    base: 220,     // default: buttons, cards, list items
    slow: 320,     // bottom sheets, expansions
    slower: 480,   // full-screen / hero entrances
  },
  // Reanimated Easing bezier tuples — kept as raw control points so this file
  // stays dependency-free. Wrap with Easing.bezier(...MOTION.easing.standard).
  easing: {
    standard: [0.2, 0, 0, 1] as const,     // enter + move (Material "standard")
    decelerate: [0, 0, 0, 1] as const,     // elements entering the screen
    accelerate: [0.3, 0, 1, 1] as const,   // elements leaving the screen
    emphasized: [0.2, 0, 0, 1] as const,   // expressive, still calm
  },
  // Reanimated withSpring configs.
  spring: {
    press: { damping: 18, stiffness: 260, mass: 0.6 },   // button / card press
    gentle: { damping: 20, stiffness: 160, mass: 0.9 },  // sheets settling
    bouncy: { damping: 12, stiffness: 180, mass: 0.8 },  // playful accents (use sparingly)
  },
  // Press-feedback scale for tappable surfaces (buttons, cards, tiles).
  pressScale: 0.97,
} as const;

// ============================================
// OPACITY / BORDER / ICON / AVATAR scales (design-system tokens)
// ============================================
// Promote the informal values the components were hardcoding into tokens so
// screens and primitives stop inventing them (DS spec §1.8/§1.6/§1.11/§1.12).
export const OPACITY = {
  disabled: 0.5,
  pressed: 0.85, // TouchableOpacity activeOpacity
  scrimLight: 0.28,
  scrim: 0.45,
  scrimHeavy: 0.6,
} as const;

export const BORDER = {
  hairline: 1,
  emphasis: 1.5, // outline buttons / focus / selection
} as const;

export const ICON = {
  xs: 14,
  sm: 16,
  md: 20, // default
  lg: 24,
  xl: 28,
  hero: 40,
} as const;

export const AVATAR = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const;

// Services config
// `color`/`colorDim`/`colorBorder` are the light-mode values; `colorDark` is
// the icon color used on dark surfaces (brightened per the MD3 dark palette).
export const SERVICES: Record<string, { icon: string; color: string; colorDim: string; colorBorder: string; colorDark: string }> = {
  BODA: { icon: 'bicycle', color: '#005f3a', colorDim: '#98f6be', colorBorder: 'rgba(0, 95, 58, 0.15)', colorDark: '#7cd9a4' },
  // colorDim was previously '#0e7a4d' (identical to color) which made the car
  // icon invisible on its own tile — use the pale primaryFixed tint instead.
  CAR: { icon: 'car', color: '#0e7a4d', colorDim: '#98f6be', colorBorder: 'rgba(14, 122, 77, 0.15)', colorDark: '#7cd9a4' },
  FOOD: { icon: 'restaurant', color: '#006e2f', colorDim: '#6bff8f', colorBorder: 'rgba(107, 255, 143, 0.15)', colorDark: '#4ae176' },
  DELIVERY: { icon: 'cube', color: '#4b5264', colorDim: '#dce2f7', colorBorder: 'rgba(220, 226, 247, 0.15)', colorDark: '#c0c6db' },
  SHOPPING: { icon: 'bag', color: '#4b5264', colorDim: '#dce2f7', colorBorder: 'rgba(220, 226, 247, 0.15)', colorDark: '#c0c6db' },
  HEALTH: { icon: 'medkit', color: '#ba1a1a', colorDim: '#ffdad6', colorBorder: 'rgba(186, 26, 26, 0.15)', colorDark: '#ffb4ab' },
};

// Mapbox Configuration
// ---------------------------------------------------------------------------
// The Mapbox public access token (pk.*) is read from EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
// (set in expo-app/.env at build time). If not set, the app fetches it at
// runtime from the backend /api/config/mapbox-token endpoint (see
// src/services/api.ts → fetchMapboxToken). This dual approach means the map
// works as long as EITHER the .env file OR the Vercel env var is configured.
//
// To configure locally: copy the token from your Mapbox account dashboard
// (https://account.mapbox.com/access-tokens/) into expo-app/.env:
//   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=<your pk.* public token>
// ---------------------------------------------------------------------------
function resolveMapboxToken(): string {
  const envToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  if (!envToken) return '';

  const trimmed = envToken.trim();

  // Reject obvious placeholders from .env.example so we don't render a black
  // map with a bogus token.
  if (trimmed.includes('your-token-here') || trimmed.includes('xxxx')) {
    return '';
  }

  // IMPORTANT: Mapbox tokens are NOT standard JWTs.
  //
  // Format:  pk.<base64url-header>.<base64url-signature>
  //
  //   - Header always starts with "eyJ" (base64 of '{"') and decodes to JSON
  //     containing at least a "u" (username) field.
  //   - Signature is ~16 bytes → ~22 base64url chars.
  //     This is SHORTER than a standard JWT HS256 signature (~43 chars).
  //
  // DO NOT reject tokens based on signature length >= 40 — that incorrectly
  // rejects valid Mapbox public tokens (whose signatures are ~22 chars) and
  // forces the map into its "Map unavailable" fallback. This was the root
  // cause of the blank-map bug.
  const mapboxTokenRegex = /^(pk|sk)\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}$/;
  if (mapboxTokenRegex.test(trimmed)) {
    return trimmed;
  }

  console.warn(
    '[constants] EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN does not match the Mapbox ' +
    'token format (pk.eyJ...<sig>). Map will fall back to runtime token ' +
    'fetch from backend /api/config/mapbox-token.'
  );
  return ''; // empty → runtime fetch will populate it
}

export const MAPBOX_CONFIG = {
  accessToken: resolveMapboxToken(),
  style: {
    dark: 'mapbox://styles/mapbox/dark-v11',
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
};

// Kampala Default Location
export const DEFAULT_LOCATION = {
  latitude: 0.3476,
  longitude: 32.5825,
  address: 'Kampala, Uganda',
};

// Popular Kampala Places
export const KAMPALA_POPULAR_PLACES = [
  { id: 'kla-acacia-mall', name: 'Acacia Mall', icon: 'shopping-bag', latitude: 0.3328, longitude: 32.5883, address: 'Kololo, Kampala' },
  { id: 'kla-garden-city', name: 'Garden City', icon: 'storefront', latitude: 0.3175, longitude: 32.5900, address: 'Yusuf Lule Road, Kampala' },
  { id: 'kla-cafe-javas', name: 'Cafe Javas', icon: 'restaurant', latitude: 0.3180, longitude: 32.5815, address: 'Kampala Road' },
  { id: 'kla-metroplex', name: 'Metroplex Mall', icon: 'shopping-bag', latitude: 0.3710, longitude: 32.6440, address: 'Naalya, Kampala' },
  { id: 'kla-parliament', name: 'Parliament', icon: 'business', latitude: 0.3176, longitude: 32.5825, address: 'Parliament Avenue' },
  { id: 'kla-makerere', name: 'Makerere University', icon: 'school', latitude: 0.3350, longitude: 32.5700, address: 'Makerere Hill' },
  { id: 'kla-entebbe-airport', name: 'Entebbe Airport', icon: 'airplane', latitude: 0.0480, longitude: 32.4430, address: 'Entebbe' },
  { id: 'kla-serena-hotel', name: 'Serena Hotel', icon: 'bed', latitude: 0.3190, longitude: 32.5820, address: 'Kintu Road' },
  { id: 'kla-ntinda', name: 'Ntinda', icon: 'location', latitude: 0.3544, longitude: 32.6136, address: 'Ntinda, Kampala' },
  { id: 'kla-kololo', name: 'Kololo', icon: 'location', latitude: 0.3290, longitude: 32.5880, address: 'Kololo, Kampala' },
  { id: 'kla-bugolobi', name: 'Bugolobi', icon: 'location', latitude: 0.3139, longitude: 32.6220, address: 'Bugolobi, Kampala' },
  { id: 'kla-mulago-hospital', name: 'Mulago Hospital', icon: 'medkit', latitude: 0.3420, longitude: 32.5730, address: 'Mulago Hill' },
  { id: 'kla-village-mall', name: 'Village Mall', icon: 'storefront', latitude: 0.3110, longitude: 32.6200, address: 'Bugolobi' },
  { id: 'kla-freedom-city', name: 'Freedom City', icon: 'shopping-bag', latitude: 0.2970, longitude: 32.5690, address: 'Entebbe Road' },
  { id: 'kla-lugogo', name: 'Lugogo', icon: 'location', latitude: 0.3275, longitude: 32.6000, address: 'Lugogo, Kampala' },
  { id: 'kla-kampala-road', name: 'Kampala Road', icon: 'navigate', latitude: 0.3175, longitude: 32.5810, address: 'Kampala CBD' },
];

// Task Status Colors
export const TASK_STATUS_COLORS: Record<string, string> = {
  CREATED: '#4b5264',
  MATCHING: '#636a7c',
  SEARCHING: '#636a7c',
  ASSIGNED: '#F59E0B',
  ACCEPTED: '#006e2f',
  ARRIVING: '#006e2f',
  ARRIVED: '#005f3a',
  PICKED_UP: '#0e7a4d',
  IN_PROGRESS: '#0e7a4d',
  IN_TRANSIT: '#0e7a4d',
  DELIVERED: '#006e2f',
  COMPLETED: '#005f3a',
  CANCELLED: '#ba1a1a',
  FAILED: '#93000a',
};

// Task Status Labels
export const TASK_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Searching for driver...',
  MATCHING: 'Finding nearby drivers...',
  SEARCHING: 'Searching for riders...',
  ASSIGNED: 'Driver assigned',
  ACCEPTED: 'Driver on the way',
  ARRIVING: 'Driver on the way',
  ARRIVED: 'Driver arrived',
  PICKED_UP: 'Trip started',
  // Rides use IN_PROGRESS as the moving state (deliveries use IN_TRANSIT).
  // Both must be mapped or the raw enum leaks into the UI header.
  IN_PROGRESS: 'Moving',
  IN_TRANSIT: 'Moving',
  DELIVERED: 'Delivered',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

// Order Status Colors (food/shopping/delivery orders)
export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#006e2f',
  PREPARING: '#0e7a4d',
  READY: '#005f3a',
  PICKED_UP: '#0e7a4d',
  DELIVERED: '#006e2f',
  COMPLETED: '#005f3a',
  CANCELLED: '#ba1a1a',
  FAILED: '#93000a',
  NEW: '#F59E0B',
};

// Order Status Labels (food/shopping/delivery orders)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Yay your item has been Delivered',
  COMPLETED: 'Successfully Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed, Try Again',
  NEW: 'New order',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'CASH', name: 'Cash', icon: 'banknote', color: '#005f3a' },
  { id: 'MTN_MOMO', name: 'MTN MoMo', icon: 'phone', color: '#FFCC00' },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', icon: 'phone', color: '#FF0000' },
  { id: 'VISA', name: 'VISA', icon: 'card', color: '#1A1F71' },
];

// Ride Types
export const RIDE_TYPES = {
  BODA: {
    id: 'BODA',
    name: 'Smart Boda',
    description: 'Motorcycle ride',
    baseFare: 2000,
    perKm: 800,
    capacity: 1,
  },
  CAR: {
    id: 'CAR',
    name: 'Smart Car',
    description: 'Car ride',
    baseFare: 5000,
    perKm: 1500,
    capacity: 4,
  },
};

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api',
  timeout: 30000,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  socketUrl: '',
  realtimePort: 3001,
};

// Payment method mapping
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  'CASH': 'CASH',
  'MTN_MOMO': 'MTN_MOMO',
  'AIRTEL_MONEY': 'AIRTEL_MONEY',
  'VISA': 'VISA',
  'MASTERCARD': 'MASTERCARD',
  'WALLET': 'WALLET',
};

export const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  'CASH': 'CASH',
  'MTN_MOMO': 'MTN_MOMO',
  'AIRTEL_MONEY': 'AIRTEL_MONEY',
  'VISA': 'VISA',
  'MASTERCARD': 'MASTERCARD',
  'WALLET': 'WALLET',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  RIDE_UPDATE: 'RIDE_UPDATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  PAYMENT: 'PAYMENT',
  PROMO: 'PROMO',
  SOS: 'SOS',
  CHAT: 'CHAT',
  SYSTEM: 'SYSTEM',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  authToken: 'smart_ride_auth_token',
  refreshToken: 'smart_ride_refresh_token',
  user: 'smart_ride_user',
  location: 'smart_ride_last_location',
  theme: 'smart_ride_theme',
};
