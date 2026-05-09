// ============================================
// SMART RIDE MOBILE - API SERVICE
// VERSION: PRODUCTION-002 (RESILIENCE UPDATE)
// PURPOSE: Production-ready API with full failure handling
//
// RESILIENCE FEATURES:
// 1. Network quality detection
// 2. Exponential backoff retry
// 3. Automatic token refresh on 401
// 4. Graceful degradation for all error types
// 5. No silent failures - everything logged and reported
// ============================================

import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, NETWORK_CONFIG, STORAGE_KEYS } from '@/src/constants';
import { 
  User, 
  Rider, 
  Task, 
  Order, 
  Merchant, 
  MenuItem,
  ApiResponse,
  PaginatedResponse,
  PaymentMethod 
} from '@/src/types';

// ============================================
// TYPES - Match backend EXACTLY
// ============================================

// Backend returns: { success, data: { user, accessToken, refreshToken, expiresIn }, message }
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

interface RideRequestRequest {
  taskType: 'SMART_BODA_RIDE' | 'SMART_CAR_RIDE';
  clientId: string; // FIX: Required by backend
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  paymentMethod: PaymentMethod;
  distanceKm: number; // FIX: Required by backend
}

interface OrderRequest {
  merchantId: string;
  orderType: 'FOOD_DELIVERY' | 'SHOPPING';
  items: { menuItemId: string; quantity: number; specialInstructions?: string }[];
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  paymentMethod: PaymentMethod;
}

// ============================================
// ERROR CLASSES - Fail Loud with Context
// ============================================

class AuthError extends Error {
  constructor(message: string, public readonly code: string, public readonly recoverable: boolean = true) {
    super(message);
    this.name = 'AuthError';
  }
}

class TokenError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'TokenError';
  }
}

class NetworkError extends Error {
  constructor(message: string, public readonly isTimeout: boolean = false) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================
// NETWORK QUALITY DETECTOR
// ============================================

type NetworkQuality = 'fast' | 'normal' | 'slow' | 'unknown';

class NetworkQualityDetector {
  private static instance: NetworkQualityDetector;
  private quality: NetworkQuality = 'unknown';
  private lastLatency: number = 0;
  private latencyHistory: number[] = [];
  private readonly historySize = 5;

  static getInstance(): NetworkQualityDetector {
    if (!NetworkQualityDetector.instance) {
      NetworkQualityDetector.instance = new NetworkQualityDetector();
    }
    return NetworkQualityDetector.instance;
  }

  recordLatency(latencyMs: number): void {
    this.lastLatency = latencyMs;
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > this.historySize) {
      this.latencyHistory.shift();
    }
    this.updateQuality();
  }

  private updateQuality(): void {
    const avgLatency = this.getAverageLatency();
    if (avgLatency < NETWORK_CONFIG.fastLatency) {
      this.quality = 'fast';
    } else if (avgLatency < NETWORK_CONFIG.normalLatency) {
      this.quality = 'normal';
    } else if (avgLatency < NETWORK_CONFIG.slowLatency) {
      this.quality = 'slow';
    } else {
      this.quality = 'slow'; // Treat very slow as slow
    }
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
  }

  getQuality(): NetworkQuality {
    return this.quality;
  }

  getAdaptiveTimeout(): number {
    switch (this.quality) {
      case 'fast': return NETWORK_CONFIG.fastTimeout;
      case 'normal': return NETWORK_CONFIG.normalTimeout;
      case 'slow': return NETWORK_CONFIG.slowTimeout;
      default: return API_CONFIG.timeout;
    }
  }

  recordFailure(): void {
    // On failure, downgrade quality assumption
    if (this.quality === 'fast') this.quality = 'normal';
    else if (this.quality === 'normal') this.quality = 'slow';
  }
}

// ============================================
// TOKEN REFRESH CALLBACK INTERFACE
// ============================================

type TokenRefreshCallback = () => Promise<string | null>;
type AuthErrorCallback = () => void;

// ============================================
// API CLIENT CLASS
// ============================================

class ApiService {
  private baseUrl: string;
  private networkDetector: NetworkQualityDetector;
  
  // Callbacks for token refresh - MUST be set by authStore
  private onTokenRefresh: TokenRefreshCallback | null = null;
  private onAuthError: AuthErrorCallback | null = null;
  
  // Flag to prevent multiple concurrent refresh attempts
  private isRefreshingToken: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;
  
  // Endpoints that should NOT trigger retry on 401
  private static readonly AUTH_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/refresh',
    '/auth/me',
    '/auth/send-otp',
    '/auth/verify-otp',
  ];

  // Endpoints that should NOT retry on network failure (idempotent check)
  private static readonly NON_IDEMPOTENT_ENDPOINTS = [
    '/payments/',  // Payment endpoints should not auto-retry
    '/orders',     // Order creation
  ];

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.networkDetector = NetworkQualityDetector.getInstance();
  }

  // ============================================
  // CALLBACK SETUP - Called by authStore
  // ============================================

  setTokenRefreshCallback(callback: TokenRefreshCallback): void {
    this.onTokenRefresh = callback;
  }

  setAuthErrorCallback(callback: AuthErrorCallback): void {
    this.onAuthError = callback;
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return ApiService.AUTH_ENDPOINTS.some(authEp => endpoint.startsWith(authEp));
  }

  private isIdempotent(endpoint: string, method: string): boolean {
    // GET, HEAD, OPTIONS, PUT, DELETE are idempotent
    if (['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method)) {
      return true;
    }
    // POST is NOT idempotent unless it's a special endpoint
    if (method === 'POST') {
      return !ApiService.NON_IDEMPOTENT_ENDPOINTS.some(ep => endpoint.includes(ep));
    }
    return false;
  }

  // ============================================
  // HEADERS - With Token from memory
  // ============================================

  private async getHeaders(accessToken?: string): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // STRICT token validation
    if (accessToken && this.isValidToken(accessToken)) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return headers;
  }

  private isValidToken(token: unknown): token is string {
    if (!token) return false;
    if (typeof token !== 'string') return false;
    if (token === 'undefined' || token === 'null' || token === '') return false;
    if (token.length < 10) return false;
    return true;
  }

  // ============================================
  // EXPONENTIAL BACKOFF SLEEP
  // ============================================

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // REQUEST WITH TIMEOUT AND RETRY
  // ============================================

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      this.networkDetector.recordLatency(latency);
    }
  }

  // ============================================
  // CORE REQUEST METHOD WITH RETRY LOGIC
  // ============================================

  async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: object,
    accessToken?: string,
    skipRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const maxRetries = skipRetry ? 1 : API_CONFIG.retryAttempts;
    let lastError: string | null = null;
    let currentDelay = API_CONFIG.retryDelay;
    const isIdempotent = this.isIdempotent(endpoint, method);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeout = this.networkDetector.getAdaptiveTimeout();
        const response = await this.fetchWithTimeout(
          `${this.baseUrl}${endpoint}`,
          {
            method,
            headers: await this.getHeaders(accessToken),
            body: body ? JSON.stringify(body) : undefined,
          },
          timeout
        );

        // Parse response safely
        let data: any = null;
        try {
          const text = await response.text();
          if (text) {
            data = JSON.parse(text);
          }
        } catch (parseError) {
          console.error('[API] JSON parse error:', parseError);
          // Return structured error, not crash
          return { 
            success: false, 
            error: 'Server returned invalid response. Please try again.',
          };
        }

        // Handle non-OK responses
        if (!response.ok) {
          // 401 - Token expired, attempt refresh
          if (response.status === 401) {
            // Don't retry on auth endpoints
            if (this.isAuthEndpoint(endpoint)) {
              return { 
                success: false, 
                error: data?.error || data?.message || 'Authentication failed',
              };
            }
            
            // Attempt token refresh
            const newToken = await this.attemptTokenRefresh();
            if (newToken) {
              // Retry with new token (only once for auth errors)
              return this.request<T>(endpoint, method, body, newToken, true);
            } else {
              // Refresh failed, signal auth error
              if (this.onAuthError) {
                this.onAuthError();
              }
              return { 
                success: false, 
                error: 'Session expired. Please login again.',
              };
            }
          }
          
          // 429 - Rate limited
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : currentDelay;
            console.warn(`[API] Rate limited, waiting ${waitTime}ms`);
            
            if (attempt < maxRetries && isIdempotent) {
              await this.sleep(waitTime);
              currentDelay *= API_CONFIG.retryDelayMultiplier;
              continue;
            }
          }
          
          // 5xx - Server error, retry if idempotent
          if (response.status >= 500 && attempt < maxRetries && isIdempotent) {
            console.warn(`[API] Server error ${response.status}, retrying (${attempt}/${maxRetries})`);
            await this.sleep(currentDelay);
            currentDelay *= API_CONFIG.retryDelayMultiplier;
            continue;
          }
          
          return { 
            success: false, 
            error: data?.error || data?.message || `Request failed with status ${response.status}` 
          };
        }

        // SUCCESS
        return { success: true, data };

      } catch (error) {
        // Network error handling
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`[API] Timeout [${method} ${endpoint}]: Request timed out`);
          this.networkDetector.recordFailure();
          lastError = 'Request timed out. Please check your connection.';
          
          // Retry on timeout if idempotent
          if (attempt < maxRetries && isIdempotent) {
            console.warn(`[API] Timeout, retrying (${attempt}/${maxRetries})`);
            await this.sleep(currentDelay);
            currentDelay *= API_CONFIG.retryDelayMultiplier;
            continue;
          }
        } else {
          console.error(`[API] Network error [${method} ${endpoint}]:`, error);
          this.networkDetector.recordFailure();
          lastError = 'Network error. Please check your connection.';
          
          // Retry on network error if idempotent
          if (attempt < maxRetries && isIdempotent) {
            console.warn(`[API] Network error, retrying (${attempt}/${maxRetries})`);
            await this.sleep(currentDelay);
            currentDelay *= API_CONFIG.retryDelayMultiplier;
            continue;
          }
        }
      }
    }

    // All retries exhausted
    return { 
      success: false, 
      error: lastError || 'Request failed after multiple attempts. Please try again.',
    };
  }

  // ============================================
  // TOKEN REFRESH - COORDINATED
  // ============================================

  private async attemptTokenRefresh(): Promise<string | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshingToken && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshingToken = true;
    this.refreshPromise = this.doTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshingToken = false;
      this.refreshPromise = null;
    }
  }

  private async doTokenRefresh(): Promise<string | null> {
    console.log('[API] Attempting token refresh...');
    
    if (!this.onTokenRefresh) {
      console.error('[API] No token refresh callback set - cannot refresh');
      return null;
    }

    try {
      const newToken = await this.onTokenRefresh();
      if (newToken && this.isValidToken(newToken)) {
        console.log('[API] Token refresh successful');
        return newToken;
      }
      console.error('[API] Token refresh returned invalid token');
      return null;
    } catch (error) {
      console.error('[API] Token refresh error:', error);
      return null;
    }
  }

  // ============================================
  // AUTHENTICATION - OTP + Token Management
  // ============================================

  /**
   * Send OTP to phone number
   * FAIL-SAFE: Returns structured response, never throws
   */
  async sendOTP(
    phone: string, 
    purpose: 'login' | 'register' | 'reset_password' = 'login'
  ): Promise<ApiResponse<{ expiresIn: number; otp?: string }>> {
    console.log('[API] Send OTP request for:', phone);
    
    // Validate phone format BEFORE making request
    if (!phone || phone.length < 10) {
      return { 
        success: false, 
        error: 'Please enter a valid phone number' 
      };
    }

    const result = await this.request<{ expiresIn: number; otp?: string }>(
      '/auth/send-otp', 
      'POST', 
      { phone, purpose }
    );

    return result;
  }

  /**
   * Verify OTP and authenticate
   * FAIL-SAFE: Returns structured response, never throws
   */
  async verifyOTP(data: {
    phone: string;
    otp: string;
    purpose: 'login' | 'register';
    name?: string;
    email?: string;
    deviceId?: string;
    deviceName?: string;
    deviceType?: 'ios' | 'android';
  }): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    console.log('[API] Verify OTP request for:', data.phone);
    
    // Validate OTP format BEFORE making request
    if (!data.otp || data.otp.length !== 6 || !/^\d{6}$/.test(data.otp)) {
      return { 
        success: false, 
        error: 'Please enter a valid 6-digit OTP' 
      };
    }

    const response = await this.request<AuthResponse>('/auth/verify-otp', 'POST', data);
    
    if (response.success && response.data) {
      // RESILIENCE: Handle both token key formats
      const accessToken = response.data.accessToken || (response.data as any).token;
      const refreshToken = response.data.refreshToken;
      
      // FAIL LOUD: Validate tokens exist
      if (!accessToken) {
        console.error('[API] CRITICAL: Verify OTP succeeded but no accessToken in response');
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing access token)' 
        };
      }
      
      if (!refreshToken) {
        console.error('[API] CRITICAL: Verify OTP succeeded but no refreshToken in response');
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing refresh token)' 
        };
      }
      
      // Store refresh token in SecureStore (handle failure gracefully)
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken);
        console.log('[API] RefreshToken stored in SecureStore');
      } catch (storageError) {
        console.error('[API] SecureStore error (non-fatal):', storageError);
        // Continue - token is still in memory for this session
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      };
    }
    
    return response as ApiResponse<{ user: User; accessToken: string; refreshToken: string }>;
  }

  /**
   * Login with email/password (legacy, fallback)
   * FAIL-SAFE: Returns structured response, never throws
   */
  async login(
    email: string, 
    password: string, 
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      deviceType?: 'ios' | 'android';
    }
  ): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    console.log('[API] Login request for:', email);
    
    // Validate inputs BEFORE making request
    if (!email || !password) {
      return { 
        success: false, 
        error: 'Email and password are required' 
      };
    }

    const response = await this.request<AuthResponse>('/auth/login', 'POST', {
      email,
      password,
      ...deviceInfo,
    });
    
    if (response.success && response.data) {
      // RESILIENCE: Handle both token key formats
      const accessToken = response.data.accessToken || (response.data as any).token;
      const refreshToken = response.data.refreshToken;
      
      // FAIL LOUD: Check for tokens
      if (!accessToken) {
        const error = '[API] CRITICAL: Login succeeded but no accessToken in response';
        console.error(error);
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing access token)' 
        };
      }
      
      if (!refreshToken) {
        const error = '[API] CRITICAL: Login succeeded but no refreshToken in response';
        console.error(error);
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing refresh token)' 
        };
      }
      
      // Store refresh token in SecureStore
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken);
        console.log('[API] RefreshToken stored in SecureStore');
      } catch (storageError) {
        console.error('[API] SecureStore error (non-fatal):', storageError);
        // Continue - token is still in memory
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      };
    }
    
    return response as ApiResponse<{ user: User; accessToken: string; refreshToken: string }>;
  }

  /**
   * Register new user
   */
  async register(
    data: RegisterRequest, 
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      deviceType?: 'ios' | 'android';
    }
  ): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    console.log('[API] Register request for:', data.email);
    
    // Validate inputs
    if (!data.email || !data.password || !data.name || !data.phone) {
      return { 
        success: false, 
        error: 'All fields are required for registration' 
      };
    }

    const response = await this.request<AuthResponse>('/auth/register', 'POST', {
      ...data,
      ...deviceInfo,
    });
    
    if (response.success && response.data) {
      const accessToken = response.data.accessToken || (response.data as any).token;
      const refreshToken = response.data.refreshToken;
      
      if (!accessToken || !refreshToken) {
        console.error('[API] CRITICAL: Register succeeded but missing tokens');
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response' 
        };
      }
      
      // Store refresh token
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken);
        console.log('[API] RefreshToken stored in SecureStore');
      } catch (storageError) {
        console.error('[API] SecureStore error (non-fatal):', storageError);
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      };
    }
    
    return response as ApiResponse<{ user: User; accessToken: string; refreshToken: string }>;
  }

  /**
   * Login with Google ID token
   * FAIL-SAFE: Returns structured response, never throws
   */
  async googleLogin(idToken: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    console.log('[API] Google login request');
    
    // Validate ID token
    if (!idToken) {
      return { 
        success: false, 
        error: 'Google authentication token is required' 
      };
    }

    const response = await this.request<AuthResponse>('/auth/google', 'POST', {
      idToken,
    });
    
    if (response.success && response.data) {
      const accessToken = response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      
      // FAIL LOUD: Check for tokens
      if (!accessToken) {
        console.error('[API] CRITICAL: Google login succeeded but no accessToken in response');
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing access token)' 
        };
      }
      
      if (!refreshToken) {
        console.error('[API] CRITICAL: Google login succeeded but no refreshToken in response');
        return { 
          success: false, 
          error: 'Authentication error: Invalid server response (missing refresh token)' 
        };
      }
      
      // Store refresh token in SecureStore
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken);
        console.log('[API] RefreshToken stored in SecureStore');
      } catch (storageError) {
        console.error('[API] SecureStore error (non-fatal):', storageError);
      }
      
      return {
        success: true,
        data: {
          user: response.data.user,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      };
    }
    
    return response as ApiResponse<{ user: User; accessToken: string; refreshToken: string }>;
  }

  /**
   * Logout - clear tokens
   */
  async logout(accessToken?: string): Promise<ApiResponse<void>> {
    console.log('[API] Logout request');
    
    try {
      const response = await this.request<void>('/auth/logout', 'POST', undefined, accessToken);
      
      // Clear refresh token from SecureStore
      await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken).catch(() => {});
      
      return response;
    } catch (error) {
      // Even if logout fails on server, clear local tokens
      await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken).catch(() => {});
      return { success: true };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(accessToken?: string): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me', 'GET', undefined, accessToken);
  }

  /**
   * Refresh access token using refresh token
   * CRITICAL: This is called by authStore, not directly
   */
  async refreshAccessToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    console.log('[API] Refresh token request');
    
    // Validate refresh token
    if (!refreshToken || !this.isValidToken(refreshToken)) {
      console.error('[API] Invalid refresh token provided');
      return { 
        success: false, 
        error: 'Invalid refresh token' 
      };
    }
    
    const response = await this.request<RefreshResponse>('/auth/refresh', 'POST', {
      refreshToken,
    });
    
    if (response.success && response.data) {
      const accessToken = response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;
      
      if (!accessToken) {
        console.error('[API] CRITICAL: Refresh succeeded but no accessToken');
        return { success: false, error: 'Token refresh failed - no access token returned' };
      }
      
      // Store new refresh token if provided (rotation)
      if (newRefreshToken) {
        try {
          await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, newRefreshToken);
          console.log('[API] New refreshToken stored');
        } catch (storageError) {
          console.error('[API] SecureStore error (non-fatal):', storageError);
        }
      }
      
      return {
        success: true,
        data: { accessToken, refreshToken: newRefreshToken || refreshToken },
      };
    }
    
    return response as ApiResponse<{ accessToken: string; refreshToken: string }>;
  }

  // ==========================================
  // RIDER / DRIVER
  // ==========================================

  async getRiderProfile(accessToken?: string): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/riders/me', 'GET', undefined, accessToken);
  }

  async updateRiderLocation(latitude: number, longitude: number, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>('/rider/location', 'POST', { latitude, longitude }, accessToken);
  }

  async setRiderOnline(online: boolean, accessToken?: string): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/rider/status', 'POST', { isOnline: online }, accessToken);
  }

  async getRiderTasks(status?: string, accessToken?: string): Promise<ApiResponse<Task[]>> {
    const query = status ? `?status=${status}` : '';
    return this.request<Task[]>(`/riders/tasks${query}`, 'GET', undefined, accessToken);
  }

  async acceptTask(taskId: string, accessToken?: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}/accept`, 'POST', undefined, accessToken);
  }

  async declineTask(taskId: string, reason?: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}/decline`, 'POST', { reason }, accessToken);
  }

  async updateTaskStatus(taskId: string, status: string, accessToken?: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}/status`, 'POST', { status }, accessToken);
  }

  async sendHeartbeat(data: {
    latitude: number;
    longitude: number;
    batteryLevel?: number;
    speed?: number;
    heading?: number;
  }, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>('/rider/heartbeat', 'POST', data, accessToken);
  }

  // ==========================================
  // TASKS / RIDES
  // ==========================================

  async requestRide(data: RideRequestRequest, accessToken?: string): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks', 'POST', data, accessToken);
  }

  async getTask(taskId: string, accessToken?: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}`, 'GET', undefined, accessToken);
  }

  async getActiveTask(accessToken?: string): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks/active', 'GET', undefined, accessToken);
  }

  async cancelTask(taskId: string, reason: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}/cancel`, 'POST', { reason }, accessToken);
  }

  async getTaskHistory(page: number = 1, limit: number = 20, accessToken?: string): Promise<ApiResponse<PaginatedResponse<Task>>> {
    return this.request<PaginatedResponse<Task>>(`/tasks/history?page=${page}&limit=${limit}`, 'GET', undefined, accessToken);
  }

  // ==========================================
  // ORDERS / FOOD DELIVERY
  // ==========================================

  async getMerchants(type?: string, accessToken?: string): Promise<ApiResponse<Merchant[]>> {
    const query = type ? `?type=${type}` : '';
    return this.request<Merchant[]>(`/merchants${query}`, 'GET', undefined, accessToken);
  }

  async getMerchant(merchantId: string, accessToken?: string): Promise<ApiResponse<Merchant>> {
    return this.request<Merchant>(`/merchants/${merchantId}`, 'GET', undefined, accessToken);
  }

  async getMerchantProducts(merchantId: string, accessToken?: string): Promise<ApiResponse<MenuItem[]>> {
    return this.request<MenuItem[]>(`/merchants/${merchantId}/menu`, 'GET', undefined, accessToken);
  }

  async getMerchantMenu(merchantId: string, accessToken?: string): Promise<ApiResponse<MenuItem[]>> {
    return this.request<MenuItem[]>(`/merchants/${merchantId}/menu`, 'GET', undefined, accessToken);
  }

  async placeOrder(data: OrderRequest, accessToken?: string): Promise<ApiResponse<Order>> {
    return this.request<Order>('/orders', 'POST', data, accessToken);
  }

  async getOrder(orderId: string, accessToken?: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/orders/${orderId}`, 'GET', undefined, accessToken);
  }

  async getOrders(page: number = 1, limit: number = 20, accessToken?: string): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return this.request<PaginatedResponse<Order>>(`/orders?page=${page}&limit=${limit}`, 'GET', undefined, accessToken);
  }

  async cancelOrder(orderId: string, reason: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/orders/${orderId}/cancel`, 'POST', { reason }, accessToken);
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  async initiateMTNMoMoPayment(phoneNumber: string, amount: number, accessToken?: string): Promise<ApiResponse<{ reference: string }>> {
    return this.request<{ reference: string }>('/payments/mtn/collect', 'POST', {
      phoneNumber,
      amount,
    }, accessToken);
  }

  async initiateAirtelMoneyPayment(phoneNumber: string, amount: number, accessToken?: string): Promise<ApiResponse<{ reference: string }>> {
    return this.request<{ reference: string }>('/payments/airtel/collect', 'POST', {
      phoneNumber,
      amount,
    }, accessToken);
  }

  async checkPaymentStatus(reference: string, accessToken?: string): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(`/payments/status/${reference}`, 'GET', undefined, accessToken);
  }

  // ==========================================
  // MAPBOX / GEOCODING
  // ==========================================

  async searchPlaces(query: string, accessToken?: string): Promise<ApiResponse<{ place_name: string; center: [number, number] }[]>> {
    return this.request(`/mapbox/geocoding?query=${encodeURIComponent(query)}`, 'GET', undefined, accessToken);
  }

  async reverseGeocode(latitude: number, longitude: number, accessToken?: string): Promise<ApiResponse<{ address: string }>> {
    return this.request(`/mapbox/geocoding/reverse?lat=${latitude}&lng=${longitude}`, 'GET', undefined, accessToken);
  }

  // ==========================================
  // SOS / EMERGENCY
  // ==========================================

  async triggerSOS(data: {
    latitude: number;
    longitude: number;
    taskId?: string;
    emergencyType: string;
  }, accessToken?: string): Promise<ApiResponse<{ sosId: string }>> {
    return this.request<{ sosId: string }>('/sos', 'POST', data, accessToken);
  }

  async resolveSOS(sosId: string, notes?: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/sos/${sosId}/resolve`, 'POST', { notes }, accessToken);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async registerPushToken(token: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications/token', 'POST', { token }, accessToken);
  }

  async getNotifications(accessToken?: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/notifications', 'GET', undefined, accessToken);
  }

  async markNotificationRead(notificationId: string, accessToken?: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/notifications/${notificationId}/read`, 'POST', undefined, accessToken);
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  async updateProfile(data: Partial<User>, accessToken?: string): Promise<ApiResponse<User>> {
    return this.request<User>('/users/me', 'PATCH', data, accessToken);
  }

  async getWallet(accessToken?: string): Promise<ApiResponse<{ balance: number }>> {
    return this.request<{ balance: number }>('/wallet/balance', 'GET', undefined, accessToken);
  }

  async getWalletBalance(accessToken?: string): Promise<ApiResponse<{ balance: number }>> {
    return this.request<{ balance: number }>('/wallet/balance', 'GET', undefined, accessToken);
  }

  async getWalletTransactions(accessToken?: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/wallet/transactions', 'GET', undefined, accessToken);
  }

  // ==========================================
  // PHARMACY / HEALTH
  // ==========================================

  async getPharmacies(accessToken?: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/health-providers?providerType=PHARMACY', 'GET', undefined, accessToken);
  }

  // ==========================================
  // SESSIONS
  // ==========================================

  async getSessions(accessToken?: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/auth/sessions', 'GET', undefined, accessToken);
  }

  async revokeAllSessions(accessToken?: string): Promise<ApiResponse<{ revokedCount: number }>> {
    return this.request<{ revokedCount: number }>('/auth/sessions', 'DELETE', {}, accessToken);
  }

  // ==========================================
  // NETWORK STATUS
  // ==========================================

  getNetworkQuality(): { quality: string; avgLatency: number } {
    return {
      quality: this.networkDetector.getQuality(),
      avgLatency: this.networkDetector.getAverageLatency(),
    };
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
