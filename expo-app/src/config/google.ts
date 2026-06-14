// ============================================
// SMART RIDE MOBILE - GOOGLE SIGN-IN CONFIG
// ============================================
// Centralized configuration for Google Sign-In
// Fixes DEVELOPER_ERROR by providing webClientId
// and iosClientId (androidClientId comes from
// google-services.json on Android)
// ============================================

import { Platform } from 'react-native';

// Safe import of GoogleSignin — the native module may be undefined if:
// 1. Running in Expo Go (native modules not available)
// 2. The android/ios native folder hasn't been prebuilt
// 3. The APK was built without the @react-native-google-signin plugin
let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  const GoogleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleSignInModule.GoogleSignin;
  statusCodes = GoogleSignInModule.statusCodes;
} catch (e) {
  console.warn('[GoogleSignIn] Native module not available. Google Sign-In will be disabled.', e);
}

// Re-export statusCodes for use in error handling
export { statusCodes };

// OAuth Client IDs from Firebase/Google Cloud Console
// IMPORTANT: These MUST match the google-services.json / GoogleService-Info.plist
// Updated 2025-03: Both debug + upload keystore SHA-1s registered in Firebase
const GOOGLE_CLIENT_IDS = {
  // Web client ID (type 3) - MUST match google-services.json oauth_client client_type=3
  webClientId: '531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com',
  // Android client IDs (type 1) - from google-services.json
  // Debug keystore: certificate_hash f28c61cc...0ae1 → client oc8o4mfd...
  // Upload keystore: certificate_hash 98ea9b4b...78f4 → client qpv85egp...
  androidClientId: '531949209415-qpv85egps3qrq3ko6ecr7uckoko66qm2.apps.googleusercontent.com',
  // iOS client ID (type 2) - from GoogleService-Info.plist
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

  // Guard: if the native module couldn't be loaded, skip configuration
  if (!GoogleSignin) {
    console.warn('[GoogleSignIn] Native module not loaded — Google Sign-In disabled. ' +
      'Ensure you are using a development build (not Expo Go), and that ' +
      'npx expo prebuild has been run with the @react-native-google-signin/google-signin plugin.');
    return;
  }

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
