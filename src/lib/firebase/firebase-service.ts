/**
 * Smart Ride Firebase Configuration
 * 
 * Firebase services for:
 * - Google Sign-In Authentication
 * - Push Notifications (FCM)
 * 
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project or use existing
 * 3. Enable Google Sign-In in Authentication > Sign-in method
 * 4. Create a web app and copy config
 * 5. Generate FCM key pair in Project Settings > Cloud Messaging
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
  Auth
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

// Firebase Configuration - Smart Ride Uganda
// Using environment variables with fallback values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBJ7reiLxFKb_2gzW8jFrjBIqWb7jTwZ-U',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'smart-ride-489806.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'smart-ride-489806',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'smart-ride-489806.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '89085363674',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:89085363674:web:1be4a21aab34bf75e36ce3',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-DVWWZL3HB3',
};

// VAPID Key for FCM Push Notifications
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 
  'BPixEzgMt0vTH5V15cEsBFB3MEl51T66idGs5dJn-zTt_4gjeZrPHINEEjC7WgXZByiPC4bYTrt9JJOab5djb0U';

// ==========================================
// Initialize Firebase
// ==========================================

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;
let googleProvider: GoogleAuthProvider | null = null;

function initializeFirebase() {
  if (typeof window === 'undefined') return;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase configuration missing. Please set environment variables.');
    return;
  }

  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

  initializeMessaging();
}

async function initializeMessaging() {
  try {
    const supported = await isSupported();
    if (supported && app) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.log('Firebase Messaging not supported');
  }
}

if (typeof window !== 'undefined') {
  initializeFirebase();
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
  };
  error?: string;
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!auth || !googleProvider) {
    return { 
      success: false, 
      error: 'Firebase not initialized. Please check configuration.' 
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
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
    
    return { success: false, error: err.message || 'Failed to sign in with Google' };
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not initialized');
  }
  await signInWithRedirect(auth, googleProvider);
}

export async function handleGoogleRedirectResult(): Promise<GoogleSignInResult | null> {
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const user = result.user;
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        phoneNumber: user.phoneNumber || undefined,
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
