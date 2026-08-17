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
  address?: string;
  notificationPreferences?: { notificationsEnabled?: boolean } | null;
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
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'PICKED_UP'
  // Rides use IN_PROGRESS as the moving state; deliveries use IN_TRANSIT.
  | 'IN_PROGRESS'
  | 'IN_TRANSIT'
  // The handover step: the courier is at the drop-off and capturing proof.
  // Present in the Prisma TaskStatus enum and in the delivery transition
  // tables; it was missing here, so the app could not represent the state the
  // backend requires a delivery to pass through (BE-005).
  | 'DELIVERING'
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
  /** null until the rider has actually been rated — see formatRating(). */
  rating: number | null;
  ratingCount?: number;
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

// Merchant Dashboard Types (for store compatibility)
export interface MerchantOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  items: Array<{ id?: string; name: string; quantity: number; price: number; totalPrice?: number; unitPrice?: number }>;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  deliveryAddress?: string;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
}

export interface MerchantAnalytics {
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface MerchantEarnings {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  pendingPayout: number;
  totalEarnings?: number;
  availableBalance?: number;
  lastPayoutAmount?: number;
  lastPayoutDate?: string;
  transactions?: MerchantTransaction[];
}

export interface MerchantTransaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  status?: string;
  orderId?: string;
}

// ============================================
// INTELLIGENT PLATFORM — DRIVER REPUTATION
// ============================================
// Mirrors GET /api/rider/reputation. This is the DRIVER-FACING projection:
// it intentionally has no fraudRiskScore / fraud flag fields, because the
// detector's internals must not be exposed to the account being scored.

export type TrustTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'WARNING' | 'SUSPENDED';

export interface ReputationMetrics {
  averageRating: number;
  totalRatings: number;
  /** Percentages, 0-100 */
  completionRate: number;
  acceptanceRate: number;
  cancellationRate: number;
  onTimeRate: number;
  safetyScore: number;
  tripsCompleted: number;
  tripsCancelled: number;
  compliments: number;
  complaints: number;
}

export interface ReputationAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  suggestedAction?: string | null;
  createdAt: string;
}

export interface ReputationHistoryPoint {
  trustScore: number;
  scoreChange: number;
  triggerType: string;
  reason?: string | null;
  createdAt: string;
}

export interface DriverIncentiveProgress {
  /** The IncentiveParticipation row's own id. */
  id: string;
  /** The campaign this participation is for — never equal to `id`. */
  incentiveId?: string;
  status: string;
  name: string;
  type: string;
  rewardAmount: number;
  ridesCompleted: number;
  ridesRequired?: number | null;
  earningsAccumulated: number;
  progressPercent: number;
  endsAt: string;
}

export interface RiderReputation {
  hasReputation: boolean;
  trustScore: number | null;
  trustTier: TrustTier | null;
  previousTrustTier?: TrustTier | null;
  lastScoreUpdateAt?: string;
  nextTier?: TrustTier | null;
  pointsToNextTier?: number | null;
  /** Present only when hasReputation is false */
  message?: string;
  metrics?: ReputationMetrics;
  streak?: { current: number; longest: number };
  accountHealth?: {
    isSuspended: boolean;
    suspendedAt?: string | null;
    suspensionEndsAt?: string | null;
    suspensionReason?: string | null;
  };
  privileges: {
    bonusEligible: boolean;
    priorityDispatch: boolean;
    premiumAccess: boolean;
  };
  earnings?: { totalBonusEarned: number; lastBonusAt?: string | null };
  alerts?: ReputationAlert[];
  history?: ReputationHistoryPoint[];
  incentives?: DriverIncentiveProgress[];
}
