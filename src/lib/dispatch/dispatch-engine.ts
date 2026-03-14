// Smart Ride Dispatch Engine
// Core dispatch logic for matching requests to providers

import {
  DispatchRequest,
  DispatchResult,
  DispatchAttempt,
  DispatchStatus,
  DispatchConfig,
  DEFAULT_DISPATCH_CONFIG,
  Provider,
  ProviderScore,
  ServiceType,
  ProviderType,
  SERVICE_TO_PROVIDER_MAP,
  DispatchLog,
} from './types';
import {
  scoreAndRankProviders,
  getTopProviders,
  calculateDistance,
} from './scoring-engine';

// ============================================
// IN-MEMORY STORES (Use Redis in Production)
// ============================================

const pendingRequests = new Map<string, DispatchRequest>();
const activeDispatches = new Map<string, DispatchResult>();
const providerRegistry = new Map<string, Provider>();
const dispatchAttempts = new Map<string, DispatchAttempt[]>();
const dispatchLogs: DispatchLog[] = [];

// Timer management
const dispatchTimers = new Map<string, NodeJS.Timeout>();
const offerTimers = new Map<string, Map<string, NodeJS.Timeout>>();

// ============================================
// PROVIDER REGISTRY MANAGEMENT
// ============================================

export function registerProvider(provider: Provider): void {
  providerRegistry.set(provider.id, provider);
  logDispatch('PROVIDER_REGISTERED', 'PROVIDER', provider.id, `Provider ${provider.name} registered`);
}

export function unregisterProvider(providerId: string): void {
  providerRegistry.delete(providerId);
  logDispatch('PROVIDER_UNREGISTERED', 'PROVIDER', providerId, `Provider ${providerId} unregistered`);
}

export function updateProviderLocation(
  providerId: string,
  latitude: number,
  longitude: number
): void {
  const provider = providerRegistry.get(providerId);
  if (provider) {
    provider.location = {
      latitude,
      longitude,
      lastUpdated: new Date(),
    };
  }
}

export function updateProviderStatus(
  providerId: string,
  isOnline: boolean,
  isAvailable: boolean,
  currentTaskId?: string
): void {
  const provider = providerRegistry.get(providerId);
  if (provider) {
    provider.isOnline = isOnline;
    provider.isAvailable = isAvailable;
    provider.currentTaskId = currentTaskId;
  }
}

export function getProvider(providerId: string): Provider | undefined {
  return providerRegistry.get(providerId);
}

export function getAllProviders(): Provider[] {
  return Array.from(providerRegistry.values());
}

export function getOnlineProviders(): Provider[] {
  return Array.from(providerRegistry.values()).filter((p) => p.isOnline);
}

export function getAvailableProviders(): Provider[] {
  return Array.from(providerRegistry.values()).filter(
    (p) => p.isOnline && p.isAvailable
  );
}

// ============================================
// DISPATCH LOGGING
// ============================================

function logDispatch(
  action: string,
  entityType: 'DISPATCH' | 'PROVIDER' | 'TASK' | 'NOTIFICATION',
  entityId: string,
  description: string,
  requestId?: string,
  metadata?: Record<string, unknown>
): void {
  const log: DispatchLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requestId: requestId || 'system',
    action,
    entityType,
    entityId,
    description,
    metadata,
    createdAt: new Date(),
  };
  dispatchLogs.push(log);
}

export function getDispatchLogs(requestId?: string): DispatchLog[] {
  if (requestId) {
    return dispatchLogs.filter((log) => log.requestId === requestId);
  }
  return dispatchLogs;
}

// ============================================
// DISPATCH ENGINE CORE
// ============================================

/**
 * Create a new dispatch request
 */
export function createDispatchRequest(
  request: DispatchRequest
): DispatchResult {
  pendingRequests.set(request.id, request);

  const result: DispatchResult = {
    requestId: request.id,
    status: 'SEARCHING',
    allAttempts: [],
    totalProvidersFound: 0,
    searchDuration: 0,
    matchingStartedAt: new Date(),
  };

  activeDispatches.set(request.id, result);
  dispatchAttempts.set(request.id, []);

  logDispatch(
    'REQUEST_CREATED',
    'DISPATCH',
    request.id,
    `Dispatch request created for ${request.serviceType}`,
    request.id,
    { serviceType: request.serviceType, userId: request.userId }
  );

  return result;
}

/**
 * Get required provider types for a service
 */
function getRequiredProviderTypes(serviceType: ServiceType): ProviderType[] {
  return SERVICE_TO_PROVIDER_MAP[serviceType] || [];
}

/**
 * Find matching providers for a request
 */
export function findMatchingProviders(
  request: DispatchRequest,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG
): ProviderScore[] {
  const requiredTypes = getRequiredProviderTypes(request.serviceType);

  // Filter providers by type and location
  const matchingProviders = Array.from(providerRegistry.values()).filter(
    (provider) => {
      // Check if provider type matches
      if (!requiredTypes.includes(provider.type)) {
        return false;
      }

      // Check if provider is online and available
      if (!provider.isOnline || !provider.isAvailable) {
        return false;
      }

      // Check if provider has the required capabilities
      if (!provider.capabilities.includes(request.serviceType)) {
        return false;
      }

      return true;
    }
  );

  // Score and rank providers
  const rankedProviders = scoreAndRankProviders(
    matchingProviders,
    request.pickupLocation,
    config
  );

  logDispatch(
    'PROVIDERS_FOUND',
    'DISPATCH',
    request.id,
    `Found ${rankedProviders.length} matching providers`,
    request.id,
    { providerCount: rankedProviders.length, requiredTypes }
  );

  return rankedProviders;
}

/**
 * Start the dispatch process for a request
 */
export function startDispatch(
  request: DispatchRequest,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG,
  onOfferSent?: (providerId: string, offer: DispatchAttempt) => void,
  onCompleted?: (result: DispatchResult) => void
): DispatchResult {
  const result = createDispatchRequest(request);
  const startTime = Date.now();

  // Find matching providers
  const rankedProviders = findMatchingProviders(request, config);
  result.totalProvidersFound = rankedProviders.length;

  if (rankedProviders.length === 0) {
    result.status = 'NO_PROVIDERS';
    result.searchDuration = Date.now() - startTime;
    result.completedAt = new Date();

    logDispatch(
      'DISPATCH_FAILED',
      'DISPATCH',
      request.id,
      'No providers found for request',
      request.id,
      { reason: 'NO_PROVIDERS' }
    );

    if (onCompleted) onCompleted(result);
    return result;
  }

  result.status = 'PROVIDERS_FOUND';

  // Get top N providers to offer simultaneously
  const topProviders = getTopProviders(rankedProviders, config.maxConcurrentOffers);

  // Create offers for top providers
  const attempts: DispatchAttempt[] = topProviders.map((score, index) => ({
    id: `attempt_${request.id}_${score.providerId}`,
    requestId: request.id,
    providerId: score.providerId,
    status: 'OFFER_SENT' as DispatchStatus,
    offeredAt: new Date(),
    score: score.totalScore,
    rank: index + 1,
  }));

  dispatchAttempts.set(request.id, attempts);
  result.allAttempts = attempts;
  result.status = 'OFFER_SENT';

  // Set up offer timers for each provider
  const timers = new Map<string, NodeJS.Timeout>();
  offerTimers.set(request.id, timers);

  attempts.forEach((attempt) => {
    const timer = setTimeout(() => {
      handleOfferTimeout(request.id, attempt.providerId, config, onCompleted);
    }, config.offerTimeoutMs);

    timers.set(attempt.providerId, timer);

    // Notify provider (via callback)
    if (onOfferSent) {
      onOfferSent(attempt.providerId, attempt);
    }

    logDispatch(
      'OFFER_SENT',
      'NOTIFICATION',
      attempt.providerId,
      `Task offer sent to provider`,
      request.id,
      { score: attempt.score, rank: attempt.rank }
    );
  });

  // Set up overall matching timeout
  const matchingTimer = setTimeout(() => {
    handleMatchingTimeout(request.id, onCompleted);
  }, config.matchingTimeoutMs);

  dispatchTimers.set(request.id, matchingTimer);

  return result;
}

/**
 * Handle provider accepting an offer
 */
export function handleOfferAccepted(
  requestId: string,
  providerId: string,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG,
  onCompleted?: (result: DispatchResult) => void
): DispatchResult | null {
  const result = activeDispatches.get(requestId);
  const attempts = dispatchAttempts.get(requestId);

  if (!result || !attempts) return null;

  const attempt = attempts.find((a) => a.providerId === providerId);
  if (!attempt) return null;

  // Update attempt status
  attempt.status = 'ACCEPTED';
  attempt.respondedAt = new Date();
  attempt.responseTime = Math.floor(
    (attempt.respondedAt.getTime() - attempt.offeredAt.getTime()) / 1000
  );

  // Clear all timers
  clearAllTimers(requestId);

  // Reject other pending offers
  attempts.forEach((a) => {
    if (a.providerId !== providerId && a.status === 'OFFER_SENT') {
      a.status = 'REJECTED';
      a.rejectionReason = 'OTHER_PROVIDER_ACCEPTED';
    }
  });

  // Update result
  const provider = providerRegistry.get(providerId);
  result.status = 'ACCEPTED';
  result.selectedProvider = provider;
  result.allAttempts = attempts;
  result.completedAt = new Date();
  result.searchDuration =
    result.completedAt.getTime() - result.matchingStartedAt.getTime();

  // Update provider status
  if (provider) {
    provider.isAvailable = false;
    provider.currentTaskId = requestId;
  }

  // Remove from pending
  pendingRequests.delete(requestId);

  logDispatch(
    'OFFER_ACCEPTED',
    'PROVIDER',
    providerId,
    `Provider accepted task`,
    requestId,
    { responseTime: attempt.responseTime }
  );

  if (onCompleted) onCompleted(result);

  return result;
}

/**
 * Handle provider rejecting an offer
 */
export function handleOfferRejected(
  requestId: string,
  providerId: string,
  reason?: string,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG,
  onOfferSent?: (providerId: string, offer: DispatchAttempt) => void,
  onCompleted?: (result: DispatchResult) => void
): DispatchResult | null {
  const result = activeDispatches.get(requestId);
  const attempts = dispatchAttempts.get(requestId);
  const request = pendingRequests.get(requestId);

  if (!result || !attempts || !request) return null;

  const attempt = attempts.find((a) => a.providerId === providerId);
  if (!attempt) return null;

  // Update attempt status
  attempt.status = 'REJECTED';
  attempt.respondedAt = new Date();
  attempt.responseTime = Math.floor(
    (attempt.respondedAt.getTime() - attempt.offeredAt.getTime()) / 1000
  );
  attempt.rejectionReason = reason || 'PROVIDER_DECLINED';

  // Clear this provider's timer
  const timers = offerTimers.get(requestId);
  if (timers) {
    const timer = timers.get(providerId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(providerId);
    }
  }

  logDispatch(
    'OFFER_REJECTED',
    'PROVIDER',
    providerId,
    `Provider rejected task`,
    requestId,
    { reason: attempt.rejectionReason, responseTime: attempt.responseTime }
  );

  // Check if all offers are rejected
  const allRejected = attempts.every(
    (a) => a.status === 'REJECTED' || a.status === 'TIMED_OUT'
  );

  if (allRejected) {
    // Find next providers to offer
    const rankedProviders = findMatchingProviders(request, config);

    // Exclude already contacted providers
    const contactedIds = new Set(attempts.map((a) => a.providerId));
    const nextProviders = rankedProviders.filter(
      (p) => !contactedIds.has(p.providerId)
    );

    if (nextProviders.length > 0 && attempts.length < config.maxDispatchAttempts * config.maxConcurrentOffers) {
      // Send offers to next batch
      const nextBatch = getTopProviders(nextProviders, config.maxConcurrentOffers);

      nextBatch.forEach((score, index) => {
        const newAttempt: DispatchAttempt = {
          id: `attempt_${requestId}_${score.providerId}`,
          requestId,
          providerId: score.providerId,
          status: 'OFFER_SENT',
          offeredAt: new Date(),
          score: score.totalScore,
          rank: attempts.length + index + 1,
        };

        attempts.push(newAttempt);

        // Set up timer
        const timer = setTimeout(() => {
          handleOfferTimeout(requestId, score.providerId, config, onCompleted);
        }, config.offerTimeoutMs);

        if (!offerTimers.has(requestId)) {
          offerTimers.set(requestId, new Map());
        }
        offerTimers.get(requestId)!.set(score.providerId, timer);

        if (onOfferSent) {
          onOfferSent(score.providerId, newAttempt);
        }

        logDispatch(
          'OFFER_SENT',
          'NOTIFICATION',
          score.providerId,
          `Task offer sent to next provider`,
          requestId,
          { score: score.totalScore, rank: newAttempt.rank }
        );
      });

      result.allAttempts = attempts;
    } else {
      // No more providers available
      result.status = 'NO_PROVIDERS';
      result.completedAt = new Date();
      result.searchDuration =
        result.completedAt.getTime() - result.matchingStartedAt.getTime();
      result.allAttempts = attempts;

      clearAllTimers(requestId);
      pendingRequests.delete(requestId);

      logDispatch(
        'DISPATCH_FAILED',
        'DISPATCH',
        requestId,
        'No providers available after all attempts',
        requestId,
        { totalAttempts: attempts.length }
      );

      if (onCompleted) onCompleted(result);
    }
  }

  return result;
}

/**
 * Handle offer timeout (provider didn't respond)
 */
function handleOfferTimeout(
  requestId: string,
  providerId: string,
  config: DispatchConfig,
  onCompleted?: (result: DispatchResult) => void
): void {
  const result = activeDispatches.get(requestId);
  const attempts = dispatchAttempts.get(requestId);

  if (!result || !attempts) return;

  const attempt = attempts.find((a) => a.providerId === providerId);
  if (!attempt || attempt.status !== 'OFFER_SENT') return;

  // Update attempt status
  attempt.status = 'TIMED_OUT';
  attempt.respondedAt = new Date();
  attempt.responseTime = Math.floor(
    (attempt.respondedAt.getTime() - attempt.offeredAt.getTime()) / 1000
  );
  attempt.rejectionReason = 'TIMEOUT';

  logDispatch(
    'OFFER_TIMEOUT',
    'PROVIDER',
    providerId,
    `Provider did not respond within timeout`,
    requestId
  );

  // Treat as rejection and try next providers
  handleOfferRejected(requestId, providerId, 'TIMEOUT', config, undefined, onCompleted);
}

/**
 * Handle overall matching timeout
 */
function handleMatchingTimeout(
  requestId: string,
  onCompleted?: (result: DispatchResult) => void
): void {
  const result = activeDispatches.get(requestId);

  if (!result || result.status === 'ACCEPTED') return;

  result.status = 'TIMED_OUT';
  result.completedAt = new Date();
  result.searchDuration =
    result.completedAt.getTime() - result.matchingStartedAt.getTime();

  clearAllTimers(requestId);
  pendingRequests.delete(requestId);

  logDispatch(
    'DISPATCH_TIMEOUT',
    'DISPATCH',
    requestId,
    'Dispatch matching timed out',
    requestId,
    { totalAttempts: result.allAttempts.length }
  );

  if (onCompleted) onCompleted(result);
}

/**
 * Clear all timers for a dispatch
 */
function clearAllTimers(requestId: string): void {
  // Clear matching timer
  const matchingTimer = dispatchTimers.get(requestId);
  if (matchingTimer) {
    clearTimeout(matchingTimer);
    dispatchTimers.delete(requestId);
  }

  // Clear offer timers
  const timers = offerTimers.get(requestId);
  if (timers) {
    timers.forEach((timer) => clearTimeout(timer));
    offerTimers.delete(requestId);
  }
}

/**
 * Cancel a dispatch
 */
export function cancelDispatch(
  requestId: string,
  reason: string
): DispatchResult | null {
  const result = activeDispatches.get(requestId);

  if (!result) return null;

  result.status = 'CANCELLED';
  result.completedAt = new Date();
  result.searchDuration =
    result.completedAt.getTime() - result.matchingStartedAt.getTime();

  clearAllTimers(requestId);
  pendingRequests.delete(requestId);

  logDispatch(
    'DISPATCH_CANCELLED',
    'DISPATCH',
    requestId,
    `Dispatch cancelled: ${reason}`,
    requestId,
    { reason }
  );

  return result;
}

/**
 * Get dispatch result
 */
export function getDispatchResult(requestId: string): DispatchResult | undefined {
  return activeDispatches.get(requestId);
}

/**
 * Get pending requests
 */
export function getPendingRequests(): DispatchRequest[] {
  return Array.from(pendingRequests.values());
}

/**
 * Complete a task (provider finished)
 */
export function completeTask(providerId: string, taskId: string): void {
  const provider = providerRegistry.get(providerId);
  if (provider && provider.currentTaskId === taskId) {
    provider.currentTaskId = undefined;
    provider.isAvailable = true;
    provider.metrics.completedJobs += 1;
    provider.metrics.totalJobs += 1;

    logDispatch(
      'TASK_COMPLETED',
      'PROVIDER',
      providerId,
      `Task completed`,
      taskId
    );
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  pendingRequests,
  activeDispatches,
  providerRegistry,
  dispatchAttempts,
};
