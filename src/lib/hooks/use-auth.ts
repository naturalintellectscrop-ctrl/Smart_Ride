/**
 * Authentication Hook
 * Provides authentication state and methods to components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi, AuthResponse, LoginCredentials, RegisterData } from '@/lib/services/auth-api';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface UseAuthReturn {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        if (authApi.isAuthenticated()) {
          const response = await authApi.getCurrentUser();
          if (response?.success && response.user) {
            setUser(response.user);
          } else {
            // Token invalid, try refresh
            const refreshResponse = await authApi.refreshToken();
            if (refreshResponse?.success && refreshResponse.user) {
              setUser(refreshResponse.user);
            }
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    const response = await authApi.login(credentials);

    if (response.success && response.user) {
      setUser(response.user);
    } else {
      setError(response.error || 'Login failed');
    }

    setIsLoading(false);
    return response;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    const response = await authApi.register(data);

    if (response.success && response.user) {
      setUser(response.user);
    } else {
      setError(response.error || 'Registration failed');
    }

    setIsLoading(false);
    return response;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    const response = await authApi.loginWithGoogle(idToken);

    if (response.success && response.user) {
      setUser(response.user);
    } else {
      setError(response.error || 'Google login failed');
    }

    setIsLoading(false);
    return response;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await authApi.logout();
    setUser(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!authApi.isAuthenticated()) return;

    const response = await authApi.getCurrentUser();
    if (response?.success && response.user) {
      setUser(response.user);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    clearError,
    refreshUser,
  };
}

export default useAuth;
