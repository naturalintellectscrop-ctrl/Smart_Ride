export type UserRole = 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACIST' | 'ADMIN';

// Rider-specific roles (chosen once during registration, cannot switch)
export type RiderRoleType = 'SMART_BODA' | 'SMART_CAR' | 'DELIVERY_PERSONNEL';

// Rider verification status
export type RiderVerificationStatus = 'PENDING_REGISTRATION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

// Task states
export type TaskState = 
  | 'CREATED'
  | 'MATCHING'
  | 'ASSIGNED'
  | 'RIDER_ACCEPTED'
  | 'IN_PROGRESS'
  | 'ARRIVED_AT_PICKUP'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

// Merchant order states
export type MerchantOrderState =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'MERCHANT_ACCEPTED'
  | 'MERCHANT_REJECTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

// Cancellation reason codes
export type CancellationReason =
  | 'CLIENT_CANCELLED'
  | 'RIDER_CANCELLED'
  | 'MERCHANT_CANCELLED'
  | 'SYSTEM_TIMEOUT'
  | 'NO_RIDER_AVAILABLE'
  | 'PAYMENT_FAILED';

// Service types
export type ServiceType = 'BODA_RIDE' | 'CAR_RIDE' | 'FOOD_DELIVERY' | 'SMART_GROCERY' | 'SMART_COURIER' | 'HEALTH';

// Vehicle types
export type VehicleType = 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';

// Payment methods
export type PaymentMethod = 'CASH' | 'MTN_MONEY' | 'AIRTEL_MONEY' | 'VISA' | 'MASTERCARD' | 'CREDIT_CARD';

export type OnboardingStep = 'welcome' | 'auth' | 'role-selection' | 'rider-role-selection' | 'rider-registration' | 'pending-approval' | 'dashboard';

export interface User {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  role: UserRole | null;
  avatarUrl?: string;
  isNewUser?: boolean;
  // Rider-specific fields
  riderRoleType?: RiderRoleType;
  verificationStatus?: RiderVerificationStatus;
  vehicleType?: VehicleType;
  physicalAddress?: string;
  documents?: {
    facePhoto?: string;
    nationalIdFront?: string;
    nationalIdBack?: string;
    driversLicense?: string;
  };
  equipmentIssued?: {
    reflectorVest?: boolean;
    helmet?: boolean;
    insulatedBox?: boolean;
  };
  rating?: number;
  totalTrips?: number;
}

export interface AuthService {
  type: 'phone' | 'google' | 'apple';
  phone?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'boda',
    name: 'Smart Boda',
    description: 'Quick motorcycle rides',
    icon: 'Bike',
    color: 'emerald',
  },
  {
    id: 'car',
    name: 'Smart Car',
    description: 'Comfortable car rides',
    icon: 'Car',
    color: 'blue',
  },
  {
    id: 'food',
    name: 'Food Delivery',
    description: 'Order from restaurants',
    icon: 'UtensilsCrossed',
    color: 'orange',
  },
  {
    id: 'smart-grocery',
    name: 'Smart Grocery',
    description: 'Groceries & retail',
    icon: 'ShoppingCart',
    color: 'purple',
  },
  {
    id: 'smart-courier',
    name: 'Smart Courier',
    description: 'Send packages anywhere',
    icon: 'Package',
    color: 'teal',
  },
  {
    id: 'health',
    name: 'Smart Health',
    description: 'Medicines & healthcare',
    icon: 'Heart',
    color: 'rose',
  },
];

export const ROLE_DESCRIPTIONS = {
  CLIENT: {
    title: 'Client',
    subtitle: 'Request Services',
    description: 'Order rides, food, groceries, and more. Get things delivered to your doorstep.',
    icon: 'User',
    color: 'emerald',
  },
  RIDER: {
    title: 'Rider/Driver',
    subtitle: 'Earn Money',
    description: 'Accept delivery and ride requests. Earn money on your own schedule.',
    icon: 'Bike',
    color: 'orange',
  },
  MERCHANT: {
    title: 'Merchant',
    subtitle: 'Grow Business',
    description: 'List your products and services. Reach more customers and grow your business.',
    icon: 'Store',
    color: 'blue',
  },
  PHARMACIST: {
    title: 'Pharmacist',
    subtitle: 'Healthcare Provider',
    description: 'Dispense medicines, verify prescriptions, and serve your community through Smart Health.',
    icon: 'Heart',
    color: 'rose',
  },
  ADMIN: {
    title: 'Admin',
    subtitle: 'System Administration',
    description: 'Manage users, riders, merchants, orders, and system settings.',
    icon: 'Shield',
    color: 'purple',
  },
};

// Rider role descriptions (chosen after selecting RIDER role)
export const RIDER_ROLE_DESCRIPTIONS = {
  SMART_BODA: {
    title: 'Smart Boda Rider',
    subtitle: 'Motorcycle Transport',
    description: 'Transport passengers and deliver items using your motorcycle (boda boda).',
    icon: 'Bike',
    color: 'emerald',
    capabilities: ['Passenger transport', 'Item delivery'],
    cannot: ['Food delivery', 'Shopping delivery'],
  },
  SMART_CAR: {
    title: 'Smart Car Driver',
    subtitle: 'Car Transport',
    description: 'Transport passengers and deliver items using your car.',
    icon: 'Car',
    color: 'blue',
    capabilities: ['Passenger transport', 'Item delivery'],
    cannot: ['Food delivery', 'Shopping delivery'],
  },
  DELIVERY_PERSONNEL: {
    title: 'Delivery Personnel',
    subtitle: 'Specialized Delivery',
    description: 'Deliver food, shopping items, and packages to customers.',
    icon: 'Package',
    color: 'orange',
    capabilities: ['Food delivery', 'Shopping delivery', 'Item delivery'],
    cannot: ['Passenger transport'],
  },
};

// Task state transitions
export const TASK_STATE_TRANSITIONS: Record<TaskState, TaskState[]> = {
  CREATED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['ASSIGNED', 'CANCELLED', 'FAILED'],
  ASSIGNED: ['RIDER_ACCEPTED', 'MATCHING', 'CANCELLED'],
  RIDER_ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ARRIVED_AT_PICKUP', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
  ARRIVED_AT_PICKUP: ['IN_PROGRESS', 'DELIVERING', 'CANCELLED'],
  DELIVERING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};

// Merchant order SLA timers (in seconds)
export const MERCHANT_SLA_TIMERS = {
  PAYMENT_CONFIRMED: 180, // 3 minutes to accept/reject
  MERCHANT_ACCEPTED: 0, // Immediate transition to preparing
  PREPARING: 1800, // 30 minutes for food, 45 for shopping
  READY_FOR_PICKUP: 600, // 10 minutes for rider arrival
};

// Service to Rider Role mapping
export const SERVICE_TO_RIDER_ROLE: Record<string, RiderRoleType[]> = {
  BODA_RIDE: ['SMART_BODA'],
  CAR_RIDE: ['SMART_CAR'],
  FOOD_DELIVERY: ['DELIVERY_PERSONNEL'],
  SMART_GROCERY: ['DELIVERY_PERSONNEL'],
  SMART_COURIER: ['SMART_BODA', 'SMART_CAR', 'DELIVERY_PERSONNEL'],
};
