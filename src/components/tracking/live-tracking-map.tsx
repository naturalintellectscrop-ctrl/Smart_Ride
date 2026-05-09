'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Bike,
  Car,
  Package
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

export interface Location {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingMapProps {
  driverId: string;
  driverName: string;
  driverPhone?: string;
  vehicleType: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';
  pickupLocation: Location;
  pickupAddress: string;
  dropoffLocation?: Location;
  dropoffAddress?: string;
  onCallDriver?: () => void;
  onMessageDriver?: () => void;
  className?: string;
}

interface DriverPosition {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: Date;
}

interface TrackingState {
  phase: 'searching' | 'driver_assigned' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'in_progress' | 'completed';
  eta: number;
  distance: number;
  progress: number;
}

// ==========================================
// Helpers
// ==========================================

function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371;
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ==========================================
// Component
// ==========================================

export function LiveTrackingMap({
  driverId,
  driverName,
  driverPhone,
  vehicleType,
  pickupLocation,
  pickupAddress,
  dropoffLocation,
  dropoffAddress,
  onCallDriver,
  onMessageDriver,
  className,
}: LiveTrackingMapProps) {
  // Initialize driver position from props - using function initializer to compute once
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(() => ({
    latitude: pickupLocation.latitude + 0.01,
    longitude: pickupLocation.longitude + 0.01,
    heading: 0,
    speed: 30,
    timestamp: new Date(),
  }));
  const [trackingState, setTrackingState] = useState<TrackingState>({
    phase: 'en_route_to_pickup',
    eta: 0,
    distance: 0,
    progress: 0,
  });
  const [isConnected, setIsConnected] = useState(true);

  const [animatedPosition, setAnimatedPosition] = useState<DriverPosition | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastPositionRef = useRef<DriverPosition | null>(null);

  // ==========================================
  // Smooth Marker Animation
  // ==========================================

  useEffect(() => {
    if (!driverPosition) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startPos = lastPositionRef.current || driverPosition;
    const endPos = driverPosition;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedPosition({
        latitude: startPos.latitude + (endPos.latitude - startPos.latitude) * easeProgress,
        longitude: startPos.longitude + (endPos.longitude - startPos.longitude) * easeProgress,
        heading: endPos.heading,
        speed: endPos.speed,
        timestamp: endPos.timestamp,
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        lastPositionRef.current = driverPosition;
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [driverPosition]);

  // ==========================================
  // ETA Calculation
  // ==========================================

  const calculateETA = useCallback(() => {
    if (!animatedPosition) return;

    let distance: number;
    let eta: number;
    let progress: number;

    if (trackingState.phase === 'en_route_to_pickup') {
      distance = calculateDistance(animatedPosition, pickupLocation);
      const avgSpeed = vehicleType === 'CAR' ? 25 : 35;
      eta = Math.round((distance / avgSpeed) * 60);
      progress = Math.max(0, Math.min(30, (1 - distance / 5) * 30));
    } else if (trackingState.phase === 'in_progress' && dropoffLocation) {
      distance = calculateDistance(animatedPosition, dropoffLocation);
      const avgSpeed = vehicleType === 'CAR' ? 25 : 35;
      eta = Math.round((distance / avgSpeed) * 60);
      const totalDistance = calculateDistance(pickupLocation, dropoffLocation);
      progress = Math.min(100, 30 + (1 - distance / totalDistance) * 70);
    } else {
      distance = 0;
      eta = 0;
      progress = 0;
    }

    setTrackingState(prev => ({
      ...prev,
      eta,
      distance,
      progress,
    }));
  }, [animatedPosition, pickupLocation, dropoffLocation, vehicleType, trackingState.phase]);

  useEffect(() => {
    const interval = setInterval(calculateETA, 2000);
    return () => clearInterval(interval);
  }, [calculateETA]);

  // ==========================================
  // Mock Location Updates (for demo)
  // ==========================================

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPosition(prev => {
        if (!prev) return null;
        const baseLat = prev.latitude;
        const baseLon = prev.longitude;
        const latDiff = pickupLocation.latitude - baseLat;
        const lonDiff = pickupLocation.longitude - baseLon;
        const moveSpeed = 0.0003;

        return {
          latitude: baseLat + (latDiff > 0 ? moveSpeed : -moveSpeed),
          longitude: baseLon + (lonDiff > 0 ? moveSpeed : -moveSpeed),
          heading: Math.atan2(lonDiff, latDiff) * (180 / Math.PI),
          speed: 25 + Math.random() * 10,
          timestamp: new Date(),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [pickupLocation]);

  // ==========================================
  // Vehicle Icon
  // ==========================================

  const getVehicleIcon = () => {
    switch (vehicleType) {
      case 'CAR':
        return <Car className="h-5 w-5" />;
      case 'BICYCLE':
        return <Bike className="h-5 w-5" />;
      default:
        return <Bike className="h-5 w-5" />;
    }
  };

  const getPhaseStatus = () => {
    switch (trackingState.phase) {
      case 'searching':
        return { text: 'Finding driver...', color: 'text-yellow-400' };
      case 'driver_assigned':
        return { text: 'Driver assigned', color: 'text-blue-400' };
      case 'en_route_to_pickup':
        return { text: 'Driver en route', color: 'text-[#00FF88]' };
      case 'arrived_at_pickup':
        return { text: 'Driver arrived', color: 'text-[#00FF88]' };
      case 'in_progress':
        return { text: 'Trip in progress', color: 'text-[#00FF88]' };
      case 'completed':
        return { text: 'Trip completed', color: 'text-green-400' };
      default:
        return { text: 'Unknown', color: 'text-gray-400' };
    }
  };

  const status = getPhaseStatus();

  return (
    <Card className={cn("overflow-hidden bg-[#0D0D12] border-white/5", className)}>
      {/* Map Area */}
      <div className="h-64 bg-gradient-to-br from-[#1a2e1a] to-[#0D0D12] relative">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(10)].map((_, i) => (
            <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-white/20" style={{ top: `${i * 10}%` }} />
          ))}
          {[...Array(10)].map((_, i) => (
            <div key={`v-${i}`} className="absolute top-0 bottom-0 border-l border-white/20" style={{ left: `${i * 10}%` }} />
          ))}
        </div>

        {/* Pickup Marker */}
        <div className="absolute transform -translate-x-1/2 -translate-y-full" style={{ left: '50%', top: '60%' }}>
          <div className="relative">
            <div className="w-8 h-8 bg-[#00FF88] rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <MapPin className="h-4 w-4 text-[#0D0D12]" />
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#00FF88]" />
          </div>
          <div className="mt-2 px-2 py-1 bg-[#1A1A24] rounded text-xs text-white whitespace-nowrap">Pickup</div>
        </div>

        {/* Dropoff Marker */}
        {dropoffLocation && (
          <div className="absolute transform -translate-x-1/2 -translate-y-full" style={{ left: '70%', top: '30%' }}>
            <div className="relative">
              <div className="w-8 h-8 bg-[#F97316] rounded-full flex items-center justify-center shadow-lg">
                <Navigation className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#F97316]" />
            </div>
            <div className="mt-2 px-2 py-1 bg-[#1A1A24] rounded text-xs text-white whitespace-nowrap">Dropoff</div>
          </div>
        )}

        {/* Driver Marker */}
        {animatedPosition && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-out"
            style={{
              left: `${50 + (animatedPosition.longitude - pickupLocation.longitude) * 1000}%`,
              top: `${60 - (animatedPosition.latitude - pickupLocation.latitude) * 1000}%`,
            }}
          >
            <div
              className="w-10 h-10 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              style={{
                transform: `rotate(${animatedPosition.heading}deg)`,
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
              }}
            >
              {getVehicleIcon()}
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-[#1A1A24] rounded text-xs text-white font-medium whitespace-nowrap">
              {Math.round(animatedPosition.speed)} km/h
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="absolute top-3 right-3">
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1.5",
              isConnected ? "border-[#00FF88]/50 text-[#00FF88]" : "border-red-500/50 text-red-400"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[#00FF88] animate-pulse" : "bg-red-500")} />
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Info Panel */}
      <div className="p-4 space-y-4">
        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-full flex items-center justify-center">
              {getVehicleIcon()}
            </div>
            <div>
              <p className="font-semibold text-white">{driverName}</p>
              <p className={cn("text-xs", status.color)}>{status.text}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {onCallDriver && (
              <Button size="icon" variant="outline" onClick={onCallDriver} className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5">
                <Phone className="h-4 w-4" />
              </Button>
            )}
            {onMessageDriver && (
              <Button size="icon" variant="outline" onClick={onMessageDriver} className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5">
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ETA and Distance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#1A1A24] rounded-xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Clock className="h-3 w-3" />
              <span>ETA</span>
            </div>
            <p className="text-xl font-bold text-[#00FF88]">{formatDuration(trackingState.eta)}</p>
          </div>
          <div className="p-3 bg-[#1A1A24] rounded-xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <MapPin className="h-3 w-3" />
              <span>Distance</span>
            </div>
            <p className="text-xl font-bold text-white">{formatDistance(trackingState.distance)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/50">
            <span>Progress</span>
            <span>{trackingState.progress}%</span>
          </div>
          <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00FF88] to-[#10B981] rounded-full transition-all duration-500"
              style={{ width: `${trackingState.progress}%` }}
            />
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-[#00FF88]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="h-3 w-3 text-[#00FF88]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs">Pickup</p>
              <p className="text-white truncate">{pickupAddress}</p>
            </div>
          </div>
          {dropoffAddress && (
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-[#F97316]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Navigation className="h-3 w-3 text-[#F97316]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-xs">Dropoff</p>
                <p className="text-white truncate">{dropoffAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default LiveTrackingMap;
