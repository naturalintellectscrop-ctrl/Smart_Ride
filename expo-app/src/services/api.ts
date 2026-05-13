// ============================================
// SMART RIDE MOBILE - API SERVICE
// ============================================
// Minimal API service for boot - no external dependencies
// ============================================

import { ApiResponse, Task, Order, Merchant, User } from '../types';
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

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', 'POST');
    await AsyncStorage.multiRemove([STORAGE_KEYS.authToken, STORAGE_KEYS.refreshToken]);
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // ==========================================
  // TASKS
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

  // ==========================================
  // MAPBOX / GEOCODING
  // ==========================================

  async searchPlaces(query: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/mapbox/geocoding?query=${encodeURIComponent(query)}`);
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
