/**
 * Smart Ride Firebase Configuration
 * 
 * Firebase services for:
 * - Google Sign-In Authentication
 * - Phone Number Authentication (SMS OTP)
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
// Audit Logging Helper
// ==========================================

interface AuditLogEntry {
  timestamp: string;
  event: string;
  severity: 'info' | 'warning' | 'error';
  details: Record<string, unknown>;
}

const AUDIT_LOG_KEY = 'smart_ride_audit_logs';

function logToAudit(event: string, severity: 'info' | 'warning' | 'error', details: Record<string, unknown>) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
  };
  
  // Log to console for development
  if (severity === 'error') {
    console.error(`[AUDIT] ${event}:`, details);
  } else if (severity === 'warning') {
    console.warn(`[AUDIT] ${event}:`, details);
  } else {
    console.log(`[AUDIT] ${event}:`, details);
  }
  
  // Store in localStorage for persistence (can be sent to server later)
  try {
    const existingLogs = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    existingLogs.push(entry);
    // Keep only last 100 logs
    const trimmedLogs = existingLogs.slice(-100);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs));
  } catch {
    // Ignore storage errors
  }
}

// ==========================================
// User-Friendly Error Messages
// ==========================================

const USER_FRIENDLY_ERRORS: Record<string, string> = {
  // Phone auth errors
  'auth/billing-not-enabled': 'SMS verification is temporarily unavailable. Please try Google Sign-In instead.',
  'auth/invalid-phone-number': 'Please enter a valid phone number (e.g., 7XX XXX XXX)',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded': 'SMS service is temporarily busy. Please try again shortly.',
  'auth/captcha-check-failed': 'Verification check failed. Please refresh and try again.',
  'auth/invalid-verification-code': 'The code you entered is incorrect. Please try again.',
  'auth/code-expired': 'The verification code has expired. Please request a new one.',
  'auth/missing-phone-number': 'Please enter your phone number.',
  'auth/missing-verification-code': 'Please enter the verification code.',
  'auth/invalid-verification-id': 'Verification session expired. Please start over.',
  
  // Google auth errors
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
  'auth/unauthorized-domain': 'This domain is not authorized. Please contact support.',
  'auth/api-key-not-valid': 'Service configuration error. Please contact support.',
  'auth/invalid-api-key': 'Service configuration error. Please contact support.',
  
  // Generic errors
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/internal-error': 'An unexpected error occurred. Please try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
};

function getUserFriendlyError(code: string, fallbackMessage: string): string {
  return USER_FRIENDLY_ERRORS[code] || fallbackMessage || 'An unexpected error occurred. Please try again.';
}

// ==========================================
// Firebase Configuration
// ==========================================

// Firebase Configuration from environment variables
const getFirebaseConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

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
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

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

// Initialize on client side
if (typeof window !== 'undefined') {
  initializationPromise = initializeFirebase();
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
    logToAudit('FIREBASE_INIT_FAILED', 'error', { 
      reason: 'Auth or provider not initialized' 
    });
    return { 
      success: false, 
      error: 'Sign-in service is not available. Please refresh the page.' 
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get ID token for backend verification
    const idToken = await user.getIdToken();

    logToAudit('GOOGLE_SIGNIN_SUCCESS', 'info', { 
      uid: user.uid,
      email: user.email,
      method: 'google'
    });

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
    
    logToAudit('GOOGLE_SIGNIN_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      method: 'google'
    });
    
    const userMessage = getUserFriendlyError(
      err.code || '', 
      err.message || 'Failed to sign in with Google'
    );
    
    return { success: false, error: userMessage };
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
    
    logToAudit('GOOGLE_REDIRECT_SUCCESS', 'info', { 
      uid: user.uid,
      email: user.email,
      method: 'google_redirect'
    });
    
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
    
    logToAudit('GOOGLE_REDIRECT_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      method: 'google_redirect'
    });
    
    const userMessage = getUserFriendlyError(
      err.code || '', 
      err.message || 'Failed to complete sign-in'
    );
    
    return { success: false, error: userMessage };
  }
}

export async function signOutFromFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
  logToAudit('SIGNOUT', 'info', { method: 'firebase' });
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
        logToAudit('RECAPTCHA_SUCCESS', 'info', { method: 'phone' });
      },
      'expired-callback': () => {
        logToAudit('RECAPTCHA_EXPIRED', 'warning', { method: 'phone' });
      }
    });
    
    return recaptchaVerifier;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    
    logToAudit('RECAPTCHA_INIT_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      method: 'phone'
    });
    
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
    logToAudit('PHONE_AUTH_INIT_FAILED', 'error', { 
      reason: 'Auth not initialized',
      phoneNumber: phoneNumber.slice(-4) // Only log last 4 digits for privacy
    });
    return { 
      success: false, 
      error: 'Sign-in service is not available. Please refresh the page.' 
    };
  }

  try {
    logToAudit('PHONE_OTP_REQUEST', 'info', { 
      phoneNumber: phoneNumber.slice(-4),
      method: 'phone'
    });
    
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    
    logToAudit('PHONE_OTP_SENT', 'info', { 
      phoneNumber: phoneNumber.slice(-4),
      verificationId: confirmationResult.verificationId.slice(-8),
      method: 'phone'
    });
    
    return {
      success: true,
      confirmationResult,
      verificationId: confirmationResult.verificationId,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    
    // Log the technical error for audit
    logToAudit('PHONE_OTP_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      phoneNumber: phoneNumber.slice(-4),
      method: 'phone'
    });
    
    // Return user-friendly message
    const userMessage = getUserFriendlyError(
      err.code || '', 
      'Unable to send verification code. Please try again.'
    );
    
    return { success: false, error: userMessage };
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
    
    logToAudit('PHONE_VERIFY_SUCCESS', 'info', { 
      uid: user.uid,
      phoneNumber: user.phoneNumber?.slice(-4),
      method: 'phone'
    });
    
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
    
    logToAudit('PHONE_VERIFY_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      method: 'phone'
    });
    
    const userMessage = getUserFriendlyError(
      err.code || '', 
      'Verification failed. Please try again.'
    );
    
    return { success: false, error: userMessage };
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
    return { success: false, error: 'Service unavailable. Please refresh and try again.' };
  }

  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const { signInWithCredential } = await import('firebase/auth');
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    logToAudit('PHONE_VERIFY_ID_SUCCESS', 'info', { 
      uid: user.uid,
      phoneNumber: user.phoneNumber?.slice(-4),
      method: 'phone_credential'
    });
    
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
    
    logToAudit('PHONE_VERIFY_ID_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message,
      method: 'phone_credential'
    });
    
    const userMessage = getUserFriendlyError(
      err.code || '', 
      'Verification failed. Please try again.'
    );
    
    return { success: false, error: userMessage };
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
    
    logToAudit('FCM_TOKEN_SUCCESS', 'info', { 
      tokenPreview: token.slice(-8)
    });
    
    return { token, success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    
    logToAudit('FCM_TOKEN_ERROR', 'error', { 
      code: err.code || 'unknown',
      message: err.message
    });
    
    return { token: '', success: false, error: 'Failed to enable notifications' };
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

// Export for external access to audit logs
export function getAuditLogs(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

export { app as firebaseApp, auth as firebaseAuth, messaging as firebaseMessaging };
