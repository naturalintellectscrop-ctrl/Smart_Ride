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
}

export const api = new ApiService();
export default api;

console.log('[API-SERVICE] Service initialized');
