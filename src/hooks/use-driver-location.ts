'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// ==========================================
// Types
// ==========================================

export interface DriverLocation {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
}

export interface LocationUpdate {
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
  accuracy?: number;
  battery_level?: number;
  is_charging?: boolean;
}

export interface UseDriverLocationConfig {
  driverId: string;
  driverName: string;
  driverRole: 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';
  updateInterval?: number; // milliseconds, default 3000 (3 seconds)
  enableHighAccuracy?: boolean;
  onLocationUpdate?: (location: DriverLocation) => void;
  onError?: (error: GeolocationPositionError | Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseDriverLocationReturn {
  currentLocation: DriverLocation | null;
  isTracking: boolean;
  isOnline: boolean;
  isConnected: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  goOnline: () => void;
  goOffline: () => void;
  lastUpdateTime: Date | null;
  totalDistance: number;
}

const DISPATCH_SERVICE_URL = process.env.NEXT_PUBLIC_DISPATCH_SERVICE_URL || 'http://localhost:3003';

// ==========================================
// Hook: useDriverLocation
// ==========================================

export function useDriverLocation({
  driverId,
  driverName,
  driverRole,
  updateInterval = 3000,
  enableHighAccuracy = true,
  onLocationUpdate,
  onError,
  onConnectionChange,
}: UseDriverLocationConfig): UseDriverLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<DriverLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<DriverLocation | null>(null);

  // ==========================================
  // Socket Connection
  // ==========================================

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(DISPATCH_SERVICE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current.on('connect', () => {
      console.log('[DriverLocation] Connected to dispatch service');
      setIsConnected(true);
      setError(null);
      onConnectionChange?.(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[DriverLocation] Disconnected from dispatch service');
      setIsConnected(false);
      onConnectionChange?.(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('[DriverLocation] Connection error:', err);
      setError('Failed to connect to dispatch service');
    });

    socketRef.current.on('rider:online:ack', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        console.log('[DriverLocation] Successfully went online');
        setIsOnline(true);
      } else {
        console.error('[DriverLocation] Failed to go online:', data.error);
        setError(data.error || 'Failed to go online');
      }
    });

    socketRef.current.on('rider:offline:ack', (data: { success: boolean }) => {
      if (data.success) {
        console.log('[DriverLocation] Successfully went offline');
        setIsOnline(false);
      }
    });
  }, [onConnectionChange]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // ==========================================
  // Geolocation Tracking
  // ==========================================

  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    const location: DriverLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // Convert m/s to km/h
      heading: position.coords.heading || 0,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    };

    // Calculate distance from last location
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        location.latitude,
        location.longitude
      );
      setTotalDistance(prev => prev + distance);
    }

    lastLocationRef.current = location;
    setCurrentLocation(location);
    setLastUpdateTime(new Date());

    // Send to server
    if (socketRef.current?.connected && isOnline) {
      const update: LocationUpdate = {
        driver_id: driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
      };

      socketRef.current.emit('rider:location', update);
    }

    onLocationUpdate?.(location);
  }, [driverId, isOnline, onLocationUpdate]);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    console.error('[DriverLocation] Geolocation error:', err);
    setError(err.message);
    onError?.(err);
  }, [onError]);

  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0,
    };

    // Use watchPosition for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );

    setIsTracking(true);
    console.log('[DriverLocation] Started geolocation tracking');
  }, [enableHighAccuracy, handlePositionUpdate, handlePositionError]);

  const stopGeolocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    console.log('[DriverLocation] Stopped geolocation tracking');
  }, []);

  // ==========================================
  // Online/Offline Control
  // ==========================================

  const goOnline = useCallback(async () => {
    if (!currentLocation) {
      setError('Cannot go online without location');
      return;
    }

    if (!socketRef.current?.connected) {
      connectSocket();
      // Wait for connection
      await new Promise(resolve => {
        socketRef.current?.once('connect', resolve);
      });
    }

    socketRef.current?.emit('rider:online', {
      riderId: driverId,
      name: driverName,
      role: driverRole,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    });
  }, [currentLocation, driverId, driverName, driverRole, connectSocket]);

  const goOffline = useCallback(() => {
    socketRef.current?.emit('rider:offline', { riderId: driverId });
    setIsOnline(false);
  }, [driverId]);

  // ==========================================
  // Tracking Control
  // ==========================================

  const startTracking = useCallback(() => {
    connectSocket();
    startGeolocation();
  }, [connectSocket, startGeolocation]);

  const stopTracking = useCallback(() => {
    stopGeolocation();
    if (isOnline) {
      goOffline();
    }
  }, [stopGeolocation, isOnline, goOffline]);

  // ==========================================
  // Cleanup
  // ==========================================

  useEffect(() => {
    return () => {
      stopGeolocation();
      disconnectSocket();
    };
  }, [stopGeolocation, disconnectSocket]);

  // ==========================================
  // Auto-start if isOnline
  // ==========================================

  useEffect(() => {
    if (isOnline && currentLocation) {
      // Periodic location updates while online
      const interval = setInterval(() => {
        // Request fresh position
        navigator.geolocation.getCurrentPosition(
          handlePositionUpdate,
          handlePositionError,
          { enableHighAccuracy, timeout: 5000, maximumAge: 0 }
        );
      }, updateInterval);

      return () => clearInterval(interval);
    }
  }, [isOnline, currentLocation, updateInterval, enableHighAccuracy, handlePositionUpdate, handlePositionError]);

  return {
    currentLocation,
    isTracking,
    isOnline,
    isConnected,
    error,
    startTracking,
    stopTracking,
    goOnline,
    goOffline,
    lastUpdateTime,
    totalDistance,
  };
}

// ==========================================
// Helper Functions
// ==========================================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default useDriverLocation;
