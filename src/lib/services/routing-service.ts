/**
 * Smart Ride Routing Service
 * Handles route calculation, distance estimation, and geocoding
 */

// ============================================
// Types
// ============================================

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distance: number; // in kilometers
  duration: number; // in minutes
  geometry: string; // encoded polyline
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface GeocodingResult {
  address: string;
  coordinates: Coordinate;
  displayName: string;
  placeId?: string;
  type?: string;
}

export type VehicleType = 'moto' | 'economy' | 'premium' | 'electric';

// ============================================
// Constants
// ============================================

// Average speeds in km/h for different vehicle types
const VEHICLE_SPEEDS: Record<VehicleType, number> = {
  moto: 40,       // Boda boda - faster in traffic
  economy: 35,    // Economy cars
  premium: 35,    // Premium cars (comfort over speed)
  electric: 40,   // Electric vehicles - efficient city driving
};

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// ============================================
// Distance Calculation (Haversine Formula)
// ============================================

/**
 * Calculate the great-circle distance between two points
 * using the Haversine formula.
 * 
 * @param point1 - Starting coordinate
 * @param point2 - Ending coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// ============================================
// Travel Time Estimation
// ============================================

/**
 * Calculate estimated travel time based on distance and vehicle type
 * 
 * @param distanceKm - Distance in kilometers
 * @param vehicleType - Type of vehicle
 * @param trafficFactor - Multiplier for traffic conditions (1.0 = normal, 1.5 = heavy traffic)
 * @returns Estimated time in minutes
 */
export function calculateTravelTime(
  distanceKm: number,
  vehicleType: VehicleType = 'economy',
  trafficFactor: number = 1.0
): number {
  const speedKmh = VEHICLE_SPEEDS[vehicleType];
  const effectiveSpeed = speedKmh / trafficFactor;
  const timeHours = distanceKm / effectiveSpeed;
  return Math.ceil(timeHours * 60); // Convert to minutes and round up
}

/**
 * Get the average speed for a vehicle type
 */
export function getVehicleSpeed(vehicleType: VehicleType): number {
  return VEHICLE_SPEEDS[vehicleType];
}

/**
 * Get all vehicle speeds
 */
export function getAllVehicleSpeeds(): Record<VehicleType, number> {
  return { ...VEHICLE_SPEEDS };
}

// ============================================
// Route Geometry Generation
// ============================================

/**
 * Generate a simplified polyline between two coordinates
 * Uses intermediate points to create a realistic route shape
 * 
 * @param start - Starting coordinate
 * @param end - Ending coordinate
 * @param numPoints - Number of intermediate points (default: 10)
 * @returns Encoded polyline string
 */
export function generateRouteGeometry(
  start: Coordinate,
  end: Coordinate,
  numPoints: number = 10
): string {
  const points: Coordinate[] = [];
  
  // Add start point
  points.push(start);
  
  // Generate intermediate points with slight curves
  for (let i = 1; i < numPoints; i++) {
    const fraction = i / numPoints;
    const point = interpolateCoordinate(start, end, fraction);
    
    // Add slight random curve to make it look more realistic
    // In production, this would use actual road data
    const curveOffset = Math.sin(fraction * Math.PI) * 0.002;
    
    points.push({
      latitude: point.latitude + curveOffset,
      longitude: point.longitude + curveOffset * 0.5,
    });
  }
  
  // Add end point
  points.push(end);
  
  return encodePolyline(points);
}

/**
 * Interpolate between two coordinates
 */
function interpolateCoordinate(
  start: Coordinate,
  end: Coordinate,
  fraction: number
): Coordinate {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * fraction,
    longitude: start.longitude + (end.longitude - start.longitude) * fraction,
  };
}

/**
 * Encode coordinates into a polyline string (Google's encoded polyline algorithm)
 */
function encodePolyline(coordinates: Coordinate[]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const coord of coordinates) {
    const lat = Math.round(coord.latitude * 1e5);
    const lng = Math.round(coord.longitude * 1e5);

    encoded += encodeValue(lat - prevLat);
    encoded += encodeValue(lng - prevLng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

/**
 * Encode a single value for polyline encoding
 */
function encodeValue(value: number): string {
  let result = '';
  
  // Convert to unsigned
  let unsignedValue = value < 0 ? ~(value << 1) : value << 1;
  
  // Encode each 5-bit chunk
  while (unsignedValue >= 0x20) {
    result += String.fromCharCode((unsignedValue & 0x1f) | 0x20 + 63);
    unsignedValue >>= 5;
  }
  
  result += String.fromCharCode(unsignedValue + 63);
  
  return result;
}

/**
 * Decode a polyline string into coordinates
 */
export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}

// ============================================
// Full Route Calculation
// ============================================

/**
 * Calculate a complete route between two points
 * 
 * @param pickup - Pickup coordinate
 * @param destination - Destination coordinate
 * @param vehicleType - Vehicle type for time estimation
 * @param trafficFactor - Traffic multiplier
 * @returns Complete route result with distance, duration, and geometry
 */
export function calculateRoute(
  pickup: Coordinate,
  destination: Coordinate,
  vehicleType: VehicleType = 'economy',
  trafficFactor: number = 1.0
): RouteResult {
  const distance = calculateDistance(pickup, destination);
  const duration = calculateTravelTime(distance, vehicleType, trafficFactor);
  const geometry = generateRouteGeometry(pickup, destination);
  
  // Calculate bounding box
  const minLat = Math.min(pickup.latitude, destination.latitude);
  const maxLat = Math.max(pickup.latitude, destination.latitude);
  const minLng = Math.min(pickup.longitude, destination.longitude);
  const maxLng = Math.max(pickup.longitude, destination.longitude);

  return {
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    duration,
    geometry,
    boundingBox: {
      minLat,
      maxLat,
      minLng,
      maxLng,
    },
  };
}

// ============================================
// Geocoding (Mock Implementation)
// ============================================

// Mock location database for Kampala, Uganda
const MOCK_LOCATIONS: Record<string, GeocodingResult> = {
  'nakasero': {
    address: 'Nakasero, Kampala',
    coordinates: { latitude: 0.3177, longitude: 32.5814 },
    displayName: 'Nakasero, Kampala Central Division, Kampala, Uganda',
    type: 'suburb',
  },
  'kololo': {
    address: 'Kololo, Kampala',
    coordinates: { latitude: 0.3333, longitude: 32.5900 },
    displayName: 'Kololo, Kampala Central Division, Kampala, Uganda',
    type: 'suburb',
  },
  'mengo': {
    address: 'Mengo, Kampala',
    coordinates: { latitude: 0.3056, longitude: 32.5611 },
    displayName: 'Mengo, Rubaga Division, Kampala, Uganda',
    type: 'suburb',
  },
  'kabalagala': {
    address: 'Kabalagala, Kampala',
    coordinates: { latitude: 0.2994, longitude: 32.5944 },
    displayName: 'Kabalagala, Makindye Division, Kampala, Uganda',
    type: 'suburb',
  },
  'muyenga': {
    address: 'Muyenga, Kampala',
    coordinates: { latitude: 0.2867, longitude: 32.6028 },
    displayName: 'Muyenga, Makindye Division, Kampala, Uganda',
    type: 'suburb',
  },
  'kampala': {
    address: 'Kampala, Uganda',
    coordinates: { latitude: 0.3476, longitude: 32.5825 },
    displayName: 'Kampala, Central Region, Uganda',
    type: 'city',
  },
  'entebbe': {
    address: 'Entebbe, Uganda',
    coordinates: { latitude: 0.0619, longitude: 32.4642 },
    displayName: 'Entebbe, Wakiso District, Uganda',
    type: 'city',
  },
  'makeree': {
    address: 'Makerere, Kampala',
    coordinates: { latitude: 0.3370, longitude: 32.5703 },
    displayName: 'Makerere, Kawempe Division, Kampala, Uganda',
    type: 'suburb',
  },
  'kisaasi': {
    address: 'Kisaasi, Kampala',
    coordinates: { latitude: 0.3556, longitude: 32.5944 },
    displayName: 'Kisaasi, Kawempe Division, Kampala, Uganda',
    type: 'suburb',
  },
  'ntinda': {
    address: 'Ntinda, Kampala',
    coordinates: { latitude: 0.3583, longitude: 32.6111 },
    displayName: 'Ntinda, Nakawa Division, Kampala, Uganda',
    type: 'suburb',
  },
};

/**
 * Geocode an address string to coordinates (Mock implementation)
 * In production, this would call a real geocoding API like Google Maps or Mapbox
 * 
 * @param address - Address string to geocode
 * @returns Geocoding result or null if not found
 */
export function geocodeAddress(address: string): GeocodingResult | null {
  const normalizedAddress = address.toLowerCase().trim();
  
  // Check for exact match first
  if (MOCK_LOCATIONS[normalizedAddress]) {
    return MOCK_LOCATIONS[normalizedAddress];
  }
  
  // Check for partial match
  for (const [key, location] of Object.entries(MOCK_LOCATIONS)) {
    if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
      return location;
    }
  }
  
  // If no match, return a default Kampala location with the address
  return {
    address,
    coordinates: {
      latitude: 0.3476 + (Math.random() - 0.5) * 0.05,
      longitude: 32.5825 + (Math.random() - 0.5) * 0.05,
    },
    displayName: `${address}, Kampala, Uganda`,
    type: 'unknown',
  };
}

/**
 * Reverse geocode coordinates to an address (Mock implementation)
 * In production, this would call a real reverse geocoding API
 * 
 * @param coordinates - Coordinates to reverse geocode
 * @returns Geocoding result
 */
export function reverseGeocode(coordinates: Coordinate): GeocodingResult {
  // Find the nearest known location
  let nearestLocation: GeocodingResult | null = null;
  let minDistance = Infinity;
  
  for (const location of Object.values(MOCK_LOCATIONS)) {
    const distance = calculateDistance(coordinates, location.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }
  
  // If close enough to a known location, return it
  if (nearestLocation && minDistance < 5) {
    return {
      ...nearestLocation,
      displayName: `Near ${nearestLocation.displayName}`,
    };
  }
  
  // Otherwise return generic Kampala address
  return {
    address: `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`,
    coordinates,
    displayName: `Location in Kampala, Uganda`,
    type: 'coordinates',
  };
}

/**
 * Search for places by query string (Mock implementation)
 * 
 * @param query - Search query
 * @param limit - Maximum number of results
 * @returns Array of matching locations
 */
export function searchPlaces(query: string, limit: number = 5): GeocodingResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: GeocodingResult[] = [];
  
  for (const [key, location] of Object.entries(MOCK_LOCATIONS)) {
    if (key.includes(normalizedQuery) || location.displayName.toLowerCase().includes(normalizedQuery)) {
      results.push(location);
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate the bearing between two points in degrees
 */
export function calculateBearing(start: Coordinate, end: Coordinate): number {
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLng = toRadians(end.longitude - start.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate a point at a given distance and bearing from a start point
 */
export function calculateDestination(
  start: Coordinate,
  distanceKm: number,
  bearing: number
): Coordinate {
  const lat1 = toRadians(start.latitude);
  const lng1 = toRadians(start.longitude);
  const brng = toRadians(bearing);
  const d = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lng2),
  };
}

/**
 * Check if a point is within a given radius of another point
 */
export function isWithinRadius(
  center: Coordinate,
  point: Coordinate,
  radiusKm: number
): boolean {
  return calculateDistance(center, point) <= radiusKm;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
