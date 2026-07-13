// ============================================
// SMART RIDE MOBILE - RIDE HELPERS
// ============================================
// Small, dependency-free helpers for the real-time ride experience:
//  - plate masking (privacy: never expose the full plate)
//  - ETA formatting + haversine fallback estimation
//  - phase detection (before/after pickup)
//  - canned quick replies for the in-app chat
// ============================================

import { TaskStatus } from '../types';

export interface Coord {
  latitude: number;
  longitude: number;
}

/**
 * Partially mask a vehicle plate for display to the customer.
 * We show only the alphabetic region prefix and hide the numeric part so the
 * plate is recognizable ("is that my ride?") without being fully exposed.
 *
 *   maskPlate('UBA 123K') → 'UBA ••••'
 *   maskPlate('SB1234')   → 'SB ••••'
 */
export function maskPlate(plate?: string | null): string {
  if (!plate) return '••••';
  const cleaned = plate.trim().toUpperCase();
  if (!cleaned) return '••••';
  // Leading letters form the region/prefix; fall back to the first 2 chars.
  const match = cleaned.match(/^([A-Z]+)/);
  const prefix = match ? match[1] : cleaned.replace(/\s+/g, '').slice(0, 2);
  return `${prefix} ••••`;
}

/**
 * Ride phases before the passenger/parcel is picked up. During these phases the
 * driver is travelling TO the pickup, so the ETA is "driver arriving in …".
 */
const PRE_PICKUP_STATUSES: TaskStatus[] = [
  'CREATED',
  'MATCHING',
  'SEARCHING',
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
];

export function isBeforePickup(status: TaskStatus): boolean {
  return PRE_PICKUP_STATUSES.includes(status);
}

/**
 * Great-circle distance in kilometres between two coordinates.
 * Used as a fallback when the Directions API is unavailable.
 */
export function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rough ETA (minutes) from a straight-line distance. Only used when the live
 * Directions route can't be fetched — the real ETA comes from traffic-aware
 * routing. Urban Kampala average ~22 km/h.
 */
export function estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 22): number {
  if (!isFinite(distanceKm) || distanceKm <= 0) return 0;
  return (distanceKm / avgSpeedKmh) * 60;
}

/**
 * Human-readable ETA from a minutes value (may be fractional from routing).
 */
export function formatEta(minutes?: number | null): string {
  if (minutes == null || !isFinite(minutes)) return '—';
  const m = Math.round(minutes);
  if (m <= 0) return 'Arriving now';
  if (m === 1) return '1 min';
  return `${m} min`;
}

/**
 * Build a short vehicle description from a rider's vehicle record.
 *   { color: 'Red', make: 'Bajaj', model: 'Boxer' } → 'Red Bajaj Boxer'
 */
export function vehicleSummary(vehicle?: {
  make?: string;
  model?: string;
  color?: string;
} | null): string {
  if (!vehicle) return '';
  return [vehicle.color, vehicle.make, vehicle.model]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Canned messages the customer can tap to send instantly — no typing needed
 * and no phone number ever shared. Keep these short and unambiguous.
 */
export const RIDE_QUICK_REPLIES: string[] = [
  'I am waiting for you',
  'Are you coming?',
  'Please call me',
  "I'm at the pickup point",
];
