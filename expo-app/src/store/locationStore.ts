// ============================================
// SMART RIDE MOBILE - LOCATION STORE
// ============================================
// Minimal location store for boot - NO expo-location dependency
// ============================================

import { create } from 'zustand';
import { DEFAULT_LOCATION } from '../constants';

interface LocationState {
  latitude: number;
  longitude: number;
  address: string;
  isLocating: boolean;
  error: string | null;
  hasPermission: boolean;
  
  setLocation: (lat: number, lng: number, address?: string) => void;
  getCurrentLocation: () => Promise<void>;
  setAddress: (address: string) => void;
  setError: (error: string | null) => void;
}

// Location store - uses default location, no native dependency
export const useLocationStore = create<LocationState>((set, get) => ({
  // Default to Kampala
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  address: DEFAULT_LOCATION.address,
  isLocating: false,
  error: null,
  hasPermission: false,

  setLocation: (latitude, longitude, address) => {
    set({ latitude, longitude, address: address || get().address });
  },

  // Stub implementation - does not use expo-location
  // This prevents native module crashes on boot
  getCurrentLocation: async () => {
    if (get().isLocating) return;
    
    set({ isLocating: true, error: null });
    
    // Simulate location fetch delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Keep default location (Kampala)
    // In a full implementation, this would use expo-location
    set({ 
      isLocating: false,
      error: null,
    });
    
    console.log('[LOCATION-STORE] Using default location (Kampala)');
  },

  setAddress: (address) => set({ address }),
  
  setError: (error) => set({ error }),
}));

console.log('[LOCATION-STORE] Store initialized (stub mode)');
