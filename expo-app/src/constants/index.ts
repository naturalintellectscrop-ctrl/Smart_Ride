// ============================================
// SMART RIDE MOBILE - CONSTANTS
// ============================================
// Minimal constants for boot - no external dependencies
// ============================================

// ============================================
// NOTE: COLORS is the DARK palette kept for backward compatibility.
// New code should use `useTheme().colors` from @/src/context/theme-context
// which automatically switches between LightColors and DarkColors.
// ============================================

// Brand Colors (Dark palette — legacy, still the default export)
export const COLORS = {
  // Primary - Neon Green (Main brand color)
  primary: '#00FF88',
  primaryLight: '#10B981',
  primaryDark: '#059669',

  // Secondary - Electric Blue
  secondary: '#3B82F6',
  secondaryLight: '#60A5FA',
  secondaryDark: '#1D4ED8',

  // Background - Dark Theme
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundSurface: '#252530',
  backgroundSecondary: '#1A1A24',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',

  // Status Colors
  success: '#00FF88',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Text dim (for icons, placeholders)
  textDim: 'rgba(255, 255, 255, 0.3)',

  // Service brand colors (matches SERVICES config)
  serviceBoda: '#00FF88',
  serviceCar: '#00D4FF',
  serviceFood: '#F59E0B',
  serviceDelivery: '#14B8A6',
  serviceShop: '#8B5CF6',
  serviceHealth: '#F43F5E',

  // Legacy compatibility
  accent: '#F59E0B',
};

// Gradients
export const GRADIENTS = {
  primary: ['#00FF88', '#00D4FF'],
  danger: ['#EF4444', '#DC2626'],
  accent: ['#00D4FF', '#00FF88'],
  // Light mode variants
  light: {
    primary: ['#005f3a', '#0e7a4d'],
    danger: ['#EF4444', '#DC2626'],
    accent: ['#0e7a4d', '#005f3a'],
  },
};

// Glass styles
export const GLASS = {
  background: 'rgba(19, 19, 26, 0.7)',
  border: 'rgba(255, 255, 255, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  elevated: 'rgba(30, 30, 40, 0.8)',
  // Light mode variants
  light: {
    background: 'rgba(255, 255, 255, 0.8)',
    border: 'rgba(0, 95, 58, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.08)',
    elevated: 'rgba(255, 255, 255, 0.9)',
  },
};

// Services config for ServiceIcon component
export const SERVICES: Record<string, { icon: string; color: string; colorDim: string; colorBorder: string }> = {
  BODA: { icon: 'bicycle', color: '#00FF88', colorDim: 'rgba(0, 255, 136, 0.08)', colorBorder: 'rgba(0, 255, 136, 0.15)' },
  CAR: { icon: 'car', color: '#00D4FF', colorDim: 'rgba(0, 212, 255, 0.08)', colorBorder: 'rgba(0, 212, 255, 0.15)' },
  FOOD: { icon: 'restaurant', color: '#F59E0B', colorDim: 'rgba(245, 158, 11, 0.08)', colorBorder: 'rgba(245, 158, 11, 0.15)' },
  DELIVERY: { icon: 'cube', color: '#14B8A6', colorDim: 'rgba(20, 184, 166, 0.08)', colorBorder: 'rgba(20, 184, 166, 0.15)' },
  SHOPPING: { icon: 'bag', color: '#8B5CF6', colorDim: 'rgba(139, 92, 246, 0.08)', colorBorder: 'rgba(139, 92, 246, 0.15)' },
  HEALTH: { icon: 'medkit', color: '#F43F5E', colorDim: 'rgba(244, 63, 94, 0.08)', colorBorder: 'rgba(244, 63, 94, 0.15)' },
};

// Mapbox Configuration (reserved for future Mapbox GL upgrade)
// To enable: install @rnmapbox/maps, set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
export const MAPBOX_CONFIG = {
  accessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
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

// Popular Kampala Places (matches backend /api/mapbox/kampala-places data)
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

// NOTE: RNMAPBOX_MAPS_DOWNLOAD_TOKEN must be set as an EAS environment variable
// for EAS builds to download the Mapbox SDK. Set it via:
//   eas secret:push --scope project --type environment --key RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value <your-token>
// Do NOT put the secret token directly in app.json or source code.

// Task Status Colors
export const TASK_STATUS_COLORS: Record<string, string> = {
  CREATED: '#3B82F6',
  MATCHING: '#8B5CF6',
  SEARCHING: '#A78BFA',
  ASSIGNED: '#F59E0B',
  ACCEPTED: '#22C55E',
  ARRIVED: '#10B981',
  PICKED_UP: '#14B8A6',
  IN_TRANSIT: '#06B6D4',
  DELIVERED: '#22C55E',
  COMPLETED: '#16A34A',
  CANCELLED: '#EF4444',
  FAILED: '#DC2626',
};

// Task Status Labels
export const TASK_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Searching for driver...',
  MATCHING: 'Finding nearby drivers...',
  SEARCHING: 'Searching for riders...',
  ASSIGNED: 'Driver assigned',
  ACCEPTED: 'Driver on the way',
  ARRIVED: 'Driver arrived',
  PICKED_UP: 'Trip started',
  IN_TRANSIT: 'On the way',
  DELIVERED: 'Delivered',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'MTN_MOMO', name: 'MTN MoMo', icon: 'phone', color: '#FFCC00' },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', icon: 'phone', color: '#ED1C24' },
  { id: 'CASH', name: 'Cash', icon: 'banknote', color: '#22C55E' },
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
  // Supabase Realtime (replaces Socket.io)
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  // Legacy socket config (kept for reference, no longer used)
  socketUrl: '',
  realtimePort: 3001,
};

// Payment method mapping: client display values → server enum values
// Now aligned with Prisma schema (MTN_MOMO, AIRTEL_MONEY).
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  'CASH': 'CASH',
  'MTN_MOMO': 'MTN_MOMO',
  'AIRTEL_MONEY': 'AIRTEL_MONEY',
  'VISA': 'VISA',
  'MASTERCARD': 'MASTERCARD',
  'WALLET': 'WALLET',
};

// Reverse map for displaying server values in the UI
export const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  'CASH': 'CASH',
  'MTN_MOMO': 'MTN_MOMO',
  'AIRTEL_MONEY': 'AIRTEL_MONEY',
  'VISA': 'VISA',
  'MASTERCARD': 'MASTERCARD',
  'WALLET': 'WALLET',
};

// Named color palette exports for direct import if needed
// Prefer useTheme().colors for dynamic switching
export { DarkColors as DARK_COLORS } from '@/src/context/theme-context';
export { LightColors as LIGHT_COLORS } from '@/src/context/theme-context';

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
