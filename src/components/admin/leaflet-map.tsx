'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

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
// Dynamic import of map component (no SSR)
// ==========================================

const MapComponent = dynamic(
  () => import('./leaflet-map-inner').then(mod => mod.LeafletMapInner),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Loading map...</p>
        </div>
      </div>
    )
  }
);

// ==========================================
// Export wrapper component
// ==========================================

export function LeafletMap(props: LeafletMapProps) {
  return <MapComponent {...props} />;
}
