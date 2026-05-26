// ============================================
// SMART RIDE MOBILE - AUTH SERVICE
// ============================================
// Handles all authentication API calls
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { STORAGE_KEYS } from '../src/constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'smart_ride_auth_token';
const REFRESH_TOKEN_KEY = 'smart_ride_refresh_token';
const USER_DATA_KEY = 'smart_ride_user_data';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatarUrl?: string;
  status: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  user?: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'ios' | 'android' | 'web';
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(STORAGE_KEYS.authToken, accessToken); // Sync with API service
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_DATA_KEY, STORAGE_KEYS.authToken]);
}

export async function saveUserData(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

export async function getUserData(): Promise<User | null> {
  const data = await AsyncStorage.getItem(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

// ============================================
// AUTH STORE SYNC
// ============================================

export function syncAuthStore(user: User, accessToken: string): void {
  try {
    useAuthStore.getState().login({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    }, accessToken);
  } catch (e) {
    console.warn('[AUTH] Failed to sync auth store:', e);
  }
}

// ============================================
// API HELPERS
// ============================================

async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const token = await getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP error: ${response.status}`);
  }
  
  return data;
}

// ============================================
// AUTHENTICATION METHODS
// ============================================

/**
 * Login with email and password
 */
export async function loginWithEmail(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await apiRequest<AuthResponse>('/auth/login', 'POST', {
      email: credentials.email,
      password: credentials.password,
      deviceId: credentials.deviceId,
      deviceName: credentials.deviceName,
      deviceType: credentials.deviceType,
    });
    
    if (response.success && response.data) {
      await saveTokens(response.data.accessToken, response.data.refreshToken);
      await saveUserData(response.data.user);
      syncAuthStore(response.data.user, response.data.accessToken);
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await apiRequest<AuthResponse>('/auth/register', 'POST', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    
    if (response.success && response.data) {
      await saveTokens(response.data.accessToken, response.data.refreshToken);
      await saveUserData(response.data.user);
      syncAuthStore(response.data.user, response.data.accessToken);
    }
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login with Google ID token
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  try {
    const response = await apiRequest<AuthResponse>('/auth/google', 'POST', {
      idToken,
    });
    
    if (response.success && response.user && response.tokens) {
      await saveTokens(response.tokens.accessToken, response.tokens.refreshToken);
      await saveUserData(response.user);
      syncAuthStore(response.user, response.tokens.accessToken);
    }
    
    return response;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', 'POST');
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    await clearTokens();
    try {
      useAuthStore.getState().logout();
    } catch (e) {}
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    
    if (data.success && data.data?.accessToken) {
      await saveTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    }
    
    await clearTokens();
    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    await clearTokens();
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  return getUserData();
}

// ============================================
// PASSWORD RESET (Admin Forgot/Reset)
// ============================================

/**
 * Request a password reset email
 * Always returns success to prevent email enumeration
 */
export async function forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message?: string }>('/auth/forgot-password', 'POST', {
      email: email.trim().toLowerCase(),
    });
    return response;
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Reset password using token from email
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ success: boolean; message?: string; error?: string }>('/auth/reset-password', 'POST', {
      token,
      newPassword,
    });
    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to reset password. Please try again.' };
  }
}
