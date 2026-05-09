'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Navigation, 
  Battery, 
  BatteryLow, 
  Wifi, 
  WifiOff,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

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

const HEARTBEAT_MONITOR_PORT = 3004;

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
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTrackingRef = useRef<() => void>(() => {});

  // Initialize tracking function stored in ref to avoid circular dependency
  startTrackingRef.current = () => {
    if (socketRef.current?.connected) return;

    setError(null);

    socketRef.current = io(`/?XTransformPort=${HEARTBEAT_MONITOR_PORT}`, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to tracking service');
      setIsTracking(true);
      
      // Subscribe to rider and task
      socketRef.current?.emit('subscribe:rider', { riderId });
      socketRef.current?.emit('subscribe:task', { taskId });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from tracking service');
      setIsTracking(false);
      setError('Connection lost. Reconnecting...');
      
      // Auto-reconnect using ref
      reconnectTimeoutRef.current = setTimeout(() => {
        startTrackingRef.current();
      }, 3000);
    });

    // Receive rider location updates
    socketRef.current.on('rider:location', (data: any) => {
      const newLocation: RiderLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(data.timestamp),
        connectionStatus: data.connectionStatus || 'ACTIVE',
      };
      
      setLocation(newLocation);
      setConnectionStatus(newLocation.connectionStatus);
      onLocationUpdate?.(newLocation);
      onConnectionStatusChange?.(newLocation.connectionStatus);
    });

    // Receive task location updates
    socketRef.current.on('task:location', (data: any) => {
      const newLocation: RiderLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date(data.timestamp),
        connectionStatus: 'ACTIVE',
      };
      
      setLocation(prev => prev ? { ...newLocation, connectionStatus: prev.connectionStatus } : newLocation);
    });

    // Receive status updates
    socketRef.current.on(`rider:${riderId}:status`, (data: any) => {
      setConnectionStatus(data.connectionStatus);
      onConnectionStatusChange?.(data.connectionStatus);
    });

    socketRef.current.on('error', (err: any) => {
      console.error('Tracking error:', err);
      setError('Failed to connect to tracking service');
    });
  };

  // Initialize tracking
  const startTracking = useCallback(() => {
    startTrackingRef.current();
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:rider', { riderId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsTracking(false);
  }, [riderId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Auto-start tracking
  useEffect(() => {
    startTracking();
  }, [startTracking]);

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
                <Button size="sm" variant="outline" className="mt-2" onClick={startTracking}>
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(`/?XTransformPort=${HEARTBEAT_MONITOR_PORT}`, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('subscribe:rider', { riderId });
    });

    socketRef.current.on('rider:location', (data: any) => {
      setConnectionStatus(data.connectionStatus || 'ACTIVE');
    });

    socketRef.current.on(`rider:${riderId}:status`, (data: any) => {
      setConnectionStatus(data.connectionStatus);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [riderId]);

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
