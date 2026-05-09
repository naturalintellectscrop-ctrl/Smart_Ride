/**
 * Firebase Cloud Messaging Service
 * 
 * Handles push notifications for Smart Ride
 */

import { getMessaging, getToken, onMessage, isSupported, MessagePayload, Messaging } from 'firebase/messaging';
import { firebaseApp, isFirebaseConfigured } from './firebase-service';

// VAPID Key - supports both env variable names
// Expo release builds require EXPO_PUBLIC_ prefix
const FIREBASE_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || 
  (process.env as Record<string, string | undefined>)['PUBLIC_FIREBASE_VAPID_KEY'] ||
  'BPixEzgMt0vTH5V15cEsBFB3MEl51T66idGs5dJn-zTt_4gjeZrPHINEEjC7WgXZByiPC4bYTrt9JJOab5djb0U';

// Types
export interface FCMTokenResult {
  success: boolean;
  token?: string;
  error?: string;
  permissionDenied?: boolean;
}

export interface NotificationPayload {
  messageId?: string;
  from?: string;
  data?: Record<string, string>;
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
}

// Constants
const FCM_TOKEN_KEY = 'smart_ride_fcm_token';
const FCM_TOKEN_TIMESTAMP_KEY = 'smart_ride_fcm_token_timestamp';
const TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Singleton service class
class FCMService {
  private messaging: Messaging | null = null;
  private initialized = false;
  private unsubscribeFromMessages: (() => void) | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn('[FCM] Not supported in this browser');
        return;
      }

      if (!firebaseApp || !isFirebaseConfigured()) {
        console.warn('[FCM] Firebase not configured');
        return;
      }

      this.messaging = getMessaging(firebaseApp);
      this.initialized = true;
      console.log('[FCM] Initialized successfully');
    } catch (error) {
      console.error('[FCM] Failed to initialize:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  isNotificationEnabled(): boolean {
    return this.getPermissionStatus() === 'granted';
  }

  async getToken(): Promise<FCMTokenResult> {
    if (!this.messaging) {
      await this.initialize();
      if (!this.messaging) {
        return { success: false, error: 'Messaging not initialized' };
      }
    }

    const permission = this.getPermissionStatus();
    if (permission !== 'granted') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') {
        return {
          success: false,
          error: 'Notification permission denied',
          permissionDenied: true,
        };
      }
    }

    try {
      const token = await getToken(this.messaging, { vapidKey: FIREBASE_VAPID_KEY });

      if (token) {
        this.storeToken(token);
        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
        return { success: true, token };
      }

      return { success: false, error: 'Failed to get token' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FCM] Error getting token:', error);
      return { success: false, error: errorMessage };
    }
  }

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    const token = localStorage.getItem(FCM_TOKEN_KEY);
    const timestamp = localStorage.getItem(FCM_TOKEN_TIMESTAMP_KEY);

    if (token && timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > TOKEN_REFRESH_INTERVAL) {
        return null;
      }
    }

    return token;
  }

  private storeToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FCM_TOKEN_KEY, token);
    localStorage.setItem(FCM_TOKEN_TIMESTAMP_KEY, Date.now().toString());
  }

  clearStoredToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(FCM_TOKEN_KEY);
    localStorage.removeItem(FCM_TOKEN_TIMESTAMP_KEY);
  }

  onForegroundMessage(callback: (payload: NotificationPayload) => void): () => void {
    if (!this.messaging) {
      return () => {};
    }

    this.unsubscribeFromMessages = onMessage(
      this.messaging,
      (payload: MessagePayload) => {
        console.log('[FCM] Foreground message:', payload);
        callback({
          messageId: payload.messageId,
          from: payload.from,
          data: payload.data as Record<string, string>,
          notification: payload.notification,
        });
      }
    );

    return this.unsubscribeFromMessages;
  }

  async sendTokenToBackend(token: string, userId?: string): Promise<boolean> {
    try {
      await fetch('/api/notifications/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userId,
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          },
        }),
      });
      return true;
    } catch (error) {
      console.error('[FCM] Error sending token to backend:', error);
      return false;
    }
  }

  async showLocalNotification(title: string, options: NotificationOptions = {}): Promise<Notification | null> {
    if (!this.isNotificationEnabled()) return null;

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };

      return notification;
    } catch {
      return null;
    }
  }

  cleanup(): void {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
      this.unsubscribeFromMessages = null;
    }
    this.initialized = false;
    this.messaging = null;
  }
}

export const fcmService = new FCMService();

// Convenience functions
export async function initializeFCM(): Promise<FCMTokenResult> {
  await fcmService.initialize();
  return fcmService.getToken();
}

export async function isFCMSupported(): Promise<boolean> {
  return isSupported();
}

export async function getFCMToken(): Promise<FCMTokenResult> {
  return fcmService.getToken();
}

export function subscribeToMessages(callback: (payload: NotificationPayload) => void): () => void {
  return fcmService.onForegroundMessage(callback);
}
