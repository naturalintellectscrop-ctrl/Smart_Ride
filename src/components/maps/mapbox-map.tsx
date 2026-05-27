'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { 
  MAPBOX_CONFIG, 
  Coordinates, 
  getDirections,
  formatDistance,
  formatDuration
} from '@/lib/maps/mapbox-service';

// ==========================================
// Types
// ==========================================

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  type: 'pickup' | 'dropoff' | 'driver' | 'merchant' | 'custom';
  label?: string;
  color?: string;
}

export interface MapRoute {
  pickup: Coordinates;
  dropoff: Coordinates;
  waypoints?: Coordinates[];
}

export interface MapboxMapProps {
  className?: string;
  center?: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  route?: MapRoute;
  showUserLocation?: boolean;
  onMapClick?: (coordinates: Coordinates) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  onLocationSelect?: (coordinates: Coordinates, address: string) => void;
  interactive?: boolean;
  showControls?: boolean;
}

// ==========================================
// Component
// ==========================================

export function MapboxMap({
  className,
  center = MAPBOX_CONFIG.defaultCenter,
  zoom = MAPBOX_CONFIG.defaultZoom,
  markers = [],
  route,
  showUserLocation = false,
  onMapClick,
  onMarkerClick,
  interactive = true,
  showControls = true,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routeLayerRef = useRef<string | null>(null);
  const userLocationMarker = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

  // ==========================================
  // Initialize Map (dynamic import of mapbox-gl)
  // ==========================================

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        // Dynamic import of mapbox-gl to reduce initial bundle size
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled) return;
        mapboxglRef.current = mapboxgl;

        mapboxgl.accessToken = MAPBOX_CONFIG.token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: MAPBOX_CONFIG.style,
          center: [center.longitude, center.latitude],
          zoom: zoom,
          interactive: interactive,
        });

        map.current.on('load', () => {
          if (!cancelled) setIsLoading(false);
        });

        map.current.on('click', (e: any) => {
          if (onMapClick) {
            onMapClick({
              latitude: e.lngLat.lat,
              longitude: e.lngLat.lng,
            });
          }
        });

        // Add navigation controls
        if (showControls && interactive) {
          map.current.addControl(
            new mapboxgl.NavigationControl({
              showCompass: true,
              showZoom: true,
            }),
            'top-right'
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Map initialization error:', error);
          setMapError('Failed to initialize map');
          setIsLoading(false);
        }
      }
    };

    initMap();

    // Clean up on unmount
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ==========================================
  // Update Center
  // ==========================================

  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center: [center.longitude, center.latitude],
        zoom: zoom,
        duration: 1000,
      });
    }
  }, [center.latitude, center.longitude, zoom]);

  // ==========================================
  // Add Markers (uses dynamic mapbox-gl ref)
  // ==========================================

  useEffect(() => {
    if (!map.current || isLoading || !mapboxglRef.current) return;

    const mapboxgl = mapboxglRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker: any) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    markers.forEach((markerData) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';

      // Set marker color based on type
      const colors: Record<string, string> = {
        pickup: '#00FF88',
        dropoff: '#F97316',
        driver: '#3B82F6',
        merchant: '#8B5CF6',
        custom: markerData.color || '#6B7280',
      };

      const color = colors[markerData.type] || markerData.color || '#6B7280';
      
      el.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" fill="${color}" fill-opacity="0.2"/>
          <circle cx="20" cy="20" r="12" fill="${color}"/>
          <circle cx="20" cy="20" r="8" fill="white"/>
        </svg>
      `;

      if (onMarkerClick) {
        el.addEventListener('click', () => onMarkerClick(markerData));
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([markerData.coordinates.longitude, markerData.coordinates.latitude])
        .addTo(map.current!);

      if (markerData.label) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setText(markerData.label);
        marker.setPopup(popup);
      }

      markersRef.current.set(markerData.id, marker);
    });
  }, [markers, isLoading, onMarkerClick]);

  // ==========================================
  // Draw Route
  // ==========================================

  useEffect(() => {
    if (!map.current || isLoading) return;

    const drawRoute = async () => {
      if (!route) {
        // Remove existing route layer
        if (routeLayerRef.current && map.current?.getLayer(routeLayerRef.current)) {
          map.current.removeLayer(routeLayerRef.current);
          map.current.removeSource(routeLayerRef.current);
        }
        setRouteInfo(null);
        return;
      }

      const waypoints = [route.pickup];
      if (route.waypoints) {
        waypoints.push(...route.waypoints);
      }
      waypoints.push(route.dropoff);

      const result = await getDirections(waypoints);

      if (result && map.current) {
        // Remove existing route
        const sourceId = 'route-source';
        const layerId = 'route-layer';

        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }

        // Add route source
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: result.geometry.coordinates,
            },
          },
        });

        // Add route layer
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#00FF88',
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        routeLayerRef.current = layerId;

        // Set route info
        setRouteInfo({
          distance: result.distance,
          duration: result.duration,
        });

        // Fit bounds to show entire route
        const coordinates = result.geometry.coordinates;
        const bounds = new mapboxglRef.current.LngLatBounds();
        coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    };

    drawRoute();
  }, [route, isLoading]);

  // ==========================================
  // User Location
  // ==========================================

  useEffect(() => {
    if (!map.current || !showUserLocation || isLoading || !mapboxglRef.current) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapboxgl = mapboxglRef.current;

          // Remove existing user marker
          if (userLocationMarker.current) {
            userLocationMarker.current.remove();
          }

          // Create user location marker
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.innerHTML = `
            <div style="
              width: 20px;
              height: 20px;
              background: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            "></div>
          `;

          userLocationMarker.current = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .addTo(map.current!);

          // Center map on user
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [showUserLocation, isLoading]);

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading Overlay */}
      {(isLoading || mapError) && (
        <div className="absolute inset-0 bg-[#0D0D12] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            {mapError ? (
              <>
                <span className="text-white/50 text-sm">{mapError}</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
                <span className="text-white/50 text-sm">Loading map...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Route Info Overlay */}
      {routeInfo && (
        <div className="absolute top-4 left-4 bg-[#1A1A24]/90 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/50">Distance:</span>
              <span className="text-[#00FF88] font-semibold">{formatDistance(routeInfo.distance)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50">Duration:</span>
              <span className="text-white font-semibold">{formatDuration(routeInfo.duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapboxMap;
