// ============================================
// SMART RIDE MOBILE - ENVIRONMENT CONFIG
// ============================================

// Production API URL - used as fallback if env var is not set
const PRODUCTION_API_URL = 'https://smartrideug.vercel.app/api';

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || PRODUCTION_API_URL;

// Mapbox Configuration
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Firebase Configuration
// Values are loaded from .env file (not committed to git)
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Firebase VAPID Keys for Push Notifications
export const FIREBASE_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || '';
export const FIREBASE_VAPID_KEY_SECONDARY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY_SECONDARY || '';

// App Configuration
export const APP_CONFIG = {
  name: 'Smart Ride',
  version: '1.0.0',
  bundleId: 'ug.smartride.app',
  supportEmail: 'support@smartride.ug',
};

// Socket URL (derived from API URL)
export const SOCKET_URL = API_BASE_URL.replace('/api', '');
