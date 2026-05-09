/**
 * Mapbox Service for Smart Ride
 * Handles geocoding, directions, places search, and distance calculations
 */

// Mapbox configuration
// Expo release builds require EXPO_PUBLIC_ prefix
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_BASE_URL = 'https://api.mapbox.com';

// ==========================================
// Types
// ==========================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  id: string;
  placeName: string;
  address: string;
  coordinates: Coordinates;
  placeType: string[];
  context?: {
    neighborhood?: string;
    locality?: string;
    place?: string;
    district?: string;
    region?: string;
    country?: string;
  };
}

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: Coordinates;
  };
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export interface DirectionsResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  category?: string;
  distance?: number;
}

export interface GeocodingResponse {
  type: string;
  features: Array<{
    id: string;
    place_name: string;
    place_type: string[];
    center: [number, number];
    text: string;
    address?: string;
    context?: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

export interface DirectionsResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        maneuver: {
          location: [number, number];
          type: string;
          modifier?: string;
        };
      }>;
    }>;
  }>;
}

// ==========================================
// Geocoding API
// ==========================================

/**
 * Search for places by query string
 */
export async function searchPlaces(
  query: string,
  options?: {
    proximity?: Coordinates;
    country?: string;
    limit?: number;
    types?: string[];
  }
): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    limit: String(options?.limit || 10),
  });

  // Add proximity for better local results
  if (options?.proximity) {
    params.append('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
  }

  // Restrict to Uganda by default
  params.append('country', options?.country || 'ug');

  // Add place types if specified
  if (options?.types?.length) {
    params.append('types', options.types.join(','));
  }

  try {
    const response = await fetch(
      `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data: GeocodingResponse = await response.json();

    return data.features.map(feature => ({
      id: feature.id,
      placeName: feature.place_name,
      address: feature.address || feature.text,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
      placeType: feature.place_type,
      context: parseContext(feature.context),
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    limit: '1',
  });

  try {
    const response = await fetch(
      `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data: GeocodingResponse = await response.json();

    if (data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    return {
      id: feature.id,
      placeName: feature.place_name,
      address: feature.address || feature.text,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
      placeType: feature.place_type,
      context: parseContext(feature.context),
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// ==========================================
// Directions API
// ==========================================

/**
 * Get driving directions between two or more points
 */
export async function getDirections(
  waypoints: Coordinates[],
  options?: {
    profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
    alternatives?: boolean;
    steps?: boolean;
    geometries?: 'geojson' | 'polyline' | 'polyline6';
    overview?: 'full' | 'simplified' | 'false';
    annotations?: boolean;
  }
): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null;

  const profile = options?.profile || 'driving';
  const coordinates = waypoints
    .map(wp => `${wp.longitude},${wp.latitude}`)
    .join(';');

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    alternatives: String(options?.alternatives || false),
    steps: String(options?.steps !== false),
    geometries: options?.geometries || 'geojson',
    overview: options?.overview || 'full',
  });

  try {
    const response = await fetch(
      `${MAPBOX_BASE_URL}/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }

    const data: DirectionsResponse = await response.json();

    if (data.code !== 'Ok' || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      legs: route.legs.map(leg => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: '', // Mapbox doesn't provide text instructions in this format
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: {
              latitude: step.maneuver.location[1],
              longitude: step.maneuver.location[0],
            },
          },
        })),
      })),
    };
  } catch (error) {
    console.error('Directions error:', error);
    return null;
  }
}

// ==========================================
// Distance Matrix API
// ==========================================

export interface DistanceMatrixResult {
  distances: number[][]; // meters
  durations: number[][]; // seconds
}

/**
 * Get distance and duration matrix between multiple origins and destinations
 */
export async function getDistanceMatrix(
  origins: Coordinates[],
  destinations: Coordinates[],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<DistanceMatrixResult | null> {
  const sources = origins.map((_, i) => i).join(';');
  const destinationsIndices = destinations.map((_, i) => origins.length + i).join(';');
  
  const allCoordinates = [...origins, ...destinations]
    .map(c => `${c.longitude},${c.latitude}`)
    .join(';');

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    sources,
    destinations: destinationsIndices,
    annotations: 'distance,duration',
  });

  try {
    const response = await fetch(
      `${MAPBOX_BASE_URL}/directions-matrix/v1/mapbox/${profile}/${allCoordinates}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Distance matrix failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      distances: data.distances,
      durations: data.durations,
    };
  } catch (error) {
    console.error('Distance matrix error:', error);
    return null;
  }
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Calculate straight-line distance between two points (Haversine formula)
 */
export function calculateDistance(loc1: Coordinates, loc2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`;
  } else {
    return `${Math.round(meters / 1000)} km`;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

/**
 * Parse Mapbox context array into structured object
 */
function parseContext(context?: Array<{ id: string; text: string }>): GeocodingResult['context'] {
  if (!context) return undefined;

  const result: GeocodingResult['context'] = {};
  
  for (const item of context) {
    if (item.id.startsWith('neighborhood')) {
      result.neighborhood = item.text;
    } else if (item.id.startsWith('locality')) {
      result.locality = item.text;
    } else if (item.id.startsWith('place')) {
      result.place = item.text;
    } else if (item.id.startsWith('district')) {
      result.district = item.text;
    } else if (item.id.startsWith('region')) {
      result.region = item.text;
    } else if (item.id.startsWith('country')) {
      result.country = item.text;
    }
  }

  return result;
}

/**
 * Get ETA estimate based on distance and vehicle type
 */
export function estimateETA(distanceMeters: number, vehicleType: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER'): number {
  // Average speeds in km/h for Kampala traffic
  const speeds: Record<string, number> = {
    BODA: 35,      // Boda bodas are faster in traffic
    CAR: 25,       // Cars slower in traffic
    BICYCLE: 15,   // Bicycles
    SCOOTER: 30,   // Scooters
  };

  const speed = speeds[vehicleType] || 30;
  const distanceKm = distanceMeters / 1000;
  const timeHours = distanceKm / speed;
  
  return Math.round(timeHours * 3600); // Return seconds
}

// ==========================================
// Map Tile URL Helpers
// ==========================================

/**
 * Get Mapbox tile URL for map display
 */
export function getMapTileUrl(style: string = 'streets-v12'): string {
  return `mapbox://styles/mapbox/${style}`;
}

/**
 * Get static map image URL
 */
export function getStaticMapUrl(options: {
  coordinates: Coordinates;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{
    coordinates: Coordinates;
    color?: string;
    label?: string;
  }>;
}): string {
  const { coordinates, zoom = 15, width = 400, height = 300, markers } = options;
  
  let markerString = '';
  if (markers && markers.length > 0) {
    markerString = markers.map(m => 
      `pin-${m.label || 'm'}+${m.color || '00FF88'}(${m.coordinates.longitude},${m.coordinates.latitude})`
    ).join(',') + '/';
  }

  return `${MAPBOX_BASE_URL}/styles/v1/mapbox/streets-v12/static/${markerString}${coordinates.longitude},${coordinates.latitude},${zoom}/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;
}

// Export configuration
export const MAPBOX_CONFIG = {
  token: MAPBOX_ACCESS_TOKEN,
  style: 'mapbox://styles/mapbox/streets-v12',
  defaultCenter: { latitude: 0.3476, longitude: 32.5825 }, // Kampala, Uganda
  defaultZoom: 13,
};
