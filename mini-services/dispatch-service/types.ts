// Smart Ride Dispatch & Matching Engine Types
// Handles intelligent assignment of ride, delivery, and health service requests

// ============================================
// DISPATCH REQUEST TYPES
// ============================================

export type ServiceType =
  | 'SMART_BODA_RIDE'
  | 'SMART_CAR_RIDE'
  | 'FOOD_DELIVERY'
  | 'SHOPPING'
  | 'ITEM_DELIVERY'
  | 'SMART_HEALTH_DELIVERY'
  | 'DOCTOR_CONSULTATION';

export type PaymentMethodType =
  | 'CASH'
  | 'MOBILE_MONEY_MTN'
  | 'MOBILE_MONEY_AIRTEL'
  | 'VISA'
  | 'MASTERCARD'
  | 'CARD';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DispatchRequest {
  id: string;
  userId: string;
  serviceType: ServiceType;
  pickupLocation: Location;
  destination?: Location;
  timeOfRequest: Date;
  paymentMethod: PaymentMethodType;
  estimatedDistance?: number; // km
  estimatedDuration?: number; // minutes
  estimatedPrice?: number;

  // Service-specific requirements
  requirements?: ServiceRequirements;

  // For orders
  orderId?: string;
  orderNumber?: string;
  merchantId?: string;
  healthOrderId?: string;
  prescriptionId?: string;
}

export interface ServiceRequirements {
  // Transport requirements
  passengerCount?: number;
  hasLuggage?: boolean;

  // Delivery requirements
  itemDescription?: string;
  itemWeight?: number; // kg
  itemValue?: number;
  isFragile?: boolean;
  isTemperatureControlled?: boolean;

  // Health requirements
  requiresPrescription?: boolean;
  requiresConsultation?: boolean;
  urgencyLevel?: 'normal' | 'urgent' | 'emergency';
}

// ============================================
// PROVIDER TYPES
// ============================================

export type ProviderType =
  | 'SMART_BODA_RIDER'
  | 'SMART_CAR_DRIVER'
  | 'DELIVERY_PERSONNEL'
  | 'PHARMACY'
  | 'DRUG_SHOP'
  | 'CLINIC'
  | 'PRIVATE_DOCTOR';

export interface ProviderLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  lastUpdated: Date;
}

export interface ProviderMetrics {
  rating: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  acceptanceRate: number; // 0-100
  completionRate: number; // 0-100
  averageResponseTime: number; // seconds
  reliabilityScore: number; // 0-100
}

export interface SafetyMetrics {
  safetyScore: number; // 0-100
  fraudRiskScore: number; // 0-100, higher is more risky
  isFlagged: boolean;
  flagReason?: string;
  lastSafetyCheck?: Date;
  suspensionReason?: string;
}

export interface Provider {
  id: string;
  type: ProviderType;
  name: string;
  phone: string;
  avatarUrl?: string;

  // Status
  isOnline: boolean;
  isAvailable: boolean;
  currentTaskId?: string;

  // Location
  location: ProviderLocation;

  // Performance
  metrics: ProviderMetrics;

  // Safety
  safety: SafetyMetrics;

  // Vehicle (for riders/drivers)
  vehicle?: {
    type: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
  };

  // Capabilities
  capabilities: ServiceType[];

  // For health providers
  healthProviderType?: 'PHARMACY' | 'DRUG_SHOP' | 'CLINIC' | 'PRIVATE_DOCTOR';
  supportsPrescription?: boolean;
  supportsOTC?: boolean;
  supportsConsultation?: boolean;
}

// ============================================
// DISPATCH SCORING TYPES
// ============================================

export interface ScoringWeights {
  distance: number; // weight for proximity
  rating: number; // weight for provider rating
  acceptanceRate: number; // weight for acceptance rate
  completionRate: number; // weight for job completion
  reliability: number; // weight for reliability score
  safety: number; // weight for safety score
  fraudRisk: number; // weight for fraud risk (negative)
  responseTime: number; // weight for response time
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  distance: 0.25,
  rating: 0.15,
  acceptanceRate: 0.10,
  completionRate: 0.15,
  reliability: 0.15,
  safety: 0.10,
  fraudRisk: 0.05,
  responseTime: 0.05,
};

export interface ProviderScore {
  providerId: string;
  totalScore: number;
  breakdown: {
    distanceScore: number;
    ratingScore: number;
    acceptanceScore: number;
    completionScore: number;
    reliabilityScore: number;
    safetyScore: number;
    fraudPenalty: number;
    responseTimeScore: number;
  };
  distance: number; // actual distance in km
  rank: number;
}

// ============================================
// DISPATCH RESULT TYPES
// ============================================

export type DispatchStatus =
  | 'SEARCHING'
  | 'PROVIDERS_FOUND'
  | 'OFFER_SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TIMED_OUT'
  | 'NO_PROVIDERS'
  | 'CANCELLED';

export interface DispatchAttempt {
  id: string;
  requestId: string;
  providerId: string;
  status: DispatchStatus;
  offeredAt: Date;
  respondedAt?: Date;
  responseTime?: number; // seconds
  rejectionReason?: string;
  score: number;
  rank: number;
}

export interface DispatchResult {
  requestId: string;
  status: DispatchStatus;
  selectedProvider?: Provider;
  allAttempts: DispatchAttempt[];
  totalProvidersFound: number;
  searchDuration: number; // ms
  matchingStartedAt: Date;
  completedAt?: Date;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface DispatchNotification {
  id: string;
  type: 'TASK_OFFER' | 'TASK_ASSIGNED' | 'TASK_CANCELLED' | 'TASK_UNAVAILABLE' | 'DISPATCH_FAILED';
  recipientId: string;
  recipientType: 'PROVIDER' | 'CLIENT' | 'MERCHANT';
  payload: {
    taskId?: string;
    taskNumber?: string;
    taskType?: ServiceType;
    pickupAddress?: string;
    dropoffAddress?: string;
    estimatedPrice?: number;
    providerEarnings?: number;
    expiresAt?: Date;
    clientName?: string;
    merchantName?: string;
    reason?: string;
  };
  createdAt: Date;
  readAt?: Date;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface DispatchConfig {
  // Search radius
  defaultSearchRadiusKm: number;
  maxSearchRadiusKm: number;

  // Timeouts
  offerTimeoutMs: number; // Time for provider to accept (default 10-15 seconds)
  matchingTimeoutMs: number; // Total time to find provider
  searchExpansionIntervalMs: number; // Expand radius after this time

  // Limits
  maxConcurrentOffers: number; // Max providers to offer simultaneously
  maxDispatchAttempts: number; // Max retry attempts

  // Scoring
  scoringWeights: ScoringWeights;
  minimumScoreThreshold: number; // Min score to be eligible

  // Safety
  safetyScoreThreshold: number; // Min safety score
  maxFraudRiskScore: number; // Max allowed fraud risk
  excludeFlaggedProviders: boolean;

  // Health-specific
  healthProviderSearchRadiusKm: number;
  maxPrescriptionProcessingTimeMinutes: number;
}

export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  defaultSearchRadiusKm: 5,
  maxSearchRadiusKm: 20,
  offerTimeoutMs: 15000, // 15 seconds
  matchingTimeoutMs: 300000, // 5 minutes
  searchExpansionIntervalMs: 30000, // 30 seconds
  maxConcurrentOffers: 3,
  maxDispatchAttempts: 5,
  scoringWeights: DEFAULT_SCORING_WEIGHTS,
  minimumScoreThreshold: 30,
  safetyScoreThreshold: 50,
  maxFraudRiskScore: 70,
  excludeFlaggedProviders: true,
  healthProviderSearchRadiusKm: 10,
  maxPrescriptionProcessingTimeMinutes: 30,
};

// ============================================
// SERVICE MAPPING
// ============================================

export const SERVICE_TO_PROVIDER_MAP: Record<ServiceType, ProviderType[]> = {
  SMART_BODA_RIDE: ['SMART_BODA_RIDER'],
  SMART_CAR_RIDE: ['SMART_CAR_DRIVER'],
  FOOD_DELIVERY: ['DELIVERY_PERSONNEL'],
  SHOPPING: ['DELIVERY_PERSONNEL'],
  ITEM_DELIVERY: ['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL'],
  SMART_HEALTH_DELIVERY: ['PHARMACY', 'DRUG_SHOP'],
  DOCTOR_CONSULTATION: ['CLINIC', 'PRIVATE_DOCTOR'],
};

// ============================================
// LOG TYPES
// ============================================

export interface DispatchLog {
  id: string;
  requestId: string;
  action: string;
  entityType: 'DISPATCH' | 'PROVIDER' | 'TASK' | 'NOTIFICATION';
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface DispatchMetrics {
  totalRequests: number;
  successfulDispatches: number;
  failedDispatches: number;
  averageMatchTime: number;
  averageProvidersSearched: number;
  acceptanceRate: number;
  byServiceType: Record<ServiceType, {
    requests: number;
    successful: number;
    averageTime: number;
  }>;
}
