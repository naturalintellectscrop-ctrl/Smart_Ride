// Smart Ride Dispatch Scoring Engine
// Ranks providers using multi-factor scoring algorithm

import {
  Provider,
  ProviderScore,
  Location,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  DispatchConfig,
  DEFAULT_DISPATCH_CONFIG,
} from './types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
      Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * Calculate distance score (inverse - closer is better)
 * Score decreases as distance increases
 */
function calculateDistanceScore(
  distanceKm: number,
  maxDistance: number = 20
): number {
  // Score from 100 (at 0 km) to 0 (at maxDistance km)
  if (distanceKm >= maxDistance) return 0;
  return Math.max(0, 100 * (1 - distanceKm / maxDistance));
}

/**
 * Calculate rating score from 1-5 rating to 0-100 scale
 */
function calculateRatingScore(rating: number): number {
  // Rating is typically 1-5
  return (rating / 5) * 100;
}

/**
 * Calculate acceptance rate score
 */
function calculateAcceptanceScore(acceptanceRate: number): number {
  // acceptanceRate is 0-100
  return acceptanceRate;
}

/**
 * Calculate completion rate score
 */
function calculateCompletionScore(completionRate: number): number {
  // completionRate is 0-100
  return completionRate;
}

/**
 * Calculate reliability score
 */
function calculateReliabilityScore(reliabilityScore: number): number {
  // reliabilityScore is 0-100
  return reliabilityScore;
}

/**
 * Calculate safety score
 */
function calculateSafetyScore(safetyScore: number): number {
  // safetyScore is 0-100
  return safetyScore;
}

/**
 * Calculate fraud risk penalty (inverse - higher risk = more penalty)
 */
function calculateFraudPenalty(fraudRiskScore: number): number {
  // fraudRiskScore is 0-100, higher = more risky
  // Return a penalty that subtracts from the total score
  return fraudRiskScore;
}

/**
 * Calculate response time score (inverse - faster is better)
 */
function calculateResponseTimeScore(
  averageResponseTime: number,
  maxResponseTime: number = 60
): number {
  // averageResponseTime in seconds
  if (averageResponseTime >= maxResponseTime) return 0;
  return 100 * (1 - averageResponseTime / maxResponseTime);
}

/**
 * Score a single provider for a dispatch request
 */
export function scoreProvider(
  provider: Provider,
  pickupLocation: Location,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ProviderScore {
  const { metrics, safety, location } = provider;

  // Calculate distance
  const distance = calculateDistance(
    { latitude: location.latitude, longitude: location.longitude },
    pickupLocation
  );

  // Calculate individual scores
  const distanceScore = calculateDistanceScore(distance, config.maxSearchRadiusKm);
  const ratingScore = calculateRatingScore(metrics.rating);
  const acceptanceScore = calculateAcceptanceScore(metrics.acceptanceRate);
  const completionScore = calculateCompletionScore(metrics.completionRate);
  const reliabilityScore = calculateReliabilityScore(metrics.reliabilityScore);
  const safetyScore = calculateSafetyScore(safety.safetyScore);
  const fraudPenalty = calculateFraudPenalty(safety.fraudRiskScore);
  const responseTimeScore = calculateResponseTimeScore(metrics.averageResponseTime);

  // Calculate weighted total score
  const totalScore =
    distanceScore * weights.distance +
    ratingScore * weights.rating +
    acceptanceScore * weights.acceptanceRate +
    completionScore * weights.completionRate +
    reliabilityScore * weights.reliability +
    safetyScore * weights.safety -
    fraudPenalty * weights.fraudRisk +
    responseTimeScore * weights.responseTime;

  return {
    providerId: provider.id,
    totalScore: Math.max(0, Math.min(100, totalScore)),
    breakdown: {
      distanceScore,
      ratingScore,
      acceptanceScore,
      completionScore,
      reliabilityScore,
      safetyScore,
      fraudPenalty,
      responseTimeScore,
    },
    distance,
    rank: 0, // Will be set after sorting
  };
}

/**
 * Rank providers by their scores
 */
export function rankProviders(
  scores: ProviderScore[]
): ProviderScore[] {
  // Sort by total score descending
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  sorted.forEach((score, index) => {
    score.rank = index + 1;
  });

  return sorted;
}

/**
 * Filter providers based on eligibility criteria
 */
export function filterEligibleProviders(
  providers: Provider[],
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG
): Provider[] {
  return providers.filter((provider) => {
    // Must be online
    if (!provider.isOnline) return false;

    // Must be available (not on another task)
    if (!provider.isAvailable) return false;

    // Safety checks
    if (config.excludeFlaggedProviders && provider.safety.isFlagged) {
      return false;
    }

    if (provider.safety.safetyScore < config.safetyScoreThreshold) {
      return false;
    }

    if (provider.safety.fraudRiskScore > config.maxFraudRiskScore) {
      return false;
    }

    return true;
  });
}

/**
 * Find nearby providers within search radius
 */
export function findNearbyProviders(
  providers: Provider[],
  location: Location,
  radiusKm: number
): Provider[] {
  return providers.filter((provider) => {
    if (!provider.location.latitude || !provider.location.longitude) {
      return false;
    }

    const distance = calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: provider.location.latitude, longitude: provider.location.longitude }
    );

    return distance <= radiusKm;
  });
}

/**
 * Score and rank all eligible providers for a dispatch request
 */
export function scoreAndRankProviders(
  providers: Provider[],
  pickupLocation: Location,
  config: DispatchConfig = DEFAULT_DISPATCH_CONFIG,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ProviderScore[] {
  // Filter eligible providers
  const eligibleProviders = filterEligibleProviders(providers, config);

  // Find nearby providers
  const nearbyProviders = findNearbyProviders(
    eligibleProviders,
    pickupLocation,
    config.defaultSearchRadiusKm
  );

  // Score each provider
  const scores = nearbyProviders.map((provider) =>
    scoreProvider(provider, pickupLocation, config, weights)
  );

  // Filter by minimum score threshold
  const qualifiedScores = scores.filter(
    (score) => score.totalScore >= config.minimumScoreThreshold
  );

  // Rank providers
  return rankProviders(qualifiedScores);
}

/**
 * Get top N providers from ranked list
 */
export function getTopProviders(
  rankedScores: ProviderScore[],
  count: number
): ProviderScore[] {
  return rankedScores.slice(0, count);
}

/**
 * Calculate estimated arrival time based on distance
 */
export function estimateArrivalTime(
  distanceKm: number,
  vehicleType?: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER'
): number {
  // Average speeds in km/h
  const speeds: Record<string, number> = {
    BODA: 40, // Motorcycle in traffic
    CAR: 30, // Car in traffic
    BICYCLE: 15, // Bicycle
    SCOOTER: 25, // Scooter
  };

  const speed = vehicleType ? speeds[vehicleType] || 30 : 30;
  const timeHours = distanceKm / speed;
  return Math.ceil(timeHours * 60); // Return minutes
}

/**
 * Surge pricing multiplier based on demand/supply ratio
 */
export function calculateSurgeMultiplier(
  availableProviders: number,
  pendingRequests: number
): number {
  if (availableProviders === 0) return 2.0; // Max surge

  const ratio = pendingRequests / availableProviders;

  if (ratio <= 0.5) return 1.0; // No surge
  if (ratio <= 1) return 1.2;
  if (ratio <= 1.5) return 1.5;
  if (ratio <= 2) return 1.8;
  return 2.0; // Max surge
}
