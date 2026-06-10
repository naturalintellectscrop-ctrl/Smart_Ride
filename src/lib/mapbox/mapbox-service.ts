/**
 * Smart Ride — Unified Mapbox Service
 *
 * Comprehensive Mapbox API integration for Uganda-specific location services.
 * Combines geocoding, reverse geocoding, directions, distance matrix,
 * static maps, ETA estimation, and Kampala fallback data.
 *
 * API Documentation: https://docs.mapbox.com/api/search/
 */

import { logger } from '@/lib/logging/logger';

// ==========================================
// Configuration
// ==========================================

const MAPBOX_API_BASE = 'https://api.mapbox.com';
const UGANDA_COUNTRY_CODE = 'ug';
const KAMPALA_CENTER: [number, number] = [32.5825, 0.3476]; // [lng, lat]

// Next.js uses NEXT_PUBLIC_ prefix; Expo uses EXPO_PUBLIC_ prefix
// Both are set in .env — prefer NEXT_PUBLIC_ for server-side, fall back to EXPO_PUBLIC_
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

/**
 * Check if Mapbox service is properly configured
 */
export function isConfigured(): boolean {
  return Boolean(MAPBOX_ACCESS_TOKEN);
}

/** Boolean export for quick checks */
export const mapboxConfigured = isConfigured();

/** Structured unavailability message */
const UNAVAILABLE_MESSAGE = 'Mapbox service not configured. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.';

// Place types to search for in Uganda
const PLACE_TYPES = [
  'poi',          // Points of interest (restaurants, shops, etc.)
  'address',      // Street addresses
  'place',        // Cities, towns
  'locality',     // Neighborhoods
  'neighborhood', // Local areas
  'poi.landmark', // Landmarks
].join(',');

// Categories for POI filtering
export const POI_CATEGORIES = {
  restaurant: 'food,restaurant',
  grocery: 'grocery,supermarket,convenience',
  pharmacy: 'health,pharmacy,hospital,clinic',
  shopping: 'shopping,mall,store',
  gas: 'fuel,gas_station',
  atm: 'atm,bank',
  hotel: 'lodging,hotel,hostel',
  school: 'school,university,college',
  government: 'government,municipal',
  transit: 'transit_station,bus_station',
};

// Export configuration object (from secondary file)
export const MAPBOX_CONFIG = {
  token: MAPBOX_ACCESS_TOKEN,
  style: 'mapbox://styles/mapbox/streets-v12',
  defaultCenter: { latitude: 0.3476, longitude: 32.5825 }, // Kampala, Uganda
  defaultZoom: 13,
  isConfigured: isConfigured(),
};

// ==========================================
// Types — From Primary (flat result types)
// ==========================================

export interface MapboxPlace {
  id: string;
  type: 'Feature';
  place_type: string[];
  relevance: number;
  address?: string;
  properties: {
    accuracy?: string;
    address?: string;
    category?: string;
    maki?: string;
    wikidata?: string;
    short_code?: string;
  };
  text: string;
  place_name: string;
  matching_place_name?: string;
  center: [number, number]; // [lng, lat]
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    short_code?: string;
    wikidata?: string;
    text: string;
  }>;
  bbox?: [number, number, number, number];
}

export interface MapboxGeocodingResponse {
  type: 'FeatureCollection';
  query: string[];
  features: MapboxPlace[];
  attribution: string;
}

export interface MapboxDirectionsResponse {
  code: string;
  routes: Array<{
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
    legs: Array<{
      distance: number;
      duration: number;
      summary: string;
      steps: Array<{
        distance: number;
        duration: number;
        geometry: {
          type: string;
          coordinates: [number, number][];
        };
        name: string;
        mode: string;
        maneuver: {
          type: string;
          instruction: string;
          location: [number, number];
        };
      }>;
    }>;
    distance: number;
    duration: number;
  }>;
  waypoints: Array<{
    distance: number;
    name: string;
    location: [number, number];
  }>;
}

/** Simple flat place result (from primary file) */
export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  fullAddress: string;
  lat: number;
  lng: number;
  type: string[];
  category?: string;
  distance?: number;
}

/** Simple route result (from primary file) */
export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][];
  steps: Array<{
    distance: number;
    duration: number;
    instruction: string;
    name: string;
  }>;
}

// ==========================================
// Types — From Secondary (detailed result types)
// ==========================================

/** Coordinate pair using semantic names (from secondary file) */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Detailed geocoding result with context parsing (from secondary file) */
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

/** Detailed directions result with legs and steps (from secondary file) */
export interface DirectionsResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
}

/** Distance matrix result (from secondary file) */
export interface DistanceMatrixResult {
  distances: number[][]; // meters
  durations: number[][]; // seconds
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
 * Get Mapbox tile URL for map display
 */
export function getMapTileUrl(style: string = 'streets-v12'): string {
  return `mapbox://styles/mapbox/${style}`;
}

// ==========================================
// Geocoding Service — searchPlaces (returns PlaceResult[])
// ==========================================

/**
 * Search for places in Uganda using Mapbox Geocoding API.
 * Returns simplified PlaceResult[] with Kampala fallback.
 *
 * Accepts proximity as either [lng, lat] tuple or Coordinates object.
 */
export async function searchPlaces(
  query: string,
  options?: {
    proximity?: [number, number] | Coordinates;
    types?: string[];
    limit?: number;
    country?: string;
    bbox?: [number, number, number, number];
  }
): Promise<PlaceResult[]> {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return getFallbackPlaces(query);
  }

  try {
    // Normalize proximity to [lng, lat] tuple
    let proximityTuple: [number, number] = KAMPALA_CENTER;
    if (options?.proximity) {
      if (Array.isArray(options.proximity)) {
        proximityTuple = options.proximity;
      } else {
        proximityTuple = [options.proximity.longitude, options.proximity.latitude];
      }
    }

    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      country: options?.country || UGANDA_COUNTRY_CODE,
      types: options?.types?.join(',') || PLACE_TYPES,
      limit: String(options?.limit || 10),
      proximity: proximityTuple.join(','),
      autocomplete: 'true',
      fuzzyMatch: 'true',
    });

    if (options?.bbox) {
      params.set('bbox', options.bbox.join(','));
    }

    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxGeocodingResponse = await response.json();

    return data.features.map(feature => ({
      id: feature.id,
      name: feature.text,
      address: feature.address || feature.properties?.address || '',
      fullAddress: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type,
      category: feature.properties?.category,
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    return getFallbackPlaces(query);
  }
}

// ==========================================
// Geocoding Service — searchPlacesDetailed (returns GeocodingResult[])
// ==========================================

/**
 * Search for places with detailed result format including context parsing.
 * Returns GeocodingResult[] with structured neighborhood/district/region info.
 *
 * This is the secondary-file searchPlaces API preserved for backward compatibility.
 */
export async function searchPlacesDetailed(
  query: string,
  options?: {
    proximity?: Coordinates;
    country?: string;
    limit?: number;
    types?: string[];
  }
): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];

  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return [];
  }

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
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`
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

// ==========================================
// Reverse Geocoding
// ==========================================

/**
 * Reverse geocode coordinates to get address.
 *
 * Accepts either (lat, lng) as separate numbers or a Coordinates object.
 * Returns simplified PlaceResult.
 */
export async function reverseGeocode(
  latOrCoordinates: number | Coordinates,
  lng?: number
): Promise<PlaceResult | null> {
  // Normalize arguments
  let lat: number;
  let longitude: number;

  if (typeof latOrCoordinates === 'object') {
    lat = latOrCoordinates.latitude;
    longitude = latOrCoordinates.longitude;
  } else {
    lat = latOrCoordinates;
    longitude = lng!;
  }

  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      country: UGANDA_COUNTRY_CODE,
      types: PLACE_TYPES,
    });

    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${longitude},${lat}.json?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxGeocodingResponse = await response.json();

    if (data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];

    return {
      id: feature.id,
      name: feature.text,
      address: feature.address || feature.properties?.address || '',
      fullAddress: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type,
      category: feature.properties?.category,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

// ==========================================
// Reverse Geocoding — Detailed (returns GeocodingResult)
// ==========================================

/**
 * Reverse geocode with detailed result format including context parsing.
 *
 * This preserves the secondary-file reverseGeocode API.
 */
export async function reverseGeocodeDetailed(
  coordinates: Coordinates
): Promise<GeocodingResult | null> {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return null;
  }

  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    limit: '1',
  });

  try {
    const response = await fetch(
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json?${params.toString()}`
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
// Category Search
// ==========================================

/**
 * Get places by category (restaurants, pharmacies, etc.)
 */
export async function getPlacesByCategory(
  category: keyof typeof POI_CATEGORIES,
  proximity?: [number, number],
  limit: number = 20
): Promise<PlaceResult[]> {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return getFallbackPlacesByCategory(category);
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      country: UGANDA_COUNTRY_CODE,
      types: 'poi',
      limit: String(limit),
      proximity: (proximity || KAMPALA_CENTER).join(','),
    });

    const categoryQuery = POI_CATEGORIES[category] || category;
    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(categoryQuery)}.json?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxGeocodingResponse = await response.json();

    return data.features.map(feature => ({
      id: feature.id,
      name: feature.text,
      address: feature.address || feature.properties?.address || '',
      fullAddress: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type,
      category: feature.properties?.category,
    }));
  } catch (error) {
    console.error('Error getting places by category:', error);
    return getFallbackPlacesByCategory(category);
  }
}

// ==========================================
// Directions — Simple (origin → destination)
// ==========================================

/**
 * Get driving directions between two points.
 * Returns simplified RouteResult with step instructions.
 */
export async function getDirections(
  origin: [number, number] | Coordinates[],
  destination?: [number, number] | { profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling'; alternatives?: boolean; steps?: boolean; geometries?: 'geojson' | 'polyline' | 'polyline6'; overview?: 'full' | 'simplified' | 'false'; annotations?: boolean },
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult | DirectionsResult | null> {
  // Detect calling convention:
  // Primary: getDirections([lng,lat], [lng,lat], 'driving')
  // Secondary: getDirections(Coordinates[], { profile: 'driving-traffic' })
  if (Array.isArray(origin) && origin.length > 0 && !Array.isArray(origin[0])) {
    // Could be either primary [lng, lat] tuple OR Coordinates[] with 2+ elements
    // Check if first element has 'latitude' property (Coordinates object)
    if (origin.length > 0 && typeof origin[0] === 'object' && 'latitude' in (origin[0] as any)) {
      // Secondary calling convention: Coordinates[] with options
      return getDirectionsMulti(
        origin as Coordinates[],
        destination as { profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling'; alternatives?: boolean; steps?: boolean; geometries?: 'geojson' | 'polyline' | 'polyline6'; overview?: 'full' | 'simplified' | 'false'; annotations?: boolean } | undefined
      );
    }
  }

  // Primary calling convention: getDirections([lng,lat], [lng,lat], profile)
  const originTuple = origin as [number, number];
  const destTuple = destination as [number, number];

  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      geometries: 'geojson',
      steps: 'true',
      overview: 'full',
    });

    const coordinates = `${originTuple[0]},${originTuple[1]};${destTuple[0]},${destTuple[1]}`;
    const url = `${MAPBOX_API_BASE}/directions/v5/mapbox/${profile}/${coordinates}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox Directions API error: ${response.status}`);
    }

    const data: MapboxDirectionsResponse = await response.json();

    if (data.code !== 'Ok' || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates,
      steps: route.legs[0].steps.map(step => ({
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver.instruction,
        name: step.name,
      })),
    };
  } catch (error) {
    console.error('Error getting directions:', error);
    return null;
  }
}

// ==========================================
// Directions — Multi-waypoint (returns DirectionsResult)
// ==========================================

/**
 * Get driving directions between two or more points with full options.
 * Supports multi-waypoint routing and driving-traffic profile.
 *
 * This preserves the secondary-file getDirections API for detailed routing.
 */
export async function getDirectionsMulti(
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

  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return null;
  }

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
      `${MAPBOX_API_BASE}/directions/v5/mapbox/${profile}/${coordinates}?${params.toString()}`
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

/**
 * Get distance and duration matrix between multiple origins and destinations
 */
export async function getDistanceMatrix(
  origins: Coordinates[],
  destinations: Coordinates[],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<DistanceMatrixResult | null> {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return null;
  }

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
      `${MAPBOX_API_BASE}/directions-matrix/v1/mapbox/${profile}/${allCoordinates}?${params.toString()}`
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
// Static Map Service — Merged from both files
// ==========================================

/**
 * Generate a static map image URL.
 *
 * Supports both coordinate formats:
 * - center as [lng, lat] tuple (primary)
 * - coordinates as Coordinates object (secondary)
 * Plus path overlay and style options from primary.
 */
export function getStaticMapUrl(options: {
  center?: [number, number] | Coordinates;
  coordinates?: Coordinates;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{
    coordinates: [number, number] | Coordinates;
    color: string;
    label?: string;
  }>;
  path?: Array<[number, number]>;
  style?: 'streets-v11' | 'streets-v12' | 'satellite-v9' | 'dark-v11' | 'light-v11' | 'navigation-night-v1';
}): string {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return '';
  }

  const {
    zoom = 14,
    width = 400,
    height = 300,
    markers = [],
    path = [],
    style = 'streets-v12',
  } = options;

  // Normalize center — prefer `center` (tuple), then `coordinates` (Coordinates object), then Kampala default
  let centerTuple: [number, number] = KAMPALA_CENTER;
  if (options.center) {
    if (Array.isArray(options.center)) {
      centerTuple = options.center;
    } else {
      centerTuple = [options.center.longitude, options.center.latitude];
    }
  } else if (options.coordinates) {
    centerTuple = [options.coordinates.longitude, options.coordinates.latitude];
  }

  // Build overlays string
  const overlays: string[] = [];

  // Add path if provided
  if (path.length > 0) {
    const pathCoords = path.map(c => `[${c.join(',')}]`).join('');
    overlays.push(`path-3+00FF88(${pathCoords})`);
  }

  // Add markers
  markers.forEach(marker => {
    let lngLat: [number, number];
    if (Array.isArray(marker.coordinates)) {
      lngLat = marker.coordinates;
    } else {
      lngLat = [marker.coordinates.longitude, marker.coordinates.latitude];
    }
    const label = marker.label ? `-${marker.label}` : '';
    const color = marker.color.replace('#', '');
    overlays.push(`pin-s${label}+${color}(${lngLat.join(',')})`);
  });

  const overlayString = overlays.length > 0 ? overlays.join(',') + ',' : '';
  const stylePath = style === 'streets-v12' ? 'streets-v12' : style;

  return `${MAPBOX_API_BASE}/styles/v1/mapbox/${stylePath}/static/${overlayString}${centerTuple[0]},${centerTuple[1]},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
}

/**
 * Generate a map with route between two points
 */
export function getRouteMapUrl(
  origin: [number, number],
  destination: [number, number],
  options?: {
    width?: number;
    height?: number;
    style?: 'streets-v11' | 'dark-v11';
  }
): string {
  if (!isConfigured()) {
    logger.warn(UNAVAILABLE_MESSAGE);
    return '';
  }

  const width = options?.width || 400;
  const height = options?.height || 300;
  const style = options?.style || 'streets-v11';

  // Build path and markers
  const pathCoords = `[${origin.join(',')}],[${destination.join(',')}]`;
  const pathOverlay = `path-4+00FF88-0.5(${pathCoords})`;

  const pickupMarker = `pin-s-a+00FF88(${origin.join(',')})`;
  const destMarker = `pin-s-b+FF6B35(${destination.join(',')})`;

  return `${MAPBOX_API_BASE}/styles/v1/mapbox/${style}/static/${pathOverlay},${pickupMarker},${destMarker}/auto/${width}x${height}@2x?padding=50&access_token=${MAPBOX_ACCESS_TOKEN}`;
}

// ==========================================
// Fallback Data (for offline/token issues)
// ==========================================

function getFallbackPlaces(query: string): PlaceResult[] {
  const ugandaPlaces: Record<string, PlaceResult[]> = {
    'bugolobi': [
      { id: 'ug_bugolobi_1', name: 'Bugolobi', address: 'Bugolobi, Kampala', fullAddress: 'Bugolobi, Kampala, Uganda', lat: 0.3167, lng: 32.6000, type: ['neighborhood'] },
      { id: 'ug_bugolobi_2', name: 'Bugolobi Market', address: 'Bugolobi Road', fullAddress: 'Bugolobi Market, Bugolobi Road, Kampala, Uganda', lat: 0.3170, lng: 32.6010, type: ['poi'], category: 'market' },
    ],
    'kololo': [
      { id: 'ug_kololo_1', name: 'Kololo', address: 'Kololo, Kampala', fullAddress: 'Kololo, Kampala, Uganda', lat: 0.3333, lng: 32.5833, type: ['neighborhood'] },
      { id: 'ug_kololo_2', name: 'Kololo Airstrip', address: 'Kololo Hill', fullAddress: 'Kololo Airstrip, Kololo Hill, Kampala, Uganda', lat: 0.3340, lng: 32.5850, type: ['poi.landmark'] },
    ],
    'ntinda': [
      { id: 'ug_ntinda_1', name: 'Ntinda', address: 'Ntinda, Kampala', fullAddress: 'Ntinda, Kampala, Uganda', lat: 0.3500, lng: 32.6167, type: ['neighborhood'] },
      { id: 'ug_ntinda_2', name: 'Ntinda Complex', address: 'Ntinda Road', fullAddress: 'Ntinda Complex, Ntinda Road, Kampala, Uganda', lat: 0.3510, lng: 32.6170, type: ['poi'], category: 'shopping' },
    ],
    'kampala': [
      { id: 'ug_kampala_1', name: 'Kampala Central', address: 'Kampala City Center', fullAddress: 'Kampala Central, Kampala, Uganda', lat: 0.3176, lng: 32.5825, type: ['place'] },
      { id: 'ug_kampala_2', name: 'Parliament of Uganda', address: 'Parliament Avenue', fullAddress: 'Parliament of Uganda, Parliament Avenue, Kampala, Uganda', lat: 0.3185, lng: 32.5820, type: ['poi'], category: 'government' },
      { id: 'ug_kampala_3', name: 'Kampala Road', address: 'Kampala Road', fullAddress: 'Kampala Road, Kampala, Uganda', lat: 0.3170, lng: 32.5830, type: ['street'] },
    ],
    'cafe java': [
      { id: 'ug_cafe_java_1', name: 'Cafe Javas', address: 'Kampala Road', fullAddress: 'Cafe Javas, Kampala Road, Kampala, Uganda', lat: 0.3180, lng: 32.5815, type: ['poi'], category: 'restaurant' },
      { id: 'ug_cafe_java_2', name: 'Cafe Javas', address: 'Garden City Mall', fullAddress: 'Cafe Javas, Garden City Mall, Yusuf Lule Road, Kampala, Uganda', lat: 0.3175, lng: 32.5900, type: ['poi'], category: 'restaurant' },
    ],
  };

  const normalizedQuery = query.toLowerCase();

  // Check for exact matches
  for (const [key, places] of Object.entries(ugandaPlaces)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return places;
    }
  }

  // Return popular places if no match
  return [
    { id: 'ug_kampala_1', name: 'Kampala Central', address: 'Kampala City Center', fullAddress: 'Kampala Central, Kampala, Uganda', lat: 0.3176, lng: 32.5825, type: ['place'] },
    { id: 'ug_makerere_1', name: 'Makerere University', address: 'Makerere Hill', fullAddress: 'Makerere University, Makerere Hill, Kampala, Uganda', lat: 0.3350, lng: 32.5700, type: ['poi'], category: 'school' },
    { id: 'ug_garden_city_1', name: 'Garden City Mall', address: 'Yusuf Lule Road', fullAddress: 'Garden City Mall, Yusuf Lule Road, Kampala, Uganda', lat: 0.3175, lng: 32.5900, type: ['poi'], category: 'shopping' },
  ];
}

function getFallbackPlacesByCategory(category: keyof typeof POI_CATEGORIES): PlaceResult[] {
  const categoryPlaces: Record<string, PlaceResult[]> = {
    restaurant: [
      { id: 'ug_rest_1', name: 'Cafe Javas', address: 'Kampala Road', fullAddress: 'Cafe Javas, Kampala Road, Kampala, Uganda', lat: 0.3180, lng: 32.5815, type: ['poi'], category: 'restaurant' },
      { id: 'ug_rest_2', name: 'Java House', address: 'Garden City Mall', fullAddress: 'Java House, Garden City Mall, Kampala, Uganda', lat: 0.3175, lng: 32.5900, type: ['poi'], category: 'restaurant' },
      { id: 'ug_rest_3', name: 'The Henley Duck', address: 'Kololo', fullAddress: 'The Henley Duck, Kololo, Kampala, Uganda', lat: 0.3330, lng: 32.5830, type: ['poi'], category: 'restaurant' },
    ],
    pharmacy: [
      { id: 'ug_pharm_1', name: 'Medi Pharm', address: 'Kampala Road', fullAddress: 'Medi Pharm, Kampala Road, Kampala, Uganda', lat: 0.3170, lng: 32.5820, type: ['poi'], category: 'pharmacy' },
      { id: 'ug_pharm_2', name: 'Abacus Pharmacy', address: 'Bugolobi', fullAddress: 'Abacus Pharmacy, Bugolobi, Kampala, Uganda', lat: 0.3165, lng: 32.6000, type: ['poi'], category: 'pharmacy' },
    ],
    grocery: [
      { id: 'ug_groc_1', name: 'Carrefour', address: 'Garden City Mall', fullAddress: 'Carrefour, Garden City Mall, Kampala, Uganda', lat: 0.3175, lng: 32.5900, type: ['poi'], category: 'grocery' },
      { id: 'ug_groc_2', name: 'Shoprite', address: 'Oasis Mall', fullAddress: 'Shoprite, Oasis Mall, Kampala, Uganda', lat: 0.3180, lng: 32.5850, type: ['poi'], category: 'grocery' },
    ],
    shopping: [
      { id: 'ug_shop_1', name: 'Garden City Mall', address: 'Yusuf Lule Road', fullAddress: 'Garden City Mall, Yusuf Lule Road, Kampala, Uganda', lat: 0.3175, lng: 32.5900, type: ['poi'], category: 'shopping' },
      { id: 'ug_shop_2', name: 'Oasis Mall', address: 'Yusuf Lule Road', fullAddress: 'Oasis Mall, Yusuf Lule Road, Kampala, Uganda', lat: 0.3180, lng: 32.5850, type: ['poi'], category: 'shopping' },
    ],
  };

  return categoryPlaces[category] || [];
}

// ==========================================
// MapboxService Class
// ==========================================

/**
 * Unified MapboxService class providing all Mapbox API functionality.
 * Can be used as a class instance or via the module-level named exports.
 */
export class MapboxService {
  // Configuration
  static readonly API_BASE = MAPBOX_API_BASE;
  static readonly KAMPALA_CENTER = KAMPALA_CENTER;
  static readonly UGANDA_COUNTRY_CODE = UGANDA_COUNTRY_CODE;
  static readonly POI_CATEGORIES = POI_CATEGORIES;
  static readonly CONFIG = MAPBOX_CONFIG;

  /** Check if the service is configured */
  static isConfigured = isConfigured;

  // Geocoding
  static searchPlaces = searchPlaces;
  static searchPlacesDetailed = searchPlacesDetailed;
  static reverseGeocode = reverseGeocode;
  static reverseGeocodeDetailed = reverseGeocodeDetailed;
  static getPlacesByCategory = getPlacesByCategory;

  // Directions
  static getDirections = getDirections;
  static getDirectionsMulti = getDirectionsMulti;

  // Distance Matrix
  static getDistanceMatrix = getDistanceMatrix;

  // Utility Functions
  static calculateDistance = calculateDistance;
  static estimateETA = estimateETA;
  static formatDistance = formatDistance;
  static formatDuration = formatDuration;

  // Map Services
  static getStaticMapUrl = getStaticMapUrl;
  static getRouteMapUrl = getRouteMapUrl;
  static getMapTileUrl = getMapTileUrl;
}

// ==========================================
// Default Export
// ==========================================

const mapboxService = {
  isConfigured,
  searchPlaces,
  searchPlacesDetailed,
  reverseGeocode,
  reverseGeocodeDetailed,
  getPlacesByCategory,
  getDirections,
  getDirectionsMulti,
  getDistanceMatrix,
  calculateDistance,
  estimateETA,
  formatDistance,
  formatDuration,
  getStaticMapUrl,
  getRouteMapUrl,
  getMapTileUrl,
  POI_CATEGORIES,
  KAMPALA_CENTER,
  MAPBOX_CONFIG,
  MapboxService,
};

export default mapboxService;
