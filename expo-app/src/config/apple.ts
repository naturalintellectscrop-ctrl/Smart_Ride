// ============================================
// SMART RIDE MOBILE - APPLE SIGN-IN CONFIG
// ============================================
// Centralized configuration for Apple Sign-In
//
// NOTES:
// - Apple Sign-In is ONLY available on iOS (native)
// - On Android, we use a web-based Apple OAuth flow
// - Apple Sign-In requires iOS 13+ and a valid Apple Developer account
// - For App Store: If your app supports other social login, Apple Sign-In is REQUIRED
// ============================================

import { Platform } from 'react-native';

// Safe import of AppleAuthentication — the native module may be undefined if:
// 1. Running on Android (not supported natively)
// 2. Running in Expo Go (native modules not available)
// 3. The iOS native folder hasn't been prebuilt
let AppleAuthentication: any = null;
let AppleAuthenticationScope: any = null;
let AppleAuthenticationCredentialState: any = null;

try {
  const AppleAuthModule = require('expo-apple-authentication');
  AppleAuthentication = AppleAuthModule;
  AppleAuthenticationScope = AppleAuthModule.AppleAuthenticationScope;
  AppleAuthenticationCredentialState = AppleAuthModule.AppleAuthenticationCredentialState;
} catch (e) {
  console.warn('[AppleSignIn] Native module not available. Apple Sign-In will be disabled.', e);
}

export { AppleAuthenticationScope, AppleAuthenticationCredentialState };

/**
 * Check if Apple Sign-In is available on the current device/platform
 * Apple Sign-In is only available on iOS 13+ devices
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  if (!AppleAuthentication) {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (e) {
    console.warn('[AppleSignIn] Error checking availability:', e);
    return false;
  }
}

/**
 * Perform Apple Sign-In on iOS
 * Returns the identity token and user info
 */
export async function signInWithApple(): Promise<{
  identityToken: string | null;
  authorizationCode: string | null;
  user: string;
  email?: string | null;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
    middleName?: string | null;
    namePrefix?: string | null;
    nameSuffix?: string | null;
    nickname?: string | null;
  } | null;
} | null> {
  if (!AppleAuthentication) {
    throw new Error('Apple Sign-In is not available on this device');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthenticationScope.FULL_NAME,
        AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('[AppleSignIn] Sign-in successful, user:', credential.user);

    return {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      user: credential.user,
      email: credential.email,
      fullName: credential.fullName,
    };
  } catch (e: any) {
    // User cancelled the sign-in
    if (e.code === 'ERR_CANCELED') {
      console.log('[AppleSignIn] User cancelled sign-in');
      return null;
    }
    throw e;
  }
}

/**
 * Check the credential state of a previously signed-in Apple user
 * Returns whether the user is still authorized
 */
export async function getCredentialState(userId: string): Promise<boolean> {
  if (!AppleAuthentication || !AppleAuthenticationCredentialState) {
    return false;
  }

  try {
    const credentialState = await AppleAuthentication.getCredentialStateAsync(userId);
    return credentialState === AppleAuthenticationCredentialState.AUTHORIZED;
  } catch (e) {
    console.warn('[AppleSignIn] Error checking credential state:', e);
    return false;
  }
}

export { AppleAuthentication };
