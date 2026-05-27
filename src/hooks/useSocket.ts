// ============================================
// SMART RIDE WEB - SOCKET HOOKS
// ============================================
// React hooks for socket.io integration.
// Import directly from the socket service (no circular dep via services/index).

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  socketService,
  TaskStatus,
  TaskStatusUpdateData,
  LocationData,
  DriverRequestData,
  NotificationData,
  ConnectionEstablishedData,
} from '@/services/socket';

// ============================================
// useSocketConnection
// Manages the connect/disconnect lifecycle for a socket.
// Call with a token to auto-connect; pass null to disconnect.
// ============================================

export function useSocketConnection(token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionEstablishedData | null>(null);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
      setIsConnected(false);
      setConnectionInfo(null);
    }
  }, [token]);

  useEffect(() => {
    const unsubConnect = socketService.on('connect', () => {
      setIsConnected(true);
    });

    const unsubDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
      setConnectionInfo(null);
    });

    const unsubEstablished = socketService.on('connection:established', (data) => {
      setConnectionInfo(data);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubEstablished();
    };
  }, []);

  const connect = useCallback((t: string) => {
    socketService.connect(t);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  return { isConnected, connectionInfo, connect, disconnect };
}

// ============================================
// useTaskStatus
// Listen for task:status:update events for a specific task.
// ============================================

export function useTaskStatus(
  taskId: string | null,
  onStatusChange?: (data: TaskStatusUpdateData) => void
) {
  useEffect(() => {
    if (!taskId) return;

    // Join the task room to receive updates
    socketService.joinTaskRoom(taskId);

    const unsubscribe = socketService.on('task:status:update', (data) => {
      if (data.taskId === taskId && onStatusChange) {
        onStatusChange(data);
      }
    });

    return () => {
      unsubscribe();
      socketService.leaveTaskRoom(taskId);
    };
  }, [taskId, onStatusChange]);
}

// ============================================
// useDriverLocation
// Track rider/driver location updates.
// ============================================

export function useDriverLocation(
  riderId: string | null,
  onLocationUpdate?: (data: LocationData) => void
) {
  useEffect(() => {
    if (!riderId) return;

    const unsubscribe = socketService.on('rider:location:update', (data) => {
      if (data.riderId === riderId && onLocationUpdate) {
        onLocationUpdate(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [riderId, onLocationUpdate]);
}

// ============================================
// useRiderDispatch
// Listen for incoming dispatch requests (driver:request) and
// provide accept/reject methods that call the dispatch API.
// ============================================

export function useRiderDispatch(
  onRequest: (data: DriverRequestData) => void,
  onExpired?: (taskId: string) => void
) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsubRequest = socketService.on('driver:request', (data) => {
      // Notify the consumer
      onRequest(data);

      // Auto-expire the request when expiresAt is reached
      if (data.expiresAt && data.task?.id) {
        const expiryMs = new Date(data.expiresAt).getTime() - Date.now();
        if (expiryMs > 0) {
          const timer = setTimeout(() => {
            if (onExpired) onExpired(data.task.id);
            timersRef.current.delete(data.task.id);
          }, expiryMs);
          timersRef.current.set(data.task.id, timer);
        }
      }
    });

    return () => {
      unsubRequest();
      // Clear all expiry timers
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [onRequest, onExpired]);

  /** Accept a dispatch match via the dispatch accept API */
  const acceptRequest = useCallback(async (matchId: string) => {
    try {
      const response = await fetch(`/api/dispatch/${matchId}/accept?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('[useRiderDispatch] Accept failed:', error);
      return false;
    }
  }, []);

  /** Reject a dispatch match via the dispatch reject API */
  const rejectRequest = useCallback(async (matchId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/dispatch/${matchId}/reject?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Declined by rider' }),
      });
      return response.ok;
    } catch (error) {
      console.error('[useRiderDispatch] Reject failed:', error);
      return false;
    }
  }, []);

  return { acceptRequest, rejectRequest };
}

// ============================================
// useSocketNotifications
// Listen for general notification events.
// ============================================

export function useSocketNotifications(
  onNotification?: (data: NotificationData) => void
) {
  useEffect(() => {
    if (!onNotification) return;

    const unsubscribe = socketService.on('notification', onNotification);
    return () => {
      unsubscribe();
    };
  }, [onNotification]);
}

// ============================================
// useLocationTracking
// Provide a method to send location updates via socket.
// ============================================

export function useLocationTracking() {
  const sendLocation = useCallback(
    (data: {
      riderId: string;
      taskId?: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      battery?: number;
    }) => {
      socketService.updateLocation(data);
    },
    []
  );

  const sendDriverLocation = useCallback(
    (data: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    }) => {
      socketService.updateDriverLocation(data);
    },
    []
  );

  return { sendLocation, sendDriverLocation };
}
