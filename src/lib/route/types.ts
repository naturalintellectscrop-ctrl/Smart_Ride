// Smart Ride Route Optimization & Traffic Intelligence Types
// Comprehensive routing system for ride-hailing platform

// ============================================
// LOCATION & COORDINATE TYPES
// ============================================

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinate {
  address?: string;
  placeId?: string;
  zoneId?: string;
  timestamp?: Date;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ============================================
// ROAD NETWORK TYPES
// ============================================

export type RoadType = 
  | 'HIGHWAY'
  | 'EXPRESSWAY'
  | 'MAIN_ROAD'
  | 'SECONDARY_ROAD'
  | 'LOCAL_STREET'
  | 'RESIDENTIAL'
  | 'SERVICE_ROAD';

export type RoadCondition = 
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'UNDER_CONSTRUCTION';

export interface RoadSegment {
  id: string;
  name?: string;
  startNode: string;
  endNode: string;
  
  // Geometry
  distanceMeters: number;
  coordinates: Coordinate[];
  
  // Road properties
  roadType: RoadType;
  speedLimitKmh: number;
  lanes: number;
  isOneWay: boolean;
  isTollRoad: boolean;
  tollAmount?: number;
  
  // Restrictions
  allowedVehicleTypes: string[];
  turnRestrictions?: TurnRestriction[];
  
  // Current state
  condition: RoadCondition;
  currentSpeedKmh?: number;
}

export interface RoadNode {
  id: string;
  coordinate: Coordinate;
  type: 'INTERSECTION' | 'ROUNDABOUT' | 'TERMINAL';
  
  // Connections
  outgoingEdges: string[];
  incomingEdges: string[];
  
  // Traffic signals
  hasTrafficLight: boolean;
  averageWaitTimeSeconds?: number;
}

export interface TurnRestriction {
  fromSegment: string;
  toSegment: string;
  restriction: 'NO_LEFT_TURN' | 'NO_RIGHT_TURN' | 'NO_U_TURN' | 'STRAIGHT_ONLY';
  timeRestriction?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
}

// ============================================
// TRAFFIC DATA TYPES
// ============================================

export type CongestionLevel = 
  | 'FREE_FLOW'
  | 'LIGHT'
  | 'MODERATE'
  | 'HEAVY'
  | 'SEVERE'
  | 'GRIDLOCK';

export type IncidentType = 
  | 'ACCIDENT'
  | 'ROAD_CLOSURE'
  | 'CONSTRUCTION'
  | 'EVENT'
  | 'FLOODING'
  | 'HAZARD';

export interface TrafficData {
  segmentId: string;
  timestamp: Date;
  
  // Speed data
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  averageSpeedKmh: number;
  
  // Congestion
  congestionLevel: CongestionLevel;
  congestionScore: number; // 0-1 (current_speed / expected_speed)
  
  // Volume
  vehicleCount?: number;
  density?: number;
  
  // Delays
  delaySeconds: number;
  delayFactor: number;
}

export interface TrafficIncident {
  id: string;
  type: IncidentType;
  location: Coordinate;
  affectedSegments: string[];
  
  // Timing
  reportedAt: Date;
  expectedClearAt?: Date;
  
  // Impact
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  lanesBlocked: number;
  
  // Description
  description: string;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
}

export interface TrafficSignal {
  id: string;
  location: Coordinate;
  segmentId?: string;
  
  // Cycle
  cycleLengthSeconds: number;
  greenTimeSeconds: number;
  redTimeSeconds: number;
  
  // Patterns by time
  peakPattern?: TrafficSignalPattern;
  offPeakPattern?: TrafficSignalPattern;
  nightPattern?: TrafficSignalPattern;
}

export interface TrafficSignalPattern {
  cycleLengthSeconds: number;
  greenTimeSeconds: number;
}

// ============================================
// ENVIRONMENTAL DATA TYPES
// ============================================

export type WeatherCondition = 
  | 'CLEAR'
  | 'CLOUDY'
  | 'LIGHT_RAIN'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'STORM'
  | 'FOG'
  | 'EXTREME_HEAT'
  | 'FLOOD_WARNING';

export interface EnvironmentalData {
  weatherCondition: WeatherCondition;
  temperature?: number;
  visibilityMeters?: number;
  windSpeedKmh?: number;
  
  // Hazards
  floodAlerts: FloodAlert[];
  roadClosures: string[];
  
  // Impact factors
  speedReductionFactor: number;
  safetyRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FloodAlert {
  id: string;
  location: Coordinate;
  radiusKm: number;
  severity: 'WATCH' | 'WARNING' | 'EMERGENCY';
  affectedSegments: string[];
  expectedDuration: number; // minutes
}

// ============================================
// ROUTE OPTIMIZATION TYPES
// ============================================

export type RoutePreference = 
  | 'FASTEST'
  | 'SHORTEST'
  | 'CHEAPEST'
  | 'BALANCED'
  | 'SCENIC';

export interface RouteRequest {
  requestId: string;
  
  // Locations
  pickup: Location;
  dropoff: Location;
  currentLocation?: Location;
  
  // Preferences
  preference: RoutePreference;
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidFerries: boolean;
  
  // Context
  rideType: 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'XL' | 'LUXURY' | 'BODA' | 'DELIVERY';
  departureTime?: Date;
  
  // Constraints
  maxAlternatives?: number;
  maxDistanceKm?: number;
  maxTimeMinutes?: number;
}

export interface RouteResult {
  routeId: string;
  requestId: string;
  
  // Route info
  distanceKm: number;
  estimatedTimeMinutes: number;
  trafficLevel: CongestionLevel;
  
  // Path
  coordinates: Coordinate[];
  segments: RouteSegment[];
  
  // Costs
  tollRequired: boolean;
  tollAmount: number;
  fuelCostEstimate: number;
  
  // ETAs
  etaBreakdown: ETABreakdown;
  
  // Traffic
  trafficDelay: number; // seconds
  congestionSegments: CongestionSegment[];
  
  // Alternatives
  alternatives?: RouteResult[];
  
  // Metadata
  calculatedAt: Date;
  algorithm: string;
  calculationTimeMs: number;
  
  // Rerouting
  rerouteRecommended: boolean;
  rerouteReason?: string;
}

export interface RouteSegment {
  segmentId: string;
  roadName?: string;
  roadType: RoadType;
  
  // Distance & Time
  distanceKm: number;
  estimatedTimeMinutes: number;
  
  // Navigation
  instruction: string;
  maneuver: ManeuverType;
  
  // Traffic
  trafficLevel: CongestionLevel;
  currentSpeedKmh: number;
  
  // Cost
  isToll: boolean;
  tollAmount?: number;
}

export type ManeuverType = 
  | 'DEPART'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'TURN_SLIGHT_LEFT'
  | 'TURN_SLIGHT_RIGHT'
  | 'TURN_SHARP_LEFT'
  | 'TURN_SHARP_RIGHT'
  | 'STRAIGHT'
  | 'MERGE_LEFT'
  | 'MERGE_RIGHT'
  | 'ROUNDABOUT_ENTER'
  | 'ROUNDABOUT_EXIT'
  | 'U_TURN'
  | 'ARRIVE';

export interface CongestionSegment {
  segmentId: string;
  startCoordinate: Coordinate;
  endCoordinate: Coordinate;
  distanceKm: number;
  congestionLevel: CongestionLevel;
  delayMinutes: number;
}

export interface ETABreakdown {
  baseTravelTime: number;  // minutes at free flow
  trafficDelay: number;     // minutes
  intersectionDelay: number; // minutes
  weatherPenalty: number;   // minutes
  pickupDelay: number;      // minutes for driver to reach pickup
  
  // Confidence
  confidence: number; // 0-1
  confidenceInterval: {
    low: number;
    high: number;
  };
}

// ============================================
// DYNAMIC REROUTING TYPES
// ============================================

export interface RerouteTrigger {
  type: 'TRAFFIC_UPDATE' | 'INCIDENT' | 'DEVIATION' | 'DRIVER_REQUEST' | 'TIME_THRESHOLD';
  
  // Details
  currentRouteId: string;
  triggerLocation: Coordinate;
  
  // Traffic specific
  congestionAhead?: CongestionSegment;
  incident?: TrafficIncident;
  
  // Thresholds
  improvementThresholdMinutes: number;
  currentETA: number;
  alternativeETA?: number;
}

export interface RerouteResult {
  originalRouteId: string;
  newRouteId: string;
  
  // Comparison
  originalETA: number;
  newETA: number;
  timeSavedMinutes: number;
  
  // Distance
  originalDistanceKm: number;
  newDistanceKm: number;
  distanceDifferenceKm: number;
  
  // Reason
  trigger: RerouteTrigger;
  reason: string;
  
  // Timestamps
  detectedAt: Date;
  reroutedAt: Date;
}

// ============================================
// GRAPH TYPES FOR ALGORITHMS
// ============================================

export interface GraphNode {
  id: string;
  coordinate: Coordinate;
  edges: GraphEdge[];
}

export interface GraphEdge {
  id: string;
  fromNode: string;
  toNode: string;
  
  // Base weights
  distanceMeters: number;
  baseTimeSeconds: number;
  
  // Dynamic weights
  currentTrafficDelay: number;
  incidentDelay: number;
  weatherPenalty: number;
  
  // Total weight (computed)
  weight: number;
  
  // Properties
  roadType: RoadType;
  speedLimitKmh: number;
  isToll: boolean;
  tollAmount: number;
}

export interface RouteGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  
  // Indexes
  nodeIndex: Map<string, string[]>; // segment -> nodes
  edgeIndex: Map<string, string>;   // segment -> edge
}

// ============================================
// HISTORICAL DATA TYPES
// ============================================

export interface HistoricalTraffic {
  segmentId: string;
  
  // By hour of day
  hourlySpeeds: number[]; // 24 values, average speed by hour
  
  // By day of week
  weekdaySpeeds: number[];
  weekendSpeeds: number[];
  
  // By weather
  weatherImpact: Map<WeatherCondition, number>;
  
  // Seasonal
  seasonalFactors: number[]; // 12 values, monthly factors
}

export interface DriverPattern {
  driverId: string;
  
  // Speed patterns
  averageSpeedByRoadType: Map<RoadType, number>;
  averageSpeedByTime: number[]; // 24 values
  
  // Behavior
  preferredRoutes: string[];
  avoidAreas: string[];
  
  // Reliability
  etaAccuracy: number;
  onTimeRate: number;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface RouteConfig {
  // Algorithm settings
  algorithm: 'DIJKSTRA' | 'A_STAR' | 'CONTRACTION_HIERARCHIES';
  maxAlternatives: number;
  maxSearchRadiusKm: number;
  
  // Weight factors
  distanceWeight: number;
  timeWeight: number;
  trafficWeight: number;
  tollWeight: number;
  safetyWeight: number;
  
  // Rerouting thresholds
  rerouteImprovementMinutes: number;
  rerouteCheckIntervalSeconds: number;
  maxReroutesPerTrip: number;
  
  // ETA settings
  etaConfidenceThreshold: number;
  etaBufferMinutes: number;
  
  // Cache settings
  cacheRouteResults: boolean;
  routeCacheTTLSeconds: number;
  trafficCacheTTLSeconds: number;
  
  // Performance
  maxCalculationTimeMs: number;
  enableParallelProcessing: boolean;
}

export const DEFAULT_ROUTE_CONFIG: RouteConfig = {
  algorithm: 'A_STAR',
  maxAlternatives: 3,
  maxSearchRadiusKm: 50,
  
  distanceWeight: 0.2,
  timeWeight: 0.35,
  trafficWeight: 0.25,
  tollWeight: 0.1,
  safetyWeight: 0.1,
  
  rerouteImprovementMinutes: 2,
  rerouteCheckIntervalSeconds: 10,
  maxReroutesPerTrip: 3,
  
  etaConfidenceThreshold: 0.7,
  etaBufferMinutes: 3,
  
  cacheRouteResults: true,
  routeCacheTTLSeconds: 300,
  trafficCacheTTLSeconds: 30,
  
  maxCalculationTimeMs: 150,
  enableParallelProcessing: true,
};

// ============================================
// PERFORMANCE METRICS
// ============================================

export interface RouteMetrics {
  totalRequests: number;
  successfulCalculations: number;
  failedCalculations: number;
  
  averageCalculationTimeMs: number;
  averageRouteDistanceKm: number;
  averageETAMinutes: number;
  
  etaAccuracyRate: number; // Within ±10%
  rerouteRate: number;
  
  byAlgorithm: {
    dijkstra: number;
    aStar: number;
    contractionHierarchies: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

export const ROUTE_CONSTANTS = {
  // Speed limits by road type (km/h)
  SPEED_LIMITS: {
    HIGHWAY: 120,
    EXPRESSWAY: 100,
    MAIN_ROAD: 80,
    SECONDARY_ROAD: 60,
    LOCAL_STREET: 40,
    RESIDENTIAL: 30,
    SERVICE_ROAD: 20,
  },
  
  // Congestion thresholds
  CONGESTION_THRESHOLDS: {
    FREE_FLOW: 0.9,    // >= 90% of free flow speed
    LIGHT: 0.7,        // >= 70%
    MODERATE: 0.5,     // >= 50%
    HEAVY: 0.3,        // >= 30%
    SEVERE: 0.15,      // >= 15%
    GRIDLOCK: 0,       // < 15%
  },
  
  // Weather impact factors
  WEATHER_IMPACT: {
    CLEAR: 1.0,
    CLOUDY: 1.0,
    LIGHT_RAIN: 0.9,
    RAIN: 0.8,
    HEAVY_RAIN: 0.6,
    STORM: 0.4,
    FOG: 0.7,
    EXTREME_HEAT: 0.95,
    FLOOD_WARNING: 0.3,
  },
  
  // Intersection delay (seconds)
  INTERSECTION_DELAYS: {
    TRAFFIC_LIGHT: 30,
    STOP_SIGN: 15,
    ROUNDABOUT: 20,
    YIELD: 5,
  },
  
  // Fuel consumption (liters per km, average)
  FUEL_CONSUMPTION: {
    ECONOMY: 0.08,
    STANDARD: 0.1,
    PREMIUM: 0.12,
    XL: 0.15,
    LUXURY: 0.14,
    BODA: 0.035,
    DELIVERY: 0.1,
  },
};
