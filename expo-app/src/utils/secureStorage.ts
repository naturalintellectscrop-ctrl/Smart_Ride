// ============================================
// SMART RIDE MOBILE - SECURE STORAGE
// ============================================
// Uses expo-secure-store for sensitive data
// (access/refresh tokens, user data).
// More secure than AsyncStorage which is
// readable by anyone with device access.
// ============================================

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
};

export const secureStorage = {
  /**
   * Save both access and refresh tokens to SecureStore.
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
  },

  /**
   * Get the stored access token.
   */
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  /**
   * Get the stored refresh token.
   */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  /**
   * Save user data (JSON string) to SecureStore.
   */
  async saveUserData(data: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_DATA, data);
  },

  /**
   * Get stored user data (JSON string).
   */
  async getUserData(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.USER_DATA);
  },

  /**
   * Clear all stored auth data from SecureStore.
   */
  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER_DATA);
  },
};
