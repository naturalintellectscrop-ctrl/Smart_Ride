// ============================================
// SMART RIDE MOBILE - AUTH STORE
// ============================================
// Minimal auth store for boot - no external dependencies
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// Auth Store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      setUser: (user) => set({ user }),
      
      setAccessToken: (token) => set({ 
        accessToken: token, 
        isAuthenticated: !!token 
      }),
      
      login: (user, token) => set({ 
        user, 
        accessToken: token, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'smart-ride-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);

console.log('[AUTH-STORE] Store initialized');
