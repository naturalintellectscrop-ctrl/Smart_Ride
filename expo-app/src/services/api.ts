// ============================================
// SMART RIDE MOBILE - API SERVICE
// ============================================
// Complete API service with all endpoints
// ============================================

import { ApiResponse, Task, Order, Merchant, User, Rider, RiderReputation, TaskPaymentResult } from '../types';
import { API_CONFIG, STORAGE_KEYS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { secureStorage } from '../utils/secureStorage';

// ============================================
// API CLIENT
// ============================================

/**
 * Order status (what the merchant screens render) -> backend action verb
 * (what `PATCH /orders/{id}?action=` accepts). Kept next to the only method
 * that uses it so the two cannot drift apart unnoticed.
 */
const ORDER_STATUS_TO_ACTION: Record<string, string> = {
  CONFIRMED: 'accept',
  ACCEPTED: 'accept',
  REJECTED: 'reject',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready',
  READY: 'ready',
  PICKED_UP: 'pickup',
  DELIVERED: 'deliver',
  CANCELLED: 'cancel',
};

/**
 * Pharmacist screen status -> `PATCH /health-provider/orders` action verb.
 * The provider order lifecycle speaks in actions (ACCEPT, START_PREPARING,
 * READY, DELIVER …), not statuses.
 */
const HEALTH_STATUS_TO_ACTION: Record<string, string> = {
  ACCEPTED: 'ACCEPT',
  PROCESSING: 'START_PREPARING',
  PREPARING: 'START_PREPARING',
  PRESCRIPTION_VERIFIED: 'VERIFY_PRESCRIPTION',
  READY_FOR_PICKUP: 'READY',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  COMPLETED: 'DELIVER',
  DELIVERED: 'DELIVER',
  CANCELLED: 'CANCEL',
  REJECTED: 'REJECT',
};

class ApiService {
  private baseUrl: string;

  // Timeout defaults: 15s for reads, 30s for writes
  private static READ_TIMEOUT = 15000;
  private static WRITE_TIMEOUT = 30000;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Read access token from SecureStore (encrypted storage)
    const token = await secureStorage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    // Determine timeout: reads (GET) get 15s, writes get 30s
    const isWrite = method !== 'GET';
    const timeoutMs = isWrite ? ApiService.WRITE_TIMEOUT : ApiService.READ_TIMEOUT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: await this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // Request succeeded — clear the timeout
      clearTimeout(timeoutId);

      // Handle 401 - attempt token refresh and retry once
      if (response.status === 401 && !isRetry) {
        console.log('[API] Got 401, attempting token refresh...');
        const newToken = await this.tryRefreshToken();
        if (newToken) {
          // Retry the original request with new token
          return this.request<T>(endpoint, method, body, true);
        }
        // Refresh failed - clear tokens and log out
        await secureStorage.clearAll();
        try { useAuthStore.getState().logout(); } catch {}
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP error: ${response.status}`,
          status: response.status,
        };
      }

      // Unwrap the backend response envelope.
      // The backend wraps ALL responses in { success, data, ... } (see
      // src/lib/api/response.ts → successResponse / paginatedResponse).
      // Without unwrapping, callers receive a double-wrapped payload
      // (response.data = { success, data }) and field access like
      // response.data.accessToken silently returns undefined — breaking
      // token persistence, profile loading, and every typed consumer.
      // Extract the inner payload so response.data IS the real data.
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        // `pagination` is a SIBLING of `data` in paginatedResponse, so
        // unwrapping to the inner payload threw it away and every paged list
        // believed it was on page 1 of 1. Carried through separately rather
        // than folded into `data`, so the shape every existing caller reads is
        // untouched.
        return {
          success: true,
          data: (data as any).data,
          pagination: (data as any).pagination,
        };
      }

      // Fallback for endpoints that return a raw (un-wrapped) payload.
      return { success: true, data };
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Detect abort/timeout error
      if (error?.name === 'AbortError') {
        console.error('[API] Request timed out:', `${method} ${endpoint}`);
        return {
          success: false,
          error: 'Request timed out. Please check your connection.',
        };
      }

      console.error('[API] Request error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      };
    }
  }

  /**
   * Attempt to refresh the access token.
   * Uses a shared promise to prevent concurrent refresh calls.
   */
  private async tryRefreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      const refreshController = new AbortController();
      const refreshTimeoutId = setTimeout(() => refreshController.abort(), ApiService.WRITE_TIMEOUT);

      try {
        // Read refresh token from SecureStore (encrypted storage)
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          console.log('[API] No refresh token available');
          return null;
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: refreshController.signal,
        });

        clearTimeout(refreshTimeoutId);
        const data = await response.json();

        if (data.success && data.data?.accessToken) {
          // Save refreshed tokens to SecureStore. The backend rotates the
          // refresh token on every refresh, so the new one MUST be stored —
          // the old one is already invalid server-side.
          await this.persistTokens(data.data.accessToken, data.data.refreshToken);
          console.log('[API] Token refresh successful');
          return data.data.accessToken;
        }

        console.log('[API] Token refresh failed:', data.error);
        return null;
      } catch (error: any) {
        clearTimeout(refreshTimeoutId);
        if (error?.name === 'AbortError') {
          console.error('[API] Token refresh timed out');
        } else {
          console.error('[API] Token refresh error:', error);
        }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ==========================================
  // AUTH
  // ==========================================

  // NOTE: the backend issues a refresh token on login/register/google and
  // ROTATES it on every /auth/refresh (the old one is invalidated server-side).
  // So the refresh token must always be persisted when present — saving
  // saveTokens(accessToken, '') here would wipe it and log the user out as
  // soon as the 7-day access token expires. Use persistTokens() below.
  private async persistTokens(accessToken: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await secureStorage.saveTokens(accessToken, refreshToken);
    } else {
      // No refresh token in this response — update ONLY the access token so a
      // previously-stored refresh token survives.
      await secureStorage.saveAccessToken(accessToken);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.authToken, accessToken);
  }

  async login(email: string, password: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    const response = await this.request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/login', 'POST', {
      email,
      password,
    });

    if (response.success && response.data?.accessToken) {
      await this.persistTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  async register(data: { name: string; email: string; phone: string; password: string }): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    const response = await this.request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/register', 'POST', data);

    if (response.success && response.data?.accessToken) {
      await this.persistTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  async googleSignIn(idToken: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    const response = await this.request<{ user: User; accessToken: string; refreshToken?: string }>('/auth/google', 'POST', {
      idToken,
    });

    if (response.success && response.data?.accessToken) {
      await this.persistTokens(response.data.accessToken, response.data.refreshToken);
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
      await this.persistTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  // Alias for backwards compatibility
  async verifyOTP(phoneOrData: string | { phone: string; otp: string; purpose?: string }, otp?: string): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken?: string }>> {
    return this.verifyOtp(phoneOrData as any, otp);
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', 'POST');
    await secureStorage.clearAll();
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

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.request('/auth/change-password', 'POST', { currentPassword, newPassword });
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  async updateProfile(data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    avatarUrl?: string;
    role?: string;
  }): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile', 'PUT', data);
  }

  /**
   * Fetch the current user's full profile (includes address &
   * notificationPreferences). Uses /user/profile which is more
   * complete than /auth/me for editing purposes.
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile');
  }

  async updateUserRole(role: string): Promise<ApiResponse<User>> {
    return this.request<User>('/user/profile', 'PUT', { role });
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
    accuracy?: number | null;
    task_id?: string;
    battery_level?: number;
  }): Promise<ApiResponse<void>> {
    return this.request<void>('/rider/heartbeat', 'POST', location);
  }

  // ==========================================
  // RIDER ONBOARDING
  // ==========================================

  async getRiderOnboarding(): Promise<ApiResponse<any>> {
    return this.request<any>('/riders/onboarding');
  }

  async updateRiderOnboarding(step: string | number, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return this.request<any>('/riders/onboarding', 'PUT', { step, ...data });
  }

  async registerRider(data: {
    fullName?: string;
    phone?: string;
    email?: string;
    password?: string;
    physicalAddress?: string;
    address?: string;
    riderRole?: string;
    riderRoleType?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    plateNumber?: string;
    vehicleModel?: string;
    model?: string;
    make?: string;
    vehicleColor?: string;
    color?: string;
    year?: number | string;
    // Document URLs (uploaded separately via /uploads/documents)
    photoUrl?: string;
    nationalIdFrontUrl?: string;
    nationalIdBackUrl?: string;
    driverLicenseUrl?: string;
    vehiclePhotoUrl?: string;
    // Legacy document fields (base64 data URLs)
    facePhoto?: string;
    nationalIdFront?: string;
    nationalIdBack?: string;
    driversLicense?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<Rider>> {
    return this.request<Rider>('/riders/register', 'POST', data);
  }

  // ==========================================
  // PRESCRIPTIONS (Client + Pharmacist)
  // ==========================================

  /**
   * List prescriptions. For clients this returns their own prescriptions.
   * Pharmacists/admins can pass an optional status filter.
   */
  async getPrescriptions(status?: string): Promise<ApiResponse<any>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<any>(`/prescriptions${query}`);
  }

  /**
   * Upload a new prescription. The image should be uploaded to /uploads/documents
   * first and the resulting URL passed here.
   */
  async uploadPrescription(data: {
    imageUrl?: string;
    imageData?: string;
    doctorName?: string;
    doctorLicense?: string;
    clinicName?: string;
    notes?: string;
    prescriptionDate?: string;
    expiryDate?: string;
    medicines?: string[];
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/prescriptions', 'POST', data);
  }

  /**
   * Get a single prescription by id
   */
  async getPrescription(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/prescriptions/${id}`);
  }

  /**
   * Verify a prescription (pharmacist/admin)
   */
  async verifyPrescription(id: string, data: { notes?: string; healthOrderId?: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/prescriptions/${id}`, 'PATCH', {
      action: 'VERIFY',
      verificationNotes: data.notes,
      healthOrderId: data.healthOrderId,
    });
  }

  /**
   * Reject a prescription (pharmacist/admin)
   */
  async rejectPrescription(id: string, reason: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/prescriptions/${id}`, 'PATCH', {
      action: 'REJECT',
      rejectionReason: reason,
    });
  }

  /**
   * Delete a prescription (soft delete — sets status to EXPIRED)
   */
  async deletePrescription(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/prescriptions/${id}`, 'DELETE');
  }

  // ==========================================
  // FILE UPLOADS
  // ==========================================

  /**
   * Upload a document (image/pdf) using multipart/form-data.
   * Returns the public URL of the uploaded file.
   */
  async uploadDocument(file: { uri: string; type: string; name: string }, documentType?: string): Promise<ApiResponse<{ url: string; key: string; filename: string }>> {
    const token = await secureStorage.getAccessToken();
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    if (documentType) {
      formData.append('documentType', documentType);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ApiService.WRITE_TIMEOUT);

      const response = await fetch(`${this.baseUrl}/uploads/documents`, {
        method: 'POST',
        headers: {
          // IMPORTANT: do NOT set Content-Type here. React Native sets
          // "multipart/form-data; boundary=..." automatically when the body is
          // FormData. Hardcoding it omits the boundary, so the server can't
          // parse the body → "Upload of images failed".
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData as any,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || `HTTP error: ${response.status}` };
      }
      // The uploads endpoint returns { success, url, key, filename, ... } (no nested data field)
      return { success: true, data: { url: data.url, key: data.key, filename: data.filename } };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { success: false, error: 'Upload timed out. Please try again.' };
      }
      console.error('[API] Document upload error:', error);
      return { success: false, error: 'Failed to upload document. Please check your connection.' };
    }
  }

  // ==========================================
  // RIDER EARNINGS
  // ==========================================

  async getRiderEarnings(period: string = 'week'): Promise<ApiResponse<any>> {
    return this.request<any>(`/riders/earnings?period=${period}`);
  }

  async requestRiderWithdrawal(amount: number, phone: string, provider: string): Promise<ApiResponse<any>> {
    return this.request<any>('/riders/withdraw', 'POST', { amount, phone, provider });
  }

  // ==========================================
  // INTELLIGENT PLATFORM — DRIVER
  // ==========================================

  /**
   * The driver's own reputation: trust score, tier, the metrics that move it,
   * account health, tier privileges and live incentive progress.
   * Deliberately excludes internal fraud signals.
   */
  async getMyReputation(): Promise<ApiResponse<RiderReputation>> {
    return this.request<RiderReputation>('/rider/reputation');
  }

  /** Driver incentive campaigns currently open to enrol in. */
  async getAvailableIncentives(): Promise<ApiResponse<any>> {
    return this.request<any>('/marketplace/incentives?status=ACTIVE');
  }

  /** Enrol this driver in an incentive campaign. */
  async joinIncentive(incentiveId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/marketplace/incentives/participate', 'POST', { incentiveId });
  }

  // ==========================================
  // INTELLIGENT PLATFORM — CLIENT
  // ==========================================

  /** Promotions this client can currently use, with their own usage state. */
  async getMyPromotions(): Promise<ApiResponse<any>> {
    return this.request<any>('/marketplace/promotions');
  }

  /** Validate a promo code against an order amount before checkout. */
  async validatePromoCode(promoCode: string, orderAmount: number): Promise<ApiResponse<any>> {
    return this.request<any>('/marketplace/promotions', 'POST', { promoCode, orderAmount });
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

  /**
   * Submit proof of delivery. The backend refuses DELIVERED without it, so
   * this is not optional decoration — it is the step that makes a delivery
   * completable (BE-005).
   *
   * A 409 means the evidence was rejected (wrong code, too far from the
   * drop-off, already recorded), not that the request was malformed. The
   * courier can correct and retry.
   */
  async submitProofOfDelivery(
    taskId: string,
    proof: {
      proofType: 'CODE' | 'PHOTO' | 'SIGNATURE' | 'LEFT_WITH_NOTE';
      code?: string;
      photoUrl?: string;
      signatureUrl?: string;
      recipientName?: string;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<ApiResponse<{ proofCaptured: boolean; distanceFromDropoffKm?: number }>> {
    return this.request<{ proofCaptured: boolean; distanceFromDropoffKm?: number }>(
      `/tasks/${taskId}/proof`,
      'POST',
      proof,
    );
  }

  /**
   * Read the proof recorded for a task.
   *
   * `deliveryCode` comes back ONLY for the customer — a courier who could read
   * it could prove a delivery they never made, so the courier's copy of this
   * response has the field absent by design.
   */
  async getProofOfDelivery(taskId: string): Promise<ApiResponse<{
    proofType: string | null;
    proofPhotoUrl: string | null;
    proofRecipientName: string | null;
    proofCapturedAt: string | null;
    deliveryCode?: string;
  }>> {
    return this.request(`/tasks/${taskId}/proof`);
  }

  async getActiveTask(): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks/active');
  }

  // Returns the authenticated user's tasks (rider → assigned, client → own),
  // paginated + privacy-redacted server-side. Note: `/tasks/history` did not
  // exist (it matched /tasks/[id] with id="history"); /tasks is the real list.
  async getTaskHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<Task[]>> {
    return this.request<Task[]>(`/tasks?page=${page}&limit=${limit}`);
  }

  async cancelTask(taskId: string, reason: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}?action=cancel`, 'POST', { reason });
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

  /**
   * Server-authoritative price for a cart, before it is placed. The same
   * function prices the order on creation, so this is what will be charged —
   * the client no longer decides its own delivery or service fee.
   */
  async quoteOrder(data: {
    merchantId: string;
    orderType: 'FOOD_DELIVERY' | 'SHOPPING';
    // Send menuItemId so the server prices from the catalogue. Without it the
    // quote can only echo back what this client believes, and a stale price
    // surfaces as an unexplained failure at checkout instead of here.
    items: Array<{ menuItemId?: string; quantity: number; unitPrice: number }>;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
  }): Promise<ApiResponse<{
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    discount: number;
    totalAmount: number;
    distanceKm: number;
    currency: string;
    /** Lines whose catalogue price rose since they were added to the cart. */
    priceChanges?: Array<{ menuItemId: string; itemName: string; was: number; now: number }>;
    /** Lines that can no longer be ordered, with a reason. */
    unavailable?: Array<{ menuItemId?: string; itemName?: string; reason: string }>;
    /** False when the cart sent no menuItemIds, so prices were not verified. */
    pricedFromCatalogue?: boolean;
  }>> {
    return this.request('/orders/quote', 'POST', data);
  }

  async confirmOrderPayment(orderId: string, paymentReference?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {
      paymentReference: paymentReference || `PAY-${Date.now()}`,
    });
  }

  /**
   * Cancel an order. Uses the existing PATCH ?action=cancel endpoint which
   * drives the full backend cancellation flow (state machine, refund,
   * notifications, audit log). A reason of at least 3 chars is required.
   */
  async cancelOrder(orderId: string, reason: string = 'Customer cancelled the order'): Promise<ApiResponse<any>> {
    return this.request<any>(`/orders/${orderId}?action=cancel`, 'PATCH', {
      reason,
      cancelledBy: 'CUSTOMER',
    });
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

  async getMerchantProfile(merchantId?: string): Promise<ApiResponse<any>> {
    const endpoint = merchantId ? `/merchants/${merchantId}/profile` : '/merchants/profile';
    return this.request<any>(endpoint);
  }

  async getMerchantOrder(orderId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/orders/${orderId}`);
  }

  async registerMerchant(data: {
    name: string;
    type: string;
    description?: string;
    phone: string;
    address: string;
    documents?: {
      businessLicense?: string;
      nationalIdFront?: string;
      nationalIdBack?: string;
      logo?: string;
    };
    // Pharmacy-specific (only when type === 'PHARMACY')
    pharmacyLicense?: string;
    pharmacistInCharge?: string;
    pharmacistLicense?: string;
    operatingHours?: string;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/merchants/register', 'POST', data);
  }

  /**
   * The merchant's own orders.
   *
   * This used to call `/merchants/{id}/orders`, which does not exist — that
   * directory holds analytics, availability, menu and products and never had an
   * orders route — so the dashboard answered "Failed to load orders. Network
   * error." on every refresh while the orders sat there in the database. Same
   * shape of defect as MERCH-1: a client addressing a URL nobody built.
   *
   * GET /orders is the real contract and already scopes a MERCHANT caller to
   * their own merchant from the token (src/app/api/orders/route.ts), so the id
   * is not sent — the server decides whose orders these are, which is also the
   * safer arrangement.
   */
  async getMerchantOrders(_merchantId: string, status?: string, page: number = 1): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    return this.request<any>(`/orders?${params.toString()}`);
  }

  async getMerchantAnalytics(merchantId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/analytics`);
  }

  async getMerchantEarnings(merchantId: string, period?: string): Promise<ApiResponse<any>> {
    const query = period ? `?period=${period}` : '';
    return this.request<any>(`/merchants/${merchantId}/earnings${query}`);
  }

  async updateMerchantAvailability(merchantId: string, isOpen: boolean): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/availability`, 'PATCH', { isOpen });
  }

  async createMenuItem(merchantId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/menu`, 'POST', data);
  }

  async updateMenuItem(merchantId: string, itemId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/menu/${itemId}`, 'PATCH', data);
  }

  async deleteMenuItem(merchantId: string, itemId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/menu/${itemId}`, 'DELETE');
  }

  async requestMerchantPayout(merchantId: string, amount?: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/merchants/${merchantId}/payout`, 'POST', { amount });
  }

  /**
   * Advance a merchant order.
   *
   * The backend contract is `PATCH /orders/{id}?action=<action>` — the action
   * is a QUERY parameter and uses its own verb vocabulary. This client used to
   * call `PATCH /orders/{id}/status` with `{ status }`, a URL that does not
   * exist, so every merchant order action was a 404 while the UI optimistically
   * moved the order on screen. Callers still speak in order statuses, which is
   * what the screens render, so the translation lives here rather than forcing
   * every call site to learn the server's verbs.
   */
  /**
   * Send a merchant order action straight through.
   *
   * The server's contract is an ACTION (accept / reject / preparing / ready),
   * and it validates that action against the order's current status. Screens
   * that know which action they are offering should say so rather than naming a
   * target status and having it translated — the translation is also why the
   * dashboard wrote 'CONFIRMED' into local state, a value OrderStatus does not
   * contain, so the card then showed the raw word to the merchant.
   */
  async merchantOrderAction(
    orderId: string,
    action: 'accept' | 'reject' | 'preparing' | 'ready' | 'cancel',
    opts?: { merchantId?: string; reason?: string }
  ): Promise<ApiResponse<any>> {
    const body: Record<string, unknown> = {};
    if (opts?.merchantId) body.merchantId = opts.merchantId;
    if (action === 'reject' || action === 'cancel') {
      body.reason =
        opts?.reason && opts.reason.length >= 5 ? opts.reason : 'Declined by the merchant';
    }
    return this.request<any>(
      `/orders/${orderId}?action=${encodeURIComponent(action)}`,
      'PATCH',
      body
    );
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    opts?: { merchantId?: string; reason?: string; riderId?: string }
  ): Promise<ApiResponse<any>> {
    const action = ORDER_STATUS_TO_ACTION[status];
    if (!action) {
      return { success: false, error: `No order action corresponds to status '${status}'` };
    }

    // Each action's own schema. merchantId is required by accept/reject/ready;
    // reject additionally requires a reason of at least 5 characters.
    const body: Record<string, unknown> = {};
    if (action === 'accept' || action === 'reject' || action === 'ready' || action === 'preparing') {
      if (opts?.merchantId) body.merchantId = opts.merchantId;
    }
    if (action === 'reject') {
      body.reason = opts?.reason && opts.reason.length >= 5
        ? opts.reason
        : 'Rejected by merchant';
    }
    if ((action === 'pickup' || action === 'deliver') && opts?.riderId) {
      body.riderId = opts.riderId;
    }

    return this.request<any>(
      `/orders/${orderId}?action=${encodeURIComponent(action)}`,
      'PATCH',
      body
    );
  }

  // ==========================================
  // HEALTH / PHARMACIES
  // ==========================================

  async getPharmacies(): Promise<ApiResponse<Merchant[]>> {
    return this.request<Merchant[]>('/merchants?type=PHARMACY');
  }

  async getHealthProviderOrders(status?: string): Promise<ApiResponse<any>> {
    const query = status ? `?status=${status}` : '';
    return this.request<any>(`/health-provider/orders${query}`);
  }

  async getHealthProviderStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/health-provider/status');
  }

  async updateHealthProviderStatus(data: boolean | { status: string }): Promise<ApiResponse<any>> {
    const payload = typeof data === 'boolean' ? { isOpen: data } : data;
    return this.request<any>('/health-provider/status', 'PATCH', payload);
  }

  /**
   * The pharmacist's own orders.
   *
   * The no-status branch used to fall through to `/health/orders`, which is the
   * monitoring namespace — that directory holds the healthcheck endpoints and
   * has never had an orders route. So the "All" tab 404'd and showed an empty
   * list while the dashboard, which asks correctly, reported orders existed.
   * This is the original PHARM-1 wrong address surviving in a second code path.
   *
   * Both branches now use /health-provider/orders, the contract the pharmacist
   * dashboard and every action already use, so the list and the actions operate
   * on the same ProviderOrder rows.
   */
  async getHealthOrders(status?: string): Promise<ApiResponse<any>> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<any>(`/health-provider/orders${query}`);
  }

  /**
   * One pharmacy order.
   *
   * This called `/health/orders/{id}` — the monitoring namespace again, the
   * third place the pharmacist client addressed it. The route does not exist,
   * so opening any order from the list showed "Order not found" even though the
   * list had just rendered it.
   *
   * `/health-provider/orders` has no single-order route, and inventing one for
   * this would add a second way to read the same data. The list already returns
   * complete order objects for exactly this provider, so the order is selected
   * from there — one contract, and the detail screen is guaranteed to show the
   * same row the list did.
   */
  async getHealthOrder(orderId: string): Promise<ApiResponse<any>> {
    const res = await this.request<any>('/health-provider/orders');
    if (!res.success) return res;

    const list = res.data?.orders ?? res.data?.data ?? res.data ?? [];
    const order = Array.isArray(list) ? list.find((o: any) => o?.id === orderId) : null;

    return order
      ? { success: true, data: order }
      : { success: false, error: 'Order not found', status: 404 };
  }

  /**
   * Advance a pharmacy/health order.
   *
   * This used to call `PATCH /health/orders/{id}/status`. `/api/health/` is the
   * health*check* namespace — `route.ts`, `ready`, `startup` — so the pharmacist
   * was addressing the monitoring endpoints by accident and every fulfilment
   * step 404'd.
   *
   * The correct route is `PATCH /health-provider/orders`, which operates on
   * ProviderOrder — the same model the pharmacist's own order list reads. There
   * is a second, similarly-named route (`/health-orders/{id}`) backed by a
   * DIFFERENT model (HealthOrder); pointing at it returns "Health order not
   * found" for every real pharmacy order. Verified by driving both.
   *
   * The contract takes `orderId` and an ACTION verb in the body.
   */
  /**
   * Send a pharmacy order action straight through.
   *
   * The server's contract is an ACTION (ACCEPT / START_PREPARING / READY / …),
   * and it validates that action against the order's current status. Screens
   * that know which action they are offering should say so rather than naming a
   * target status and having it translated — the translation is what let three
   * screens drift onto statuses the server never issues.
   */
  /**
   * Remove a medicine from the pharmacy's catalogue.
   *
   * The route exists (DELETE /health-provider/catalog?medicineId=…) and the
   * screen offered no way to reach it, so a mistyped or discontinued medicine
   * could only ever be hidden, never removed.
   */
  async deleteMedicineFromCatalog(medicineId: string): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/health-provider/catalog?medicineId=${encodeURIComponent(medicineId)}`,
      'DELETE'
    );
  }

  async providerOrderAction(
    orderId: string,
    action: string,
    opts?: { notes?: string; rejectionReason?: string; riderId?: string }
  ): Promise<ApiResponse<any>> {
    return this.request<any>('/health-provider/orders', 'PATCH', {
      orderId,
      action,
      ...(opts?.notes ? { notes: opts.notes } : {}),
      ...(opts?.rejectionReason ? { rejectionReason: opts.rejectionReason } : {}),
      ...(opts?.riderId ? { riderId: opts.riderId } : {}),
    });
  }

  async updateHealthOrderStatus(
    orderId: string,
    status: string,
    opts?: { notes?: string; rejectionReason?: string; riderId?: string }
  ): Promise<ApiResponse<any>> {
    const action = HEALTH_STATUS_TO_ACTION[status];
    if (!action) {
      return { success: false, error: `No pharmacy action corresponds to status '${status}'` };
    }

    return this.request<any>('/health-provider/orders', 'PATCH', {
      orderId,
      action,
      ...(opts?.notes ? { notes: opts.notes } : {}),
      ...(opts?.rejectionReason ? { rejectionReason: opts.rejectionReason } : {}),
      ...(opts?.riderId ? { riderId: opts.riderId } : {}),
    });
  }

  async getHealthProviderCatalog(): Promise<ApiResponse<any>> {
    return this.request<any>('/health-provider/catalog');
  }

  async addMedicineToCatalog(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/health-provider/catalog', 'POST', data);
  }

  // Catalog edits go to `PATCH /health-provider/catalog`, which identifies the
  // row by `medicineId` in the body. These used to address
  // `/health/catalog/{itemId}` and `/health/catalog/{itemId}/availability` —
  // the monitoring namespace, where neither route exists — so editing a
  // medicine or toggling its availability silently did nothing.
  async updateMedicineCatalog(itemId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/health-provider/catalog', 'PATCH', { medicineId: itemId, ...data });
  }

  async updateMedicineAvailability(itemId: string, data: { isAvailable: boolean } | boolean): Promise<ApiResponse<any>> {
    // The route's whitelist names this field `isAvailable`; a bare boolean was
    // being sent as `available`, which it would have ignored.
    const isAvailable = typeof data === 'boolean' ? data : data.isAvailable;
    return this.request<any>('/health-provider/catalog', 'PATCH', { medicineId: itemId, isAvailable });
  }

  // ==========================================
  // MAPBOX / GEOCODING
  // ==========================================

  /**
   * Fetch the Mapbox PUBLIC access token from the backend at runtime.
   * Used when the token wasn't baked in at build time (no .env file).
   * The backend reads it from its own env vars and returns it here.
   * Public tokens (pk.*) are safe to expose to clients.
   */
  async fetchMapboxToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>('/config/mapbox-token');
  }

  /**
   * Search places. Backend merges a curated Kampala POI database with Mapbox
   * geocoding (Mapbox alone has poor Uganda POI coverage). The endpoint returns
   * { success, places: [...] }; request() wraps that into data, so the real
   * array lives at data.places. We unwrap it here so callers get a clean array.
   * Each item has both name/lat/lng and place_name/center (Mapbox-compatible).
   */
  async searchPlaces(
    query: string,
    proximity?: { latitude: number; longitude: number },
  ): Promise<ApiResponse<any[]>> {
    let url = `/mapbox/geocoding?search=${encodeURIComponent(query)}`;
    if (proximity) url += `&proximity=${proximity.longitude},${proximity.latitude}`;
    const res = await this.request<any>(url);
    const payload: any = res.data;
    const places = Array.isArray(payload) ? payload : payload?.places || [];
    return { success: res.success, data: places, error: res.error };
  }

  /**
   * Popular curated places — shown in the search empty-state (like Uber/Bolt
   * "saved/popular" rows) before the user types anything.
   */
  async getPopularPlaces(
    proximity?: { latitude: number; longitude: number },
  ): Promise<ApiResponse<any[]>> {
    let url = `/mapbox/kampala-places?popular=true&limit=8`;
    if (proximity) url += `&lat=${proximity.latitude}&lng=${proximity.longitude}`;
    const res = await this.request<any>(url);
    const payload: any = res.data;
    const places = Array.isArray(payload) ? payload : payload?.places || [];
    return { success: res.success, data: places, error: res.error };
  }

  /**
   * Reverse geocode coordinates to an address. Returns a normalized array of
   * places plus a convenience `placeName` on the first result.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    const res = await this.request<any>(`/mapbox/reverse?lat=${latitude}&lng=${longitude}`);
    return res;
  }

  /**
   * Get driving route between two coordinates.
   * Returns route geometry (polyline waypoints), road distance, and duration.
   */
  async getDirections(
    pickup: { latitude: number; longitude: number },
    dropoff: { latitude: number; longitude: number },
  ): Promise<ApiResponse<{
    geometry: Array<{ latitude: number; longitude: number }>;
    distanceKm: number;
    durationMin: number;
    trafficAware?: boolean;
  }>> {
    return this.request(
      `/mapbox/directions?pickupLat=${pickup.latitude}&pickupLng=${pickup.longitude}` +
      `&dropoffLat=${dropoff.latitude}&dropoffLng=${dropoff.longitude}`,
    );
  }

  /**
   * Get accurate fare estimates for all ride types.
   * Uses the same calculatePricing() as task creation — guaranteed to match.
   */
  async getFareEstimate(
    distanceKm: number,
    durationMin: number,
    pickupLatitude?: number | null,
    pickupLongitude?: number | null,
  ): Promise<ApiResponse<{
    estimates: Record<string, {
      totalAmount: number;
      baseFare: number;
      distanceFare: number;
      timeFare: number;
      waitingCharge: number;
      serviceFee: number;
      surcharges: number;
      minimumApplied: boolean;
      /** 1 when the pickup zone is not surging. */
      surgeMultiplier: number;
      surgeAmount: number;
      /** Customer-facing explanation, e.g. "High demand in Kampala Central". */
      surgeReason: string | null;
    }>;
    distanceKm: number;
    durationMin: number;
    isNightTime: boolean;
    isPeakHours: boolean;
  }>> {
    // Pickup coordinates are optional but matter: without them the quote
    // cannot include surge and would undercut what the trip actually costs.
    const params = new URLSearchParams({
      distanceKm: String(distanceKm),
      durationMin: String(durationMin),
    });
    if (pickupLatitude != null && pickupLongitude != null) {
      params.set('pickupLatitude', String(pickupLatitude));
      params.set('pickupLongitude', String(pickupLongitude));
    }
    return this.request(`/tasks/fare-estimate?${params.toString()}`);
  }

  /**
   * Nearby online drivers around a point (for live dots + "nearest driver ETA").
   * Returns anonymized positions only — no driver PII.
   */
  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    taskType?: string,
  ): Promise<ApiResponse<{
    drivers: Array<{
      id: string;
      latitude: number;
      longitude: number;
      distanceKm: number;
      etaMin: number;
      vehicleType: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER' | null;
      riderRole: string | null;
      heading: number | null;
    }>;
    count: number;
    nearestEtaMin: number | null;
  }>> {
    let url = `/riders/nearby?lat=${latitude}&lng=${longitude}`;
    if (taskType) url += `&taskType=${taskType}`;
    return this.request(url);
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

  async getWalletTransactions(page: number = 1, limit: number = 20): Promise<ApiResponse<{ data: any[]; transactions?: any[] }>> {
    return this.request<{ data: any[]; transactions?: any[] }>(`/wallet/transactions?page=${page}&limit=${limit}`);
  }

  async requestWithdrawal(amount: number, phone: string, provider: string): Promise<ApiResponse<any>> {
    return this.request<any>('/wallet/withdraw', 'POST', { amount, phone, provider });
  }

  /**
   * Request a wallet top-up.
   * Routes to the correct backend based on payment method:
   *   NYLON_PAY  → /payments/nylonpay/initiate  (NylonPay STK push)
   *   MTN_MOMO / AIRTEL_MONEY → /wallet/topup  (legacy MoMo direct)
   */
  async requestTopUp(data: {
    amount: number;
    paymentMethod: string;
    phoneNumber: string;
  }): Promise<ApiResponse<any>> {
    if (data.paymentMethod === 'NYLON_PAY') {
      return this.request<any>('/payments/nylonpay/initiate', 'POST', {
        amount: Math.round(data.amount),
        currency: 'UGX',
        customerPhone: data.phoneNumber,
        description: 'Smart Ride Wallet Top-up',
      });
    }
    return this.request<any>('/wallet/topup', 'POST', data);
  }

  // ==========================================
  // TASK PAYMENT (settling a completed trip)
  // ==========================================

  /**
   * Pay for a task.
   *
   * Completing a task does NOT settle it. `FinanceLedgerService` marks
   * `paymentStatus` COMPLETED only for CASH, where the driver takes the fare by
   * hand; every gateway method leaves the task PENDING with nothing charged, and
   * no code moves a task to the PAID status at all. This is the call that
   * actually collects the money, and until this existed there was no way for a
   * customer to pay for a non-cash ride from the app.
   *
   * `amount` must come from the task's own `totalAmount` — never from anything
   * the user typed. The endpoint trusts the amount it is given, so passing
   * anything else would under- or over-charge the trip.
   */
  async payForTask(params: {
    taskId: string;
    amount: number;
    paymentMethod: string;
    phoneNumber?: string;
  }): Promise<ApiResponse<TaskPaymentResult>> {
    const res = await this.request<any>('/payments/initiate', 'POST', {
      taskId: params.taskId,
      amount: Math.round(params.amount),
      currency: 'UGX',
      paymentMethod: params.paymentMethod,
      phoneNumber: params.phoneNumber,
      description: `Smart Ride task ${params.taskId}`,
    });

    // This route answers { success, payment }, not the { success, data }
    // envelope the wrapper unwraps, so normalise it here rather than making
    // every screen know that.
    if (res.success) {
      const payment = (res.data as any)?.payment ?? res.data;
      return { success: true, data: payment as TaskPaymentResult };
    }
    return res as ApiResponse<TaskPaymentResult>;
  }

  /** Poll a payment initiated by `payForTask`. */
  async getTaskPaymentStatus(paymentId: string): Promise<ApiResponse<TaskPaymentResult>> {
    const res = await this.request<any>(
      `/payments/initiate?paymentId=${encodeURIComponent(paymentId)}`
    );
    if (res.success) {
      const payment = (res.data as any)?.payment ?? res.data;
      return { success: true, data: payment as TaskPaymentResult };
    }
    return res as ApiResponse<TaskPaymentResult>;
  }

  /**
   * Request a pharmacy provider payout.
   */
  async requestPharmacyPayout(amount: number): Promise<ApiResponse<any>> {
    return this.request<any>('/pharmacy/payout', 'POST', { amount });
  }

  /**
   * Get pharmacy provider earnings summary.
   */
  async getPharmacyEarnings(period: string = 'daily'): Promise<ApiResponse<any>> {
    return this.request<any>(`/pharmacy/earnings?action=summary&period=${period}`);
  }

  /**
   * Update the user's notification preferences (global notifications toggle).
   */
  async updateNotificationPreferences(enabled: boolean): Promise<ApiResponse<any>> {
    return this.request<any>('/user/notification-preferences', 'PATCH', {
      notificationsEnabled: enabled,
    });
  }

  // ==========================================
  // SOS
  // ==========================================

  async triggerSOS(data: {
    riderId?: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    locationAddress?: string;
    emergencyType?: string;
  }): Promise<ApiResponse<{ success: boolean; alert: any }>> {
    return this.request<{ success: boolean; alert: any }>('/sos', 'POST', data);
  }

  async createSOSAlert(data: {
    riderId?: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    locationAddress?: string;
  }): Promise<ApiResponse<{ success: boolean; alert: any }>> {
    return this.triggerSOS(data);
  }

  async resolveSOSAlert(alertId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/sos/${alertId}`, 'PATCH', { status: 'RESOLVED' });
  }

  // ==========================================
  // EMERGENCY CONTACTS
  // ==========================================

  async getEmergencyContacts(userId: string, userType: string = 'CLIENT'): Promise<ApiResponse<{ contacts: any[] }>> {
    return this.request<{ contacts: any[] }>(`/emergency-contacts?userId=${userId}&userType=${userType}`);
  }

  async addEmergencyContact(data: {
    userId?: string;
    riderId?: string;
    userType?: string;
    name: string;
    phone: string;
    email?: string;
    relationship?: string;
    isPrimary?: boolean;
  }): Promise<ApiResponse<{ success: boolean; contact: any }>> {
    return this.request<{ success: boolean; contact: any }>('/emergency-contacts', 'POST', data);
  }

  async deleteEmergencyContact(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/emergency-contacts?id=${id}`, 'DELETE');
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
    const auditController = new AbortController();
    const auditTimeoutId = setTimeout(() => auditController.abort(), ApiService.WRITE_TIMEOUT);

    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/audit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: auditController.signal,
      });

      clearTimeout(auditTimeoutId);

      if (!response.ok) {
        console.warn('[AUDIT] Failed to log activity:', response.status);
        return { success: false, error: 'Failed to log activity' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error: any) {
      clearTimeout(auditTimeoutId);
      // Audit logging should never block the main flow
      if (error?.name === 'AbortError') {
        console.warn('[AUDIT] Request timed out');
      } else {
        console.warn('[AUDIT] Failed to log activity:', error);
      }
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
    /** The shop, restaurant or pharmacy the courier collects from. */
    pickupContactName?: string | null;
    pickupContactPhone?: string | null;
    dropoffContactName?: string | null;
    dropoffContactPhone?: string | null;
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

  /**
   * Report that this rider's dispatch offer countdown ran out. The backend
   * marks the match EXPIRED and immediately rotates the offer to the next
   * eligible rider (instead of waiting for the cron sweep).
   */
  async dispatchExpire(matchId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dispatch/${matchId}/expire`, 'POST');
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
  // PUSH NOTIFICATION TOKENS
  // ==========================================

  async registerPushToken(token: string, platform?: string, deviceId?: string): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications/token', 'POST', { token, deviceInfo: { platform, deviceId } });
  }

  async unregisterPushToken(token: string): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications/token', 'DELETE', { token });
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
  // RATINGS
  // ==========================================

  /**
   * Rate a completed task.
   *
   * Both directions are supported by the backend: a client rating goes to the
   * driver and feeds the reputation engine, a driver rating goes to the
   * passenger and is stored without feeding anything automated (BE-012). The
   * server decides the direction from who the caller is on the task, so there
   * is nothing to pass here.
   *
   * The three sub-scores are accepted from CLIENTS only — the server nulls them
   * on a driver's rating, since a passenger has no vehicle or punctuality
   * obligation. They were part of the API from the start and simply never sent.
   */
  async rateTask(
    taskId: string,
    rating: number,
    comment?: string,
    subScores?: {
      punctualityScore?: number;
      professionalismScore?: number;
      vehicleConditionScore?: number;
    }
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/tasks/${taskId}/rate`, 'POST', {
      rating,
      comment,
      ...(subScores ?? {}),
    });
  }

  // ==========================================
  // RECEIPTS (privacy-safe: first names only, no phone numbers)
  // ==========================================

  /** Generate (idempotent) + email the receipt for a completed task. */
  async generateReceipt(taskId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/receipts', 'POST', { taskId });
  }

  /** Fetch a receipt by id or receipt number. */
  async getReceipt(idOrNumber: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/receipts/${encodeURIComponent(idOrNumber)}`);
  }

  /** List the current user's receipts. */
  async getReceipts(): Promise<ApiResponse<any>> {
    return this.request<any>('/receipts');
  }

  /** Absolute URL for the branded receipt HTML (used for PDF export). */
  receiptHtmlUrl(idOrNumber: string): string {
    return `${this.baseUrl}/receipts/${encodeURIComponent(idOrNumber)}?format=html`;
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

  // ==========================================
  // IN-APP CALLS (VoIP)
  // ==========================================

  /**
   * Initiate an in-app internet call
   * Creates a call session and returns channel info for Agora/RTC
   */
  async initiateCall(params: {
    recipientId: string;
    recipientType: string;
    taskId?: string;
  }): Promise<ApiResponse<{
    sessionId: string;
    channelId: string;
    status: string;
    caller: any;
    recipient: any;
    agoraAppId: string;
  }>> {
    return this.request('/calls/initiate', 'POST', params);
  }

  /**
   * End an active call session
   * Updates call record with end time and duration
   */
  async endCall(sessionId: string): Promise<ApiResponse<{
    sessionId: string;
    channelId: string;
    status: string;
    duration: number | null;
    endedAt: string;
    otherPartyId: string;
  }>> {
    return this.request(`/calls/${sessionId}/end`, 'POST');
  }

  /**
   * Get Agora RTC token for joining a call channel
   */
  async getCallToken(channelName: string, userId?: string): Promise<ApiResponse<{
    token: string;
    channelId: string;
    appId: string;
    userId: string;
    uid: number;
    isAgoraConfigured: boolean;
    fallbackMode: boolean;
  }>> {
    return this.request('/calls/token', 'POST', { channelName, userId });
  }

  /**
   * Get call session details
   */
  async getCallSession(sessionId: string): Promise<ApiResponse<{
    id: string;
    channelId: string;
    status: string;
    caller: any;
    recipient: any;
    task: any;
    startedAt: string | null;
    endedAt: string | null;
    duration: number | null;
    formattedDuration: string | null;
    createdAt: string;
    agoraAppId: string;
  }>> {
    return this.request(`/calls/${sessionId}`);
  }

  // ==========================================
  // CHAT & MESSAGING
  // ==========================================

  /**
   * Get all conversations for the authenticated user
   * Supports cursor-based pagination
   */
  async getConversations(cursor?: string, limit?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return this.request(`/chat/conversations${query ? `?${query}` : ''}`);
  }

  /**
   * Get messages for a specific conversation
   * Supports cursor-based pagination
   */
  async getMessages(conversationId: string, cursor?: string, limit?: number): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return this.request(`/chat/${conversationId}/messages${query ? `?${query}` : ''}`);
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, data: { content: string; type?: string; metadata?: any }): Promise<ApiResponse<any>> {
    return this.request(`/chat/${conversationId}/send`, 'POST', data);
  }

  /**
   * Mark all unread messages in a conversation as read
   */
  async markMessagesRead(conversationId: string): Promise<ApiResponse<any>> {
    return this.request(`/chat/${conversationId}/read`, 'POST');
  }

  // ==========================================
  // SAVED ADDRESSES
  // ==========================================

  async getSavedAddresses(): Promise<ApiResponse<any>> {
    return this.request('/user/addresses');
  }

  async addSavedAddress(data: {
    label: string;
    address: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request('/user/addresses', 'POST', data);
  }

  async updateSavedAddress(addressId: string, data: {
    label?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request(`/user/addresses/${addressId}`, 'PATCH', data);
  }

  async deleteSavedAddress(addressId: string): Promise<ApiResponse<any>> {
    return this.request(`/user/addresses/${addressId}`, 'DELETE');
  }

  // ==========================================
  // ACCOUNT MANAGEMENT
  // ==========================================

  async deleteAccount(password: string): Promise<ApiResponse<any>> {
    return this.request('/auth/delete-account', 'POST', { password });
  }
}

export const api = new ApiService();
export default api;

console.log('[API-SERVICE] Service initialized');
