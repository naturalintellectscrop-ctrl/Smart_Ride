/**
 * Nearby Drivers API
 * GET /api/riders/nearby?lat=0.34&lng=32.58&taskType=SMART_BODA_RIDE&radiusKm=5
 *
 * Returns online, approved riders near a point so the app can show live driver
 * dots and a "nearest driver ~N min away" estimate before booking (Uber/SafeBoda
 * style). Returns NO personal data — only anonymized positions + ETA.
 *
 * ETA is a straight-line estimate (haversine ÷ average urban speed). We do NOT
 * call the Directions API per driver — that would be costly and slow for many
 * drivers; the precise route ETA is computed for the chosen trip only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { encodeGeohash, geohashNeighbors } from '@/lib/geo/geohash';
import type { Prisma, VehicleType } from '@prisma/client';

const AVG_URBAN_SPEED_KMH = 22; // Kampala mixed boda/car average
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function vehicleTypeFor(taskType: string | null): VehicleType | null {
  if (taskType === 'SMART_BODA_RIDE') return 'BODA';
  if (taskType === 'SMART_CAR_RIDE') return 'CAR';
  return null;
}

export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.search);
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radiusKm = Math.min(parseFloat(searchParams.get('radiusKm') || '5'), 15);
  const vehicleType = vehicleTypeFor(searchParams.get('taskType'));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: 'lat and lng are required' },
      { status: 400 },
    );
  }

  // Bounding box to let the DB index do the heavy filtering before we refine
  // with an exact haversine distance. 1° lat ≈ 111 km; lng scaled by cos(lat).
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const where: Prisma.RiderWhereInput = {
    isOnline: true,
    status: 'APPROVED',
    currentLatitude: { gte: lat - latDelta, lte: lat + latDelta },
    currentLongitude: { gte: lng - lngDelta, lte: lng + lngDelta },
  };
  if (vehicleType) where.vehicleType = vehicleType;

  const toDriver = (
    latitude: number,
    longitude: number,
    distanceKm: number,
    i: number,
    vType: VehicleType | null,
  ) => ({
    id: `drv-${i}`, // anonymous key only — never the real rider id
    latitude,
    longitude,
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMin: Math.max(1, Math.round((distanceKm / AVG_URBAN_SPEED_KMH) * 60)),
    vehicleType: vType, // BODA | CAR | BICYCLE | SCOOTER — lets the map pick an icon
  });

  await setServiceRoleContext();
  try {
    let drivers: Array<ReturnType<typeof toDriver>> = [];

    // ---- Primary path: PostGIS ST_DWithin (accurate + index-backed) ----
    // Falls back to a bounding-box scan if PostGIS isn't enabled yet.
    try {
      const radiusMeters = radiusKm * 1000;
      const vehicleFilter = vehicleType ? `AND "vehicleType" = $4` : '';
      const sql = `
        SELECT "currentLatitude" AS lat, "currentLongitude" AS lng, "vehicleType" AS vehicle_type,
          ST_Distance(
            ST_SetSRID(ST_MakePoint("currentLongitude","currentLatitude"),4326)::geography,
            ST_SetSRID(ST_MakePoint($1,$2),4326)::geography
          ) AS dist_m
        FROM "Rider"
        WHERE "isOnline" = true AND "status" = 'APPROVED'
          AND "currentLatitude" IS NOT NULL AND "currentLongitude" IS NOT NULL
          ${vehicleFilter}
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint("currentLongitude","currentLatitude"),4326)::geography,
            ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,
            $3
          )
        ORDER BY dist_m ASC
        LIMIT 8;`;
      const params: any[] = [lng, lat, radiusMeters];
      if (vehicleType) params.push(vehicleType);

      const rows = await db.$queryRawUnsafe<Array<{ lat: number; lng: number; dist_m: number; vehicle_type: VehicleType | null }>>(sql, ...params);
      drivers = rows.map((r, i) => toDriver(r.lat, r.lng, r.dist_m / 1000, i, r.vehicle_type));
    } catch (postgisErr) {
      // Shared refinement: exact haversine sort/limit on a candidate set.
      const refine = (
        rows: Array<{ currentLatitude: number | null; currentLongitude: number | null; vehicleType?: VehicleType | null }>,
      ) =>
        rows
          .filter((r) => r.currentLatitude != null && r.currentLongitude != null)
          .map((r) => ({ r, d: haversineKm(lat, lng, r.currentLatitude!, r.currentLongitude!) }))
          .filter((x) => x.d <= radiusKm)
          .sort((a, b) => a.d - b.d)
          .slice(0, 8)
          .map((x, i) => toDriver(x.r.currentLatitude!, x.r.currentLongitude!, x.d, i, x.r.vehicleType ?? null));

      // ---- Tier 2: geohash-prefix pre-filter (uses the geohash index) ----
      try {
        const precision = radiusKm <= 1.2 ? 6 : 5;
        const neighbors = geohashNeighbors(encodeGeohash(lat, lng, precision));
        const ghRiders = await db.rider.findMany({
          where: {
            isOnline: true,
            status: 'APPROVED',
            ...(vehicleType ? { vehicleType } : {}),
            OR: neighbors.map((g) => ({ geohash: { startsWith: g } })),
          },
          select: { currentLatitude: true, currentLongitude: true, vehicleType: true },
          take: 100,
        });
        drivers = refine(ghRiders);
        if (drivers.length === 0) throw new Error('geohash returned none — try bbox');
      } catch {
        // ---- Tier 3: bounding-box scan (always works, no special columns) ----
        console.warn('[riders/nearby] using bounding-box fallback');
        const riders = await db.rider.findMany({
          where,
          select: { currentLatitude: true, currentLongitude: true, vehicleType: true },
          take: 50,
        });
        drivers = refine(riders);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        drivers,
        count: drivers.length,
        nearestEtaMin: drivers.length > 0 ? drivers[0].etaMin : null,
      },
    });
  } catch (error) {
    console.error('[riders/nearby] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch nearby drivers' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}
