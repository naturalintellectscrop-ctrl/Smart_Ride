// Safe Google Sign-In configuration
// Works in both Expo Go (graceful fallback) and development builds

let isConfigured = false;

export function configureGoogleSignIn() {
  if (isConfigured) return;
  
  try {
    // Dynamic import to avoid hard crash if native module isn't available
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      offlineAccess: true,
    });
    
    isConfigured = true;
    console.log('[Google] Sign-In configured successfully');
  } catch (error: any) {
    // Native module not available - this is expected in Expo Go
    console.warn('[Google] Sign-In not available:', error?.message || 'Native module missing');
  }
}

export async function signInWithGoogle() {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    
    if (!isConfigured) {
      configureGoogleSignIn();
    }
    
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return { success: true, user: userInfo };
  } catch (error: any) {
    console.warn('[Google] Sign-In failed:', error?.message || error);
    return { success: false, error: error?.message || 'Google Sign-In not available' };
  }
}

export async function isGoogleSignInAvailable(): Promise<boolean> {
  try {
    require('@react-native-google-signin/google-signin');
    return true;
  } catch {
    return false;
  }
}
