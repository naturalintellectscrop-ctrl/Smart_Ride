// ============================================
// SMART RIDE MOBILE - APP ENTRY
// ============================================
// NOTE: This file is NOT used by Expo Router in release builds.
// The real entry point is: expo-router/entry → app/_layout.tsx
// This file exists only for compatibility with Expo Go dev mode.
// ============================================

// CRITICAL: Reanimated must be first import
import 'react-native-reanimated';

// Expo Router handles the root - just re-export from layout
// This ensures both dev (Expo Go) and release (APK) work correctly
export { default } from './app/_layout';
