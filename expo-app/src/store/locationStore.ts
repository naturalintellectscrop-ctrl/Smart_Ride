// ============================================
// SMART RIDE MOBILE - LOCATION STORE
// ============================================
// Location store with expo-location integration
// With persist middleware for data persistence
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Location store with expo-location and persistence
export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
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
      // 1. Request permission if not granted
      let hasPermission = get().hasPermission;
      if (!hasPermission) {
        hasPermission = await get().requestPermission();
      }

      if (!hasPermission) {
        // Distinguish "denied once" from "blocked permanently" so we can
        // tell the user to open Settings instead of silently failing.
        const { status } = await Location.getForegroundPermissionsAsync();
        const deniedPermanently = status === 'undetermined' || status === 'blocked';
        set({
          isLocating: false,
          error: deniedPermanently
            ? 'Location permission was denied. Please enable it in Settings → Apps → Smart Ride → Permissions.'
            : 'Location permission denied',
        });
        return;
      }

      // 2. Check that location services are actually enabled at the OS level.
      // Even with permission granted, the user may have turned off Location
      // in system settings — getCurrentPositionAsync would hang or fail silently.
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        set({
          isLocating: false,
          error: 'Location services are turned off. Please enable them in Settings → Location.',
        });
        return;
      }

      // 3. Get current position — try High accuracy first, fall back to
      // Balanced if High fails (some devices without Play Services reject High).
      let location: Location.LocationObject;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch (highErr) {
        console.warn('[LOCATION] High accuracy failed, retrying with Balanced:', highErr);
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      const { latitude, longitude } = location.coords;

      // 4. Reverse geocode to get address
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
        error: 'Failed to get location. Check that location services are enabled.',
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
}),
  {
    name: 'smart-ride-location',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      latitude: state.latitude,
      longitude: state.longitude,
      address: state.address,
      pickupLocation: state.pickupLocation,
      dropoffLocation: state.dropoffLocation,
    }),
  }
  )
);

console.log('[LOCATION-STORE] Store initialized with expo-location and persist');
