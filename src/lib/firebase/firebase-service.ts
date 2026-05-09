/**
 * Smart Ride Firebase Configuration
 * 
 * Firebase services for:
 * - Google Sign-In Authentication
 * - Phone Number Authentication (SMS 6-digit code)
 * - Push Notifications (FCM)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
  ApplicationVerifier
} from 'firebase/auth';
import { 
  getMessaging, 
  getToken, 
  onMessage,
  Messaging,
  isSupported 
} from 'firebase/messaging';

// ==========================================
// Firebase Configuration
// ==========================================

// Firebase Configuration from environment variables (Production Ready)
const getFirebaseConfig = () => {
  // Expo release builds require EXPO_PUBLIC_ prefix
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !authDomain || !projectId) {
    console.error('Firebase: Missing required configuration');
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: storageBucket || `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderId || '',
    appId: appId || '',
    measurementId: measurementId || '',
  };
};

// VAPID Key for FCM Push Notifications
export const FIREBASE_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || '';

// ==========================================
// Initialize Firebase
// ==========================================

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeFirebase(): Promise<void> {
  if (typeof window === 'undefined') return;

  const config = getFirebaseConfig();
  if (!config) {
    console.warn('Firebase: Configuration not available');
    return;
  }

  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp(config);
  }

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

  // Initialize messaging
  try {
    const supported = await isSupported();
    if (supported && app) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.log('Firebase Messaging not supported');
  }
}

// Initialize on client side - with error handling to prevent startup crash
if (typeof window !== 'undefined') {
  try {
    initializationPromise = initializeFirebase();
  } catch (error) {
    console.warn('[Firebase] Initialization failed, app will continue without Firebase:', error);
    initializationPromise = Promise.resolve();
  }
}

// Export function to check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return config !== null;
}

// ==========================================
// Google Sign-In Functions
// ==========================================

export interface GoogleSignInResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    phoneNumber?: string;
    idToken?: string;
  };
  error?: string;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // Wait for initialization
  if (initializationPromise) {
    await initializationPromise;
  }

  if (!auth || !googleProvider) {
    return { 
      success: false, 
      error: 'Firebase not initialized. Please check your Firebase configuration in environment variables.' 
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get ID token for backend verification
    const idToken = await user.getIdToken();

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
        idToken,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Google Sign-In error:', error);
    
    if (err.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in was cancelled' };
    }
    if (err.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup was blocked by browser' };
    }
    if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key') {
      return { success: false, error: 'Invalid Firebase API key. Please check your configuration.' };
    }
    
    return { success: false, error: err.message || 'Failed to sign in with Google' };
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  if (initializationPromise) {
    await initializationPromise;
  }
  
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  await signInWithRedirect(auth, googleProvider);
}

export async function handleGoogleRedirectResult(): Promise<GoogleSignInResult | null> {
  if (initializationPromise) {
    await initializationPromise;
  }
  
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const user = result.user;
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
        idToken,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message };
  }
}

export async function signOutFromFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth?.currentUser || null;
}

// ==========================================
// Phone Authentication Functions
// ==========================================

export interface PhoneSignInResult {
  success: boolean;
  confirmationResult?: ConfirmationResult;
  verificationId?: string;
  error?: string;
}

export interface PhoneVerifyResult {
  success: boolean;
  user?: {
    uid: string;
    phoneNumber: string;
    idToken?: string;
  };
  error?: string;
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * This creates an invisible reCAPTCHA widget
 */
export function initRecaptchaVerifier(buttonId: string): ApplicationVerifier | null {
  if (!auth || typeof window === 'undefined') return null;
  
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again
        console.log('reCAPTCHA expired');
      }
    });
    
    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
}

/**
 * Send SMS verification code to phone number
 * @param phoneNumber - Phone number in E.164 format (e.g., +256700123456)
 * @param recaptchaVerifier - reCAPTCHA verifier instance
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<PhoneSignInResult> {
  if (initializationPromise) {
    await initializationPromise;
  }

  if (!auth) {
    return { 
      success: false, 
      error: 'Firebase not initialized. Please check your Firebase configuration.' 
    };
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    
    return {
      success: true,
      confirmationResult,
      verificationId: confirmationResult.verificationId,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Phone verification error:', error);
    
    if (err.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'Invalid phone number format. Please use format: +256700123456' };
    }
    if (err.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please try again later.' };
    }
    if (err.code === 'auth/quota-exceeded') {
      return { success: false, error: 'SMS quota exceeded. Please contact support.' };
    }
    if (err.code === 'auth/captcha-check-failed') {
      return { success: false, error: 'reCAPTCHA verification failed. Please try again.' };
    }
    
    return { success: false, error: err.message || 'Failed to send verification code' };
  }
}

/**
 * Verify the SMS code entered by user
 * @param confirmationResult - The confirmation result from sendPhoneVerificationCode
 * @param verificationCode - The 6-digit code entered by user
 */
export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<PhoneVerifyResult> {
  try {
    const userCredential = await confirmationResult.confirm(verificationCode);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber || '',
        idToken,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Code verification error:', error);
    
    if (err.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid verification code. Please try again.' };
    }
    if (err.code === 'auth/code-expired') {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }
    
    return { success: false, error: err.message || 'Failed to verify code' };
  }
}

/**
 * Verify SMS code using verification ID (alternative method)
 * @param verificationId - The verification ID from sendPhoneVerificationCode
 * @param verificationCode - The 6-digit code entered by user
 */
export async function verifyPhoneCodeWithId(
  verificationId: string,
  verificationCode: string
): Promise<PhoneVerifyResult> {
  if (!auth) {
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const { signInWithCredential } = await import('firebase/auth');
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber || '',
        idToken,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('Code verification error:', error);
    
    if (err.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid verification code. Please try again.' };
    }
    if (err.code === 'auth/code-expired') {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }
    
    return { success: false, error: err.message || 'Failed to verify code' };
  }
}

// ==========================================
// Push Notifications (FCM)
// ==========================================

export interface PushNotificationToken {
  token: string;
  success: boolean;
  error?: string;
}

export async function getFCMToken(): Promise<PushNotificationToken> {
  if (!messaging) {
    return { token: '', success: false, error: 'Messaging not supported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: '', success: false, error: 'Notification permission denied' };
    }

    const vapidKey = FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return { token: '', success: false, error: 'VAPID key not configured' };
    }

    const token = await getToken(messaging, { vapidKey });
    return { token, success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { token: '', success: false, error: err.message || 'Failed to get push notification token' };
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { app as firebaseApp, auth as firebaseAuth, messaging as firebaseMessaging };
