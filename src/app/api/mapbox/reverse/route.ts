// ============================================
// SMART RIDE - MAPBOX REVERSE GEOCODING API
// ============================================
// Proxies Mapbox reverse geocoding requests.
// Accepts lat/lng and returns a human-readable address.
// Returns BOTH `places` (unified array) and `placeName`/`data` so every
// consumer (location-picker, ride-request) works without transformation.
// SECURITY: Rate limited to prevent Mapbox quota exhaustion.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { getMapboxToken } from '@/lib/mapbox-token';
import type { UnifiedPlace } from '@/lib/geo/kampala-places';

// GET /api/mapbox/reverse?lat=&lng=  — reverse geocode coordinates
// No auth required — location picking happens before login.
export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.search);
  }

  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat and lng query parameters are required' },
        { status: 400 },
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ success: false, error: 'Invalid lat or lng values' }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ success: false, error: 'Coordinates out of valid range' }, { status: 400 });
    }

    const mapboxToken = getMapboxToken();
    if (!mapboxToken) {
      return NextResponse.json({ success: false, error: 'Mapbox access token not configured' }, { status: 500 });
    }

    // FIX: correct geocoding endpoint is `mapbox.places` (the previous value
    // `mapbox.mapbox-places` does not exist and always 404'd, silently breaking
    // tap-to-pick reverse geocoding throughout the app).
    const mapboxUrl =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
      `?access_token=${mapboxToken}&limit=1`;

    const response = await fetch(mapboxUrl);
    if (!response.ok) {
      console.error('Mapbox reverse API error:', response.status, response.statusText);
      return NextResponse.json({ success: false, error: 'Failed to fetch location from Mapbox' }, { status: 502 });
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No location found for these coordinates' },
        { status: 404 },
      );
    }

    const feature = data.features[0];
    const placeName: string = feature.place_name;

    const places: UnifiedPlace[] = data.features.map((f: {
      id: string; text: string; address?: string; properties?: { address?: string };
      place_name: string; center: number[];
    }): UnifiedPlace => ({
      id: f.id,
      name: f.text,
      address: f.address || f.properties?.address || '',
      fullAddress: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
      place_name: f.place_name,
      center: [f.center[0], f.center[1]],
      source: 'mapbox',
      relevance: 1,
    } as UnifiedPlace));

    return NextResponse.json({
      success: true,
      places,
      placeName,
      data: { placeName, latitude, longitude, places },
    });
  } catch (error: unknown) {
    console.error('Mapbox reverse geocoding error:', error);
    return NextResponse.json({ success: false, error: 'An internal error occurred' }, { status: 500 });
  }
}
