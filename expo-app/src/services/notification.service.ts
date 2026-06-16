// ============================================
// SMART RIDE MOBILE - NOTIFICATION SERVICE
// ============================================
// Safe notification service that works in both
// Expo Go and development builds.
// Registers push tokens with the backend.
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

let isAvailable = false;

// Check if we're in a development build (not Expo Go)
async function checkAvailability(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      // This will throw in Expo Go since push notifications were removed in SDK 53
      await Notifications.getExpoPushTokenAsync({ projectId: 'test' });
    }
    isAvailable = true;
    return true;
  } catch {
    console.log('[NotificationService] Not available in this environment (likely Expo Go)');
    isAvailable = false;
    return false;
  }
}

export const notificationService = {
  async initialize(): Promise<string | null> {
    try {
      const available = await checkAvailability();
      if (!available) return null;

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[NotificationService] Permission not granted');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync();
      console.log('[NotificationService] Token obtained');

      // Register the token with the backend
      await notificationService.registerWithBackend(token.data);

      return token.data;
    } catch (error) {
      console.log('[NotificationService] Init failed (non-fatal):', error);
      return null;
    }
  },

  /**
   * Register push token with the backend so the server
   * can send push notifications to this device.
   */
  async registerWithBackend(token: string): Promise<void> {
    try {
      await api.registerPushToken(token, Platform.OS);
      console.log('[NotificationService] Push token registered with backend');
    } catch (error) {
      console.warn('[NotificationService] Failed to register push token with backend:', error);
    }
  },

  setupListeners(
    onForegroundNotification: (notification: Notifications.Notification) => void,
    onResponseNotification: (response: Notifications.NotificationResponse) => void
  ) {
    if (!isAvailable) return;

    try {
      Notifications.addNotificationReceivedListener(onForegroundNotification);
      Notifications.addNotificationResponseReceivedListener(onResponseNotification);
    } catch (error) {
      console.log('[NotificationService] Listeners setup skipped (non-fatal)');
    }
  },
};
