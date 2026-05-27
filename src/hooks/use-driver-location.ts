'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/services/socket';

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

// ==========================================
// Hook: useDriverLocation
// ==========================================
// Uses the central socketService (port 3001 via XTransformPort)
// instead of creating a separate socket connection.

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

  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<DriverLocation | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketUnsubsRef = useRef<Array<() => void>>([]);

  // Track socket connection status
  useEffect(() => {
    const unsubConnect = socketService.on('connect', () => {
      setIsConnected(true);
      onConnectionChange?.(true);
    });

    const unsubDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
      onConnectionChange?.(false);
    });

    // Set initial state
    setIsConnected(socketService.isConnectedToSocket());

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, [onConnectionChange]);

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

    // Send to server via central socket service
    if (socketService.isConnectedToSocket() && isOnline) {
      const update: LocationUpdate = {
        driver_id: driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
      };

      // Emit via the central socketService (which connects to port 3001 via XTransformPort)
      socketService.updateLocation({
        riderId: driverId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        heading: location.heading,
      });

      // Also emit via the alias event name for compatibility
      socketService.updateDriverLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
      });
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
  // Online/Offline Control (via API + socket)
  // ==========================================

  const goOnline = useCallback(async () => {
    if (!currentLocation) {
      setError('Cannot go online without location');
      return;
    }

    // Update rider status via API (which also notifies the realtime service)
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/riders/status?XTransformPort=3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          isOnline: true,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });

      if (response.ok) {
        setIsOnline(true);
        setError(null);
      } else {
        setError('Failed to go online');
      }
    } catch (err) {
      console.error('[DriverLocation] Error going online:', err);
      setError('Failed to go online');
    }
  }, [currentLocation]);

  const goOffline = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/riders/status?XTransformPort=3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isOnline: false }),
      });
    } catch (err) {
      console.error('[DriverLocation] Error going offline:', err);
    }
    setIsOnline(false);
  }, []);

  // ==========================================
  // Tracking Control
  // ==========================================

  const startTracking = useCallback(() => {
    startGeolocation();
  }, [startGeolocation]);

  const stopTracking = useCallback(() => {
    stopGeolocation();
    if (isOnline) {
      goOffline();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [stopGeolocation, isOnline, goOffline]);

  // ==========================================
  // Periodic location updates while online
  // ==========================================

  useEffect(() => {
    if (isOnline && currentLocation) {
      // Periodic location updates while online
      intervalRef.current = setInterval(() => {
        // Request fresh position
        navigator.geolocation.getCurrentPosition(
          handlePositionUpdate,
          handlePositionError,
          { enableHighAccuracy, timeout: 5000, maximumAge: 0 }
        );
      }, updateInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isOnline, currentLocation, updateInterval, enableHighAccuracy, handlePositionUpdate, handlePositionError]);

  // ==========================================
  // Cleanup on unmount
  // ==========================================

  useEffect(() => {
    return () => {
      stopGeolocation();
      socketUnsubsRef.current.forEach(unsub => unsub());
      socketUnsubsRef.current = [];
    };
  }, [stopGeolocation]);

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
