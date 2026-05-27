/**
 * Smart Ride Client API Service
 * Connects frontend to backend services
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================
// Types
// ============================================

export interface TaskRequest {
  taskType: 'SMART_BODA_RIDE' | 'SMART_CAR_RIDE' | 'FOOD_DELIVERY' | 'SHOPPING' | 'ITEM_DELIVERY' | 'SMART_HEALTH_DELIVERY';
  clientId: string;
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  distanceKm: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY_MTN' | 'MOBILE_MONEY_AIRTEL' | 'VISA' | 'MASTERCARD' | 'WALLET';
  passengerCount?: number;
  passengerNames?: string;
  itemDescription?: string;
  itemWeight?: number;
  itemValue?: number;
}

export interface OrderRequest {
  clientId: string;
  merchantId: string;
  orderType: 'FOOD_DELIVERY' | 'SHOPPING';
  items: Array<{
    menuItemId?: string;
    itemName: string;
    itemDescription?: string;
    quantity: number;
    unitPrice: number;
    specialInstructions?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  discount?: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY_MTN' | 'MOBILE_MONEY_AIRTEL' | 'VISA' | 'MASTERCARD' | 'WALLET';
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryInstructions?: string;
  recipientName?: string;
  recipientPhone?: string;
}

export interface Task {
  id: string;
  taskNumber: string;
  taskType: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number | null;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  completedAt: string | null;
  rider?: {
    id: string;
    fullName: string;
    phone: string;
    riderRole: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: string;
  createdAt: string;
  merchant?: {
    id: string;
    name: string;
    type: string;
  };
  items?: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  task?: {
    id: string;
    taskNumber: string;
    status: string;
    rider?: {
      fullName: string;
    };
  };
}

export interface DispatchResult {
  success: boolean;
  data?: {
    requestId: string;
    status: string;
    matchedProvider?: {
      id: string;
      name: string;
      rating: number;
      trips: number;
      vehicle?: string;
      plateNumber?: string;
      phone?: string;
      eta?: number;
    };
    error?: string;
  };
  message?: string;
}

// ============================================
// Task API
// ============================================

export function useCreateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(async (taskData: TaskRequest): Promise<{ success: boolean; data?: Task; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to create task');
        return { success: false, error: result.error };
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTask, loading, error };
}

export function useClientTasks(clientId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!clientId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?clientId=${clientId}&limit=20`);
      const result = await response.json();
      
      if (response.ok) {
        setTasks(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}

// ============================================
// Order API
// ============================================

export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (orderData: OrderRequest): Promise<{ success: boolean; data?: Order; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to create order');
        return { success: false, error: result.error };
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createOrder, loading, error };
}

export function useClientOrders(clientId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!clientId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders?clientId=${clientId}&limit=20`);
      const result = await response.json();
      
      if (response.ok) {
        setOrders(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

// ============================================
// Dispatch API
// ============================================

export function useCreateDispatch() {
  const [loading, setLoading] = useState(false);

  const createDispatch = useCallback(async (
    taskId: string,
    serviceType: string,
    pickupLocation: { latitude: number; longitude: number }
  ): Promise<DispatchResult> => {
    setLoading(true);
    
    try {
      // SECURITY: Get userId from stored auth token instead of hardcoded demo ID
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch('/api/dispatch?action=create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          request: {
            id: taskId,
            serviceType,
            userId: 'authenticated', // Server extracts real userId from JWT token
            pickupLocation,
            dropoffLocation: pickupLocation, // Will be updated
            paymentMethod: 'CASH',
          },
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      return {
        success: false,
        data: { error: err instanceof Error ? err.message : 'Network error' },
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createDispatch, loading };
}

export function useDispatchStats() {
  const [stats, setStats] = useState<{
    totalProviders: number;
    onlineProviders: number;
    availableProviders: number;
    pendingRequests: number;
    byType: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/dispatch?action=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch dispatch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// ============================================
// Wallet API
// ============================================

export interface WalletData {
  balance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalSpent: number;
  status: string;
}

export function useWallet(userId: string | null) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/wallet?userId=${userId}`);
      const result = await response.json();
      
      if (response.ok) {
        setWallet(result.data || result);
      } else {
        setError(result.error || 'Failed to fetch wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return { wallet, loading, error, refetch: fetchWallet };
}

// ============================================
// Merchants API
// ============================================

export interface Merchant {
  id: string;
  name: string;
  type: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isOpen: boolean;
  rating: number;
  averagePrepTime: number;
}

export function useMerchants(type?: string) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const url = type ? `/api/merchants?type=${type}` : '/api/merchants';
      const response = await fetch(url);
      const result = await response.json();
      
      if (response.ok) {
        setMerchants(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch merchants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  return { merchants, loading, error, refetch: fetchMerchants };
}

// ============================================
// User API
// ============================================

export interface UserData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

export function useUser(userId: string | null) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users?id=${userId}`);
      const result = await response.json();
      
      if (response.ok) {
        setUser(result.data || result);
      } else {
        setError(result.error || 'Failed to fetch user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}

// ============================================
// Pricing Calculator
// ============================================

export function calculatePrice(
  serviceType: 'boda' | 'car' | 'food' | 'shopping' | 'item' | 'health',
  distanceKm: number
): { baseFare: number; distanceFare: number; totalAmount: number } {
  const pricing = {
    boda: { baseFare: 2000, perKm: 150 },
    car: { baseFare: 5000, perKm: 300 },
    food: { baseFare: 3000, perKm: 100 },
    shopping: { baseFare: 3000, perKm: 100 },
    item: { baseFare: 2500, perKm: 120 },
    health: { baseFare: 3000, perKm: 100 },
  };

  const config = pricing[serviceType];
  const baseFare = config.baseFare;
  const distanceFare = Math.round(config.perKm * distanceKm);
  const totalAmount = baseFare + distanceFare;

  return { baseFare, distanceFare, totalAmount };
}
