/**
 * Smart Ride — Surge Pricing Bridge
 *
 * The missing link between the marketplace engine and the money.
 *
 * The scheduler writes SurgeRecord rows to the DATABASE, but the pricing
 * engine read surge from an in-memory `surgeZones` Map that nothing outside
 * pricing-engine.ts ever populated — and which would not survive a serverless
 * cold start or be shared across instances even if it had. So the marketplace
 * chain ran:
 *
 *   demand -> zone metrics -> surge calculated -> SurgeRecord written -> ✗
 *
 * and stopped. A surging zone never changed a single fare.
 *
 * This module closes that gap: it resolves the ACTIVE surge for a pickup
 * location straight from the database, so the multiplier the scheduler decided
 * is the multiplier the customer is quoted and the driver is paid on.
 */

import { db } from '@/lib/db';

/** Hard ceiling, independent of whatever a zone record claims. */
const MAX_SURGE_MULTIPLIER = 3.0;

export interface SurgeLookup {
  multiplier: number;
  isActive: boolean;
  zoneId?: string;
  zoneName?: string;
  /** Customer-safe explanation of why the fare is higher. */
  reason?: string;
}

const NO_SURGE: SurgeLookup = { multiplier: 1, isActive: false };

/** Distance in km between two points, flat-earth approximation. */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat1 - lat2) * 111;
  const dLng = (lng1 - lng2) * 111 * Math.cos((lat2 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Resolve the active surge multiplier for a pickup point.
 *
 * Returns 1.0 (no surge) for any failure — a surge lookup problem must never
 * block a booking or, worse, overcharge. Fail cheap, not expensive.
 */
export async function getSurgeForLocation(
  pickupLatitude?: number | null,
  pickupLongitude?: number | null
): Promise<SurgeLookup> {
  if (pickupLatitude == null || pickupLongitude == null) return NO_SURGE;

  try {
    const zones = await db.geographicZone.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        centerLatitude: true,
        centerLongitude: true,
        radiusKm: true,
      },
    });
    if (zones.length === 0) return NO_SURGE;

    // A point can sit in overlapping zones; the nearest centre wins so the
    // multiplier is deterministic rather than dependent on row order.
    const containing = zones
      .map(z => ({
        zone: z,
        d: distanceKm(pickupLatitude, pickupLongitude, z.centerLatitude, z.centerLongitude),
      }))
      .filter(x => x.d <= x.zone.radiusKm)
      .sort((a, b) => a.d - b.d);

    if (containing.length === 0) return NO_SURGE;

    const zone = containing[0].zone;
    const surge = await db.surgeRecord.findFirst({
      where: { zoneId: zone.id, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      select: { multiplier: true },
    });

    if (!surge || surge.multiplier <= 1) {
      return { ...NO_SURGE, zoneId: zone.id, zoneName: zone.name };
    }

    const multiplier = Math.min(surge.multiplier, MAX_SURGE_MULTIPLIER);
    return {
      multiplier,
      isActive: true,
      zoneId: zone.id,
      zoneName: zone.name,
      reason: `High demand in ${zone.name}`,
    };
  } catch (err) {
    // Never let a surge lookup break a booking.
    console.error('[surge] lookup failed, defaulting to no surge:', err);
    return NO_SURGE;
  }
}

/**
 * Apply a surge multiplier to a computed fare.
 *
 * Surge lifts the RIDE component and the rider's share, never the platform's
 * service fee — the point of surge is to pay drivers more for working scarce
 * conditions, not to widen the platform's cut.
 */
export function applySurgeToFare(
  fare: { totalAmount: number; riderEarnings: number; platformCommission: number },
  multiplier: number
): {
  totalAmount: number;
  riderEarnings: number;
  platformCommission: number;
  surgeMultiplier: number;
  surgeAmount: number;
} {
  if (!multiplier || multiplier <= 1) {
    return { ...fare, surgeMultiplier: 1, surgeAmount: 0 };
  }

  const capped = Math.min(multiplier, MAX_SURGE_MULTIPLIER);
  const surgeAmount = Math.round(fare.totalAmount * (capped - 1));

  return {
    totalAmount: fare.totalAmount + surgeAmount,
    // The entire surge premium goes to the rider.
    riderEarnings: fare.riderEarnings + surgeAmount,
    platformCommission: fare.platformCommission,
    surgeMultiplier: capped,
    surgeAmount,
  };
}
