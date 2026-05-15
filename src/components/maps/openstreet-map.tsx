'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

// ==========================================
// Fix Leaflet default marker icons
// ==========================================

const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 10px solid ${color};
      "></div>
    </div>
  `,
  iconSize: [24, 34],
  iconAnchor: [12, 34],
  popupAnchor: [0, -34],
});

const MARKER_ICONS = {
  active: createIcon('#00FF88'),
  unstable: createIcon('#FBBF24'),
  disconnected: createIcon('#EF4444'),
  driver: createIcon('#3B82F6'),
  pickup: createIcon('#00FF88'),
  dropoff: createIcon('#F97316'),
};

// ==========================================
// Types
// ==========================================

export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: string;
  coordinates: MapLocation;
  type: 'active' | 'unstable' | 'disconnected' | 'driver' | 'pickup' | 'dropoff';
  label?: string;
}

export interface OpenStreetMapProps {
  className?: string;
  center?: MapLocation;
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}

// ==========================================
// Map Controls Component
// ==========================================

function MapControls({ center, zoom }: { center: MapLocation; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center.latitude, center.longitude], zoom);
    }
  }, [center, zoom, map]);
  
  return null;
}

// ==========================================
// Main Component
// ==========================================

export function OpenStreetMap({
  className,
  center = { latitude: 0.3476, longitude: 32.5825 }, // Kampala default
  zoom = 14,
  markers = [],
  onMarkerClick,
}: OpenStreetMapProps) {
  
  const markerElements = useMemo(() => {
    return markers.map((marker) => (
      <Marker
        key={marker.id}
        position={[marker.coordinates.latitude, marker.coordinates.longitude]}
        icon={MARKER_ICONS[marker.type] || MARKER_ICONS.driver}
        eventHandlers={{
          click: () => onMarkerClick?.(marker),
        }}
      >
        {marker.label && (
          <Popup>
            <div className="text-sm font-medium">{marker.label}</div>
          </Popup>
        )}
      </Marker>
    ));
  }, [markers, onMarkerClick]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        className="w-full h-full"
        style={{ background: '#1A1A24' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TileLayer
          url="https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png"
          opacity={0.3}
        />
        {markerElements}
        <MapControls center={center} zoom={zoom} />
      </MapContainer>
      
      {/* Dark overlay for Smart Ride theme */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(13,13,18,0.4) 0%, rgba(15,15,24,0.3) 50%, rgba(13,13,18,0.4) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}

export default OpenStreetMap;
