/**
 * Smart Ride - API Service
 * 
 * This service connects to the Next.js backend API.
 * All endpoints are the same as the web app - just called from React Native.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://smartride.ug/api';   // Production

// Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'CLIENT' | 'RIDER' | 'ADMIN';
}

interface Ride {
  id: string;
  status: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  fare: number;
  riderId?: string;
}

// API Client Class
class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.loadToken();
  }

  private async loadToken() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: object
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: await this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', 'POST', {
      email,
      password,
    });
    
    if (response.success && response.data?.token) {
      this.token = response.data.token;
      await AsyncStorage.setItem('auth_token', response.data.token);
    }
    
    return response;
  }

  async googleSignIn(idToken: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/google', 'POST', {
      idToken,
    });
    
    if (response.success && response.data?.token) {
      this.token = response.data.token;
      await AsyncStorage.setItem('auth_token', response.data.token);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  // Rides
  async requestRide(data: {
    pickup: { lat: number; lng: number; address: string };
    dropoff: { lat: number; lng: number; address: string };
    rideType: 'BODA' | 'CAR';
  }): Promise<ApiResponse<Ride>> {
    return this.request<Ride>('/rides/request', 'POST', data);
  }

  async getActiveRide(): Promise<ApiResponse<Ride>> {
    return this.request<Ride>('/rides/active');
  }

  async cancelRide(rideId: string, reason: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/rides/${rideId}/cancel`, 'POST', { reason });
  }

  // Food Delivery
  async getRestaurants(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/merchants?type=RESTAURANT');
  }

  async placeOrder(data: {
    merchantId: string;
    items: { id: string; quantity: number }[];
    deliveryAddress: { lat: number; lng: number; address: string };
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/orders', 'POST', data);
  }

  // Payments
  async payWithMTNMoMo(phoneNumber: string, amount: number): Promise<ApiResponse<{ reference: string }>> {
    return this.request<{ reference: string }>('/payments/mtn/collect', 'POST', {
      phoneNumber,
      amount,
    });
  }

  async payWithAirtelMoney(phoneNumber: string, amount: number): Promise<ApiResponse<{ reference: string }>> {
    return this.request<{ reference: string }>('/payments/airtel/collect', 'POST', {
      phoneNumber,
      amount,
    });
  }

  // User Profile
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile', 'PUT', data);
  }
}

export const api = new ApiService();
export default api;
