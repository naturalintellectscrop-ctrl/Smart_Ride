'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ==========================================
// Types
// ==========================================

interface RiderStatus {
  riderId: string;
  riderName: string;
  connectionStatus: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
  lastKnownLocation: { latitude: number; longitude: number } | null;
  batteryLevel: number | null;
}

interface LeafletMapProps {
  riders: RiderStatus[];
  selectedRider: RiderStatus | null;
  onSelectRider: (rider: RiderStatus | null) => void;
}

// ==========================================
// Custom Marker Icon
// ==========================================

function createCustomIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid rgba(0,0,0,0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px ${color}50;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5">
          <circle cx="12" cy="10" r="3"/>
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ==========================================
// Map Controller for flyTo
// ==========================================

function MapController({ selectedRider }: { selectedRider: RiderStatus | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedRider?.lastKnownLocation) {
      map.flyTo(
        [selectedRider.lastKnownLocation.latitude, selectedRider.lastKnownLocation.longitude],
        15,
        { duration: 1 }
      );
    }
  }, [selectedRider, map]);
  
  return null;
}

// ==========================================
// Main Map Component
// ==========================================

export function LeafletMapInner({ riders, selectedRider, onSelectRider }: LeafletMapProps) {
  // Kampala center coordinates
  const KAMPALA_CENTER: [number, number] = [0.3476, 32.5825];

  // Filter riders with location
  const ridersWithLocation = useMemo(
    () => riders.filter(r => r.lastKnownLocation),
    [riders]
  );

  // Get marker color based on status
  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#00FF88';
      case 'UNSTABLE': return '#FBBF24';
      case 'DISCONNECTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="h-[400px] bg-white/5 rounded-xl overflow-hidden border border-white/10 relative">
      {/* Global styles for Leaflet */}
      <style jsx global>{`
        .leaflet-container {
          background: #1a1a2e;
          height: 100%;
          width: 100%;
        }
        .leaflet-tile-pane {
          filter: brightness(0.8) contrast(1.1);
        }
        .leaflet-popup-content-wrapper {
          background: #0D0D12;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
        }
        .leaflet-popup-tip {
          background: #0D0D12;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
      `}</style>
      
      <MapContainer
        center={KAMPALA_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController selectedRider={selectedRider} />
        
        {ridersWithLocation.map((rider) => {
          if (!rider.lastKnownLocation) return null;
          
          const { latitude, longitude } = rider.lastKnownLocation;
          const markerColor = getMarkerColor(rider.connectionStatus);
          const icon = createCustomIcon(markerColor);
          
          return (
            <Marker
              key={rider.riderId}
              position={[latitude, longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectRider(rider),
              }}
            >
              <Popup>
                <div className="p-1">
                  <strong className="text-white">{rider.riderName}</strong>
                  <div className="text-gray-400 text-xs mt-1">
                    Status: <span style={{ color: markerColor, fontWeight: 'bold' }}>{rider.connectionStatus}</span>
                  </div>
                  {rider.batteryLevel !== null && (
                    <div className="text-gray-400 text-xs">
                      Battery: {rider.batteryLevel}%
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-[#0D0D12]/90 backdrop-blur-sm rounded-lg p-3 border border-white/10 z-[1000]">
        <p className="text-xs font-medium text-white mb-2">Connection Status</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00FF88]" />
            <span className="text-xs text-gray-300">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
            <span className="text-xs text-gray-300">Unstable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
            <span className="text-xs text-gray-300">Disconnected</span>
          </div>
        </div>
      </div>
      
      {/* Rider Count */}
      <div className="absolute top-4 left-4 bg-[#0D0D12]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 z-[1000]">
        <p className="text-xs text-gray-400">
          <span className="text-white font-medium">{ridersWithLocation.length}</span> riders visible
        </p>
      </div>
      
      {/* Free Map Badge */}
      <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-green-500/30 z-[1000]">
        <p className="text-xs text-green-400 font-medium">FREE OpenStreetMap</p>
      </div>
    </div>
  );
}
