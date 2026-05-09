// ============================================
// SMART RIDE MOBILE - NOTIFICATION SERVICE
// ============================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export type NotificationType = 
  | 'RIDE_REQUEST'
  | 'RIDE_ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PROMOTION'
  | 'SOS_ALERT';

export interface SmartRideNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: Date;
}

// Expo project ID from app.json
const EXPO_PROJECT_ID = 'b5e4442e-0af3-4913-9ac6-e98e7a8e4db5';

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  // Initialize push notifications
  async initialize(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permission');
        return null;
      }

      // Get push token with correct project ID
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });
      this.expoPushToken = token.data;

      // Register token with backend (fire and forget - don't block)
      this.registerTokenWithBackend(token.data).catch(err => {
        console.log('Failed to register push token:', err);
      });

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rides', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1F4E79',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#22C55E',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('sos', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 500, 500],
          lightColor: '#EF4444',
          sound: 'default',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register token with backend
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await api.registerPushToken(token);
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  // Setup notification listeners
  setupListeners(
    onReceive?: (notification: SmartRideNotification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Received notification while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as any;
        
        if (onReceive) {
          onReceive({
            id: notification.request.identifier,
            type: data?.type || 'PROMOTION',
            title: notification.request.content.title || '',
            body: notification.request.content.body || '',
            data: data,
            createdAt: new Date(),
          });
        }
      }
    );

    // User tapped on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (onResponse) {
          onResponse(response);
        }
      }
    );

    // Return cleanup function
    return () => {
      if (this.notificationListener) {
        this.notificationListener.remove();
      }
      if (this.responseListener) {
        this.responseListener.remove();
      }
    };
  }

  // Schedule local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 0,
    channelId: string = 'rides'
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: seconds > 0 ? { seconds, channelId } : { channelId },
    });
  }

  // Send ride request notification (for drivers)
  async notifyRideRequest(
    clientName: string, 
    pickup: string, 
    fare: number
  ): Promise<void> {
    await this.scheduleLocalNotification(
      '🚗 New Ride Request',
      `${clientName} needs a ride from ${pickup}. Earn UGX ${fare.toLocaleString()}`,
      { type: 'RIDE_REQUEST' },
      0,
      'rides'
    );
  }

  // Send driver arrived notification
  async notifyDriverArrived(driverName: string): Promise<void> {
    await this.scheduleLocalNotification(
      '✅ Driver Arrived',
      `${driverName} has arrived at your pickup location`,
      { type: 'DRIVER_ARRIVED' },
      0,
      'rides'
    );
  }

  // Send ride started notification
  async notifyRideStarted(): Promise<void> {
    await this.scheduleLocalNotification(
      '🚀 Ride Started',
      'Your ride has begun. Have a safe trip!',
      { type: 'RIDE_STARTED' },
      0,
      'rides'
    );
  }

  // Send ride completed notification
  async notifyRideCompleted(fare: number): Promise<void> {
    await this.scheduleLocalNotification(
      '🎉 Ride Completed',
      `Your ride has ended. Total fare: UGX ${fare.toLocaleString()}`,
      { type: 'RIDE_COMPLETED' },
      0,
      'rides'
    );
  }

  // Send order update notification
  async notifyOrderUpdate(
    orderId: string, 
    status: string, 
    merchantName?: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      'ORDER_CREATED': 'Your order has been placed',
      'MERCHANT_ACCEPTED': `${merchantName || 'Restaurant'} confirmed your order`,
      'PREPARING': 'Your order is being prepared',
      'READY_FOR_PICKUP': 'Your order is ready for pickup',
      'OUT_FOR_DELIVERY': 'Your order is on the way',
      'DELIVERED': 'Your order has been delivered',
    };

    await this.scheduleLocalNotification(
      '📦 Order Update',
      statusMessages[status] || `Order status: ${status}`,
      { type: 'ORDER_UPDATE', orderId, status },
      0,
      'orders'
    );
  }

  // Send SOS alert notification
  async notifySOSAlert(message: string): Promise<void> {
    await this.scheduleLocalNotification(
      '🚨 EMERGENCY ALERT',
      message,
      { type: 'SOS_ALERT' },
      0,
      'sos'
    );
  }

  // Send payment notification
  async notifyPaymentReceived(amount: number, method: string): Promise<void> {
    await this.scheduleLocalNotification(
      '💰 Payment Received',
      `UGX ${amount.toLocaleString()} received via ${method}`,
      { type: 'PAYMENT_RECEIVED', amount, method },
      0,
      'rides'
    );
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Cancel all scheduled notifications
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Set badge count (iOS)
  async setBadge(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
