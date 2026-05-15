// ============================================
// SMART RIDE MOBILE - TYPE DEFINITIONS
// ============================================

// User Types
export type UserRole = 'CLIENT' | 'RIDER' | 'DRIVER' | 'MERCHANT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

// Task Types
export type TaskType = 
  | 'SMART_BODA_RIDE' 
  | 'SMART_CAR_RIDE' 
  | 'FOOD_DELIVERY' 
  | 'SHOPPING' 
  | 'ITEM_DELIVERY' 
  | 'SMART_HEALTH_DELIVERY';

export type TaskStatus = 
  | 'CREATED' 
  | 'MATCHING' 
  | 'ASSIGNED' 
  | 'ACCEPTED' 
  | 'ARRIVED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'COMPLETED' 
  | 'CANCELLED'
  | 'FAILED';

export interface Task {
  id: string;
  taskNumber: string;
  taskType: TaskType;
  status: TaskStatus;
  clientId: string;
  riderId?: string;
  
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  
  baseFare: number;
  distanceFare?: number;
  totalAmount: number;
  
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  
  client?: User;
  rider?: Rider;
}

// Order Types
export type OrderType = 'FOOD_DELIVERY' | 'SHOPPING';
export type OrderStatus = 
  | 'ORDER_CREATED' 
  | 'PAYMENT_CONFIRMED' 
  | 'MERCHANT_ACCEPTED' 
  | 'PREPARING' 
  | 'READY_FOR_PICKUP' 
  | 'PICKED_UP' 
  | 'DELIVERED' 
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  merchantId?: string;
  
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  
  createdAt: string;
  merchant?: Merchant;
}

// Merchant Types
export type MerchantType = 'RESTAURANT' | 'SUPERMARKET' | 'RETAIL_STORE' | 'PHARMACY' | 'GROCERY';

export interface Merchant {
  id: string;
  name: string;
  type: MerchantType;
  description?: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isOpen: boolean;
  rating: number;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
}

// Payment Types
export type PaymentMethod = 
  | 'CASH' 
  | 'MTN_MOMO' 
  | 'AIRTEL_MONEY' 
  | 'VISA' 
  | 'MASTERCARD' 
  | 'WALLET';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'REFUNDED';

// Rider Types
export type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';
export type RiderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';

export interface Rider {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  riderRole: RiderRole;
  status: RiderStatus;
  isOnline: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  rating: number;
  totalTrips: number;
  completedTrips: number;
  walletBalance: number;
  vehicle?: Vehicle;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number;
  color: string;
  plateNumber: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}
