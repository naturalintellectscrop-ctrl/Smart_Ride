// Smart Ride Route Optimization API
// REST endpoints for route calculation, traffic intelligence, and ETA prediction

import { NextRequest, NextResponse } from 'next/server';
import {
  aStar,
  dijkstra,
  calculateDistance,
  calculateETA,
  buildRouteGraph,
  generateWaypoints,
} from '@/lib/route/route-engine';
import {
  updateTrafficData,
  getTrafficData,
  getAllTrafficData,
  reportIncident,
  getActiveIncidents,
  getIncidentsForSegments,
  clearIncident,
  predictRouteTraffic,
  predictFutureCongestion,
  getAllZoneTraffic,
  exportTrafficAnalytics,
  calculateAreaCongestion,
  processGPSProbe,
  calculateTrafficImpact,
} from '@/lib/route/traffic-intelligence';
import {
  RouteRequest,
  RouteResult,
  RouteSegment,
  Coordinate,
  CongestionLevel,
  RoadType,
  DEFAULT_ROUTE_CONFIG,
  RouteConfig,
  TrafficIncident,
} from '@/lib/route/types';

// Simulated road network for demo (in production, use real map data)
const DEMO_ROAD_NETWORK = {
  nodes: [
    { id: 'N001', coordinate: { latitude: 0.3162, longitude: 32.5678 } },
    { id: 'N002', coordinate: { latitude: 0.3180, longitude: 32.5700 } },
    { id: 'N003', coordinate: { latitude: 0.3200, longitude: 32.5720 } },
    { id: 'N004', coordinate: { latitude: 0.3220, longitude: 32.5740 } },
    { id: 'N005', coordinate: { latitude: 0.3240, longitude: 32.5760 } },
    { id: 'N006', coordinate: { latitude: 0.3260, longitude: 32.5780 } },
    { id: 'N007', coordinate: { latitude: 0.3280, longitude: 32.5800 } },
    { id: 'N008', coordinate: { latitude: 0.3300, longitude: 32.5820 } },
  ],
  segments: [
    { id: 'S001', startNode: 'N001', endNode: 'N002', name: 'Jinja Road', roadType: 'MAIN_ROAD', speedLimit: 60, distance: 1200 },
    { id: 'S002', startNode: 'N002', endNode: 'N003', name: 'Jinja Road', roadType: 'MAIN_ROAD', speedLimit: 60, distance: 1100 },
    { id: 'S003', startNode: 'N003', endNode: 'N004', name: 'Jinja Road', roadType: 'HIGHWAY', speedLimit: 80, distance: 1500 },
    { id: 'S004', startNode: 'N004', endNode: 'N005', name: 'Jinja Road', roadType: 'HIGHWAY', speedLimit: 80, distance: 1400 },
    { id: 'S005', startNode: 'N005', endNode: 'N006', name: 'Jinja Road', roadType: 'MAIN_ROAD', speedLimit: 60, distance: 1000 },
    { id: 'S006', startNode: 'N006', endNode: 'N007', name: 'Jinja Road', roadType: 'MAIN_ROAD', speedLimit: 60, distance: 900 },
    { id: 'S007', startNode: 'N007', endNode: 'N008', name: 'Jinja Road', roadType: 'LOCAL_STREET', speedLimit: 40, distance: 800 },
    // Alternative route
    { id: 'S010', startNode: 'N002', endNode: 'N005', name: 'Old Port Bell Road', roadType: 'SECONDARY_ROAD', speedLimit: 50, distance: 2500 },
    { id: 'S011', startNode: 'N001', endNode: 'N006', name: 'Lugogo Bypass', roadType: 'EXPRESSWAY', speedLimit: 100, distance: 4000 },
  ],
};

// GET /api/route - Get route information
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'traffic':
      return getTraffic();

    case 'traffic-segment':
      const segmentId = searchParams.get('segmentId');
      return getTrafficForSegment(segmentId);

    case 'incidents':
      return getIncidents();

    case 'zones':
      return getZones();

    case 'predict':
      return getPrediction(searchParams);

    case 'analytics':
      return getAnalytics();

    case 'demo-network':
      return getDemoNetwork();

    default:
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Route Optimization API',
        endpoints: [
          'GET /api/route?action=traffic - Get all traffic data',
          'GET /api/route?action=traffic-segment&segmentId=xxx - Get segment traffic',
          'GET /api/route?action=incidents - Get active incidents',
          'GET /api/route?action=zones - Get zone traffic summaries',
          'GET /api/route?action=predict - Predict future congestion',
          'GET /api/route?action=analytics - Export traffic analytics',
          'GET /api/route?action=demo-network - Get demo road network',
          'POST /api/route?action=calculate - Calculate optimal route',
          'POST /api/route?action=traffic - Update traffic data',
          'POST /api/route?action=incident - Report traffic incident',
          'POST /api/route?action=gps-probe - Submit GPS probe data',
          'POST /api/route?action=clear-incident - Clear an incident',
        ],
      });
  }
}

// POST /api/route - Calculate routes or update data
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'calculate':
        return handleCalculateRoute(body);

      case 'traffic':
        return handleUpdateTraffic(body);

      case 'incident':
        return handleReportIncident(body);

      case 'gps-probe':
        return handleGPSProbe(body);

      case 'clear-incident':
        return handleClearIncident(body);

      case 'eta':
        return handleCalculateETA(body);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Route API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

function getTraffic() {
  const trafficData = getAllTrafficData();
  return NextResponse.json({
    success: true,
    data: trafficData,
    count: trafficData.length,
    timestamp: new Date(),
  });
}

function getTrafficForSegment(segmentId: string | null) {
  if (!segmentId) {
    return NextResponse.json(
      { success: false, error: 'segmentId is required' },
      { status: 400 }
    );
  }

  const traffic = getTrafficData(segmentId);
  return NextResponse.json({
    success: true,
    data: traffic,
  });
}

function getIncidents() {
  const incidents = getActiveIncidents();
  return NextResponse.json({
    success: true,
    data: incidents,
    count: incidents.length,
  });
}

function getZones() {
  const zones = getAllZoneTraffic();
  return NextResponse.json({
    success: true,
    data: zones,
    count: zones.length,
  });
}

function getPrediction(searchParams: URLSearchParams) {
  const zoneId = searchParams.get('zoneId') || 'default';
  const minutesAhead = parseInt(searchParams.get('minutes') || '30');

  const prediction = predictFutureCongestion(zoneId, minutesAhead);
  return NextResponse.json({
    success: true,
    data: prediction,
  });
}

function getAnalytics() {
  const analytics = exportTrafficAnalytics();
  return NextResponse.json({
    success: true,
    data: analytics,
  });
}

function getDemoNetwork() {
  return NextResponse.json({
    success: true,
    data: DEMO_ROAD_NETWORK,
  });
}

async function handleCalculateRoute(data: {
  pickup: Coordinate;
  dropoff: Coordinate;
  preference?: 'FASTEST' | 'SHORTEST' | 'BALANCED';
  avoidTolls?: boolean;
  rideType?: string;
}) {
  const startTime = Date.now();
  const { pickup, dropoff, preference = 'FASTEST', avoidTolls = false } = data;

  if (!pickup || !dropoff) {
    return NextResponse.json(
      { success: false, error: 'Pickup and dropoff locations are required' },
      { status: 400 }
    );
  }

  // Calculate direct distance
  const directDistance = calculateDistance(pickup, dropoff);

  // Generate route coordinates (simplified - in production, use real routing)
  const routeCoordinates = generateRouteCoordinates(pickup, dropoff, 8);

  // Calculate base metrics
  const distanceKm = directDistance / 1000;
  const baseTimeMinutes = estimateBaseTime(distanceKm, preference);

  // Get traffic impact
  const segmentIds = routeCoordinates.slice(0, -1).map((_, i) => `S00${i + 1}`);
  const trafficImpact = calculateTrafficImpact(segmentIds, baseTimeMinutes);

  // Build route segments
  const segments = buildRouteSegments(routeCoordinates, segmentIds);

  // Get incidents affecting route
  const incidents = getIncidentsForSegments(segmentIds);

  // Calculate ETA with traffic
  const estimatedTimeMinutes = baseTimeMinutes + trafficImpact.additionalMinutes;

  // Determine if rerouting is needed
  const rerouteRecommended = trafficImpact.congestionLevel === 'SEVERE' || 
    trafficImpact.congestionLevel === 'GRIDLOCK';

  const routeId = `RT${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const result: RouteResult = {
    routeId,
    requestId: routeId,
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedTimeMinutes: Math.round(estimatedTimeMinutes),
    trafficLevel: trafficImpact.congestionLevel,
    tollRequired: false,
    tollAmount: 0,
    rerouteRecommended,
    rerouteReason: rerouteRecommended 
      ? `${trafficImpact.congestionLevel} traffic detected on route` 
      : undefined,
    coordinates: routeCoordinates,
    segments,
    trafficDelay: trafficImpact.additionalMinutes * 60,
    congestionSegments: trafficImpact.criticalSegments.map(id => ({
      segmentId: id,
      startCoordinate: routeCoordinates[0],
      endCoordinate: routeCoordinates[routeCoordinates.length - 1],
      distanceKm: distanceKm / segmentIds.length,
      congestionLevel: trafficImpact.congestionLevel,
      delayMinutes: trafficImpact.additionalMinutes / segmentIds.length,
    })),
    etaBreakdown: {
      baseTravelTime: baseTimeMinutes,
      trafficDelay: trafficImpact.additionalMinutes,
      intersectionDelay: 2,
      weatherPenalty: 0,
      pickupDelay: 0,
      confidence: 0.85,
      confidenceInterval: {
        low: Math.round(estimatedTimeMinutes * 0.9),
        high: Math.round(estimatedTimeMinutes * 1.1),
      },
    },
    calculatedAt: new Date(),
    algorithm: 'A_STAR',
    calculationTimeMs: Date.now() - startTime,
  };

  return NextResponse.json({
    success: true,
    data: result,
    incidents: incidents.length > 0 ? incidents : undefined,
  });
}

async function handleUpdateTraffic(data: {
  segmentId: string;
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  vehicleCount?: number;
}) {
  const { segmentId, currentSpeedKmh, freeFlowSpeedKmh, vehicleCount } = data;

  if (!segmentId || currentSpeedKmh === undefined || freeFlowSpeedKmh === undefined) {
    return NextResponse.json(
      { success: false, error: 'segmentId, currentSpeedKmh, and freeFlowSpeedKmh are required' },
      { status: 400 }
    );
  }

  const trafficData = updateTrafficData(segmentId, {
    currentSpeedKmh,
    freeFlowSpeedKmh,
    vehicleCount,
  });

  return NextResponse.json({
    success: true,
    data: trafficData,
    message: 'Traffic data updated',
  });
}

async function handleReportIncident(data: {
  type: string;
  location: Coordinate;
  affectedSegments: string[];
  severity: string;
  description: string;
}) {
  const { type, location, affectedSegments, severity, description } = data;

  if (!type || !location || !affectedSegments || !severity) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const incident = reportIncident({
    type: type as TrafficIncident['type'],
    location,
    affectedSegments,
    severity: severity as TrafficIncident['severity'],
    description,
  });

  return NextResponse.json({
    success: true,
    data: incident,
    message: 'Incident reported',
  });
}

async function handleGPSProbe(data: {
  driverId: string;
  location: Coordinate;
  speed: number;
  heading: number;
  segmentIds: string[];
}) {
  const { driverId, location, speed, heading, segmentIds } = data;

  if (!driverId || !location || speed === undefined) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  processGPSProbe(driverId, location, speed, heading, segmentIds || []);

  return NextResponse.json({
    success: true,
    message: 'GPS probe processed',
  });
}

async function handleClearIncident(data: { incidentId: string }) {
  const { incidentId } = data;

  if (!incidentId) {
    return NextResponse.json(
      { success: false, error: 'incidentId is required' },
      { status: 400 }
    );
  }

  const cleared = clearIncident(incidentId);

  return NextResponse.json({
    success: cleared,
    message: cleared ? 'Incident cleared' : 'Incident not found',
  });
}

async function handleCalculateETA(data: {
  segments: RouteSegment[];
  weatherCondition?: string;
}) {
  const { segments, weatherCondition = 'CLEAR' } = data;

  if (!segments || segments.length === 0) {
    return NextResponse.json(
      { success: false, error: 'segments are required' },
      { status: 400 }
    );
  }

  const eta = calculateETA(segments, {
    weatherCondition: weatherCondition as any,
    floodAlerts: [],
    roadClosures: [],
    speedReductionFactor: 1,
    safetyRiskLevel: 'LOW',
  });

  return NextResponse.json({
    success: true,
    data: eta,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRouteCoordinates(
  start: Coordinate,
  end: Coordinate,
  points: number
): Coordinate[] {
  const coordinates: Coordinate[] = [start];

  for (let i = 1; i < points - 1; i++) {
    const ratio = i / (points - 1);
    // Add slight curve to route
    const jitter = Math.sin(ratio * Math.PI) * 0.001;

    coordinates.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio + jitter,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio - jitter,
    });
  }

  coordinates.push(end);
  return coordinates;
}

function estimateBaseTime(distanceKm: number, preference: string): number {
  const avgSpeed = preference === 'FASTEST' ? 50 : preference === 'SHORTEST' ? 30 : 40;
  return Math.ceil((distanceKm / avgSpeed) * 60);
}

function buildRouteSegments(
  coordinates: Coordinate[],
  segmentIds: string[]
): RouteSegment[] {
  const segments: RouteSegment[] = [];

  for (let i = 0; i < segmentIds.length && i < coordinates.length - 1; i++) {
    const distance = calculateDistance(coordinates[i], coordinates[i + 1]) / 1000;
    const traffic = getTrafficData(segmentIds[i]);

    segments.push({
      segmentId: segmentIds[i],
      roadName: `Road Segment ${i + 1}`,
      roadType: i < 3 ? 'MAIN_ROAD' : 'LOCAL_STREET',
      distanceKm: Math.round(distance * 100) / 100,
      estimatedTimeMinutes: Math.ceil(distance / 40 * 60),
      instruction: i === 0 ? 'Head towards destination' : `Continue for ${Math.round(distance * 10) / 10} km`,
      maneuver: i === 0 ? 'DEPART' : i === segmentIds.length - 1 ? 'ARRIVE' : 'STRAIGHT',
      trafficLevel: traffic?.congestionLevel || 'FREE_FLOW',
      currentSpeedKmh: traffic?.currentSpeedKmh || 40,
      isToll: false,
    });
  }

  return segments;
}
