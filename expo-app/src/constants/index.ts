// ============================================
// SMART RIDE MOBILE - CONSTANTS
// ============================================
// Minimal constants for boot - no external dependencies
// ============================================

// Brand Colors
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

  // Legacy compatibility
  accent: '#F59E0B',
};

// Gradients
export const GRADIENTS = {
  primary: ['#00FF88', '#00D4FF'],
  danger: ['#EF4444', '#DC2626'],
  accent: ['#00D4FF', '#00FF88'],
};

// Glass styles
export const GLASS = {
  background: 'rgba(19, 19, 26, 0.7)',
  border: 'rgba(255, 255, 255, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  elevated: 'rgba(30, 30, 40, 0.8)',
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

// Kampala Default Location
export const DEFAULT_LOCATION = {
  latitude: 0.3476,
  longitude: 32.5825,
  address: 'Kampala, Uganda',
};

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
  // Socket.io URL - connects through gateway to realtime service (port 3001)
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || '',
  realtimePort: 3001,
};

// Storage Keys
export const STORAGE_KEYS = {
  authToken: 'smart_ride_auth_token',
  refreshToken: 'smart_ride_refresh_token',
  user: 'smart_ride_user',
  location: 'smart_ride_last_location',
};
