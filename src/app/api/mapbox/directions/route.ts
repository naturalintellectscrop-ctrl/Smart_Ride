/**
 * Mapbox Directions API Proxy
 * GET /api/mapbox/directions?pickupLat=&pickupLng=&dropoffLat=&dropoffLng=
 *
 * Returns the driving route between two coordinates:
 *   - geometry  : array of {latitude, longitude} waypoints for the polyline
 *   - distanceKm: road distance in kilometres
 *   - durationMin: estimated drive time in minutes
 *
 * Server-side proxy keeps the Mapbox token off the client bundle.
 * Rate-limited to prevent quota exhaustion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limit';
import { getMapboxToken } from '@/lib/mapbox-token';

export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const pickupLat  = parseFloat(searchParams.get('pickupLat')  || '');
  const pickupLng  = parseFloat(searchParams.get('pickupLng')  || '');
  const dropoffLat = parseFloat(searchParams.get('dropoffLat') || '');
  const dropoffLng = parseFloat(searchParams.get('dropoffLng') || '');

  if ([pickupLat, pickupLng, dropoffLat, dropoffLng].some(isNaN)) {
    return NextResponse.json(
      { success: false, error: 'pickupLat, pickupLng, dropoffLat, dropoffLng are required' },
      { status: 400 },
    );
  }

  const token = getMapboxToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Mapbox token not configured' },
      { status: 500 },
    );
  }

  // Mapbox Directions v5 — driving profile
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;

  let mapboxRes: Response;
  try {
    mapboxRes = await fetch(url);
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to reach Mapbox' }, { status: 502 });
  }

  if (!mapboxRes.ok) {
    const text = await mapboxRes.text();
    console.error('[mapbox/directions] Mapbox error', mapboxRes.status, text);
    return NextResponse.json(
      { success: false, error: `Mapbox returned ${mapboxRes.status}` },
      { status: 502 },
    );
  }

  const data = await mapboxRes.json();
  const route = data?.routes?.[0];

  if (!route) {
    return NextResponse.json({ success: false, error: 'No route found' }, { status: 404 });
  }

  // GeoJSON coordinates are [lng, lat]; flip to {latitude, longitude} for RN maps
  const geometry: Array<{ latitude: number; longitude: number }> =
    (route.geometry?.coordinates ?? []).map(([lng, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lng,
    }));

  const distanceKm  = Math.round((route.distance  / 1000) * 10) / 10; // metres → km, 1dp
  const durationMin = Math.round( route.duration  / 60);              // seconds → minutes

  return NextResponse.json({
    success: true,
    data: {
      geometry,
      distanceKm,
      durationMin,
    },
  });
}
