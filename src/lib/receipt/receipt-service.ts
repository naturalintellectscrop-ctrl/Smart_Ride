/**
 * Smart Ride Receipt Service
 * 
 * API service for generating and managing receipts.
 * Receipts are sent after service completion.
 */

import { 
  ReceiptData, 
  ServiceType, 
  PaymentMethodType,
  generateReceiptId 
} from '@/components/smart-ride/receipts/receipt-view';

// ==========================================
// Types
// ==========================================

export interface CreateReceiptInput {
  taskId: string;
  serviceType: ServiceType;
  clientId: string;
  clientName: string;
  riderId?: string;
  riderName?: string;
  merchantId?: string;
  merchantName?: string;
  pickup: { address: string; lat?: number; lng?: number };
  dropoff: { address: string; lat?: number; lng?: number };
  distance: number;
  duration: number;
  paymentMethod: PaymentMethodType;
  baseFare: number;
  distanceFare: number;
  serviceFee: number;
  tips?: number;
  discount?: number;
  discountCode?: string;
  currency?: string;
}

export interface ReceiptResponse {
  success: boolean;
  receipt?: ReceiptData;
  error?: string;
}

// ==========================================
// Receipt API Functions
// ==========================================

const API_BASE = '/api/receipts';

export async function createReceipt(input: CreateReceiptInput): Promise<ReceiptResponse> {
  try {
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating receipt:', error);
    return { success: false, error: 'Failed to create receipt' };
  }
}

export async function getReceipt(receiptId: string): Promise<ReceiptResponse> {
  try {
    const response = await fetch(`${API_BASE}/${receiptId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return { success: false, error: 'Failed to fetch receipt' };
  }
}

export async function getReceiptsByTask(taskId: string): Promise<ReceiptResponse> {
  try {
    const response = await fetch(`${API_BASE}/task/${taskId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching receipt by task:', error);
    return { success: false, error: 'Failed to fetch receipt' };
  }
}

export async function sendReceiptToClient(receiptId: string, method: 'sms' | 'email' | 'whatsapp'): Promise<ReceiptResponse> {
  try {
    const response = await fetch(`${API_BASE}/${receiptId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending receipt:', error);
    return { success: false, error: 'Failed to send receipt' };
  }
}

export async function rateReceipt(receiptId: string, rating: number, feedback?: string): Promise<ReceiptResponse> {
  try {
    const response = await fetch(`${API_BASE}/${receiptId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating, feedback }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error rating receipt:', error);
    return { success: false, error: 'Failed to submit rating' };
  }
}

// ==========================================
// Receipt Generation Helper
// ==========================================

export function generateReceiptFromTask(task: {
  id: string;
  type: ServiceType;
  status: string;
  pickup: { address: string };
  dropoff: { address: string };
  distance: number;
  duration: number;
  rider?: { id: string; name: string; rating: number };
  merchant?: { id: string; name: string; type: string; address: string };
  paymentMethod: PaymentMethodType;
  fare: { base: number; distance: number; serviceFee: number; total: number; tips?: number };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  clientName: string;
}): ReceiptData {
  const now = new Date();
  
  return {
    receiptId: generateReceiptId(),
    taskId: task.id,
    serviceType: task.type,
    status: 'COMPLETED',
    requestTime: new Date(task.createdAt),
    startTime: task.startedAt || new Date(task.createdAt),
    endTime: task.completedAt || now,
    duration: task.duration,
    distance: task.distance,
    pickup: {
      address: task.pickup.address,
    },
    dropoff: {
      address: task.dropoff.address,
    },
    rider: task.rider ? {
      id: task.rider.id,
      name: task.rider.name,
      rating: task.rider.rating,
      totalTrips: 100, // Would come from database
    } : undefined,
    merchant: task.merchant ? {
      id: task.merchant.id,
      name: task.merchant.name,
      type: task.merchant.type,
      address: task.merchant.address,
    } : undefined,
    clientName: task.clientName,
    paymentMethod: task.paymentMethod,
    fareBreakdown: {
      baseFare: task.fare.base,
      distanceFare: task.fare.distance,
      serviceFee: task.fare.serviceFee,
      tips: task.fare.tips,
      total: task.fare.total,
    },
    currency: 'UGX',
    rated: false,
  };
}

// ==========================================
// Mock Data for Development
// ==========================================

export function createMockReceiptFromTask(): ReceiptData {
  return {
    receiptId: generateReceiptId(),
    taskId: 'TASK-2024-09825',
    serviceType: 'FOOD_DELIVERY',
    status: 'COMPLETED',
    requestTime: new Date(Date.now() - 60 * 60 * 1000),
    startTime: new Date(Date.now() - 55 * 60 * 1000),
    endTime: new Date(Date.now() - 25 * 60 * 1000),
    duration: 30,
    distance: 5.2,
    pickup: {
      address: 'Cafe Java, Kampala Road',
      coordinates: { lat: 0.3176, lng: 32.5826 },
    },
    dropoff: {
      address: 'Plot 45, Kololo Hill Drive',
      coordinates: { lat: 0.3376, lng: 32.5926 },
    },
    rider: {
      id: 'rider_002',
      name: 'Mukasa Peter',
      rating: 4.9,
      totalTrips: 850,
      vehicleType: 'Motorcycle',
      vehicleModel: 'Bajaj Boxer 150',
      plateNumber: 'UAX 456B',
    },
    merchant: {
      id: 'merchant_001',
      name: 'Cafe Java',
      type: 'Restaurant',
      address: 'Kampala Road, Kampala',
    },
    clientName: 'John Doe',
    paymentMethod: 'MTN_MOMO',
    fareBreakdown: {
      baseFare: 3000,
      distanceFare: 2600,
      serviceFee: 500,
      total: 6100,
    },
    currency: 'UGX',
    rated: false,
  };
}

const receiptService = {
  createReceipt,
  getReceipt,
  getReceiptsByTask,
  sendReceiptToClient,
  rateReceipt,
  generateReceiptFromTask,
  createMockReceiptFromTask,
};

export default receiptService;
