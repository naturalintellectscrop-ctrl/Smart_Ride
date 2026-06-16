// ============================================
// SMART RIDE MOBILE - LOCATION STORE
// ============================================
// Location store with expo-location integration
// ============================================

import { create } from 'zustand';
import * as Location from 'expo-location';
import { DEFAULT_LOCATION } from '../constants';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationState {
  latitude: number;
  longitude: number;
  address: string;
  isLocating: boolean;
  error: string | null;
  hasPermission: boolean;

  // Pickup / Dropoff selection (used by location-picker to return data to caller)
  pickupLocation: SelectedLocation | null;
  dropoffLocation: SelectedLocation | null;

  setLocation: (lat: number, lng: number, address?: string) => void;
  getCurrentLocation: () => Promise<void>;
  setAddress: (address: string) => void;
  setError: (error: string | null) => void;
  requestPermission: () => Promise<boolean>;

  // Pickup / Dropoff setters
  setPickupLocation: (location: SelectedLocation | null) => void;
  setDropoffLocation: (location: SelectedLocation | null) => void;
  clearPickupLocation: () => void;
  clearDropoffLocation: () => void;
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

  // Pickup / Dropoff selection
  pickupLocation: null,
  dropoffLocation: null,

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

  // Pickup / Dropoff setters
  setPickupLocation: (location) => set({ pickupLocation: location }),
  setDropoffLocation: (location) => set({ dropoffLocation: location }),
  clearPickupLocation: () => set({ pickupLocation: null }),
  clearDropoffLocation: () => set({ dropoffLocation: null }),
}));

console.log('[LOCATION-STORE] Store initialized with expo-location');
