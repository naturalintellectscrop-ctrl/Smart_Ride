'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// ==========================================
// Types
// ==========================================

export interface HeartbeatConfig {
  intervalMs: number;           // Heartbeat interval (default: 10000ms)
  retryAttempts: number;        // Max retry attempts on failure
  retryDelayMs: number;         // Delay between retries
  enableWebSocket: boolean;     // Use WebSocket instead of HTTP
  enableOfflineQueue: boolean;  // Queue heartbeats when offline
}

export interface HeartbeatData {
  riderId: string;
  taskId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  batteryLevel?: number;
  heading?: number;
  accuracy?: number;
  isCharging?: boolean;
  networkType?: string;
}

export interface HeartbeatStatus {
  isMonitoring: boolean;
  lastHeartbeatAt: Date | null;
  connectionStatus: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
  failedAttempts: number;
  pendingHeartbeats: number;
  lastError: string | null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

// ==========================================
// Default Configuration
// ==========================================

const DEFAULT_CONFIG: HeartbeatConfig = {
  intervalMs: 10000,            // 10 seconds
  retryAttempts: 3,
  retryDelayMs: 2000,
  enableWebSocket: true,
  enableOfflineQueue: true,
};

const HEARTBEAT_MONITOR_PORT = 3004;

// ==========================================
// Storage Keys
// ==========================================

const STORAGE_KEYS = {
  OFFLINE_HEARTBEATS: 'smartride_offline_heartbeats',
};

// ==========================================
// Helper Functions
// ==========================================

function getOfflineHeartbeats(): HeartbeatData[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_HEARTBEATS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveOfflineHeartbeat(heartbeat: HeartbeatData): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getOfflineHeartbeats();
    existing.push(heartbeat);
    // Keep only last 50 heartbeats
    const trimmed = existing.slice(-50);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_HEARTBEATS, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save offline heartbeat:', error);
  }
}

function clearOfflineHeartbeats(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_HEARTBEATS);
}

// ==========================================
// Hook: useGeolocation
// ==========================================

export function useGeolocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ?? undefined,
          heading: position.coords.heading ?? undefined,
        });
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 5000,
      }
    );
  }, [options]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const getCurrentPosition = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed ?? undefined,
            heading: position.coords.heading ?? undefined,
          });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    location,
    error,
    isLoading,
    startWatching,
    stopWatching,
    getCurrentPosition,
  };
}

// ==========================================
// Hook: useBatteryStatus
// ==========================================

export function useBatteryStatus() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    // @ts-expect-error - Battery API not in standard types
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      // @ts-expect-error - Battery API not in standard types
      navigator.getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });

        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {
        // Battery API not supported or blocked
      });
    }
  }, []);

  return { batteryLevel, isCharging };
}

// ==========================================
// Hook: useHeartbeat (Main Hook)
// ==========================================

export function useHeartbeat(
  riderId: string | null,
  taskId: string | null,
  config: Partial<HeartbeatConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [status, setStatus] = useState<HeartbeatStatus>({
    isMonitoring: false,
    lastHeartbeatAt: null,
    connectionStatus: 'ACTIVE',
    failedAttempts: 0,
    pendingHeartbeats: 0,
    lastError: null,
  });

  const { location, startWatching, stopWatching, getCurrentPosition } = useGeolocation();
  const { batteryLevel, isCharging } = useBatteryStatus();
  
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef<boolean>(true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Sync offline heartbeats
      syncOfflineHeartbeats();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (finalConfig.enableWebSocket && riderId) {
      socketRef.current = io(`/?XTransformPort=${HEARTBEAT_MONITOR_PORT}`, {
        transports: ['websocket'],
        autoConnect: false,
      });

      socketRef.current.on('connect', () => {
        console.log('Heartbeat monitor connected');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Heartbeat monitor disconnected');
      });

      socketRef.current.on('error', (error) => {
        console.error('Heartbeat monitor error:', error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [riderId, finalConfig.enableWebSocket]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!riderId) return;

    let currentLocation = location;
    if (!currentLocation) {
      try {
        currentLocation = await getCurrentPosition();
      } catch {
        setStatus(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1,
          lastError: 'Failed to get location',
        }));
        return;
      }
    }

    const heartbeatData: HeartbeatData = {
      riderId,
      taskId: taskId || undefined,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      speed: currentLocation.speed,
      heading: currentLocation.heading,
      accuracy: currentLocation.accuracy,
      batteryLevel: batteryLevel ?? undefined,
      isCharging,
      networkType: navigator.connection ? (navigator.connection as any).effectiveType : undefined,
    };

    if (!isOnlineRef.current) {
      // Offline - queue heartbeat
      if (finalConfig.enableOfflineQueue) {
        saveOfflineHeartbeat(heartbeatData);
        setStatus(prev => ({
          ...prev,
          pendingHeartbeats: getOfflineHeartbeats().length,
          connectionStatus: 'DISCONNECTED',
        }));
      }
      return;
    }

    // Try WebSocket first
    if (finalConfig.enableWebSocket && socketRef.current?.connected) {
      socketRef.current.emit('heartbeat', heartbeatData);
      setStatus(prev => ({
        ...prev,
        lastHeartbeatAt: new Date(),
        failedAttempts: 0,
        lastError: null,
        pendingHeartbeats: getOfflineHeartbeats().length,
      }));
      return;
    }

    // Fallback to HTTP
    try {
      const response = await fetch('/api/rider/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: heartbeatData.riderId,
          task_id: heartbeatData.taskId,
          latitude: heartbeatData.latitude,
          longitude: heartbeatData.longitude,
          speed: heartbeatData.speed,
          battery_level: heartbeatData.batteryLevel,
          heading: heartbeatData.heading,
          accuracy: heartbeatData.accuracy,
          is_charging: heartbeatData.isCharging,
          network_type: heartbeatData.networkType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed: ${response.status}`);
      }

      setStatus(prev => ({
        ...prev,
        lastHeartbeatAt: new Date(),
        failedAttempts: 0,
        lastError: null,
        pendingHeartbeats: getOfflineHeartbeats().length,
      }));
    } catch (error) {
      console.error('Heartbeat error:', error);
      
      // Queue for later if offline
      if (finalConfig.enableOfflineQueue) {
        saveOfflineHeartbeat(heartbeatData);
      }

      setStatus(prev => ({
        ...prev,
        failedAttempts: prev.failedAttempts + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        pendingHeartbeats: getOfflineHeartbeats().length,
      }));
    }
  }, [
    riderId, 
    taskId, 
    location, 
    batteryLevel, 
    isCharging, 
    getCurrentPosition,
    finalConfig.enableOfflineQueue,
    finalConfig.enableWebSocket,
  ]);

  // Sync offline heartbeats
  const syncOfflineHeartbeats = useCallback(async () => {
    const offlineHeartbeats = getOfflineHeartbeats();
    if (offlineHeartbeats.length === 0) return;

    console.log(`Syncing ${offlineHeartbeats.length} offline heartbeats...`);

    // Send the most recent heartbeat
    const latest = offlineHeartbeats[offlineHeartbeats.length - 1];
    
    try {
      await fetch('/api/rider/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: latest.riderId,
          task_id: latest.taskId,
          latitude: latest.latitude,
          longitude: latest.longitude,
          speed: latest.speed,
          battery_level: latest.batteryLevel,
          heading: latest.heading,
        }),
      });

      clearOfflineHeartbeats();
      setStatus(prev => ({
        ...prev,
        pendingHeartbeats: 0,
      }));
    } catch (error) {
      console.error('Failed to sync offline heartbeats:', error);
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!riderId) return;

    // Start watching location
    startWatching();

    // Connect WebSocket
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
      
      // Emit task start if we have a task
      if (taskId) {
        socketRef.current.emit('rider:task:start', { riderId, taskId });
      }
    }

    // Start heartbeat interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Then start interval
    intervalRef.current = setInterval(sendHeartbeat, finalConfig.intervalMs);

    setStatus(prev => ({
      ...prev,
      isMonitoring: true,
      connectionStatus: 'ACTIVE',
    }));

    console.log(`Heartbeat monitoring started for rider ${riderId}, task ${taskId || 'none'}`);
  }, [riderId, taskId, startWatching, sendHeartbeat, finalConfig.intervalMs]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    // Stop location watching
    stopWatching();

    // Disconnect WebSocket
    if (socketRef.current) {
      if (taskId && riderId) {
        socketRef.current.emit('rider:task:end', { riderId, taskId });
      }
      socketRef.current.disconnect();
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isMonitoring: false,
    }));

    console.log('Heartbeat monitoring stopped');
  }, [stopWatching, taskId, riderId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Pause monitoring (temporarily)
  const pauseMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  // Resume monitoring
  const resumeMonitoring = useCallback(() => {
    if (!riderId) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, finalConfig.intervalMs);
    setStatus(prev => ({ ...prev, isMonitoring: true }));
  }, [riderId, sendHeartbeat, finalConfig.intervalMs]);

  return {
    status,
    location,
    batteryLevel,
    isCharging,
    startMonitoring,
    stopMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    sendHeartbeat,
    syncOfflineHeartbeats,
  };
}

// ==========================================
// Hook: useClientTracking (For Clients)
// ==========================================

export function useClientTracking(riderId: string | null, taskId: string | null) {
  const [riderLocation, setRiderLocation] = useState<LocationData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('ACTIVE');
  const [isTracking, setIsTracking] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!riderId) return;

    socketRef.current = io(`/?XTransformPort=${HEARTBEAT_MONITOR_PORT}`, {
      transports: ['websocket'],
      autoConnect: false,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to heartbeat monitor for tracking');
      
      // Subscribe to rider location
      if (riderId) {
        socketRef.current?.emit('subscribe:rider', { riderId });
      }
      if (taskId) {
        socketRef.current?.emit('subscribe:task', { taskId });
      }
    });

    socketRef.current.on('rider:location', (data: any) => {
      setRiderLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
      });
      setConnectionStatus(data.connectionStatus || 'ACTIVE');
    });

    socketRef.current.on(`rider:${riderId}:status`, (data: any) => {
      setConnectionStatus(data.connectionStatus);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:rider', { riderId });
        socketRef.current.disconnect();
      }
    };
  }, [riderId, taskId]);

  const startTracking = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
      setIsTracking(true);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
      setIsTracking(false);
    }
  }, []);

  return {
    riderLocation,
    connectionStatus,
    isTracking,
    startTracking,
    stopTracking,
  };
}
