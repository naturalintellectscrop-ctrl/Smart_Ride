// ============================================
// SMART RIDE MOBILE - LOCATION STORE
// ============================================
// Location store with expo-location integration
// ============================================

import { create } from 'zustand';
import * as Location from 'expo-location';
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
  requestPermission: () => Promise<boolean>;
}

// Location store with expo-location
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

  requestPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      set({ hasPermission });
      return hasPermission;
    } catch (error) {
      console.error('[LOCATION] Permission error:', error);
      return false;
    }
  },

  getCurrentLocation: async () => {
    if (get().isLocating) return;
    
    set({ isLocating: true, error: null });
    
    try {
      // Request permission if not granted
      let hasPermission = get().hasPermission;
      if (!hasPermission) {
        hasPermission = await get().requestPermission();
      }
      
      if (!hasPermission) {
        set({ 
          isLocating: false,
          error: 'Location permission denied',
        });
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        const address = addressResult 
          ? `${addressResult.street || ''}, ${addressResult.city || ''}, ${addressResult.country || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        set({ 
          latitude, 
          longitude, 
          address,
          isLocating: false,
          error: null,
        });
      } catch (geocodeError) {
        // Still update coordinates even if geocoding fails
        set({ 
          latitude, 
          longitude, 
          address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          isLocating: false,
          error: null,
        });
      }
      
      console.log('[LOCATION] Updated:', latitude, longitude);
    } catch (error) {
      console.error('[LOCATION] Error:', error);
      set({ 
        isLocating: false, 
        error: 'Failed to get location',
      });
    }
  },

  setAddress: (address) => set({ address }),
  
  setError: (error) => set({ error }),
}));

console.log('[LOCATION-STORE] Store initialized with expo-location');
