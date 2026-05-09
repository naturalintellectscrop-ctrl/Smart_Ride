/**
 * Push Notifications Hook
 * 
 * React hooks for Firebase Cloud Messaging
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { fcmService, FCMTokenResult, NotificationPayload, initializeFCM } from '@/lib/firebase/fcm-service';

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getToken: () => Promise<FCMTokenResult>;
  isEnabled: boolean;
}

export function usePushNotifications(autoInit: boolean = true): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSupport = useCallback(async () => {
    try {
      const { isFCMSupported } = await import('@/lib/firebase/fcm-service');
      const supported = await isFCMSupported();
      setIsSupported(supported);
      return supported;
    } catch {
      setIsSupported(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fcmService.getToken();
      if (result.success && result.token) {
        setToken(result.token);
        setPermission('granted');
      } else if (result.permissionDenied) {
        setPermission('denied');
        setError('Notification permission denied');
      } else {
        setError(result.error || 'Failed to get permission');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getToken = useCallback(async (): Promise<FCMTokenResult> => {
    return fcmService.getToken();
  }, []);

  useEffect(() => {
    if (!autoInit) return;

    const init = async () => {
      setIsLoading(true);
      const supported = await checkSupport();
      
      if (!supported) {
        setIsLoading(false);
        return;
      }

      setPermission(fcmService.getPermissionStatus());
      
      const storedToken = fcmService.getStoredToken();
      if (storedToken) {
        setToken(storedToken);
      }

      setIsLoading(false);
    };

    init();
  }, [autoInit, checkSupport]);

  return {
    isSupported,
    permission,
    token,
    isLoading,
    error,
    requestPermission,
    getToken,
    isEnabled: permission === 'granted' && !!token,
  };
}

interface UseNotificationPermissionResult {
  permission: NotificationPermission;
  isLoading: boolean;
  request: () => Promise<boolean>;
}

export function useNotificationPermission(): UseNotificationPermissionResult {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPermission(fcmService.getPermissionStatus());
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await fcmService.requestPermission();
      setPermission(result);
      return result === 'granted';
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { permission, isLoading, request };
}

interface UseFCMTokenResult {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

export function useFCMToken(): UseFCMTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fcmService.getToken();
      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setError(result.error || 'Failed to get token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = fcmService.getStoredToken();
    if (stored) {
      setToken(stored);
    }
  }, []);

  return { token, isLoading, error, refreshToken };
}

interface UseForegroundMessagesResult {
  messages: NotificationPayload[];
  clearMessages: () => void;
}

export function useForegroundMessages(): UseForegroundMessagesResult {
  const [messages, setMessages] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    const unsubscribe = fcmService.onForegroundMessage((payload) => {
      setMessages((prev) => [...prev, payload]);
      
      // Show local notification
      if (payload.notification?.title) {
        fcmService.showLocalNotification(payload.notification.title, {
          body: payload.notification.body,
          data: payload.data,
        });
      }
    });

    return unsubscribe;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, clearMessages };
}
