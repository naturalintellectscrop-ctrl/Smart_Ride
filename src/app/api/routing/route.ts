/**
 * Smart Ride Routing API
 * REST endpoints for route calculation and fare estimation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateRoute,
  calculateDistance,
  calculateTravelTime,
  geocodeAddress,
  reverseGeocode,
  searchPlaces,
  formatDistance,
  formatDuration,
  getAllVehicleSpeeds,
  VehicleType,
  Coordinate,
  RouteResult,
} from '@/lib/services/routing-service';
import {
  calculateFare,
  calculateAllFares,
  calculateFareWithSurge,
  getSurgeInfo,
  getAllVehicleMultipliers,
  formatFare,
  FareBreakdown,
} from '@/lib/services/pricing-engine';

// ============================================
// Types
// ============================================

interface RouteRequest {
  pickup: Coordinate | string;
  destination: Coordinate | string;
  vehicleType?: VehicleType;
  trafficFactor?: number;
  demandRatio?: number;
}

interface RouteResponse {
  success: boolean;
  data?: {
    distance: number;
    distanceFormatted: string;
    duration: number;
    durationFormatted: string;
    geometry: string;
    boundingBox: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
    pickup: Coordinate;
    destination: Coordinate;
    pickupAddress?: string;
    destinationAddress?: string;
    baseFareEstimate: FareBreakdown;
    fareEstimates?: Record<VehicleType, {
      minFare: number;
      maxFare: number;
      breakdown: FareBreakdown;
    }>;
    surgeInfo?: {
      multiplier: number;
      reason: string;
    };
  };
  error?: string;
}

// ============================================
// GET /api/routing - API Info & Geocoding
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'geocode':
      // Geocode an address to coordinates
      return handleGeocode(searchParams.get('address'));

    case 'reverse-geocode':
      // Reverse geocode coordinates to address
      return handleReverseGeocode(
        searchParams.get('lat'),
        searchParams.get('lng')
      );

    case 'search':
      // Search for places
      return handleSearchPlaces(
        searchParams.get('query'),
        searchParams.get('limit')
      );

    case 'vehicle-speeds':
      // Get vehicle speed configuration
      return handleGetVehicleSpeeds();

    case 'pricing-config':
      // Get pricing configuration
      return handleGetPricingConfig();

    default:
      // Return API info
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Routing API',
        endpoints: [
          'POST /api/routing - Calculate route and fare estimate',
          'GET /api/routing?action=geocode&address=xxx - Geocode address',
          'GET /api/routing?action=reverse-geocode&lat=xxx&lng=xxx - Reverse geocode',
          'GET /api/routing?action=search&query=xxx - Search places',
          'GET /api/routing?action=vehicle-speeds - Get vehicle speeds',
          'GET /api/routing?action=pricing-config - Get pricing configuration',
        ],
        supportedVehicleTypes: ['moto', 'economy', 'premium', 'electric'],
      });
  }
}

// ============================================
// POST /api/routing - Calculate Route
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: RouteRequest = await request.json();

    // Validate request
    if (!body.pickup || !body.destination) {
      return NextResponse.json(
        { success: false, error: 'Pickup and destination are required' },
        { status: 400 }
      );
    }

    // Resolve coordinates (either from Coordinate objects or addresses)
    const pickupCoord = await resolveCoordinate(body.pickup);
    const destinationCoord = await resolveCoordinate(body.destination);

    if (!pickupCoord || !destinationCoord) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve pickup or destination coordinates' },
        { status: 400 }
      );
    }

    // Get vehicle type and traffic factor
    const vehicleType: VehicleType = body.vehicleType || 'economy';
    const trafficFactor = body.trafficFactor || 1.0;
    const demandRatio = body.demandRatio || 1.0;

    // Calculate route
    const route: RouteResult = calculateRoute(
      pickupCoord,
      destinationCoord,
      vehicleType,
      trafficFactor
    );

    // Get surge info
    const surgeInfo = getSurgeInfo();

    // Calculate fare estimates for all vehicle types
    const fareEstimates = calculateAllFares(
      route.distance,
      route.duration,
      surgeInfo.multiplier
    );

    // Get base fare estimate for the selected vehicle type
    const baseFareEstimate = fareEstimates[vehicleType].breakdown;

    // Get addresses if coordinates were provided directly
    let pickupAddress: string | undefined;
    let destinationAddress: string | undefined;

    if (typeof body.pickup !== 'string') {
      const geocodeResult = reverseGeocode(pickupCoord);
      pickupAddress = geocodeResult.displayName;
    } else {
      const geocodeResult = geocodeAddress(body.pickup);
      pickupAddress = geocodeResult?.displayName;
    }

    if (typeof body.destination !== 'string') {
      const geocodeResult = reverseGeocode(destinationCoord);
      destinationAddress = geocodeResult.displayName;
    } else {
      const geocodeResult = geocodeAddress(body.destination);
      destinationAddress = geocodeResult?.displayName;
    }

    // Build response
    const response: RouteResponse = {
      success: true,
      data: {
        distance: route.distance,
        distanceFormatted: formatDistance(route.distance),
        duration: route.duration,
        durationFormatted: formatDuration(route.duration),
        geometry: route.geometry,
        boundingBox: route.boundingBox,
        pickup: pickupCoord,
        destination: destinationCoord,
        pickupAddress,
        destinationAddress,
        baseFareEstimate,
        fareEstimates: Object.fromEntries(
          Object.entries(fareEstimates).map(([type, estimate]) => [
            type,
            {
              minFare: estimate.minFare,
              maxFare: estimate.maxFare,
              breakdown: estimate.breakdown,
            },
          ])
        ) as Record<VehicleType, { minFare: number; maxFare: number; breakdown: FareBreakdown }>,
        surgeInfo: {
          multiplier: surgeInfo.multiplier,
          reason: surgeInfo.reason,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Routing API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Resolve a coordinate from either a Coordinate object or an address string
 */
async function resolveCoordinate(
  input: Coordinate | string
): Promise<Coordinate | null> {
  if (typeof input === 'string') {
    const result = geocodeAddress(input);
    return result?.coordinates || null;
  }
  return input as Coordinate;
}

/**
 * Handle geocode request
 */
function handleGeocode(address: string | null) {
  if (!address) {
    return NextResponse.json(
      { success: false, error: 'Address is required' },
      { status: 400 }
    );
  }

  const result = geocodeAddress(address);

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Address not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
}

/**
 * Handle reverse geocode request
 */
function handleReverseGeocode(lat: string | null, lng: string | null) {
  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { success: false, error: 'Invalid latitude or longitude' },
      { status: 400 }
    );
  }

  const result = reverseGeocode({ latitude, longitude });

  return NextResponse.json({
    success: true,
    data: result,
  });
}

/**
 * Handle place search request
 */
function handleSearchPlaces(query: string | null, limit: string | null) {
  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query is required' },
      { status: 400 }
    );
  }

  const results = searchPlaces(query, limit ? parseInt(limit) : 5);

  return NextResponse.json({
    success: true,
    data: results,
    count: results.length,
  });
}

/**
 * Handle get vehicle speeds request
 */
function handleGetVehicleSpeeds() {
  const speeds = getAllVehicleSpeeds();

  return NextResponse.json({
    success: true,
    data: speeds,
  });
}

/**
 * Handle get pricing config request
 */
function handleGetPricingConfig() {
  const multipliers = getAllVehicleMultipliers();

  return NextResponse.json({
    success: true,
    data: {
      multipliers,
      currency: 'UGX',
    },
  });
}
