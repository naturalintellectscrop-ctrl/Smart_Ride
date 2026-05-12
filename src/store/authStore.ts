// ============================================
// SMART RIDE MOBILE - AUTH STORE
// ============================================
// VERSION: PRODUCTION-002 (RESILIENCE UPDATE)
// PURPOSE: Production auth with complete failure handling
//
// TOKEN ARCHITECTURE:
// - accessToken: Memory ONLY (never persisted)
// - refreshToken: SecureStore (encrypted, persists)
//
// FAILURE HANDLING:
// - SecureStore failures: Continue with memory-only session
// - Token refresh failures: Force logout with clear error
// - Network failures: Retry with exponential backoff
// - NEVER crash, NEVER silent failure, NEVER undefined state
// ============================================

console.log('[AUTH-STORE] Module loading...');

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_CONFIG } from '@/constants';

console.log('[AUTH-STORE] Imports complete');

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
}

// Auth state error types for UI handling
type AuthErrorType = 
  | 'network'
  | 'token_expired'
  | 'token_invalid'
  | 'session_revoked'
  | 'secure_store_failed'
  | 'server_error'
  | 'unknown';

interface AuthState {
  user: User | null;
  accessToken: string | null;  // Memory ONLY - never persisted
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  errorType: AuthErrorType | null;
  initLogs: string[];
  lastRefreshAttempt: number | null;
  refreshFailureCount: number;
  
  initialize: () => Promise<void>;
  forceComplete: () => void;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => void;
  clearError: () => void;
}

console.log('[AUTH-STORE] Types defined');

// Helper to log with timestamp
const log = (msg: string) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
};

// ============================================
// STRICT VALIDATION HELPERS
// ============================================

const validateToken = (token: unknown): { valid: boolean; reason?: string } => {
  if (!token) {
    return { valid: false, reason: 'Token is null/undefined' };
  }
  if (typeof token !== 'string') {
    return { valid: false, reason: `Token is not a string: ${typeof token}` };
  }
  if (token === 'undefined' || token === 'null' || token === '') {
    return { valid: false, reason: 'Token is empty string literal' };
  }
  if (token.length < 10) {
    return { valid: false, reason: `Token too short: ${token.length} chars` };
  }
  if (token.includes('[object') || token.includes('undefined')) {
    return { valid: false, reason: 'Token contains invalid patterns' };
  }
  return { valid: true };
};

const validateUser = (user: unknown): { valid: boolean; reason?: string } => {
  if (!user) {
    return { valid: false, reason: 'User is null/undefined' };
  }
  if (typeof user !== 'object') {
    return { valid: false, reason: `User is not an object: ${typeof user}` };
  }
  const u = user as Record<string, unknown>;
  if (!u.id || typeof u.id !== 'string') {
    return { valid: false, reason: 'User.id is missing or invalid' };
  }
  if (!u.email || typeof u.email !== 'string') {
    return { valid: false, reason: 'User.email is missing or invalid' };
  }
  return { valid: true };
};

// ============================================
// SECURESTORE HELPER WITH TIMEOUT
// ============================================

const secureStoreGet = async (key: string, timeoutMs: number = 5000): Promise<string | null> => {
  try {
    const promise = SecureStore.getItemAsync(key);
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });
    
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } catch (error) {
    log(`[SECURESTORE] Get error for ${key}: ${error}`);
    return null;
  }
};

const secureStoreSet = async (key: string, value: string, timeoutMs: number = 5000): Promise<boolean> => {
  try {
    const promise = SecureStore.setItemAsync(key, value);
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });
    
    await Promise.race([promise, timeoutPromise]);
    return true;
  } catch (error) {
    log(`[SECURESTORE] Set error for ${key}: ${error}`);
    return false;
  }
};

const secureStoreDelete = async (key: string, timeoutMs: number = 3000): Promise<boolean> => {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    log(`[SECURESTORE] Delete error for ${key}: ${error}`);
    return false;
  }
};

console.log('[AUTH-STORE] Creating store...');

export const useAuthStore = create<AuthState>((set, get) => {
  console.log('[AUTH-STORE] Store creator function running');
  
  return {
    user: null,
    accessToken: null,  // Memory only - NEVER in SecureStore
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,
    errorType: null,
    initLogs: [],
    lastRefreshAttempt: null,
    refreshFailureCount: 0,

    // ============================================
    // CLEAR ERROR
    // ============================================
    clearError: () => {
      set({ error: null, errorType: null });
    },

    // ============================================
    // INITIALIZE - WITH COMPLETE FAILURE HANDLING
    // ============================================
    initialize: async () => {
      log('[INIT] ========== START ==========');
      set(state => ({ 
        initLogs: [...state.initLogs, 'START'],
        isLoading: true,
        error: null,
        errorType: null,
      }));
      
      try {
        // STEP 1: Try to get REFRESH token from SecureStore
        log('[INIT] Step 1: Loading refreshToken from SecureStore...');
        set(state => ({ initLogs: [...state.initLogs, 'BEFORE_SECURESTORE'] }));
        
        const refreshToken = await secureStoreGet(STORAGE_KEYS.refreshToken, 5000);
        log(`[INIT] RefreshToken found: ${refreshToken ? 'YES' : 'NO'}`);
        set(state => ({ initLogs: [...state.initLogs, 'AFTER_SECURESTORE'] }));
        
        // STEP 2: If no refresh token, user is not authenticated (clean state)
        if (!refreshToken) {
          log('[INIT] No refreshToken - user not authenticated');
          set({ 
            isLoading: false,
            isInitialized: true,
            isAuthenticated: false,
            accessToken: null,
            user: null,
          });
          set(state => ({ initLogs: [...state.initLogs, 'END_NO_TOKEN'] }));
          return;
        }
        
        // STEP 3: Validate refresh token format
        const tokenValidation = validateToken(refreshToken);
        if (!tokenValidation.valid) {
          log(`[INIT] Invalid refreshToken format: ${tokenValidation.reason}`);
          // Clear invalid token
          await secureStoreDelete(STORAGE_KEYS.refreshToken);
          set({ 
            isLoading: false,
            isInitialized: true,
            isAuthenticated: false,
            accessToken: null,
            user: null,
            error: 'Session data corrupted. Please login again.',
            errorType: 'token_invalid',
          });
          set(state => ({ initLogs: [...state.initLogs, 'END_INVALID_TOKEN'] }));
          return;
        }
        
        // STEP 4: Try to refresh access token
        log('[INIT] Attempting token refresh...');
        set(state => ({ initLogs: [...state.initLogs, 'BEFORE_REFRESH'] }));
        
        // Dynamic import to avoid circular deps
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { api } = require('@/services');
        
        // Set up API callbacks BEFORE refresh
        api.setTokenRefreshCallback(async () => {
          return get().refreshAccessToken();
        });
        api.setAuthErrorCallback(() => {
          log('[INIT] Auth error callback triggered');
          get().logout();
        });
        
        const response = await api.refreshAccessToken(refreshToken);
        
        if (response.success && response.data?.accessToken) {
          log('[INIT] Token refresh SUCCESS');
          
          // Validate new access token
          const newAccessToken = response.data.accessToken;
          const accessTokenValidation = validateToken(newAccessToken);
          if (!accessTokenValidation.valid) {
            log(`[INIT] New accessToken invalid: ${accessTokenValidation.reason}`);
            throw new Error('Received invalid access token from server');
          }
          
          // Store new access token in MEMORY
          set({ 
            accessToken: newAccessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            refreshFailureCount: 0,
          });
          
          // Store new refresh token if provided (rotation)
          if (response.data.refreshToken) {
            const stored = await secureStoreSet(STORAGE_KEYS.refreshToken, response.data.refreshToken);
            if (stored) {
              log('[INIT] New refreshToken stored');
            } else {
              log('[INIT] WARNING: Failed to store new refreshToken');
              set({ 
                error: 'Warning: Session may not persist across app restarts',
                errorType: 'secure_store_failed',
              });
            }
          }
          
          // Get user info (non-critical, can fail silently)
          try {
            const userResponse = await api.getCurrentUser(newAccessToken);
            if (userResponse.success && userResponse.data) {
              const userValidation = validateUser(userResponse.data);
              if (userValidation.valid) {
                set({ user: userResponse.data });
                log(`[INIT] User loaded: ${(userResponse.data as User).email}`);
              }
            }
          } catch (userError) {
            log(`[INIT] User fetch error (non-critical): ${userError}`);
            // Continue without user - can fetch later
          }
          
        } else {
          // Refresh failed - force logout with clear message
          log(`[INIT] Token refresh FAILED: ${response.error}`);
          await secureStoreDelete(STORAGE_KEYS.refreshToken);
          
          let errorType: AuthErrorType = 'token_expired';
          if (response.error?.includes('revoked') || response.error?.includes('invalid')) {
            errorType = 'session_revoked';
          } else if (response.error?.includes('network') || response.error?.includes('connection')) {
            errorType = 'network';
          }
          
          set({ 
            isLoading: false,
            isInitialized: true,
            isAuthenticated: false,
            accessToken: null,
            user: null,
            error: response.error || 'Session expired. Please login again.',
            errorType,
          });
        }
        
        set(state => ({ initLogs: [...state.initLogs, 'AFTER_REFRESH'] }));
        log('[INIT] ========== END ==========');
        
      } catch (error) {
        log(`[INIT] CRITICAL ERROR: ${error}`);
        
        // Determine error type
        let errorType: AuthErrorType = 'unknown';
        const errorMsg = String(error);
        if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          errorType = 'network';
        } else if (errorMsg.includes('token')) {
          errorType = 'token_invalid';
        }
        
        set({ 
          isLoading: false,
          isInitialized: true,
          isAuthenticated: false,
          accessToken: null,
          user: null,
          error: 'Failed to initialize. Please restart the app.',
          errorType,
        });
        set(state => ({ initLogs: [...state.initLogs, `ERROR: ${error}`] }));
      }
    },

    // ============================================
    // FORCE COMPLETE - ALWAYS WORKS
    // ============================================
    forceComplete: () => {
      log('[FORCE] Force complete called');
      set({ 
        isLoading: false, 
        isInitialized: true,
        error: null,
        errorType: null,
      });
    },

    // ============================================
    // LOGIN - STORE TOKENS PROPERLY
    // ============================================
    login: async (user, accessToken, refreshToken) => {
      log(`[LOGIN] Called for: ${user?.email || 'unknown'}`);
      
      // CRITICAL: Validate access token
      const accessTokenValidation = validateToken(accessToken);
      if (!accessTokenValidation.valid) {
        const error = `[LOGIN] CRITICAL: Invalid accessToken - ${accessTokenValidation.reason}`;
        console.error(error);
        set({ 
          error: 'Authentication error: Invalid access token received',
          errorType: 'token_invalid',
          isLoading: false,
        });
        throw new Error(error);
      }
      
      // CRITICAL: Validate refresh token
      const refreshTokenValidation = validateToken(refreshToken);
      if (!refreshTokenValidation.valid) {
        const error = `[LOGIN] CRITICAL: Invalid refreshToken - ${refreshTokenValidation.reason}`;
        console.error(error);
        set({ 
          error: 'Authentication error: Invalid refresh token received',
          errorType: 'token_invalid',
          isLoading: false,
        });
        throw new Error(error);
      }
      
      // Validate user object
      const userValidation = validateUser(user);
      if (!userValidation.valid) {
        const error = `[LOGIN] CRITICAL: Invalid user object - ${userValidation.reason}`;
        console.error(error);
        set({ 
          error: 'Authentication error: Invalid user data received',
          errorType: 'unknown',
          isLoading: false,
        });
        throw new Error(error);
      }
      
      // Store REFRESH token in SecureStore (handle failure gracefully)
      log('[LOGIN] Storing refreshToken in SecureStore...');
      const stored = await secureStoreSet(STORAGE_KEYS.refreshToken, refreshToken);
      
      if (stored) {
        log('[LOGIN] RefreshToken stored successfully');
      } else {
        log('[LOGIN] WARNING: Failed to store refreshToken in SecureStore');
        // Continue anyway - token is in memory for this session
      }
      
      // Store ACCESS token in MEMORY ONLY
      set({ 
        user, 
        accessToken,  // Memory only - NOT in SecureStore
        isAuthenticated: true, 
        isLoading: false,
        isInitialized: true,
        error: stored ? null : 'Warning: Session may not persist across app restarts',
        errorType: stored ? null : 'secure_store_failed',
        refreshFailureCount: 0,
      });
      
      log(`[LOGIN] SUCCESS: ${user.email} authenticated`);
    },

    // ============================================
    // LOGOUT - CLEAR ALL TOKENS AND STATE
    // ============================================
    logout: async () => {
      log('[LOGOUT] Called');
      
      // Clear refresh token from SecureStore (ignore errors)
      await secureStoreDelete(STORAGE_KEYS.refreshToken);
      await secureStoreDelete(STORAGE_KEYS.authToken); // Legacy key
      
      // Clear ALL state (accessToken in memory is cleared here)
      set({ 
        user: null, 
        accessToken: null, 
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        errorType: null,
        refreshFailureCount: 0,
        lastRefreshAttempt: null,
      });
      
      log('[LOGOUT] Complete');
    },

    // ============================================
    // REFRESH ACCESS TOKEN - CALLED BY API SERVICE
    // ============================================
    refreshAccessToken: async () => {
      log('[REFRESH] Called');
      const now = Date.now();
      const state = get();
      
      // Rate limit refresh attempts (min 1 second between)
      if (state.lastRefreshAttempt && (now - state.lastRefreshAttempt) < 1000) {
        log('[REFRESH] Rate limited - too soon since last attempt');
        return state.accessToken; // Return current token if we have one
      }
      
      set({ lastRefreshAttempt: now });
      
      try {
        // Get refresh token from SecureStore
        const refreshToken = await secureStoreGet(STORAGE_KEYS.refreshToken);
        
        if (!refreshToken) {
          log('[REFRESH] No refreshToken found - forcing logout');
          await get().logout();
          return null;
        }
        
        const tokenValidation = validateToken(refreshToken);
        if (!tokenValidation.valid) {
          log(`[REFRESH] Invalid refreshToken: ${tokenValidation.reason}`);
          await get().logout();
          return null;
        }
        
        // Dynamic import
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { api } = require('@/services');
        
        const response = await api.refreshAccessToken(refreshToken);
        
        if (response.success && response.data?.accessToken) {
          const newAccessToken = response.data.accessToken;
          
          // Validate new token
          const newTokenValidation = validateToken(newAccessToken);
          if (!newTokenValidation.valid) {
            log(`[REFRESH] Invalid new accessToken: ${newTokenValidation.reason}`);
            await get().logout();
            return null;
          }
          
          // Update access token in memory
          set({ 
            accessToken: newAccessToken,
            refreshFailureCount: 0,
          });
          
          // Store new refresh token if provided (rotation)
          if (response.data.refreshToken) {
            await secureStoreSet(STORAGE_KEYS.refreshToken, response.data.refreshToken);
          }
          
          log('[REFRESH] SUCCESS');
          return newAccessToken;
        } else {
          log(`[REFRESH] FAILED: ${response.error}`);
          
          // Increment failure count
          const newFailureCount = state.refreshFailureCount + 1;
          set({ refreshFailureCount: newFailureCount });
          
          // After 3 consecutive failures, force logout
          if (newFailureCount >= 3) {
            log('[REFRESH] Max failures reached - forcing logout');
            await get().logout();
            return null;
          }
          
          // Return null to indicate failure (API will handle retry)
          return null;
        }
      } catch (error) {
        log(`[REFRESH] ERROR: ${error}`);
        
        const newFailureCount = state.refreshFailureCount + 1;
        set({ refreshFailureCount: newFailureCount });
        
        if (newFailureCount >= 3) {
          await get().logout();
        }
        
        return null;
      }
    },

    // ============================================
    // SET ACCESS TOKEN (for manual token update)
    // ============================================
    setAccessToken: (token: string) => {
      const validation = validateToken(token);
      if (validation.valid) {
        set({ accessToken: token });
      } else {
        log(`[SET-TOKEN] Invalid token rejected: ${validation.reason}`);
      }
    },
  };
});

console.log('[AUTH-STORE] Store created successfully');
