'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Navigation,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  useSocketConnection,
  useDriverLocation,
  useTaskStatus,
} from '@/hooks/useSocket';
import type { LocationData, TaskStatusUpdateData } from '@/services/socket';

// ==========================================
// Types
// ==========================================

interface RiderLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
  connectionStatus: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
}

interface RiderTrackingProps {
  riderId: string;
  taskId: string;
  riderName?: string;
  onLocationUpdate?: (location: RiderLocation) => void;
  onConnectionStatusChange?: (status: string) => void;
}

const TOKEN_STORAGE_KEY = 'accessToken';
const UNSTABLE_TIMEOUT_MS = 30_000; // 30s without update → UNSTABLE
const DISCONNECTED_TIMEOUT_MS = 60_000; // 60s without update → DISCONNECTED

// ==========================================
// Component: RiderTracking
// ==========================================

export function RiderTracking({
  riderId,
  taskId,
  riderName = 'Rider',
  onLocationUpdate,
  onConnectionStatusChange,
}: RiderTrackingProps) {
  const [location, setLocation] = useState<RiderLocation | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('ACTIVE');
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read auth token from localStorage for socket connection
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      setAuthToken(token);
    } catch {
      // localStorage unavailable (SSR)
    }
  }, []);

  // Connect to Supabase Realtime
  const { isConnected } = useSocketConnection(authToken);

  // Handle rider location updates
  const handleLocationUpdate = useCallback(
    (data: LocationData) => {
      const newLocation: RiderLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        connectionStatus: 'ACTIVE',
      };

      setLocation(newLocation);
      setConnectionStatus('ACTIVE');
      setIsTracking(true);
      setError(null);
      onLocationUpdate?.(newLocation);
      onConnectionStatusChange?.('ACTIVE');
    },
    [onLocationUpdate, onConnectionStatusChange]
  );

  useDriverLocation(riderId, handleLocationUpdate);

  // Handle task status changes
  const handleStatusChange = useCallback(
    (data: TaskStatusUpdateData) => {
      // Task completion/cancellation ends tracking
      if (
        data.status === 'CANCELLED' ||
        data.status === 'COMPLETED' ||
        data.status === 'CLOSED'
      ) {
        setIsTracking(false);
      }
    },
    []
  );

  useTaskStatus(taskId, handleStatusChange);

  // Monitor connection health based on location update recency
  const lastUpdateRef = useRef<Date>(new Date());

  useEffect(() => {
    if (location) {
      lastUpdateRef.current = location.timestamp;
    }
  }, [location]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastUpdateRef.current.getTime();

      if (elapsed > DISCONNECTED_TIMEOUT_MS) {
        setConnectionStatus('DISCONNECTED');
        onConnectionStatusChange?.('DISCONNECTED');
      } else if (elapsed > UNSTABLE_TIMEOUT_MS) {
        setConnectionStatus('UNSTABLE');
        onConnectionStatusChange?.('UNSTABLE');
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [onConnectionStatusChange]);

  // Update tracking/error state based on socket connection
  useEffect(() => {
    if (isConnected && authToken) {
      setIsTracking(true);
      setError(null);
    } else if (!isConnected && authToken) {
      setError('Connection lost. Reconnecting...');
      setIsTracking(false);
    }
  }, [isConnected, authToken]);

  // Retry handler — re-read token and force reconnect
  const handleRetry = useCallback(() => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        // Setting a new token value triggers useSocketConnection reconnect
        setAuthToken(token);
      }
    } catch {
      // ignore
    }
  }, []);

  // Get connection status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ACTIVE': return 'bg-green-500';
      case 'UNSTABLE': return 'bg-yellow-500';
      case 'DISCONNECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Format time since last update
  const formatTimeSince = (date: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Map placeholder */}
        <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 relative">
          {/* Connection status overlay */}
          <div className="absolute top-2 right-2">
            <Badge
              variant={connectionStatus === 'ACTIVE' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {connectionStatus === 'ACTIVE' ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Live
                </>
              ) : connectionStatus === 'UNSTABLE' ? (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  Unstable
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>

          {/* Rider marker */}
          {location && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className={`w-8 h-8 rounded-full ${getStatusColor()} flex items-center justify-center shadow-lg`}>
                  <Navigation
                    className="h-4 w-4 text-white"
                    style={{
                      transform: location.heading
                        ? `rotate(${location.heading}deg)`
                        : undefined
                    }}
                  />
                </div>
                {location.speed !== undefined && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                    {Math.round(location.speed)} km/h
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No location placeholder */}
          {!location && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-1" />
                <p className="text-sm">Getting rider location...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="text-center text-white">
                <WifiOff className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm">{error}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="font-medium">{riderName}</span>
            </div>

            {location && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeSince(location.timestamp)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Connection quality indicator */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Connection Quality</span>
              <span>
                {connectionStatus === 'ACTIVE' ? 'Excellent' :
                 connectionStatus === 'UNSTABLE' ? 'Poor' : 'Lost'}
              </span>
            </div>
            <Progress
              value={
                connectionStatus === 'ACTIVE' ? 100 :
                connectionStatus === 'UNSTABLE' ? 40 : 0
              }
              className="h-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// Component: RiderTrackingMini
// Mini version for task cards
// ==========================================

interface RiderTrackingMiniProps {
  riderId: string;
  taskId: string;
  riderName?: string;
}

export function RiderTrackingMini({
  riderId,
  taskId,
  riderName = 'Rider',
}: RiderTrackingMiniProps) {
  const [connectionStatus, setConnectionStatus] = useState<string>('ACTIVE');
  const lastUpdateRef = useRef<Date>(new Date());

  // Track rider location to infer connection status
  const handleLocationUpdate = useCallback(
    (data: LocationData) => {
      lastUpdateRef.current = data.timestamp ? new Date(data.timestamp) : new Date();
      setConnectionStatus('ACTIVE');
    },
    []
  );

  useDriverLocation(riderId, handleLocationUpdate);

  // Also listen on task status for completeness
  useTaskStatus(taskId, undefined);

  // Monitor connection health based on update recency
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastUpdateRef.current.getTime();
      if (elapsed > DISCONNECTED_TIMEOUT_MS) {
        setConnectionStatus('DISCONNECTED');
      } else if (elapsed > UNSTABLE_TIMEOUT_MS) {
        setConnectionStatus('UNSTABLE');
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ACTIVE': return 'bg-green-500';
      case 'UNSTABLE': return 'bg-yellow-500';
      case 'DISCONNECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-sm font-medium">{riderName}</span>
      {connectionStatus !== 'ACTIVE' && (
        <Badge variant="outline" className="text-xs">
          {connectionStatus === 'UNSTABLE' ? 'Unstable' : 'Offline'}
        </Badge>
      )}
    </div>
  );
}

export default RiderTracking;
