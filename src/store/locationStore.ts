// ============================================
// SMART RIDE MOBILE - LOCATION STORE
// ============================================

import { create } from 'zustand';
import * as Location from 'expo-location';
import { DEFAULT_LOCATION } from '@/constants';

interface LocationState {
  // State
  latitude: number;
  longitude: number;
  address: string;
  isLocating: boolean;
  error: string | null;
  hasPermission: boolean;
  
  // Actions
  setLocation: (lat: number, lng: number, address?: string) => void;
  getCurrentLocation: () => Promise<void>;
  setAddress: (address: string) => void;
  setError: (error: string | null) => void;
  requestPermission: () => Promise<boolean>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  // Initial state - use default location so app works immediately
  latitude: DEFAULT_LOCATION.latitude,
  longitude: DEFAULT_LOCATION.longitude,
  address: DEFAULT_LOCATION.address,
  isLocating: false,
  error: null,
  hasPermission: false,

  // Actions
  setLocation: (latitude, longitude, address) => {
    set({ latitude, longitude, address: address || get().address });
  },

  getCurrentLocation: async () => {
    // Don't start new request if already locating
    if (get().isLocating) {
      return;
    }
    
    set({ isLocating: true, error: null });
    
    try {
      // Request permission with timeout
      const { status } = await Promise.race([
        Location.requestForegroundPermissionsAsync(),
        new Promise<{ status: 'denied' }>((_, reject) => 
          setTimeout(() => reject(new Error('Permission timeout')), 5000)
        )
      ]).catch(() => ({ status: 'denied' as const }));
      
      if (status !== 'granted') {
        set({ 
          hasPermission: false,
          error: 'Location permission denied',
          isLocating: false 
        });
        return;
      }

      set({ hasPermission: true });

      // Get current position with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 15000)
        )
      ]).catch((error) => {
        console.log('Location fetch failed:', error);
        return null;
      });

      if (!location) {
        set({ 
          error: 'Could not get location, using default',
          isLocating: false 
        });
        return;
      }

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address (with timeout)
      const addresses = await Promise.race([
        Location.reverseGeocodeAsync({
          latitude,
          longitude,
        }),
        new Promise<Location.LocationGeocodedAddress[] | null>((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 5000)
        )
      ]).catch(() => null);

      const address = addresses?.[0] 
        ? `${addresses[0].street || ''}, ${addresses[0].city || ''}, ${addresses[0].country || ''}`.trim()
        : 'Current location';

      set({ 
        latitude, 
        longitude, 
        address: address || 'Current location',
        isLocating: false,
        error: null,
      });
    } catch (error) {
      console.error('Location error:', error);
      set({ 
        error: 'Failed to get location',
        isLocating: false 
      });
    }
  },

  setAddress: (address) => set({ address }),

  setError: (error) => set({ error }),

  requestPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      set({ hasPermission: granted });
      return granted;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  },
}));
