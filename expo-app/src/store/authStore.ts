// ============================================
// SMART RIDE MOBILE - AUTH STORE
// ============================================
// Auth store with SecureStore for token storage.
// Access/refresh tokens are stored in SecureStore
// (encrypted, device-only). Only non-sensitive
// user info is persisted via AsyncStorage.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../utils/secureStorage';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  address?: string;
  notificationPreferences?: { notificationsEnabled?: boolean } | null;
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
// NOTE: accessToken is NOT persisted to AsyncStorage — it lives in
// SecureStore only. The partialize function excludes it so that
// zustand's AsyncStorage persistence only saves the user object.
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
      
      login: (user, token) => {
        // Store the token in SecureStore (encrypted)
        secureStorage.saveTokens(token, '').catch((e) => {
          console.warn('[AUTH-STORE] Failed to save token to SecureStore:', e);
        });
        set({ user, accessToken: token, isAuthenticated: true });
      },
      
      logout: () => {
        // Clear tokens from SecureStore
        secureStorage.clearAll().catch((e) => {
          console.warn('[AUTH-STORE] Failed to clear SecureStore:', e);
        });
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'smart-ride-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user info — NOT the access token.
      // The access token is stored in SecureStore for security.
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

console.log('[AUTH-STORE] Store initialized (SecureStore mode)');
