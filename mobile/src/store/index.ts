/**
 * Smart Ride - State Management with Zustand
 * 
 * This store manages all application state including:
 * - Authentication
 * - User profile
 * - Active rides/orders
 * - Location
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'ADMIN';
  avatarUrl?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface ActiveRide {
  id: string;
  status: 'SEARCHING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED';
  pickup: Location;
  dropoff: Location;
  fare: number;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  
  // Location
  currentLocation: Location | null;
  isLocationLoading: boolean;
  
  // Active Ride
  activeRide: ActiveRide | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setCurrentLocation: (location: Location | null) => void;
  setActiveRide: (ride: ActiveRide | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Persistent Storage Configuration
const storage = {
  name: 'smartride-storage',
  storage: createJSONStorage(() => AsyncStorage),
};

// Auth Store
export const useAuthStore = create<AppState>()(
  persist(storage, {
    name: 'auth',
    partialize: (state) => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      token: state.token,
    }),
  }),
  (set) => ({
    // Auth State
    isAuthenticated: false,
    user: null,
    token: null,
    
    // Location
    currentLocation: null,
    isLocationLoading: false,
    
    // Active Ride
    activeRide: null,
    
    // UI State
    isLoading: false,
    error: null,
    
    // Actions
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token, isAuthenticated: !!token }),
    logout: () => set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    }),
    setCurrentLocation: (location) => set({ currentLocation: location }),
    setActiveRide: (ride) => set({ activeRide: ride }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
  })
);

// Selectors
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useCurrentLocation = () => useAuthStore((state) => state.currentLocation);
export const useActiveRide = () => useAuthStore((state) => state.activeRide);
