// Smart Ride Pricing Engine API
// REST endpoints for fare calculation and configuration

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateFare,
  estimateFare,
  getPricingConfig,
  updatePricingConfig,
  updateRideTypePricing,
  updateZoneSurge,
  getSurgeStatus,
  getDemandHistory,
  formatFare,
} from '@/lib/pricing/pricing-engine';
import {
  PricingInput,
  RideType,
  TrafficCondition,
  WeatherCondition,
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
} from '@/lib/pricing/types';

// GET /api/pricing - Get pricing information
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'config':
      return getConfig();

    case 'surge':
      return getSurge();

    case 'history':
      const zoneId = searchParams.get('zoneId');
      return getHistory(zoneId);

    case 'estimate':
      return getEstimate(searchParams);

    case 'ride-types':
      return getRideTypes();

    default:
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Pricing Engine API',
        endpoints: [
          'GET /api/pricing?action=config - Get pricing configuration',
          'GET /api/pricing?action=surge - Get surge status',
          'GET /api/pricing?action=history&zoneId=xxx - Get demand history',
          'GET /api/pricing?action=estimate - Quick fare estimate',
          'GET /api/pricing?action=ride-types - Get available ride types',
          'POST /api/pricing?action=calculate - Calculate fare',
          'POST /api/pricing?action=config - Update configuration',
          'POST /api/pricing?action=surge - Update zone surge',
        ],
      });
  }
}

// POST /api/pricing - Calculate fare or update configuration
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'calculate':
        return handleCalculateFare(body);

      case 'config':
        return handleUpdateConfig(body);

      case 'ride-type':
        return handleUpdateRideType(body);

      case 'surge':
        return handleUpdateSurge(body);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

function getConfig() {
  const config = getPricingConfig();
  
  return NextResponse.json({
    success: true,
    data: config,
  });
}

function getSurge() {
  const status = getSurgeStatus();
  
  return NextResponse.json({
    success: true,
    data: status,
  });
}

function getHistory(zoneId: string | null) {
  if (!zoneId) {
    return NextResponse.json(
      { success: false, error: 'zoneId is required' },
      { status: 400 }
    );
  }

  const history = getDemandHistory(zoneId);
  
  return NextResponse.json({
    success: true,
    data: history,
    count: history.length,
  });
}

function getEstimate(searchParams: URLSearchParams) {
  const distanceKm = parseFloat(searchParams.get('distanceKm') || '0');
  const timeMinutes = parseInt(searchParams.get('timeMinutes') || '0');
  const rideType = (searchParams.get('rideType') || 'STANDARD') as RideType;
  const zoneId = searchParams.get('zoneId') || undefined;

  if (!distanceKm || !timeMinutes) {
    return NextResponse.json(
      { success: false, error: 'distanceKm and timeMinutes are required' },
      { status: 400 }
    );
  }

  const estimate = estimateFare(distanceKm, timeMinutes, rideType, zoneId);
  const config = getPricingConfig();
  const ridePricing = config.rideTypePricing[rideType];

  return NextResponse.json({
    success: true,
    data: {
      estimatedFare: estimate,
      formatted: formatFare(estimate),
      currency: config.currency,
      rideType,
      distanceKm,
      timeMinutes,
      minimumFare: ridePricing.minimumFare,
      baseFare: ridePricing.baseFare,
    },
  });
}

function getRideTypes() {
  const config = getPricingConfig();
  const rideTypes = Object.entries(config.rideTypePricing).map(([type, pricing]) => ({
    rideType: type as RideType,
    baseFare: pricing.baseFare,
    perKmRate: pricing.perKilometerRate,
    perMinRate: pricing.perMinuteRate,
    minimumFare: pricing.minimumFare,
    maxPassengers: pricing.maxPassengers,
    isActive: pricing.isActive,
  }));

  return NextResponse.json({
    success: true,
    data: rideTypes,
    count: rideTypes.length,
  });
}

async function handleCalculateFare(data: PricingInput) {
  // Validate required fields
  if (!data.estimatedDistanceKm || !data.estimatedTimeMinutes) {
    return NextResponse.json(
      { success: false, error: 'estimatedDistanceKm and estimatedTimeMinutes are required' },
      { status: 400 }
    );
  }

  // Set defaults for optional fields
  const input: PricingInput = {
    ...data,
    rideType: data.rideType || 'STANDARD',
    trafficCondition: data.trafficCondition || 'MODERATE',
    weatherCondition: data.weatherCondition || 'CLEAR',
    currentDemandLevel: data.currentDemandLevel || 0,
    availableDriversNearby: data.availableDriversNearby || 1,
    timeOfDay: data.timeOfDay ? new Date(data.timeOfDay) : new Date(),
    dayOfWeek: data.dayOfWeek ?? new Date().getDay(),
    isHoliday: data.isHoliday || false,
  };

  const result = calculateFare(input);

  return NextResponse.json({
    success: true,
    data: result,
    formatted: {
      finalFare: formatFare(result.fareBreakdown.finalFare),
      currency: result.fareBreakdown.currency,
    },
  });
}

async function handleUpdateConfig(data: Partial<PricingConfig>) {
  const updated = updatePricingConfig(data);

  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Pricing configuration updated',
  });
}

async function handleUpdateRideType(data: {
  rideType: RideType;
  pricing: Partial<typeof DEFAULT_PRICING_CONFIG.rideTypePricing[RideType]>;
}) {
  const { rideType, pricing } = data;

  if (!rideType || !pricing) {
    return NextResponse.json(
      { success: false, error: 'rideType and pricing are required' },
      { status: 400 }
    );
  }

  updateRideTypePricing(rideType, pricing);

  return NextResponse.json({
    success: true,
    message: `Pricing updated for ${rideType}`,
  });
}

async function handleUpdateSurge(data: {
  zoneId: string;
  zoneName: string;
  rideRequests: number;
  availableDrivers: number;
}) {
  const { zoneId, zoneName, rideRequests, availableDrivers } = data;

  if (!zoneId) {
    return NextResponse.json(
      { success: false, error: 'zoneId is required' },
      { status: 400 }
    );
  }

  const zoneConfig = updateZoneSurge(
    zoneId,
    zoneName || zoneId,
    rideRequests || 0,
    availableDrivers || 0
  );

  return NextResponse.json({
    success: true,
    data: zoneConfig,
    message: 'Zone surge updated',
  });
}
