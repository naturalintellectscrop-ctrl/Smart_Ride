// Safe notification service that works in both Expo Go and development builds
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
      return token.data;
    } catch (error) {
      console.log('[NotificationService] Init failed (non-fatal):', error);
      return null;
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
