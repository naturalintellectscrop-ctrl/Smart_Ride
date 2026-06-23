// ============================================
// SMART RIDE MOBILE - GEOFENCE HELPERS
// ============================================
// Lightweight circular geofencing used to auto-detect when a driver has
// arrived at the pickup or destination. Pairs with the existing background
// location tracking — no extra native modules required.
// ============================================

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;

/** Distance in metres between two coordinates (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** True when `point` is inside the circular geofence around `center`. */
export function isWithinGeofence(point: LatLng, center: LatLng, radiusMeters = 80): boolean {
  return distanceMeters(point, center) <= radiusMeters;
}

/** Default arrival radius (metres) — generous enough for GPS jitter in town. */
export const ARRIVAL_RADIUS_M = 80;
