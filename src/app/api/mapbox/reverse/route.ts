// ============================================
// SMART RIDE - MAPBOX REVERSE GEOCODING API
// ============================================
// Proxies Mapbox reverse geocoding requests.
// Accepts lat/lng and returns a place name.
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// GET /api/mapbox/reverse - Reverse geocode coordinates
// No auth required — location picking happens before login
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Validate coordinates
    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat and lng query parameters are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lat or lng values' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Get Mapbox access token
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
                        process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
                        process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (!mapboxToken) {
      return NextResponse.json(
        { success: false, error: 'Mapbox access token not configured' },
        { status: 500 }
      );
    }

    // Call Mapbox reverse geocoding API
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.mapbox-places/${longitude},${latitude}.json?access_token=${mapboxToken}&limit=1`;

    const response = await fetch(mapboxUrl);

    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch location from Mapbox' },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No location found for these coordinates' },
        { status: 404 }
      );
    }

    const placeName = data.features[0].place_name;

    return NextResponse.json({
      success: true,
      data: {
        placeName,
        latitude,
        longitude,
        features: data.features,
      },
    });
  } catch (error: unknown) {
    console.error('Mapbox reverse geocoding error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}
