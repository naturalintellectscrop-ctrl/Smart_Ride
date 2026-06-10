/**
 * @deprecated This module is deprecated. Import from '@/lib/mapbox/mapbox-service' instead.
 *
 * This file exists only for backward compatibility and will be removed in a future release.
 * All functionality has been consolidated into the unified MapboxService at:
 *   @/lib/mapbox/mapbox-service
 *
 * Migration guide:
 *   - searchPlaces()       → searchPlacesDetailed()  (returns GeocodingResult[])
 *   - reverseGeocode()     → reverseGeocodeDetailed() (accepts Coordinates, returns GeocodingResult)
 *   - getDirections()      → getDirectionsMulti()     (accepts Coordinates[], returns DirectionsResult)
 *   - All other exports    → same name in @/lib/mapbox/mapbox-service
 */

export {
  // Types
  type Coordinates,
  type GeocodingResult,
  type DirectionsResult,
  type DistanceMatrixResult,
  type RouteStep,
  type RouteLeg,
  type GeocodingResponse,
  type DirectionsResponse,

  // Configuration
  isConfigured,
  mapboxConfigured,
  MAPBOX_CONFIG,

  // Functions — renamed to match old secondary API
  searchPlacesDetailed as searchPlaces,
  reverseGeocodeDetailed as reverseGeocode,
  getDirectionsMulti as getDirections,

  // Functions — same name
  getDistanceMatrix,
  calculateDistance,
  formatDistance,
  formatDuration,
  estimateETA,
  getMapTileUrl,
  getStaticMapUrl,

  // Class
  MapboxService,
} from '@/lib/mapbox/mapbox-service';
