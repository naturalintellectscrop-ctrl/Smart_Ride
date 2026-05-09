// ============================================
// SMART RIDE MOBILE - GOOGLE SIGN-IN SERVICE
// ============================================
// PURPOSE: Native Google Sign-In for React Native/Expo
// Uses @react-native-google-signin/google-signin
// ============================================

import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
  User,
} from '@react-native-google-signin/google-signin';

// ============================================
// TYPES
// ============================================

export interface GoogleSignInResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    photo?: string;
    idToken: string;
  };
  error?: string;
}

// ============================================
// CONFIGURATION
// ============================================

// iOS Client ID from google-services.json
const IOS_CLIENT_ID = '531949209415-1knt1vf2v8g5fh7rltg31knps9j2otar.apps.googleusercontent.com';

// Web Client ID (used for Android and server verification)
const WEB_CLIENT_ID = '531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com';

// ============================================
// INITIALIZE GOOGLE SIGN-IN
// ============================================

let isInitialized = false;

export function configureGoogleSignIn(): void {
  if (isInitialized) return;

  try {
    GoogleSignin.configure({
      // iOS configuration
      iosClientId: IOS_CLIENT_ID,
      
      // Web client ID for Android (required for getting idToken)
      webClientId: WEB_CLIENT_ID,
      
      // Whether to request offline access (refresh token)
      offlineAccess: true,
      
      // Force consent prompt on each login
      forceCodeForRefreshToken: true,
      
      // Account name to pre-select (optional)
      // accountName: '',
    });
    
    isInitialized = true;
    console.log('[GOOGLE-SIGNIN] Configured successfully');
  } catch (error) {
    console.error('[GOOGLE-SIGNIN] Configuration error:', error);
  }
}

// ============================================
// SIGN IN METHODS
// ============================================

/**
 * Sign in with Google
 * Returns user info including idToken for backend verification
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // Ensure configured
  configureGoogleSignIn();

  try {
    // Check if device supports Google Play Services (Android only)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in
    const response = await GoogleSignin.signIn();

    // Check if successful
    if (isSuccessResponse(response)) {
      const user: User = response.data;
      
      // Get the ID token for backend verification
      const idToken = user.idToken;
      
      if (!idToken) {
        console.error('[GOOGLE-SIGNIN] No ID token received');
        return {
          success: false,
          error: 'Failed to get authentication token from Google',
        };
      }

      console.log('[GOOGLE-SIGNIN] Sign in successful:', user.user.email);

      return {
        success: true,
        user: {
          id: user.user.id,
          email: user.user.email || '',
          name: user.user.name || user.user.email?.split('@')[0] || 'User',
          photo: user.user.photo || undefined,
          idToken: idToken,
        },
      };
    }

    // User cancelled
    return {
      success: false,
      error: 'Sign in was cancelled',
    };
  } catch (error) {
    console.error('[GOOGLE-SIGNIN] Sign in error:', error);

    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return { success: false, error: 'Sign in was cancelled' };
        
        case statusCodes.IN_PROGRESS:
          return { success: false, error: 'Sign in is already in progress' };
        
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          return { success: false, error: 'Google Play Services not available. Please install or update Google Play Services.' };
        
        default:
          return { success: false, error: `Google sign in failed: ${error.message || 'Unknown error'}` };
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred during Google sign in',
    };
  }
}

/**
 * Sign in silently (if already signed in)
 */
export async function signInSilently(): Promise<GoogleSignInResult> {
  configureGoogleSignIn();

  try {
    const user = await GoogleSignin.signInSilently();

    if (user && user.idToken) {
      return {
        success: true,
        user: {
          id: user.user.id,
          email: user.user.email || '',
          name: user.user.name || user.user.email?.split('@')[0] || 'User',
          photo: user.user.photo || undefined,
          idToken: user.idToken,
        },
      };
    }

    return { success: false, error: 'No cached sign in found' };
  } catch (error) {
    console.log('[GOOGLE-SIGNIN] Silent sign in failed (normal if not signed in):', error);
    return { success: false, error: 'Not signed in' };
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
    console.log('[GOOGLE-SIGNIN] Signed out');
  } catch (error) {
    console.error('[GOOGLE-SIGNIN] Sign out error:', error);
  }
}

/**
 * Check if user is currently signed in
 */
export async function isGoogleSignedIn(): Promise<boolean> {
  try {
    const isSignedIn = await GoogleSignin.hasPreviousSignIn();
    return isSignedIn;
  } catch (error) {
    return false;
  }
}

/**
 * Get current user (if signed in)
 */
export async function getCurrentGoogleUser(): Promise<GoogleSignInResult | null> {
  try {
    const isSignedIn = await GoogleSignin.hasPreviousSignIn();
    if (!isSignedIn) return null;

    const tokens = await GoogleSignin.getTokens();
    const user = await GoogleSignin.getCurrentUser();

    if (user && tokens.idToken) {
      return {
        success: true,
        user: {
          id: user.user.id,
          email: user.user.email || '',
          name: user.user.name || '',
          photo: user.user.photo || undefined,
          idToken: tokens.idToken,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[GOOGLE-SIGNIN] Get current user error:', error);
    return null;
  }
}
