/**
 * Smart Ride Real Mapbox Map Component
 * 
 * A proper Mapbox GL JS map that shows:
 * - Roads and streets
 * - Buildings
 * - Points of Interest (restaurants, shops, etc.)
 * - Real-time location tracking
 * - Route visualization
 * 
 * Uses Mapbox GL JS SDK for full interactivity
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, Navigation, Locate, Layers, X } from 'lucide-react';

// ==========================================
// Types
// ==========================================

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface MapboxMapProps {
  pickup?: MapLocation | null;
  destination?: MapLocation | null;
  riderLocation?: MapLocation | null;
  showRoute?: boolean;
  interactive?: boolean;
  showPOIs?: boolean;
  className?: string;
  onLocationSelect?: (location: MapLocation) => void;
  onMapLoad?: () => void;
}

// ==========================================
// Map Styles
// ==========================================

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  navigation: 'mapbox://styles/mapbox/navigation-night-v1',
};

// ==========================================
// Component
// ==========================================

export function MapboxMap({
  pickup,
  destination,
  riderLocation,
  showRoute = true,
  interactive = true,
  showPOIs = true,
  className,
  onLocationSelect,
  onMapLoad,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<'streets' | 'dark' | 'satellite'>('streets');
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);
  const markersRef = useRef<any[]>([]);

  // Kampala center
  const KAMPALA_CENTER: [number, number] = [32.5825, 0.3476];

  // Initialize map
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    
    if (!token) {
      setMapError('Mapbox token not configured');
      setIsLoading(false);
      return;
    }

    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Dynamic import of mapbox-gl
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: MAP_STYLES[currentStyle],
          center: pickup ? [pickup.lng, pickup.lat] : KAMPALA_CENTER,
          zoom: 14,
          pitch: 0,
          bearing: 0,
        });

        // Add navigation controls
        if (interactive) {
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          map.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
          }), 'top-right');
        }

        // Map load event
        map.current.on('load', () => {
          setIsLoading(false);
          onMapLoad?.();

          // Add POI layer if enabled
          if (showPOIs) {
            addPOILayer(map.current);
          }

          // Fit bounds if both pickup and destination exist
          if (pickup && destination) {
            fitMapToBounds(map.current, pickup, destination);
          }
        });

        // Click handler for location selection
        if (interactive && onLocationSelect) {
          map.current.on('click', async (e: any) => {
            const { lng, lat } = e.lngLat;
            
            // Reverse geocode to get address
            const address = await reverseGeocode(lat, lng);
            
            onLocationSelect({
              lat,
              lng,
              address,
            });
          });
        }

        // Error handling
        map.current.on('error', (e: any) => {
          console.error('Map error:', e);
          setMapError('Failed to load map');
          setIsLoading(false);
        });

      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [currentStyle, interactive, showPOIs]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || isLoading) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const addMarker = async (location: MapLocation, type: 'pickup' | 'destination' | 'rider' | 'user') => {
      const mapboxgl = (await import('mapbox-gl')).default;
      
      const colors = {
        pickup: '#00FF88',
        destination: '#FF6B35',
        rider: '#00FF88',
        user: '#3B82F6',
      };

      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          background: ${colors[type]};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px ${colors[type]}40;
          cursor: pointer;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${type === 'pickup' || type === 'rider' ? '#0D0D12' : 'white'}" stroke-width="2">
            ${type === 'pickup' ? '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' : ''}
            ${type === 'destination' ? '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' : ''}
            ${type === 'rider' ? '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' : ''}
            ${type === 'user' ? '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>' : ''}
          </svg>
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.lng, location.lat])
        .addTo(map.current);

      markersRef.current.push(marker);
    };

    if (pickup) addMarker(pickup, 'pickup');
    if (destination) addMarker(destination, 'destination');
    if (riderLocation) addMarker(riderLocation, 'rider');
    if (userLocation) addMarker(userLocation, 'user');

    // Fit bounds if both locations exist
    if (pickup && destination) {
      fitMapToBounds(map.current, pickup, destination);
    }
  }, [pickup, destination, riderLocation, userLocation, isLoading]);

  // Draw route when both pickup and destination exist
  useEffect(() => {
    if (!map.current || !showRoute || !pickup || !destination || isLoading) return;

    drawRoute(map.current, pickup, destination);
  }, [pickup, destination, showRoute, isLoading]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Loading state
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

  // Error state
  if (mapError) {
    return (
      <div className={cn("relative bg-[#1A1A24] rounded-2xl overflow-hidden", className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">{mapError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Style Toggle */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-[#13131A]/90 backdrop-blur-sm rounded-lg p-1 flex gap-1">
          {(['streets', 'dark', 'satellite'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setCurrentStyle(style)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                currentStyle === style
                  ? "bg-[#00FF88] text-[#0D0D12]"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Location Selection Indicator */}
      {interactive && onLocationSelect && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-[#13131A]/90 backdrop-blur-sm border-white/10 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-[#00FF88]" />
              <span>Tap on map to select location</span>
            </div>
          </Card>
        </div>
      )}

      {/* Map Attribution */}
      <div className="absolute bottom-1 right-1 text-[8px] text-gray-600 bg-white/50 px-1 rounded">
        © Mapbox © OpenStreetMap
      </div>
    </div>
  );
}

// ==========================================
// Helper Functions
// ==========================================

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(`/api/mapbox/geocoding?lat=${lat}&lng=${lng}`);
    const data = await response.json();
    
    if (data.success && data.places.length > 0) {
      return data.places[0].fullAddress;
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function fitMapToBounds(map: any, pickup: MapLocation, destination: MapLocation) {
  const bounds = new (window as any).mapboxgl.LngLatBounds();
  bounds.extend([pickup.lng, pickup.lat]);
  bounds.extend([destination.lng, destination.lat]);
  
  map.fitBounds(bounds, {
    padding: { top: 80, bottom: 80, left: 80, right: 80 },
    maxZoom: 16,
  });
}

async function drawRoute(map: any, pickup: MapLocation, destination: MapLocation) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) return;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates;

      // Remove existing route layer
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }

      // Add route source
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      // Add route layer
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#00FF88',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    }
  } catch (error) {
    console.error('Error drawing route:', error);
  }
}

function addPOILayer(map: any) {
  // POI labels are already included in the streets style
  // This function can be used to add custom POI markers if needed
}

export default MapboxMap;
