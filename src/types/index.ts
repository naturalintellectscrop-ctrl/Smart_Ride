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
  | 'CANCELLED';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Task {
  id: string;
  taskNumber: string;
  taskType: TaskType;
  status: TaskStatus;
  clientId: string;
  riderId?: string;
  
  // Locations
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  
  // Pricing
  baseFare: number;
  distanceFare?: number;
  totalAmount: number;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  
  // Timestamps
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  
  // Related entities
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

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

// Socket Event Types
export interface SocketEvents {
  // Task events
  'task:created': Task;
  'task:assigned': { taskId: string; riderId: string };
  'task:accepted': { taskId: string };
  'task:status': { taskId: string; status: TaskStatus };
  'task:cancelled': { taskId: string; reason: string };
  
  // Location events
  'location:update': { 
    riderId: string; 
    latitude: number; 
    longitude: number;
    heading?: number;
    speed?: number;
  };
  
  // Driver events
  'driver:request': {
    task: Task;
    client: User;
    pickup: Location;
    expiresAt: string;
  };
  
  // Order events
  'order:status': { orderId: string; status: OrderStatus };
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

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: { role?: UserRole };
  ForgotPassword: undefined;
  
  // Rider screens
  RiderHome: undefined;
  RideRequest: { type: 'BODA' | 'CAR' };
  RideTracking: { taskId: string };
  RidePayment: { taskId: string };
  
  // Driver screens
  DriverHome: undefined;
  DriverTask: { taskId: string };
  DriverNavigation: { taskId: string };
  
  // Orders
  FoodDelivery: undefined;
  RestaurantDetail: { merchantId: string };
  Cart: undefined;
  OrderTracking: { orderId: string };
  
  // Profile
  Profile: undefined;
  EditProfile: undefined;
  Wallet: undefined;
  Settings: undefined;
};
