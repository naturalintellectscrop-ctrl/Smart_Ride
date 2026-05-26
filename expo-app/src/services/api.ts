// ============================================
// SMART RIDE MOBILE - API SERVICE
// ============================================
// Complete API service with all endpoints
// ============================================

import { ApiResponse, Task, Order, Merchant, User, Rider } from '../types';
import { API_CONFIG, STORAGE_KEYS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// API CLIENT
// ============================================

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const token = await AsyncStorage.getItem(STORAGE_KEYS.authToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: await this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || `HTTP error: ${response.status}` 
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[API] Request error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      };
    }
  }

  // ==========================================
  // AUTH
  // ==========================================

  async login(email: string, password: string): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    const response = await this.request<{ user: User; accessToken: string }>('/auth/login', 'POST', {
      email,
      password,
    });
    
    if (response.success && response.data?.accessToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.authToken, response.data.accessToken);
    }
    
    return response;
  }

  async register(data: { name: string; email: string; phone: string; password: string }): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    const response = await this.request<{ user: User; accessToken: string }>('/auth/register', 'POST', data);
    
    if (response.success && response.data?.accessToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.authToken, response.data.accessToken);
    }
    
    return response;
  }

  async googleSignIn(idToken: string): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    const response = await this.request<{ user: User; accessToken: string }>('/auth/google', 'POST', {
      idToken,
    });
    
    if (response.success && response.data?.accessToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.authToken, response.data.accessToken);
    }
    
    return response;
  }

  // OTP methods - both naming conventions supported
  async sendOtp(phone: string, purpose?: string): Promise<ApiResponse<{ messageId: string; otp?: string; expiresIn?: number }>> {
    return this.request<{ messageId: string; otp?: string; expiresIn?: number }>('/auth/send-otp', 'POST', { phone, purpose });
  }

  // Alias for backwards compatibility
  async sendOTP(phone: string, purpose?: string): Promise<ApiResponse<{ messageId: string; otp?: string; expiresIn?: number }>> {
    return this.sendOtp(phone, purpose);
  }

  async verifyOtp(phoneOrData: string | { phone: string; otp: string; purpose?: string; deviceId?: string; deviceName?: string; deviceType?: string }, otp?: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    let data: { phone: string; otp: string; purpose?: string; deviceId?: string; deviceName?: string; deviceType?: string };
    
    if (typeof phoneOrData === 'object') {
      data = phoneOrData;
    } else {
      data = { phone: phoneOrData, otp: otp! };
    }
    
    const response = await this.request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/verify-otp', 'POST', data);
    
    if (response.success && response.data?.accessToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.authToken, response.data.accessToken);
    }
    
    return response;
  }

  // Alias for backwards compatibility
  async verifyOTP(phoneOrData: string | { phone: string; otp: string; purpose?: string }, otp?: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    return this.verifyOtp(phoneOrData as any, otp);
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', 'POST');
    await AsyncStorage.multiRemove([STORAGE_KEYS.authToken, STORAGE_KEYS.refreshToken]);
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // ==========================================
  // PASSWORD RESET (User Forgot/Reset)
  // ==========================================

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', 'POST', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', 'POST', { token, newPassword });
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  async updateProfile(data: { name?: string; phone?: string; avatarUrl?: string }): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile', 'PUT', data);
  }

  // ==========================================
  // RIDER / DRIVER PROFILE
  // ==========================================

  async getRiderProfile(): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/riders/profile');
  }

  async updateRiderProfile(data: Partial<Rider>): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/riders/profile', 'PUT', data);
  }

  async setRiderOnline(online: boolean): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/riders/status', 'POST', { isOnline: online });
  }

  async sendHeartbeat(location: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
    task_id?: string;
    battery_level?: number;
  }): Promise<ApiResponse<void>> {
    return this.request<void>('/rider/heartbeat', 'POST', location);
  }

  // ==========================================
  // TASKS - CLIENT
  // ==========================================

  async requestRide(data: any): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks', 'POST', data);
  }

  async getTask(taskId: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  async getActiveTask(): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks/active');
  }

  async getTaskHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<{ data: Task[] }>> {
    return this.request<{ data: Task[] }>(`/tasks/history?page=${page}&limit=${limit}`);
  }

  async cancelTask(taskId: string, reason: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}/cancel`, 'POST', { reason });
  }

  // ==========================================
  // TASKS - DRIVER
  // ==========================================

  async getAvailableTasks(): Promise<ApiResponse<Task[]>> {
    return this.request<Task[]>('/tasks/available');
  }

  async acceptTask(taskId: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}/accept`, 'POST');
  }

  async declineTask(taskId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}/decline`, 'POST');
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${taskId}/status`, 'POST', { status });
  }

  async transitionTask(taskId: string, toStatus: string, context?: { riderId?: string; reason?: string; latitude?: number; longitude?: number; metadata?: Record<string, unknown> }): Promise<ApiResponse<{ task: Task }>> {
    return this.request<{ task: Task }>(`/tasks/${taskId}/transition`, 'POST', {
      toStatus,
      ...context,
    });
  }

  // ==========================================
  // ORDERS
  // ==========================================

  async getOrders(page: number = 1, limit: number = 20): Promise<ApiResponse<{ data: Order[] }>> {
    return this.request<{ data: Order[] }>(`/orders?page=${page}&limit=${limit}`);
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/orders/${orderId}`);
  }

  async placeOrder(data: any): Promise<ApiResponse<Order>> {
    return this.request<Order>('/orders', 'POST', data);
  }

  // ==========================================
  // MERCHANTS
  // ==========================================

  async getMerchants(type?: string): Promise<ApiResponse<Merchant[]>> {
    const query = type ? `?type=${type}` : '';
    return this.request<Merchant[]>(`/merchants${query}`);
  }

  async getMerchant(merchantId: string): Promise<ApiResponse<Merchant>> {
    return this.request<Merchant>(`/merchants/${merchantId}`);
  }

  async getMerchantMenu(merchantId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/merchants/${merchantId}/menu`);
  }

  async getMerchantProducts(merchantId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/merchants/${merchantId}/products`);
  }

  // ==========================================
  // HEALTH / PHARMACIES
  // ==========================================

  async getPharmacies(): Promise<ApiResponse<Merchant[]>> {
    return this.request<Merchant[]>('/merchants?type=PHARMACY');
  }

  // ==========================================
  // MAPBOX / GEOCODING
  // ==========================================

  async searchPlaces(query: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/mapbox/geocoding?query=${encodeURIComponent(query)}`);
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/mapbox/reverse?lat=${latitude}&lng=${longitude}`);
  }

  // ==========================================
  // WALLET
  // ==========================================

  async getWallet(): Promise<ApiResponse<{ 
    wallet: { 
      balance: number; 
      pendingBalance: number; 
      totalDeposited: number;
      totalWithdrawn: number;
    }; 
    transactions: any[];
    paymentMethods: any[];
  }>> {
    return this.request<{ 
      wallet: { 
        balance: number; 
        pendingBalance: number; 
        totalDeposited: number;
        totalWithdrawn: number;
      }; 
      transactions: any[];
      paymentMethods: any[];
    }>('/wallet');
  }

  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    return this.request<{ balance: number }>('/wallet/balance');
  }

  async getWalletTransactions(page: number = 1, limit: number = 20): Promise<ApiResponse<{ data: any[] }>> {
    return this.request<{ data: any[] }>(`/wallet/transactions?page=${page}&limit=${limit}`);
  }

  async requestWithdrawal(amount: number, phone: string, provider: string): Promise<ApiResponse<any>> {
    return this.request<any>('/wallet/withdraw', 'POST', { amount, phone, provider });
  }

  // ==========================================
  // SOS
  // ==========================================

  async triggerSOS(data: any): Promise<ApiResponse<{ sosId: string }>> {
    return this.request<{ sosId: string }>('/sos', 'POST', data);
  }

  // ==========================================
  // AUDIT LOGGING - Mobile App Activity
  // ==========================================

  async logActivity(data: {
    action: string;
    entityType: string;
    entityId: string;
    description?: string;
    actorType?: string;
    actorId?: string;
    userId?: string;
    riderId?: string;
    orderId?: string;
    taskId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/audit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.warn('[AUDIT] Failed to log activity:', response.status);
        return { success: false, error: 'Failed to log activity' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      // Audit logging should never block the main flow
      console.warn('[AUDIT] Failed to log activity:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // ==========================================
  // TASK TRANSITIONS (State Machine)
  // ==========================================

  async transitionTask(taskId: string, toStatus: string, context?: {
    riderId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<{ task: any; transition: any }>> {
    return this.request<{ task: any; transition: any }>(`/tasks/${taskId}/transition`, 'POST', {
      toStatus,
      ...context,
    });
  }

  // ==========================================
  // DISPATCH
  // ==========================================

  async dispatchAssign(data: {
    taskId: string;
    taskType: string;
    pickupLatitude: number;
    pickupLongitude: number;
    excludeRiderIds?: string[];
    priority?: number;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/dispatch/assign', 'POST', data);
  }

  async dispatchAccept(matchId: string): Promise<ApiResponse<{ taskId: string }>> {
    return this.request<{ taskId: string }>(`/dispatch/${matchId}/accept`, 'POST');
  }

  async dispatchReject(matchId: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dispatch/${matchId}/reject`, 'POST', { reason });
  }

  async getDispatchHistory(taskId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dispatch?taskid=${taskId}`);
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  async getAuditLogs(filters?: {
    actorType?: string;
    entityType?: string;
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ logs: any[]; pagination: any }>> {
    const params = new URLSearchParams();
    params.set('action', 'list');
    if (filters?.actorType) params.set('actorType', filters.actorType);
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.source) params.set('source', filters.source);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return this.request<{ logs: any[]; pagination: any }>(`/audit?${params.toString()}`);
  }

  async getAuditStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.set('action', 'stats');
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    return this.request<any>(`/audit?${params.toString()}`);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async getNotifications(page: number = 1, limit: number = 20, unreadOnly?: boolean): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (unreadOnly) params.set('unreadOnly', 'true');
    return this.request<any>(`/notifications?${params.toString()}`);
  }

  async markNotificationRead(notificationId?: string, markAll?: boolean): Promise<ApiResponse<any>> {
    return this.request<any>('/notifications/read', 'POST', {
      notificationId,
      markAll,
    });
  }

  // ==========================================
  // TASK HISTORY (for client)
  // ==========================================

  async getClientTasks(taskType?: string, status?: string, page: number = 1, limit: number = 20): Promise<ApiResponse<{ data: any[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (taskType) params.set('taskType', taskType);
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return this.request<{ data: any[]; pagination: any }>(`/tasks?${params.toString()}`);
  }
}

export const api = new ApiService();
export default api;

console.log('[API-SERVICE] Service initialized');
