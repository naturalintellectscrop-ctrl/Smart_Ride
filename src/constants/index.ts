// ============================================
// SMART RIDE MOBILE - CONSTANTS
// ============================================
// BRAND: Matches Admin Dashboard Theme
// Primary: Neon Green (#00FF88)
// Background: Dark (#0D0D12)
// Secondary: Electric Blue (#3B82F6)
// ============================================

import Constants from 'expo-constants';
import { API_BASE_URL, MAPBOX_ACCESS_TOKEN, FIREBASE_VAPID_KEY } from '@/config/env';

// API Configuration - Use env config with production fallback
export const API_CONFIG = {
  baseUrl: Constants.expoConfig?.extra?.apiBaseUrl || API_BASE_URL,
  timeout: 30000, // 30 seconds timeout (3G friendly)
  slowNetworkTimeout: 60000, // 60 seconds for slow networks
  retryAttempts: 3, // Number of retry attempts
  retryDelay: 1000, // Initial retry delay (exponential backoff)
  retryDelayMultiplier: 2, // Exponential backoff multiplier
};

// Network Condition Thresholds
export const NETWORK_CONFIG = {
  // Connection quality detection thresholds
  fastLatency: 500, // <500ms = fast
  normalLatency: 2000, // <2s = normal
  slowLatency: 5000, // <5s = slow (3G)
  // Above 5s = very slow (2G/edge)
  
  // Timeouts by network quality
  fastTimeout: 15000,
  normalTimeout: 30000,
  slowTimeout: 60000,
};

// Mapbox Configuration
export const MAPBOX_CONFIG = {
  accessToken: Constants.expoConfig?.extra?.mapboxAccessToken || MAPBOX_ACCESS_TOKEN,
  styleURL: 'mapbox://styles/mapbox/streets-v12',
};

// Firebase Configuration
export const FIREBASE_CONFIG = {
  vapidKey: FIREBASE_VAPID_KEY,
};

// ============================================
// BRAND COLORS - MATCHES ADMIN DASHBOARD
// ============================================
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
  background: '#0D0D12',       // Deep charcoal - main background
  backgroundElevated: '#1A1A24', // Dark navy - cards, panels
  backgroundSurface: '#252530',  // Slightly lighter - inputs
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
  borderNeon: 'rgba(0, 255, 136, 0.3)',
  
  // Status Colors
  success: '#00FF88',
  successMuted: '#10B981',
  error: '#EF4444',
  errorMuted: '#DC2626',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Service Colors
  boda: '#10B981',      // Green
  car: '#3B82F6',       // Blue
  food: '#F97316',      // Orange
  shopping: '#8B5CF6',  // Purple
  delivery: '#14B8A6',  // Teal
  health: '#F43F5E',    // Rose
  
  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Glow Effects
  glowNeon: 'rgba(0, 255, 136, 0.4)',
  glowElectric: 'rgba(59, 130, 246, 0.4)',
  
  // Legacy compatibility
  accent: '#F59E0B',
  accentLight: '#FBBF24',
};

// Task Status Colors
export const TASK_STATUS_COLORS = {
  CREATED: '#3B82F6',
  MATCHING: '#8B5CF6',
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
export const TASK_STATUS_LABELS = {
  CREATED: 'Searching for driver...',
  MATCHING: 'Finding nearby drivers...',
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
  { id: 'VISA', name: 'Visa', icon: 'card', color: '#1A1F71' },
  { id: 'MASTERCARD', name: 'Mastercard', icon: 'card', color: '#EB001B' },
];

// Ride Types
export const RIDE_TYPES = {
  BODA: {
    id: 'BODA',
    name: 'Smart Boda',
    description: 'Motorcycle ride',
    icon: 'motorbike',
    baseFare: 2000,
    perKm: 800,
    capacity: 1,
  },
  CAR: {
    id: 'CAR',
    name: 'Smart Car',
    description: 'Car ride',
    icon: 'car',
    baseFare: 5000,
    perKm: 1500,
    capacity: 4,
  },
};

// Service Categories
export const SERVICE_CATEGORIES = [
  {
    id: 'ride',
    name: 'Rides',
    icon: 'car',
    color: COLORS.primary,
    description: 'Get a ride to your destination',
  },
  {
    id: 'food',
    name: 'Food',
    icon: 'restaurant',
    color: '#F59E0B',
    description: 'Order food from restaurants',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'cart',
    color: '#8B5CF6',
    description: 'Shop from stores near you',
  },
  {
    id: 'delivery',
    name: 'Delivery',
    icon: 'package',
    color: '#10B981',
    description: 'Send packages anywhere',
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'medical',
    color: '#EF4444',
    description: 'Order medicines & healthcare',
  },
];

// Kampala Default Location
export const DEFAULT_LOCATION = {
  latitude: 0.3476,
  longitude: 32.5825,
  address: 'Kampala, Uganda',
};

// Map Styles
export const MAP_STYLES = {
  standard: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

// Animation Durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Debounce Delays
export const DEBOUNCE = {
  search: 300,
  location: 1000,
};

// Storage Keys
export const STORAGE_KEYS = {
  authToken: 'smart_ride_auth_token',
  refreshToken: 'smart_ride_refresh_token',
  user: 'smart_ride_user',
  location: 'smart_ride_last_location',
  theme: 'smart_ride_theme',
  notifications: 'smart_ride_notifications',
  cart: 'smart_ride_cart',
};
