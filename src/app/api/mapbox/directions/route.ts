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

  // Build the Mapbox Directions v5 URL for a given routing profile.
  const buildUrl = (profile: 'driving-traffic' | 'driving') =>
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
    `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;

  // Prefer the traffic-aware profile so the ETA reflects current road
  // conditions (congestion, closures) rather than free-flow speed. If it
  // fails (coverage gaps / rate limits), fall back to the plain driving
  // profile so we still return a real route + ETA.
  const fetchRoute = async (profile: 'driving-traffic' | 'driving'): Promise<Response> =>
    fetch(buildUrl(profile));

  let mapboxRes: Response;
  let profileUsed: 'driving-traffic' | 'driving' = 'driving-traffic';
  try {
    mapboxRes = await fetchRoute('driving-traffic');
    if (!mapboxRes.ok) {
      console.warn('[mapbox/directions] driving-traffic returned', mapboxRes.status, '— falling back to driving');
      profileUsed = 'driving';
      mapboxRes = await fetchRoute('driving');
    }
  } catch (err) {
    // Network error on the first attempt — try the plain profile once.
    try {
      profileUsed = 'driving';
      mapboxRes = await fetchRoute('driving');
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to reach Mapbox' }, { status: 502 });
    }
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
      trafficAware: profileUsed === 'driving-traffic',
    },
  });
}
