// Smart Ride Route Optimization Engine
// Implements Dijkstra, A*, and Contraction Hierarchies for route calculation

import {
  Coordinate,
  Location,
  RoadSegment,
  RoadNode,
  TrafficData,
  TrafficIncident,
  EnvironmentalData,
  RouteRequest,
  RouteResult,
  RouteSegment,
  GraphNode,
  GraphEdge,
  RouteGraph,
  CongestionLevel,
  RoadType,
  ManeuverType,
  ETABreakdown,
  CongestionSegment,
  RouteConfig,
  DEFAULT_ROUTE_CONFIG,
  ROUTE_CONSTANTS,
} from './types';

// ============================================
// MIN HEAP FOR PRIORITY QUEUE
// ============================================

interface HeapNode {
  nodeId: string;
  distance: number;
  path: string[];
}

class MinHeap {
  private heap: HeapNode[] = [];

  push(node: HeapNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].distance <= this.heap[index].distance) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].distance < this.heap[smallest].distance) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].distance < this.heap[smallest].distance) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}

// ============================================
// GEOSPATIAL UTILITIES
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Heuristic function for A* - Euclidean distance estimate
 */
function heuristic(coord1: Coordinate, coord2: Coordinate, avgSpeed: number = 60): number {
  const distance = calculateDistance(coord1, coord2);
  return (distance / 1000) / avgSpeed * 3600; // Time in seconds
}

/**
 * Check if coordinate is within bounding box
 */
function isWithinBounds(coord: Coordinate, bounds: { min: Coordinate; max: Coordinate }): boolean {
  return (
    coord.latitude >= bounds.min.latitude &&
    coord.latitude <= bounds.max.latitude &&
    coord.longitude >= bounds.min.longitude &&
    coord.longitude <= bounds.max.longitude
  );
}

// ============================================
// EDGE WEIGHT CALCULATION
// ============================================

/**
 * Calculate the travel cost (weight) for an edge
 * travel_cost = distance_weight + traffic_delay_weight + road_priority_weight + accident_penalty + toll_penalty
 */
export function calculateEdgeWeight(
  edge: GraphEdge,
  config: RouteConfig,
  avoidTolls: boolean = false
): number {
  // Base time in seconds
  let weight = edge.baseTimeSeconds;

  // Traffic delay
  weight += edge.currentTrafficDelay;

  // Incident delay
  weight += edge.incidentDelay;

  // Weather penalty
  weight += edge.weatherPenalty;

  // Road type factor (priority)
  const roadFactor = getRoadTypeFactor(edge.roadType);
  weight *= roadFactor;

  // Toll penalty
  if (edge.isToll && avoidTolls) {
    weight += config.tollWeight * 3600; // Add 0.1 hours per toll preference
  }

  // Apply configured weights
  const distanceComponent = (edge.distanceMeters / 1000) * config.distanceWeight * 60; // km to weight
  const timeComponent = weight * config.timeWeight;
  const trafficComponent = edge.currentTrafficDelay * config.trafficWeight;

  return distanceComponent + timeComponent + trafficComponent;
}

function getRoadTypeFactor(roadType: RoadType): number {
  const factors: Record<RoadType, number> = {
    HIGHWAY: 0.9,
    EXPRESSWAY: 0.92,
    MAIN_ROAD: 1.0,
    SECONDARY_ROAD: 1.05,
    LOCAL_STREET: 1.1,
    RESIDENTIAL: 1.15,
    SERVICE_ROAD: 1.2,
  };
  return factors[roadType] || 1.0;
}

// ============================================
// DIJKSTRA'S ALGORITHM
// ============================================

export function dijkstra(
  graph: RouteGraph,
  startNodeId: string,
  endNodeId: string,
  config: RouteConfig,
  avoidTolls: boolean = false
): { distance: number; path: string[] } | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  // Initialize
  distances.set(startNodeId, 0);
  heap.push({ nodeId: startNodeId, distance: 0, path: [startNodeId] });

  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (!current) break;

    const { nodeId, distance: currentDistance, path } = current;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // Found destination
    if (nodeId === endNodeId) {
      return { distance: currentDistance, path };
    }

    // Explore neighbors
    const node = graph.nodes.get(nodeId);
    if (!node) continue;

    for (const edge of node.edges) {
      if (visited.has(edge.toNode)) continue;

      const edgeWeight = calculateEdgeWeight(edge, config, avoidTolls);
      const newDistance = currentDistance + edgeWeight;

      const currentBest = distances.get(edge.toNode);
      if (currentBest === undefined || newDistance < currentBest) {
        distances.set(edge.toNode, newDistance);
        previous.set(edge.toNode, nodeId);
        heap.push({
          nodeId: edge.toNode,
          distance: newDistance,
          path: [...path, edge.toNode],
        });
      }
    }
  }

  return null; // No path found
}

// ============================================
// A* ALGORITHM
// ============================================

export function aStar(
  graph: RouteGraph,
  startNodeId: string,
  endNodeId: string,
  config: RouteConfig,
  avoidTolls: boolean = false
): { distance: number; path: string[]; expandedNodes: number } | null {
  const gScore = new Map<string, number>(); // Cost from start
  const fScore = new Map<string, number>(); // Estimated total cost
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  const endNode = graph.nodes.get(endNodeId);
  if (!endNode) return null;

  // Initialize
  gScore.set(startNodeId, 0);
  const startNode = graph.nodes.get(startNodeId);
  const h = startNode ? heuristic(startNode.coordinate, endNode.coordinate) : 0;
  fScore.set(startNodeId, h);

  heap.push({ nodeId: startNodeId, distance: h, path: [startNodeId] });

  let expandedNodes = 0;

  while (!heap.isEmpty()) {
    const current = heap.pop();
    if (!current) break;

    const { nodeId, path } = current;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    expandedNodes++;

    // Found destination
    if (nodeId === endNodeId) {
      return { distance: gScore.get(nodeId) || 0, path, expandedNodes };
    }

    // Explore neighbors
    const node = graph.nodes.get(nodeId);
    if (!node) continue;

    for (const edge of node.edges) {
      if (visited.has(edge.toNode)) continue;

      const edgeWeight = calculateEdgeWeight(edge, config, avoidTolls);
      const tentativeG = (gScore.get(nodeId) || 0) + edgeWeight;

      const currentG = gScore.get(edge.toNode);
      if (currentG === undefined || tentativeG < currentG) {
        previous.set(edge.toNode, nodeId);
        gScore.set(edge.toNode, tentativeG);

        const neighborNode = graph.nodes.get(edge.toNode);
        const h = neighborNode ? heuristic(neighborNode.coordinate, endNode.coordinate) : 0;
        const f = tentativeG + h;
        fScore.set(edge.toNode, f);

        heap.push({
          nodeId: edge.toNode,
          distance: f,
          path: [...path, edge.toNode],
        });
      }
    }
  }

  return null; // No path found
}

// ============================================
// TRAFFIC INTELLIGENCE
// ============================================

/**
 * Calculate congestion score for a road segment
 * congestion_score = current_speed / expected_speed
 */
export function calculateCongestionScore(
  currentSpeed: number,
  freeFlowSpeed: number
): number {
  return Math.max(0, Math.min(1, currentSpeed / freeFlowSpeed));
}

/**
 * Determine congestion level from score
 */
export function getCongestionLevel(score: number): CongestionLevel {
  const thresholds = ROUTE_CONSTANTS.CONGESTION_THRESHOLDS;

  if (score >= thresholds.FREE_FLOW) return 'FREE_FLOW';
  if (score >= thresholds.LIGHT) return 'LIGHT';
  if (score >= thresholds.MODERATE) return 'MODERATE';
  if (score >= thresholds.HEAVY) return 'HEAVY';
  if (score >= thresholds.SEVERE) return 'SEVERE';
  return 'GRIDLOCK';
}

/**
 * Calculate traffic delay in seconds
 */
export function calculateTrafficDelay(
  distanceMeters: number,
  currentSpeed: number,
  freeFlowSpeed: number
): number {
  if (currentSpeed <= 0) return distanceMeters / 10 * 3600; // Very slow = 10 km/h

  const freeFlowTime = (distanceMeters / 1000) / freeFlowSpeed * 3600;
  const currentTime = (distanceMeters / 1000) / currentSpeed * 3600;

  return Math.max(0, currentTime - freeFlowTime);
}

/**
 * Get speed reduction factor for weather
 */
export function getWeatherSpeedFactor(
  weather: EnvironmentalData['weatherCondition']
): number {
  return ROUTE_CONSTANTS.WEATHER_IMPACT[weather] || 1.0;
}

// ============================================
// ETA PREDICTION
// ============================================

/**
 * Calculate comprehensive ETA breakdown
 * ETA = base_travel_time + traffic_delay + intersection_delay + weather_penalty
 */
export function calculateETA(
  segments: RouteSegment[],
  environmentalData: EnvironmentalData,
  driverSpeedFactor: number = 1.0
): ETABreakdown {
  let baseTravelTime = 0;
  let trafficDelay = 0;
  let intersectionDelay = 0;

  for (const segment of segments) {
    // Base time at free flow
    const freeFlowTime = segment.estimatedTimeMinutes;
    baseTravelTime += freeFlowTime;

    // Traffic delay
    const congestionFactor = getCongestionDelayFactor(segment.trafficLevel);
    trafficDelay += freeFlowTime * (congestionFactor - 1);

    // Intersection delays (estimate based on road type)
    const intersectionPenalty = getIntersectionDelay(segment.roadType);
    intersectionDelay += intersectionPenalty;
  }

  // Weather penalty
  const weatherFactor = getWeatherSpeedFactor(environmentalData.weatherCondition);
  const weatherPenalty = baseTravelTime * (1 - weatherFactor);

  // Apply driver speed factor
  const adjustedBaseTime = baseTravelTime / driverSpeedFactor;

  // Calculate total
  const totalTime = adjustedBaseTime + trafficDelay + intersectionDelay + weatherPenalty;

  // Confidence calculation
  const confidence = calculateETAConfidence(segments, environmentalData);
  const confidenceInterval = {
    low: totalTime * 0.9,
    high: totalTime * 1.1,
  };

  return {
    baseTravelTime: Math.round(adjustedBaseTime),
    trafficDelay: Math.round(trafficDelay),
    intersectionDelay: Math.round(intersectionDelay),
    weatherPenalty: Math.round(weatherPenalty),
    pickupDelay: 0,
    confidence,
    confidenceInterval: {
      low: Math.round(confidenceInterval.low),
      high: Math.round(confidenceInterval.high),
    },
  };
}

function getCongestionDelayFactor(level: CongestionLevel): number {
  const factors: Record<CongestionLevel, number> = {
    FREE_FLOW: 1.0,
    LIGHT: 1.1,
    MODERATE: 1.3,
    HEAVY: 1.6,
    SEVERE: 2.2,
    GRIDLOCK: 3.0,
  };
  return factors[level] || 1.0;
}

function getIntersectionDelay(roadType: RoadType): number {
  const delays: Record<RoadType, number> = {
    HIGHWAY: 0,
    EXPRESSWAY: 0.1,
    MAIN_ROAD: 0.3,
    SECONDARY_ROAD: 0.5,
    LOCAL_STREET: 0.7,
    RESIDENTIAL: 0.8,
    SERVICE_ROAD: 1.0,
  };
  return delays[roadType] || 0.5;
}

function calculateETAConfidence(
  segments: RouteSegment[],
  environment: EnvironmentalData
): number {
  let confidence = 0.9; // Base confidence

  // Reduce for severe traffic
  const severeSegments = segments.filter(s => s.trafficLevel === 'SEVERE' || s.trafficLevel === 'GRIDLOCK');
  confidence -= severeSegments.length * 0.05;

  // Reduce for bad weather
  if (environment.weatherCondition === 'STORM' || environment.weatherCondition === 'HEAVY_RAIN') {
    confidence -= 0.1;
  }

  // Reduce for safety risks
  if (environment.safetyRiskLevel === 'HIGH' || environment.safetyRiskLevel === 'CRITICAL') {
    confidence -= 0.1;
  }

  return Math.max(0.5, Math.min(1.0, confidence));
}

// ============================================
// DYNAMIC REROUTING
// ============================================

/**
 * Check if rerouting should be recommended
 */
export function shouldReroute(
  currentRoute: RouteResult,
  newTrafficData: Map<string, TrafficData>,
  incidents: TrafficIncident[],
  config: RouteConfig
): { shouldReroute: boolean; reason?: string; timeLost?: number } {
  let timeLost = 0;
  const reasons: string[] = [];

  // Check each segment for traffic changes
  for (const segment of currentRoute.segments) {
    const traffic = newTrafficData.get(segment.segmentId);
    if (!traffic) continue;

    // Severe congestion
    if (traffic.congestionLevel === 'SEVERE' || traffic.congestionLevel === 'GRIDLOCK') {
      timeLost += traffic.delaySeconds / 60;
      reasons.push(`Heavy traffic on ${segment.roadName || segment.roadType}`);
    }
  }

  // Check for incidents on route
  for (const incident of incidents) {
    const onRoute = currentRoute.segments.some(s =>
      incident.affectedSegments.includes(s.segmentId)
    );
    if (onRoute && incident.isActive) {
      timeLost += 10; // Estimate 10 minutes for incidents
      reasons.push(`${incident.type}: ${incident.description}`);
    }
  }

  // Check threshold
  if (timeLost >= config.rerouteImprovementMinutes) {
    return {
      shouldReroute: true,
      reason: reasons.join('; '),
      timeLost,
    };
  }

  return { shouldReroute: false };
}

// ============================================
// ROUTE GRAPH BUILDER
// ============================================

/**
 * Build route graph from road segments and nodes
 */
export function buildRouteGraph(
  segments: RoadSegment[],
  nodes: Map<string, RoadNode>,
  trafficData: Map<string, TrafficData>,
  incidents: TrafficIncident[],
  environment: EnvironmentalData
): RouteGraph {
  const graphNodes = new Map<string, GraphNode>();
  const graphEdges = new Map<string, GraphEdge>();

  // Build nodes
  for (const [nodeId, node] of nodes) {
    graphNodes.set(nodeId, {
      id: nodeId,
      coordinate: node.coordinate,
      edges: [],
    });
  }

  // Build edges
  for (const segment of segments) {
    const traffic = trafficData.get(segment.id);
    const incidentDelay = calculateIncidentDelay(segment.id, incidents);
    const weatherPenalty = calculateWeatherPenalty(segment, environment);

    const baseTimeSeconds = (segment.distanceMeters / 1000) / segment.speedLimitKmh * 3600;
    const trafficDelay = traffic
      ? calculateTrafficDelay(
          segment.distanceMeters,
          traffic.currentSpeedKmh,
          segment.speedLimitKmh
        )
      : 0;

    const edge: GraphEdge = {
      id: segment.id,
      fromNode: segment.startNode,
      toNode: segment.endNode,
      distanceMeters: segment.distanceMeters,
      baseTimeSeconds,
      currentTrafficDelay: trafficDelay,
      incidentDelay,
      weatherPenalty,
      weight: 0, // Will be calculated during routing
      roadType: segment.roadType,
      speedLimitKmh: segment.speedLimitKmh,
      isToll: segment.isTollRoad,
      tollAmount: segment.tollAmount || 0,
    };

    graphEdges.set(edge.id, edge);

    // Add to node's edge list
    const fromNode = graphNodes.get(segment.startNode);
    if (fromNode) {
      fromNode.edges.push(edge);
    }
  }

  return { nodes: graphNodes, edges: graphEdges };
}

function calculateIncidentDelay(segmentId: string, incidents: TrafficIncident[]): number {
  let delay = 0;
  for (const incident of incidents) {
    if (!incident.isActive) continue;
    if (!incident.affectedSegments.includes(segmentId)) continue;

    switch (incident.severity) {
      case 'CRITICAL':
        delay += 1800; // 30 minutes
        break;
      case 'MAJOR':
        delay += 900; // 15 minutes
        break;
      case 'MODERATE':
        delay += 300; // 5 minutes
        break;
      case 'MINOR':
        delay += 120; // 2 minutes
        break;
    }
  }
  return delay;
}

function calculateWeatherPenalty(
  segment: RoadSegment,
  environment: EnvironmentalData
): number {
  const baseTime = (segment.distanceMeters / 1000) / segment.speedLimitKmh * 3600;
  const weatherFactor = getWeatherSpeedFactor(environment.weatherCondition);
  return baseTime * (1 - weatherFactor);
}

// ============================================
// WAYPOINT GENERATION
// ============================================

/**
 * Generate navigation waypoints from path
 */
export function generateWaypoints(
  path: string[],
  graph: RouteGraph,
  segments: Map<string, RoadSegment>
): RouteSegment[] {
  const routeSegments: RouteSegment[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = graph.nodes.get(path[i]);
    const toNode = graph.nodes.get(path[i + 1]);

    if (!fromNode || !toNode) continue;

    // Find the edge between these nodes
    const edge = fromNode.edges.find(e => e.toNode === path[i + 1]);
    if (!edge) continue;

    const segment = segments.get(edge.id);
    if (!segment) continue;

    const traffic = getCongestionLevel(
      edge.currentTrafficDelay > 0
        ? ROUTE_CONSTANTS.CONGESTION_THRESHOLDS.MODERATE
        : ROUTE_CONSTANTS.CONGESTION_THRESHOLDS.FREE_FLOW
    );

    const currentSpeed = edge.speedLimitKmh * (1 - edge.currentTrafficDelay / edge.baseTimeSeconds / 2);

    routeSegments.push({
      segmentId: edge.id,
      roadName: segment.name,
      roadType: edge.roadType,
      distanceKm: edge.distanceMeters / 1000,
      estimatedTimeMinutes: (edge.baseTimeSeconds + edge.currentTrafficDelay + edge.incidentDelay) / 60,
      instruction: generateInstruction(i, path.length, edge, segment),
      maneuver: getManeuverType(i, path.length, edge),
      trafficLevel: traffic,
      currentSpeedKmh: Math.round(currentSpeed),
      isToll: edge.isToll,
      tollAmount: edge.tollAmount,
    });
  }

  return routeSegments;
}

function generateInstruction(
  index: number,
  totalNodes: number,
  edge: GraphEdge,
  segment: RoadSegment
): string {
  if (index === 0) {
    return `Head ${getDirection(edge)} on ${segment.name || edge.roadType}`;
  }
  if (index === totalNodes - 2) {
    return `Arrive at destination`;
  }
  return `Continue on ${segment.name || edge.roadType}`;
}

function getDirection(edge: GraphEdge): string {
  // Simplified direction
  return 'forward';
}

function getManeuverType(index: number, totalNodes: number, edge: GraphEdge): ManeuverType {
  if (index === 0) return 'DEPART';
  if (index === totalNodes - 2) return 'ARRIVE';
  return 'STRAIGHT';
}

// ============================================
// EXPORTS
// ============================================

export {
  MinHeap,
};
