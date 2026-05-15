import { create } from 'zustand';

export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  role: string;
  avatar?: string;
  verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setShowAuthModal: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  showAuthModal: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  login: (user, token) =>
    set({ user, token, isAuthenticated: true, showAuthModal: false }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
}));
