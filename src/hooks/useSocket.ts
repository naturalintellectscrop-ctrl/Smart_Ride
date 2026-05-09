// ============================================
// SMART RIDE MOBILE - SOCKET HOOKS
// ============================================

import { useEffect, useCallback } from 'react';
import { socketService } from '@/src/services';
import { Task, TaskStatus } from '@/src/types';

// Hook for listening to task status updates
export function useTaskStatus(
  taskId: string | null,
  onStatusChange?: (status: TaskStatus) => void
) {
  useEffect(() => {
    if (!taskId) return;

    socketService.joinTaskRoom(taskId);

    const unsubscribe = socketService.on('task:status', (data) => {
      if (data.taskId === taskId && onStatusChange) {
        onStatusChange(data.status);
      }
    });

    return () => {
      unsubscribe();
      socketService.leaveTaskRoom(taskId);
    };
  }, [taskId, onStatusChange]);
}

// Hook for tracking driver location
export function useDriverLocation(
  riderId: string | null,
  onLocationUpdate?: (location: { latitude: number; longitude: number; heading?: number }) => void
) {
  useEffect(() => {
    if (!riderId) return;

    const unsubscribe = socketService.on('location:update', (data) => {
      if (data.riderId === riderId && onLocationUpdate) {
        onLocationUpdate({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [riderId, onLocationUpdate]);
}

// Hook for driver to receive ride requests
export function useDriverRequests(
  onRequest: (request: {
    task: Task;
    pickup: { latitude: number; longitude: number; address: string };
    expiresAt: string;
  }) => void,
  onExpired?: (taskId: string) => void
) {
  useEffect(() => {
    const unsubscribeRequest = socketService.on('driver:request', onRequest);
    const unsubscribeExpired = socketService.on('driver:request:expired', (data) => {
      if (onExpired) onExpired(data.taskId);
    });

    return () => {
      unsubscribeRequest();
      unsubscribeExpired();
    };
  }, [onRequest, onExpired]);
}

// Hook for sending location updates (for drivers)
export function useLocationTracking(enabled: boolean = false) {
  const sendLocation = useCallback((data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    batteryLevel?: number;
  }) => {
    socketService.updateLocation(data);
  }, []);

  const sendHeartbeat = useCallback((data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    batteryLevel?: number;
  }) => {
    // Also send via HTTP for reliability
    import('@/src/services').then(({ api }) => {
      api.sendHeartbeat(data);
    });
  }, []);

  return { sendLocation, sendHeartbeat };
}

// Hook for SOS functionality
export function useSOS() {
  const triggerSOS = useCallback(async (data: {
    latitude: number;
    longitude: number;
    taskId?: string;
    type: string;
  }) => {
    try {
      socketService.triggerSOS({
        latitude: data.latitude,
        longitude: data.longitude,
        type: data.type,
      });
      
      const { api } = await import('@/src/services');
      await api.triggerSOS({
        latitude: data.latitude,
        longitude: data.longitude,
        taskId: data.taskId,
        emergencyType: data.type,
      });
      
      return true;
    } catch (error) {
      console.error('SOS error:', error);
      return false;
    }
  }, []);

  return { triggerSOS };
}
