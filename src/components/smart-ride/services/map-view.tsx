'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, Navigation, Locate } from 'lucide-react';

interface MapViewProps {
  pickup?: { lat: number; lng: number; address: string } | null;
  destination?: { lat: number; lng: number; address: string } | null;
  className?: string;
  showRoute?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Kampala bounding box for demo
const KAMPALA_BOUNDS = {
  north: 0.45,
  south: 0.25,
  east: 32.65,
  west: 32.52,
};

// Default Kampala center
const KAMPALA_CENTER = { lat: 0.3476, lng: 32.5825 };

export function MapView({
  pickup,
  destination,
  className,
  showRoute = true,
  onMapClick,
  interactive = false,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(() => {
    // Initialize with Kampala center as default
    return KAMPALA_CENTER;
  });

  // Simulate map loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Get current location asynchronously
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Keep default Kampala center if geolocation fails
        }
      );
    }
  }, []);

  // Calculate route distance and time (Haversine formula)
  const calculateRoute = () => {
    if (!pickup || !destination) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
    const dLon = (destination.lng - pickup.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate time based on average speed (30 km/h in city)
    const timeMinutes = Math.round((distance / 30) * 60);

    return { distance: distance.toFixed(1), timeMinutes };
  };

  const route = calculateRoute();

  // Generate path points for route visualization
  const generateRoutePath = () => {
    if (!pickup || !destination) return '';

    // Create a slightly curved path between points
    const midLat = (pickup.lat + destination.lat) / 2 + 0.01;
    const midLng = (pickup.lng + destination.lng) / 2 - 0.01;

    return `M ${50} ${20} Q ${30} ${50}, ${50} ${80} T ${80} ${85}`;
  };

  if (isLoading) {
    return (
      <div className={cn("relative bg-[#1A1A24] rounded-2xl overflow-hidden", className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-[#00FF88] animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-[#1A1A24] rounded-2xl overflow-hidden", className)}>
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0">
        {/* Stylized Map Background */}
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid pattern for streets */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
            </pattern>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FF88" stopOpacity="1" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="1" />
            </linearGradient>
          </defs>
          
          {/* Background */}
          <rect width="100" height="100" fill="#1A1A24" />
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Simulated roads */}
          <path d="M 0 30 L 100 30" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <path d="M 0 50 L 100 50" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <path d="M 0 70 L 100 70" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <path d="M 30 0 L 30 100" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <path d="M 50 0 L 50 100" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <path d="M 70 0 L 70 100" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          
          {/* Buildings/blocks */}
          <rect x="15" y="35" width="8" height="10" fill="rgba(255,255,255,0.03)" rx="1" />
          <rect x="55" y="35" width="12" height="10" fill="rgba(255,255,255,0.03)" rx="1" />
          <rect x="75" y="55" width="10" height="8" fill="rgba(255,255,255,0.03)" rx="1" />
          <rect x="5" y="75" width="15" height="12" fill="rgba(255,255,255,0.03)" rx="1" />
          <rect x="55" y="75" width="18" height="15" fill="rgba(255,255,255,0.03)" rx="1" />
          
          {/* Route line if both points exist */}
          {pickup && destination && showRoute && (
            <>
              {/* Route glow */}
              <path
                d={generateRoutePath()}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.5"
              />
              {/* Main route */}
              <path
                d={generateRoutePath()}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="0.4"
                strokeLinecap="round"
                strokeDasharray="2,1"
              />
            </>
          )}
        </svg>

        {/* Pickup marker */}
        {pickup && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{ left: '50%', top: '20%' }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-[#00FF88] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <MapPin className="h-4 w-4 text-black" />
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-[#00FF88]" />
            </div>
          </div>
        )}

        {/* Destination marker */}
        {destination && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{ left: '80%', top: '85%' }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Navigation className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-orange-500" />
            </div>
          </div>
        )}

        {/* Current location marker */}
        {currentLocation && !pickup && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: '50%', top: '50%' }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-30" />
            </div>
          </div>
        )}
      </div>

      {/* Route Info Overlay */}
      {route && showRoute && (
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-black/60 backdrop-blur-lg border-white/10 p-3">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-[#00FF88] text-lg font-bold">{route.distance} km</p>
                <p className="text-gray-400 text-xs">Distance</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-orange-400 text-lg font-bold">{route.timeMinutes} min</p>
                <p className="text-gray-400 text-xs">Est. Time</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Locate Me Button */}
      {interactive && (
        <button
          className="absolute top-4 right-4 w-10 h-10 bg-[#13131A] border border-white/10 rounded-full flex items-center justify-center hover:bg-[#1A1A24] transition-colors"
          onClick={() => {
            if (currentLocation) {
              onMapClick?.(currentLocation.lat, currentLocation.lng);
            }
          }}
        >
          <Locate className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-1 right-2 text-[8px] text-gray-600">
        Map data © OpenStreetMap
      </div>
    </div>
  );
}

// Full-screen map with controls for location picking
interface LocationMapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number };
  type: 'pickup' | 'destination';
  onClose: () => void;
}

export function LocationMapPicker({
  onLocationSelect,
  initialLocation,
  type,
  onClose,
}: LocationMapPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );

  // Predefined locations for demo
  const predefinedLocations = [
    { name: 'Kampala Central', lat: 0.3176, lng: 32.5825 },
    { name: 'Nakasero', lat: 0.3276, lng: 32.5725 },
    { name: 'Kololo', lat: 0.3376, lng: 32.5925 },
    { name: 'Ntinda', lat: 0.3576, lng: 32.6125 },
    { name: 'Mengo', lat: 0.3076, lng: 32.5625 },
    { name: 'Kisenyi', lat: 0.3176, lng: 32.5525 },
    { name: 'Wandegeya', lat: 0.3476, lng: 32.5725 },
    { name: 'Makerere', lat: 0.3376, lng: 32.5625 },
  ];

  const handleLocationClick = (location: { name: string; lat: number; lng: number }) => {
    setSelectedLocation({ lat: location.lat, lng: location.lng });
    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      address: location.name,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0D0D12] z-50">
      {/* Map */}
      <MapView
        pickup={type === 'pickup' && selectedLocation ? {
          ...selectedLocation,
          address: 'Selected location'
        } : undefined}
        destination={type === 'destination' && selectedLocation ? {
          ...selectedLocation,
          address: 'Selected location'
        } : undefined}
        className="h-1/2"
        showRoute={false}
        interactive
        onMapClick={(lat, lng) => {
          setSelectedLocation({ lat, lng });
          onLocationSelect({
            lat,
            lng,
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          });
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 w-10 h-10 bg-[#13131A] border border-white/10 rounded-full flex items-center justify-center"
      >
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Selected location info */}
      {selectedLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#13131A] border border-white/10 rounded-full px-4 py-2">
          <p className="text-white text-sm font-medium">
            {type === 'pickup' ? 'Pickup' : 'Destination'} selected
          </p>
        </div>
      )}

      {/* Location picker panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#13131A] rounded-t-3xl p-4 max-h-[50%] overflow-y-auto">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-3">Select {type === 'pickup' ? 'Pickup' : 'Destination'}</h3>
        
        <div className="space-y-2">
          {predefinedLocations.map((location) => (
            <button
              key={location.name}
              onClick={() => handleLocationClick(location)}
              className={cn(
                "w-full p-4 rounded-xl flex items-center gap-3 transition-all text-left",
                selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                  ? "bg-[#00FF88]/15 border border-[#00FF88]/30"
                  : "bg-[#1A1A24] border border-white/5 hover:border-white/10"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                type === 'pickup' ? "bg-[#00FF88]/20" : "bg-orange-500/20"
              )}>
                <MapPin className={cn(
                  "h-5 w-5",
                  type === 'pickup' ? "text-[#00FF88]" : "text-orange-500"
                )} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{location.name}</p>
                <p className="text-gray-400 text-sm">Kampala, Uganda</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
