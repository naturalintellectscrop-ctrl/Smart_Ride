// ============================================
// SMART RIDE MOBILE - GOOGLE SIGN-IN CONFIG
// ============================================
// Centralized configuration for Google Sign-In
// Fixes DEVELOPER_ERROR by providing webClientId
// and iosClientId (androidClientId comes from
// google-services.json on Android)
// ============================================

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// OAuth Client IDs from Firebase/Google Cloud Console
const GOOGLE_CLIENT_IDS = {
  // Web client ID (type 3) - Required for all platforms (offline access + server verification)
  webClientId: '531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com',
  // Android client ID (type 1) - Used on Android (configured via google-services.json)
  androidClientId: '531949209415-3fnqdkfo69dognl93ffp0keg0jusvq6t.apps.googleusercontent.com',
  // iOS client ID (type 2) - Required for iOS
  iosClientId: '531949209415-1knt1vf2v8g5fh7rltg31knps9j2otar.apps.googleusercontent.com',
};

let isConfigured = false;

/**
 * Configure Google Sign-In once on app startup.
 * This MUST be called before any GoogleSignin.signIn() calls.
 * Safe to call multiple times - will only configure once.
 */
export function configureGoogleSignIn(): void {
  if (isConfigured) return;

  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_IDS.webClientId,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_CLIENT_IDS.iosClientId : undefined,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    isConfigured = true;
    console.log('[GoogleSignIn] Configured successfully');
  } catch (error) {
    console.error('[GoogleSignIn] Configuration failed:', error);
    // Don't throw - app should still work without Google Sign-In
  }
}

export { GoogleSignin, GOOGLE_CLIENT_IDS };
