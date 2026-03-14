/**
 * Smart Ride Mapbox Service
 * 
 * Comprehensive Mapbox API integration for Uganda-specific location services.
 * Includes geocoding, reverse geocoding, directions, and static maps.
 * 
 * API Documentation: https://docs.mapbox.com/api/search/
 */

// ==========================================
// Types
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
// Configuration
// ==========================================

const MAPBOX_API_BASE = 'https://api.mapbox.com';
const UGANDA_COUNTRY_CODE = 'ug';
const KAMPALA_CENTER: [number, number] = [32.5825, 0.3476]; // [lng, lat]

// Place types to search for in Uganda
const PLACE_TYPES = [
  'poi',          // Points of interest (restaurants, shops, etc.)
  'address',      // Street addresses
  'place',        // Cities, towns
  'locality',     // Neighborhoods
  'neighborhood', // Local areas
  'street',       // Streets
  'poi.landmark', // Landmarks
].join(',');

// Categories for POI filtering
const POI_CATEGORIES = {
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

// ==========================================
// Geocoding Service
// ==========================================

/**
 * Search for places in Uganda using Mapbox Geocoding API
 * 
 * Example: https://api.mapbox.com/geocoding/v5/mapbox.places/bugolobi.json
 *   ?country=ug
 *   &types=poi,address,place,locality,neighborhood
 *   &proximity=32.58,0.34
 *   &access_token=YOUR_TOKEN
 */
export async function searchPlaces(
  query: string,
  options?: {
    proximity?: [number, number];
    types?: string[];
    limit?: number;
    country?: string;
    bbox?: [number, number, number, number];
  }
): Promise<PlaceResult[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    console.error('Mapbox access token not found');
    return getFallbackPlaces(query);
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      country: options?.country || UGANDA_COUNTRY_CODE,
      types: options?.types?.join(',') || PLACE_TYPES,
      limit: String(options?.limit || 10),
      proximity: (options?.proximity || KAMPALA_CENTER).join(','),
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

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<PlaceResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      country: UGANDA_COUNTRY_CODE,
      types: PLACE_TYPES,
    });

    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`;
    
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

/**
 * Get places by category (restaurants, pharmacies, etc.)
 */
export async function getPlacesByCategory(
  category: keyof typeof POI_CATEGORIES,
  proximity?: [number, number],
  limit: number = 20
): Promise<PlaceResult[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    return getFallbackPlacesByCategory(category);
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
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
// Directions Service
// ==========================================

/**
 * Get driving directions between two points
 */
export async function getDirections(
  origin: [number, number],
  destination: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      geometries: 'geojson',
      steps: 'true',
      overview: 'full',
    });

    const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
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
// Static Map Service
// ==========================================

/**
 * Generate a static map image URL
 */
export function getStaticMapUrl(options: {
  center?: [number, number];
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Array<{
    coordinates: [number, number];
    color: string;
    label?: string;
  }>;
  path?: Array<[number, number]>;
  style?: 'streets-v11' | 'satellite-v9' | 'dark-v11' | 'light-v11' | 'navigation-night-v1';
}): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
    return '';
  }

  const {
    center = KAMPALA_CENTER,
    zoom = 14,
    width = 400,
    height = 300,
    markers = [],
    path = [],
    style = 'streets-v11',
  } = options;

  // Build overlays string
  const overlays: string[] = [];

  // Add path if provided
  if (path.length > 0) {
    const pathCoords = path.map(c => `[${c.join(',')}]`).join('');
    overlays.push(`path-3+00FF88(${pathCoords})`);
  }

  // Add markers
  markers.forEach(marker => {
    const label = marker.label ? `-${marker.label}` : '';
    overlays.push(`pin-s${label}+${marker.color.replace('#', '')}(${marker.coordinates.join(',')})`);
  });

  const overlayString = overlays.length > 0 ? overlays.join(',') + ',' : '';
  
  return `${MAPBOX_API_BASE}/styles/v1/mapbox/${style}/static/${overlayString}${center[0]},${center[1]},${zoom}/${width}x${height}@2x?access_token=${token}`;
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
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (!token) {
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

  // Calculate center between points
  const centerLng = (origin[0] + destination[0]) / 2;
  const centerLat = (origin[1] + destination[1]) / 2;

  return `${MAPBOX_API_BASE}/styles/v1/mapbox/${style}/static/${pathOverlay},${pickupMarker},${destMarker}/auto/${width}x${height}@2x?padding=50&access_token=${token}`;
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
// Export Default
// ==========================================

const mapboxService = {
  searchPlaces,
  reverseGeocode,
  getPlacesByCategory,
  getDirections,
  getStaticMapUrl,
  getRouteMapUrl,
  POI_CATEGORIES,
  KAMPALA_CENTER,
};

export default mapboxService;
