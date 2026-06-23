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

  await setServiceRoleContext();
  try {
    const riders = await db.rider.findMany({
      where,
      select: { currentLatitude: true, currentLongitude: true },
      take: 50,
    });

    const drivers = riders
      .filter((r) => r.currentLatitude != null && r.currentLongitude != null)
      .map((r, i) => {
        const distanceKm = haversineKm(lat, lng, r.currentLatitude!, r.currentLongitude!);
        return {
          id: `drv-${i}`, // anonymous key only — never the real rider id
          latitude: r.currentLatitude!,
          longitude: r.currentLongitude!,
          distanceKm: Math.round(distanceKm * 10) / 10,
          etaMin: Math.max(1, Math.round((distanceKm / AVG_URBAN_SPEED_KMH) * 60)),
        };
      })
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);

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
