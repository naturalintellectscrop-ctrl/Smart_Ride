// Smart Ride Dispatch Service
// WebSocket-based real-time dispatch with integrated scoring engine

import { Server } from 'socket.io';
import {
  DispatchRequest,
  DispatchResult,
  DispatchAttempt,
  Provider,
  DispatchConfig,
  DEFAULT_DISPATCH_CONFIG,
  ServiceType,
  ProviderType,
} from './types';

// Import scoring functions
import {
  scoreAndRankProviders,
  calculateDistance,
  estimateArrivalTime,
  calculateSurgeMultiplier,
} from './scoring-engine';

const PORT = 3003;

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RiderInfo {
  id: string;
  socketId: string;
  name: string;
  role: ProviderType;
  location: { latitude: number; longitude: number } | null;
  isOnline: boolean;
  isAvailable: boolean;
  currentTaskId: string | null;
  rating: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  acceptanceRate: number;
  completionRate: number;
  averageResponseTime: number;
  reliabilityScore: number;
  safetyScore: number;
  fraudRiskScore: number;
  isFlagged: boolean;
  flagReason?: string;
  lastSafetyCheck?: Date;
  vehicle?: {
    type: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
  };
}

interface HealthProviderInfo {
  id: string;
  socketId: string;
  name: string;
  type: 'PHARMACY' | 'DRUG_SHOP' | 'CLINIC' | 'PRIVATE_DOCTOR';
  location: { latitude: number; longitude: number } | null;
  isOpen: boolean;
  isAvailable: boolean;
  currentOrderId: string | null;
  rating: number;
  totalOrders: number;
  supportsPrescription: boolean;
  supportsOTC: boolean;
  supportsConsultation: boolean;
}

interface PendingTask {
  id: string;
  taskNumber: string;
  taskType: ServiceType;
  pickupAddress: string;
  pickupLocation: { latitude: number; longitude: number };
  dropoffAddress?: string;
  totalAmount: number;
  riderEarnings: number;
  clientId: string;
  merchantId?: string;
  healthOrderId?: string;
  prescriptionId?: string;
  createdAt: Date;
  matchingStartedAt: Date;
  offeredTo: string[];
  currentRadius: number;
  searchAttempts: number;
}

interface DispatchAttemptInfo {
  id: string;
  taskId: string;
  providerId: string;
  status: 'OFFER_SENT' | 'ACCEPTED' | 'REJECTED' | 'TIMED_OUT';
  offeredAt: Date;
  respondedAt?: Date;
  responseTime?: number;
  rejectionReason?: string;
  score: number;
  rank: number;
}

// ============================================
// IN-MEMORY STORES (Use Redis in Production)
// ============================================

const riders = new Map<string, RiderInfo>();
const healthProviders = new Map<string, HealthProviderInfo>();
const pendingTasks = new Map<string, PendingTask>();
const dispatchAttempts = new Map<string, DispatchAttemptInfo[]>();
const taskTimers = new Map<string, NodeJS.Timeout>();
const offerTimers = new Map<string, Map<string, NodeJS.Timeout>>();

// Dispatch logs for analytics
const dispatchLogs: Array<{
  id: string;
  taskId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}> = [];

// ============================================
// CONFIGURATION
// ============================================

const config: DispatchConfig = {
  ...DEFAULT_DISPATCH_CONFIG,
  // Override defaults if needed
};

const TASK_TYPE_TO_PROVIDER_ROLE: Record<ServiceType, ProviderType[]> = {
  'SMART_BODA_RIDE': ['SMART_BODA_RIDER'],
  'SMART_CAR_RIDE': ['SMART_CAR_DRIVER'],
  'FOOD_DELIVERY': ['DELIVERY_PERSONNEL'],
  'SHOPPING': ['DELIVERY_PERSONNEL'],
  'ITEM_DELIVERY': ['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL'],
  'SMART_HEALTH_DELIVERY': ['PHARMACY', 'DRUG_SHOP'],
  'DOCTOR_CONSULTATION': ['CLINIC', 'PRIVATE_DOCTOR'],
};

console.log(`🚀 Smart Ride Dispatch Service running on port ${PORT}`);
console.log(`📊 Scoring Engine Active - Multi-factor provider ranking enabled`);

// ============================================
// LOGGING
// ============================================

function logDispatch(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  taskId?: string,
  metadata?: Record<string, unknown>
): void {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taskId: taskId || 'system',
    action,
    entityType,
    entityId,
    description,
    metadata,
    createdAt: new Date(),
  };
  dispatchLogs.push(log);

  // Keep only last 1000 logs in memory
  if (dispatchLogs.length > 1000) {
    dispatchLogs.shift();
  }

  console.log(`[${log.createdAt.toISOString()}] ${action}: ${description}`);
}

// ============================================
// SAFETY & FRAUD INTEGRATION
// ============================================

function checkProviderEligibility(provider: RiderInfo | HealthProviderInfo): {
  eligible: boolean;
  reason?: string;
} {
  // Check if flagged
  if ('isFlagged' in provider && provider.isFlagged) {
    return {
      eligible: false,
      reason: `Provider flagged: ${provider.flagReason || 'Safety concern'}`,
    };
  }

  // Check safety score
  if ('safetyScore' in provider && provider.safetyScore < config.safetyScoreThreshold) {
    return {
      eligible: false,
      reason: `Safety score too low: ${provider.safetyScore}`,
    };
  }

  // Check fraud risk
  if ('fraudRiskScore' in provider && provider.fraudRiskScore > config.maxFraudRiskScore) {
    return {
      eligible: false,
      reason: `Fraud risk too high: ${provider.fraudRiskScore}`,
    };
  }

  return { eligible: true };
}

function updateProviderSafetyScore(providerId: string, score: number): void {
  const rider = riders.get(providerId);
  if (rider) {
    rider.safetyScore = score;
    rider.lastSafetyCheck = new Date();
  }
}

function updateProviderFraudRisk(providerId: string, riskScore: number): void {
  const rider = riders.get(providerId);
  if (rider) {
    rider.fraudRiskScore = riskScore;
    
    // Auto-flag if risk too high
    if (riskScore > config.maxFraudRiskScore) {
      rider.isFlagged = true;
      rider.flagReason = 'High fraud risk detected';
      
      logDispatch(
        'PROVIDER_FLAGGED',
        'PROVIDER',
        providerId,
        `Provider auto-flagged due to high fraud risk`,
        undefined,
        { riskScore }
      );
    }
  }
}

// ============================================
// SCORING ENGINE INTEGRATION
// ============================================

function convertToProvider(rider: RiderInfo): Provider {
  return {
    id: rider.id,
    type: rider.role,
    name: rider.name,
    phone: '', // Not exposed in scoring
    isOnline: rider.isOnline,
    isAvailable: rider.isAvailable && !rider.currentTaskId,
    currentTaskId: rider.currentTaskId || undefined,
    location: {
      latitude: rider.location?.latitude || 0,
      longitude: rider.location?.longitude || 0,
      lastUpdated: new Date(),
    },
    metrics: {
      rating: rider.rating,
      totalJobs: rider.totalTrips,
      completedJobs: rider.completedTrips,
      cancelledJobs: rider.cancelledTrips,
      acceptanceRate: rider.acceptanceRate,
      completionRate: rider.completionRate,
      averageResponseTime: rider.averageResponseTime,
      reliabilityScore: rider.reliabilityScore,
    },
    safety: {
      safetyScore: rider.safetyScore,
      fraudRiskScore: rider.fraudRiskScore,
      isFlagged: rider.isFlagged,
      flagReason: rider.flagReason,
      lastSafetyCheck: rider.lastSafetyCheck,
    },
    vehicle: rider.vehicle,
    capabilities: getCapabilitiesForRole(rider.role),
  };
}

function getCapabilitiesForRole(role: ProviderType): ServiceType[] {
  const capabilityMap: Record<ProviderType, ServiceType[]> = {
    'SMART_BODA_RIDER': ['SMART_BODA_RIDE', 'ITEM_DELIVERY'],
    'SMART_CAR_DRIVER': ['SMART_CAR_RIDE', 'ITEM_DELIVERY'],
    'DELIVERY_PERSONNEL': ['FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY'],
    'PHARMACY': ['SMART_HEALTH_DELIVERY'],
    'DRUG_SHOP': ['SMART_HEALTH_DELIVERY'],
    'CLINIC': ['DOCTOR_CONSULTATION'],
    'PRIVATE_DOCTOR': ['DOCTOR_CONSULTATION'],
  };
  return capabilityMap[role] || [];
}

function scoreProvidersForTask(
  task: PendingTask
): Array<{ providerId: string; score: number; distance: number; rank: number }> {
  const requiredRoles = TASK_TYPE_TO_PROVIDER_ROLE[task.taskType] || [];

  // Get eligible riders
  const eligibleRiders = Array.from(riders.values()).filter((rider) => {
    // Check role compatibility
    if (!requiredRoles.includes(rider.role)) return false;

    // Check availability
    if (!rider.isOnline || !rider.isAvailable || rider.currentTaskId) return false;

    // Check location
    if (!rider.location) return false;

    // Check safety eligibility
    const eligibility = checkProviderEligibility(rider);
    if (!eligibility.eligible) return false;

    // Check distance
    const distance = calculateDistance(
      { latitude: task.pickupLocation.latitude, longitude: task.pickupLocation.longitude },
      rider.location
    );

    return distance <= task.currentRadius;
  });

  // Convert to Provider format and score
  const providers = eligibleRiders.map(convertToProvider);

  const scoredProviders = scoreAndRankProviders(
    providers,
    { latitude: task.pickupLocation.latitude, longitude: task.pickupLocation.longitude },
    config
  );

  return scoredProviders.map((sp) => {
    const rider = eligibleRiders.find((r) => r.id === sp.providerId)!;
    return {
      providerId: sp.providerId,
      score: sp.totalScore,
      distance: sp.distance,
      rank: sp.rank,
    };
  });
}

// ============================================
// DISPATCH FLOW
// ============================================

function matchTaskToProviders(task: PendingTask): void {
  logDispatch(
    'MATCHING_STARTED',
    'TASK',
    task.id,
    `Starting matching for task ${task.taskNumber}`,
    task.id,
    { taskType: task.taskType, radius: task.currentRadius }
  );

  // Score providers
  const scoredProviders = scoreProvidersForTask(task);

  if (scoredProviders.length === 0) {
    // No providers found - expand radius or fail
    if (task.currentRadius < config.maxSearchRadiusKm) {
      task.currentRadius = Math.min(task.currentRadius + 5, config.maxSearchRadiusKm);
      task.searchAttempts++;

      logDispatch(
        'RADIUS_EXPANDED',
        'TASK',
        task.id,
        `Expanded search radius to ${task.currentRadius}km`,
        task.id,
        { newRadius: task.currentRadius, attempt: task.searchAttempts }
      );

      // Retry after short delay
      setTimeout(() => matchTaskToProviders(task), 5000);
      return;
    }

    // No providers available
    logDispatch(
      'NO_PROVIDERS',
      'TASK',
      task.id,
      'No providers available within radius',
      task.id,
      { finalRadius: task.currentRadius, attempts: task.searchAttempts }
    );

    io.to(`client:${task.clientId}`).emit('task:failed', {
      taskId: task.id,
      reason: 'NO_RIDER_AVAILABLE',
      message: 'No providers available at this time. Please try again.',
    });

    pendingTasks.delete(task.id);
    clearTaskTimers(task.id);
    return;
  }

  // Get top providers to offer
  const topProviders = scoredProviders.slice(0, config.maxConcurrentOffers);

  // Initialize attempts
  if (!dispatchAttempts.has(task.id)) {
    dispatchAttempts.set(task.id, []);
  }
  const attempts = dispatchAttempts.get(task.id)!;

  // Send offers
  topProviders.forEach((provider, index) => {
    // Skip if already offered
    if (task.offeredTo.includes(provider.providerId)) return;

    task.offeredTo.push(provider.providerId);

    const attempt: DispatchAttemptInfo = {
      id: `attempt_${task.id}_${provider.providerId}`,
      taskId: task.id,
      providerId: provider.providerId,
      status: 'OFFER_SENT',
      offeredAt: new Date(),
      score: provider.score,
      rank: index + 1,
    };

    attempts.push(attempt);

    // Get rider info
    const rider = riders.get(provider.providerId);

    // Send offer to provider
    io.to(`rider:${provider.providerId}`).emit('task:offer', {
      taskId: task.id,
      taskNumber: task.taskNumber,
      taskType: task.taskType,
      pickupAddress: task.pickupAddress,
      dropoffAddress: task.dropoffAddress,
      totalAmount: task.totalAmount,
      riderEarnings: task.riderEarnings,
      estimatedDistance: provider.distance,
      estimatedArrival: rider?.vehicle
        ? estimateArrivalTime(provider.distance, rider.vehicle.type)
        : estimateArrivalTime(provider.distance),
      expiresAt: new Date(Date.now() + config.offerTimeoutMs),
      score: provider.score,
      rank: provider.rank,
    });

    logDispatch(
      'OFFER_SENT',
      'PROVIDER',
      provider.providerId,
      `Task offer sent to provider (score: ${provider.score.toFixed(1)}, rank: ${provider.rank})`,
      task.id,
      { score: provider.score, distance: provider.distance }
    );

    // Set offer timeout
    if (!offerTimers.has(task.id)) {
      offerTimers.set(task.id, new Map());
    }
    const timer = setTimeout(() => {
      handleOfferTimeout(task.id, provider.providerId);
    }, config.offerTimeoutMs);
    offerTimers.get(task.id)!.set(provider.providerId, timer);
  });

  // Set overall matching timeout
  const matchingTimer = setTimeout(() => {
    handleMatchingTimeout(task.id);
  }, config.matchingTimeoutMs);
  taskTimers.set(task.id, matchingTimer);
}

function handleOfferTimeout(taskId: string, providerId: string): void {
  const task = pendingTasks.get(taskId);
  const attempts = dispatchAttempts.get(taskId);

  if (!task || !attempts) return;

  const attempt = attempts.find((a) => a.providerId === providerId);
  if (!attempt || attempt.status !== 'OFFER_SENT') return;

  attempt.status = 'TIMED_OUT';
  attempt.respondedAt = new Date();
  attempt.rejectionReason = 'TIMEOUT';

  logDispatch(
    'OFFER_TIMEOUT',
    'PROVIDER',
    providerId,
    'Provider did not respond within timeout',
    taskId
  );

  // Update rider's acceptance rate
  const rider = riders.get(providerId);
  if (rider) {
    rider.acceptanceRate = Math.max(0, rider.acceptanceRate - 5);
  }

  // Try next provider or expand search
  handleProviderRejection(taskId, providerId, 'TIMEOUT');
}

function handleMatchingTimeout(taskId: string): void {
  const task = pendingTasks.get(taskId);

  if (!task) return;

  logDispatch(
    'MATCHING_TIMEOUT',
    'TASK',
    taskId,
    'Matching timed out without finding a provider',
    taskId
  );

  io.to(`client:${task.clientId}`).emit('task:failed', {
    taskId,
    reason: 'MATCHING_TIMEOUT',
    message: 'Could not find a provider. Please try again.',
  });

  pendingTasks.delete(taskId);
  clearTaskTimers(taskId);
}

function clearTaskTimers(taskId: string): void {
  // Clear matching timer
  const matchingTimer = taskTimers.get(taskId);
  if (matchingTimer) {
    clearTimeout(matchingTimer);
    taskTimers.delete(taskId);
  }

  // Clear offer timers
  const timers = offerTimers.get(taskId);
  if (timers) {
    timers.forEach((timer) => clearTimeout(timer));
    offerTimers.delete(taskId);
  }
}

function handleProviderRejection(
  taskId: string,
  providerId: string,
  reason: string
): void {
  const task = pendingTasks.get(taskId);
  const attempts = dispatchAttempts.get(taskId);

  if (!task || !attempts) return;

  // Find next providers not yet offered
  const offeredIds = new Set(task.offeredTo);
  const scoredProviders = scoreProvidersForTask(task);
  const nextProviders = scoredProviders.filter((p) => !offeredIds.has(p.providerId));

  if (nextProviders.length > 0) {
    // Offer to next batch
    const nextBatch = nextProviders.slice(0, config.maxConcurrentOffers);

    nextBatch.forEach((provider, index) => {
      task.offeredTo.push(provider.providerId);

      const attempt: DispatchAttemptInfo = {
        id: `attempt_${taskId}_${provider.providerId}`,
        taskId,
        providerId: provider.providerId,
        status: 'OFFER_SENT',
        offeredAt: new Date(),
        score: provider.score,
        rank: attempts.length + index + 1,
      };

      attempts.push(attempt);

      // Send offer
      io.to(`rider:${provider.providerId}`).emit('task:offer', {
        taskId,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        pickupAddress: task.pickupAddress,
        dropoffAddress: task.dropoffAddress,
        totalAmount: task.totalAmount,
        riderEarnings: task.riderEarnings,
        expiresAt: new Date(Date.now() + config.offerTimeoutMs),
      });

      logDispatch(
        'OFFER_SENT',
        'PROVIDER',
        provider.providerId,
        `Task offer sent to next provider`,
        taskId
      );

      // Set timeout
      if (!offerTimers.has(taskId)) {
        offerTimers.set(taskId, new Map());
      }
      const timer = setTimeout(() => {
        handleOfferTimeout(taskId, provider.providerId);
      }, config.offerTimeoutMs);
      offerTimers.get(taskId)!.set(provider.providerId, timer);
    });
  } else if (task.currentRadius < config.maxSearchRadiusKm) {
    // Expand search
    task.currentRadius = Math.min(task.currentRadius + 5, config.maxSearchRadiusKm);
    task.searchAttempts++;
    setTimeout(() => matchTaskToProviders(task), 2000);
  } else {
    // No more providers
    io.to(`client:${task.clientId}`).emit('task:failed', {
      taskId,
      reason: 'NO_RIDER_AVAILABLE',
      message: 'No providers available at this time.',
    });

    pendingTasks.delete(taskId);
    clearTaskTimers(taskId);
  }
}

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ================== RIDER EVENTS ==================

  /**
   * Rider comes online
   */
  socket.on('rider:online', (data: {
    riderId: string;
    name: string;
    role: ProviderType;
    latitude: number;
    longitude: number;
    rating?: number;
    totalTrips?: number;
    completedTrips?: number;
    cancelledTrips?: number;
    vehicle?: RiderInfo['vehicle'];
  }) => {
    console.log(`Rider online: ${data.name} (${data.role})`);

    // Safety check - could integrate with fraud detection here
    const existingRider = riders.get(data.riderId);
    let safetyScore = 100;
    let fraudRiskScore = 0;
    let isFlagged = false;
    let flagReason: string | undefined;

    if (existingRider) {
      safetyScore = existingRider.safetyScore;
      fraudRiskScore = existingRider.fraudRiskScore;
      isFlagged = existingRider.isFlagged;
      flagReason = existingRider.flagReason;
    }

    riders.set(data.riderId, {
      id: data.riderId,
      socketId: socket.id,
      name: data.name,
      role: data.role,
      location: { latitude: data.latitude, longitude: data.longitude },
      isOnline: true,
      isAvailable: true,
      currentTaskId: null,
      rating: data.rating || 5.0,
      totalTrips: data.totalTrips || 0,
      completedTrips: data.completedTrips || 0,
      cancelledTrips: data.cancelledTrips || 0,
      acceptanceRate: 100,
      completionRate: data.totalTrips ? (data.completedTrips || 0) / data.totalTrips * 100 : 100,
      averageResponseTime: 10, // Default 10 seconds
      reliabilityScore: 100,
      safetyScore,
      fraudRiskScore,
      isFlagged,
      flagReason,
      lastSafetyCheck: new Date(),
      vehicle: data.vehicle,
    });

    socket.join(`rider:${data.riderId}`);
    io.emit('rider:status', {
      riderId: data.riderId,
      isOnline: true,
      location: { latitude: data.latitude, longitude: data.longitude },
    });

    socket.emit('rider:online:ack', { success: true });

    logDispatch(
      'RIDER_ONLINE',
      'PROVIDER',
      data.riderId,
      `Rider ${data.name} is now online`,
      undefined,
      { role: data.role }
    );
  });

  /**
   * Rider goes offline
   */
  socket.on('rider:offline', (data: { riderId: string }) => {
    console.log(`Rider offline: ${data.riderId}`);

    const rider = riders.get(data.riderId);
    if (rider) {
      rider.isOnline = false;
      rider.isAvailable = false;
      rider.location = null;

      io.emit('rider:status', {
        riderId: data.riderId,
        isOnline: false,
      });

      logDispatch('RIDER_OFFLINE', 'PROVIDER', data.riderId, 'Rider went offline');
    }

    socket.emit('rider:offline:ack', { success: true });
  });

  /**
   * Rider location update
   */
  socket.on('rider:location', (data: {
    riderId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }) => {
    const rider = riders.get(data.riderId);
    if (rider) {
      rider.location = { latitude: data.latitude, longitude: data.longitude };

      io.emit(`rider:${data.riderId}:location`, {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        battery: data.battery,
        timestamp: new Date(),
      });
    }
  });

  /**
   * Rider accepts a task
   */
  socket.on('task:accept', (data: { taskId: string; riderId: string }) => {
    console.log(`Task ${data.taskId} accepted by rider ${data.riderId}`);

    const task = pendingTasks.get(data.taskId);
    const rider = riders.get(data.riderId);
    const attempts = dispatchAttempts.get(data.taskId);

    if (!task || !rider) {
      socket.emit('task:accept:ack', { success: false, error: 'Invalid task or rider' });
      return;
    }

    // Clear all timers
    clearTaskTimers(data.taskId);

    // Update attempt status
    if (attempts) {
      const attempt = attempts.find((a) => a.providerId === data.riderId);
      if (attempt) {
        attempt.status = 'ACCEPTED';
        attempt.respondedAt = new Date();
        attempt.responseTime = Math.floor(
          (attempt.respondedAt.getTime() - attempt.offeredAt.getTime()) / 1000
        );
      }

      // Mark other attempts as rejected
      attempts.forEach((a) => {
        if (a.providerId !== data.riderId && a.status === 'OFFER_SENT') {
          a.status = 'REJECTED';
          a.rejectionReason = 'OTHER_PROVIDER_ACCEPTED';
        }
      });
    }

    // Update rider status
    rider.currentTaskId = data.taskId;
    rider.isAvailable = false;
    rider.acceptanceRate = Math.min(100, rider.acceptanceRate + 2);

    // Remove task from pending
    pendingTasks.delete(data.taskId);

    // Notify rider of successful acceptance
    socket.emit('task:accept:ack', { success: true, task });

    // Notify client
    io.to(`client:${task.clientId}`).emit('task:assigned', {
      taskId: data.taskId,
      rider: {
        id: rider.id,
        name: rider.name,
        role: rider.role,
        rating: rider.rating,
        vehicle: rider.vehicle,
      },
    });

    // Notify other riders that task is no longer available
    task.offeredTo.forEach((riderId) => {
      if (riderId !== data.riderId) {
        io.to(`rider:${riderId}`).emit('task:unavailable', { taskId: data.taskId });
      }
    });

    logDispatch(
      'TASK_ACCEPTED',
      'PROVIDER',
      data.riderId,
      `Task accepted by rider`,
      data.taskId,
      { riderName: rider.name }
    );
  });

  /**
   * Rider rejects a task
   */
  socket.on('task:reject', (data: { taskId: string; riderId: string; reason?: string }) => {
    console.log(`Task ${data.taskId} rejected by rider ${data.riderId}`);

    const task = pendingTasks.get(data.taskId);
    const attempts = dispatchAttempts.get(data.taskId);
    const rider = riders.get(data.riderId);

    if (task && attempts) {
      // Update attempt status
      const attempt = attempts.find((a) => a.providerId === data.riderId);
      if (attempt) {
        attempt.status = 'REJECTED';
        attempt.respondedAt = new Date();
        attempt.responseTime = Math.floor(
          (attempt.respondedAt.getTime() - attempt.offeredAt.getTime()) / 1000
        );
        attempt.rejectionReason = data.reason || 'PROVIDER_DECLINED';
      }

      // Update rider acceptance rate
      if (rider) {
        rider.acceptanceRate = Math.max(0, rider.acceptanceRate - 3);
      }

      // Clear this rider's offer timer
      const timers = offerTimers.get(data.taskId);
      if (timers) {
        const timer = timers.get(data.riderId);
        if (timer) {
          clearTimeout(timer);
          timers.delete(data.riderId);
        }
      }

      logDispatch(
        'TASK_REJECTED',
        'PROVIDER',
        data.riderId,
        `Task rejected by rider`,
        data.taskId,
        { reason: data.reason }
      );

      // Try next provider
      handleProviderRejection(data.taskId, data.riderId, data.reason || 'PROVIDER_DECLINED');
    }

    socket.emit('task:reject:ack', { success: true });
  });

  /**
   * Task status update from rider
   */
  socket.on('task:status', (data: {
    taskId: string;
    riderId: string;
    status: string;
    metadata?: Record<string, unknown>;
  }) => {
    console.log(`Task ${data.taskId} status: ${data.status}`);

    io.emit(`task:${data.taskId}:status`, {
      status: data.status,
      timestamp: new Date(),
      metadata: data.metadata,
    });

    logDispatch(
      'TASK_STATUS_UPDATE',
      'TASK',
      data.taskId,
      `Task status updated to ${data.status}`,
      data.taskId,
      { status: data.status, riderId: data.riderId }
    );
  });

  /**
   * Rider task completed
   */
  socket.on('task:complete', (data: { taskId: string; riderId: string }) => {
    const rider = riders.get(data.riderId);
    if (rider && rider.currentTaskId === data.taskId) {
      rider.currentTaskId = null;
      rider.isAvailable = true;
      rider.totalTrips += 1;
      rider.completedTrips += 1;
      rider.completionRate = (rider.completedTrips / rider.totalTrips) * 100;

      logDispatch(
        'TASK_COMPLETED',
        'PROVIDER',
        data.riderId,
        'Task completed',
        data.taskId
      );
    }
  });

  // ================== CLIENT EVENTS ==================

  /**
   * Client requests a new task
   */
  socket.on('task:create', (data: {
    taskId: string;
    taskNumber: string;
    taskType: ServiceType;
    clientId: string;
    pickupAddress: string;
    pickupLocation: { latitude: number; longitude: number };
    dropoffAddress?: string;
    totalAmount: number;
    riderEarnings: number;
    merchantId?: string;
    healthOrderId?: string;
    prescriptionId?: string;
  }) => {
    console.log(`New task created: ${data.taskNumber}`);

    const task: PendingTask = {
      id: data.taskId,
      taskNumber: data.taskNumber,
      taskType: data.taskType,
      clientId: data.clientId,
      pickupAddress: data.pickupAddress,
      pickupLocation: data.pickupLocation,
      dropoffAddress: data.dropoffAddress,
      totalAmount: data.totalAmount,
      riderEarnings: data.riderEarnings,
      merchantId: data.merchantId,
      healthOrderId: data.healthOrderId,
      prescriptionId: data.prescriptionId,
      createdAt: new Date(),
      matchingStartedAt: new Date(),
      offeredTo: [],
      currentRadius: config.defaultSearchRadiusKm,
      searchAttempts: 0,
    };

    pendingTasks.set(data.taskId, task);
    dispatchAttempts.set(data.taskId, []);

    socket.join(`client:${data.clientId}`);

    // Start matching
    matchTaskToProviders(task);

    socket.emit('task:create:ack', {
      success: true,
      taskId: data.taskId,
      message: 'Searching for available providers...',
    });

    logDispatch(
      'TASK_CREATED',
      'TASK',
      data.taskId,
      `Task ${data.taskNumber} created for ${data.taskType}`,
      data.taskId,
      { taskType: data.taskType, clientId: data.clientId }
    );
  });

  /**
   * Client cancels task
   */
  socket.on('task:cancel', (data: { taskId: string; clientId: string; reason: string }) => {
    console.log(`Task ${data.taskId} cancelled by client`);

    const task = pendingTasks.get(data.taskId);
    if (task) {
      clearTaskTimers(data.taskId);

      // Notify riders
      task.offeredTo.forEach((riderId) => {
        io.to(`rider:${riderId}`).emit('task:cancelled', { taskId: data.taskId });
      });

      pendingTasks.delete(data.taskId);
      dispatchAttempts.delete(data.taskId);

      logDispatch(
        'TASK_CANCELLED',
        'TASK',
        data.taskId,
        `Task cancelled: ${data.reason}`,
        data.taskId,
        { reason: data.reason }
      );
    }

    socket.emit('task:cancel:ack', { success: true });
  });

  /**
   * Client tracks rider location
   */
  socket.on('track:rider', (data: { riderId: string }) => {
    socket.join(`tracking:rider:${data.riderId}`);

    const rider = riders.get(data.riderId);
    if (rider && rider.location) {
      socket.emit('rider:location', {
        riderId: data.riderId,
        location: rider.location,
      });
    }
  });

  // ================== ADMIN EVENTS ==================

  /**
   * Admin joins for monitoring
   */
  socket.on('admin:join', () => {
    socket.join('admin');
    console.log('Admin joined monitoring');
  });

  /**
   * Get system stats
   */
  socket.on('admin:stats', () => {
    const onlineRiders = Array.from(riders.values()).filter((r) => r.isOnline);
    const availableRiders = onlineRiders.filter((r) => r.isAvailable && !r.currentTaskId);

    socket.emit('admin:stats', {
      totalRiders: riders.size,
      onlineRiders: onlineRiders.length,
      availableRiders: availableRiders.length,
      pendingTasks: pendingTasks.size,
      byRole: {
        SMART_BODA_RIDER: onlineRiders.filter((r) => r.role === 'SMART_BODA_RIDER').length,
        SMART_CAR_DRIVER: onlineRiders.filter((r) => r.role === 'SMART_CAR_DRIVER').length,
        DELIVERY_PERSONNEL: onlineRiders.filter((r) => r.role === 'DELIVERY_PERSONNEL').length,
      },
      surgeMultiplier: calculateSurgeMultiplier(availableRiders.length, pendingTasks.size),
    });
  });

  /**
   * Get dispatch logs
   */
  socket.on('admin:logs', (data: { limit?: number }) => {
    const limit = data.limit || 100;
    socket.emit('admin:logs', dispatchLogs.slice(-limit));
  });

  /**
   * Admin flags/unflags rider for safety
   */
  socket.on('admin:flag-rider', (data: { riderId: string; flag: boolean; reason?: string }) => {
    const rider = riders.get(data.riderId);
    if (rider) {
      rider.isFlagged = data.flag;
      rider.flagReason = data.flag ? data.reason : undefined;

      logDispatch(
        data.flag ? 'RIDER_FLAGGED' : 'RIDER_UNFLAGGED',
        'PROVIDER',
        data.riderId,
        `Rider ${data.flag ? 'flagged' : 'unflagged'}: ${data.reason || 'Admin action'}`,
        undefined,
        { reason: data.reason }
      );

      socket.emit('admin:flag-rider:ack', { success: true });
    }
  });

  /**
   * Admin updates rider safety/fraud scores
   */
  socket.on('admin:update-safety', (data: {
    riderId: string;
    safetyScore?: number;
    fraudRiskScore?: number;
  }) => {
    if (data.safetyScore !== undefined) {
      updateProviderSafetyScore(data.riderId, data.safetyScore);
    }
    if (data.fraudRiskScore !== undefined) {
      updateProviderFraudRisk(data.riderId, data.fraudRiskScore);
    }

    logDispatch(
      'SAFETY_SCORE_UPDATED',
      'PROVIDER',
      data.riderId,
      'Safety/Fraud scores updated',
      undefined,
      data
    );

    socket.emit('admin:update-safety:ack', { success: true });
  });

  // ================== HEALTH PROVIDER EVENTS ==================

  /**
   * Health provider comes online
   */
  socket.on('health-provider:online', (data: {
    providerId: string;
    name: string;
    type: 'PHARMACY' | 'DRUG_SHOP' | 'CLINIC' | 'PRIVATE_DOCTOR';
    latitude: number;
    longitude: number;
    supportsPrescription?: boolean;
    supportsOTC?: boolean;
    supportsConsultation?: boolean;
  }) => {
    console.log(`Health provider online: ${data.name} (${data.type})`);

    healthProviders.set(data.providerId, {
      id: data.providerId,
      socketId: socket.id,
      name: data.name,
      type: data.type,
      location: { latitude: data.latitude, longitude: data.longitude },
      isOpen: true,
      isAvailable: true,
      currentOrderId: null,
      rating: 5.0,
      totalOrders: 0,
      supportsPrescription: data.supportsPrescription ?? true,
      supportsOTC: data.supportsOTC ?? true,
      supportsConsultation: data.supportsConsultation ?? false,
    });

    socket.join(`provider:${data.providerId}`);
    socket.emit('health-provider:online:ack', { success: true });

    logDispatch(
      'HEALTH_PROVIDER_ONLINE',
      'PROVIDER',
      data.providerId,
      `Health provider ${data.name} is now online`,
      undefined,
      { type: data.type }
    );
  });

  // ================== DISCONNECT ==================

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Find and update rider status
    for (const [riderId, rider] of riders) {
      if (rider.socketId === socket.id) {
        rider.isOnline = false;
        rider.isAvailable = false;
        io.emit('rider:status', { riderId, isOnline: false });

        logDispatch('RIDER_DISCONNECTED', 'PROVIDER', riderId, 'Rider disconnected');
        break;
      }
    }

    // Check health providers
    for (const [providerId, provider] of healthProviders) {
      if (provider.socketId === socket.id) {
        provider.isOpen = false;
        provider.isAvailable = false;

        logDispatch('HEALTH_PROVIDER_DISCONNECTED', 'PROVIDER', providerId, 'Health provider disconnected');
        break;
      }
    }
  });
});

// Export for testing
export { io, riders, pendingTasks, dispatchLogs };
