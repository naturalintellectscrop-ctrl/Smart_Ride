// ============================================
// SMART RIDE MOBILE - GOOGLE SIGN-IN CONFIG
// ============================================
// Centralized configuration for Google Sign-In
//
// KEY INSIGHT (2025-03 fix):
// On Android, DO NOT pass androidClientId in configure().
// The library auto-detects the correct OAuth client from
// google-services.json based on the APK's signing certificate.
// Passing androidClientId explicitly OVERRIDES this auto-detection
// and causes DEVELOPER_ERROR when the hardcoded client ID
// doesn't match the certificate the APK was signed with.
//
// Only webClientId + iosClientId need to be set manually.
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
  // NOTE: These are NOT passed to configure() on Android. The library reads
  // them automatically from google-services.json at runtime based on the
  // signing certificate. We keep them here for reference/debugging only.
  // Debug keystore: certificate_hash f28c61cc...0ae1 → client oc8o4mfd...
  // Upload keystore: certificate_hash 98ea9b4b...78f4 → client qpv85egp...
  //
  // androidClientId: '531949209415-qpv85egps3qrq3ko6ecr7uckoko66qm2.apps.googleusercontent.com',
  // ← INTENTIONALLY REMOVED — passing this caused DEVELOPER_ERROR
  //
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
    }
    // ANDROID: DO NOT set androidClientId here!
    // The library auto-resolves the correct Android OAuth client from
    // google-services.json based on the APK signing certificate at runtime.
    // Passing androidClientId explicitly overrides this and causes
    // DEVELOPER_ERROR when it doesn't match the actual signing cert.
    // See: https://github.com/react-native-google-signin/google-signin/issues/917

    console.log('[GoogleSignIn] Configuring with:', JSON.stringify({
      platform: Platform.OS,
      webClientId: config.webClientId,
      iosClientId: config.iosClientId || '(not set - Android auto-detects)',
      offlineAccess: config.offlineAccess,
      forceCodeForRefreshToken: config.forceCodeForRefreshToken,
    }));

    GoogleSignin.configure(config);
    isConfigured = true;
    console.log('[GoogleSignIn] ✅ Configured successfully for', Platform.OS);
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
