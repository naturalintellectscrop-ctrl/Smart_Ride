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
  webClientId: '531949209415-ja4espd5h0m6p74esft4iv541os5ertj.apps.googleusercontent.com',
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
 * 
 * IMPORTANT: On Android, the googleServicesFile must be present for Google Play Services to work.
 * On iOS, the GoogleService-Info.plist must be configured in app.json.
 */
export function configureGoogleSignIn(): void {
  if (isConfigured) return;

  try {
    const config: any = {
      webClientId: GOOGLE_CLIENT_IDS.webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    };

    // Platform-specific configuration
    if (Platform.OS === 'ios') {
      config.iosClientId = GOOGLE_CLIENT_IDS.iosClientId;
    } else if (Platform.OS === 'android') {
      // Android client ID helps with Play Services sign-in
      config.androidClientId = GOOGLE_CLIENT_IDS.androidClientId;
    }

    GoogleSignin.configure(config);
    isConfigured = true;
    console.log('[GoogleSignIn] Configured successfully for', Platform.OS);
  } catch (error) {
    console.error('[GoogleSignIn] Configuration failed:', error);
    // Don't throw - app should still work without Google Sign-In
  }
}

/**
 * Check if Google Sign-In is properly configured
 */
export function isGoogleSignInConfigured(): boolean {
  return isConfigured;
}

/**
 * Reset Google Sign-In configuration (useful for testing/debugging)
 */
export function resetGoogleSignInConfig(): void {
  isConfigured = false;
}

export { GoogleSignin, GOOGLE_CLIENT_IDS };
