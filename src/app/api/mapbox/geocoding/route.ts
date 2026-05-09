/**
 * Mapbox Geocoding API Route
 * 
 * Server-side proxy for Mapbox Geocoding API to keep access token secure.
 * Searches for places in Uganda with specific types (POI, addresses, etc.)
 * 
 * Endpoint: /api/mapbox/geocoding?search=bugolobi
 */

import { NextRequest, NextResponse } from 'next/server';

const MAPBOX_API_BASE = 'https://api.mapbox.com';

// Uganda country code
const COUNTRY_CODE = 'ug';

// Place types for comprehensive search
const PLACE_TYPES = 'poi,address,place,locality,neighborhood,street,poi.landmark';

// Kampala center for proximity bias [lng, lat]
const KAMPALA_CENTER = '32.58,0.34';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('search');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const types = searchParams.get('types');
  const limit = searchParams.get('limit') || '10';
  const country = searchParams.get('country') || COUNTRY_CODE;

  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'Mapbox access token not configured' },
      { status: 500 }
    );
  }

  // If lat/lng provided, do reverse geocoding
  if (lat && lng) {
    return handleReverseGeocode(parseFloat(lat), parseFloat(lng), token);
  }

  // Otherwise, do forward geocoding (search)
  if (!query) {
    return NextResponse.json(
      { error: 'Search query required' },
      { status: 400 }
    );
  }

  return handleForwardGeocode(query, {
    token,
    types: types || PLACE_TYPES,
    limit: parseInt(limit),
    country,
    proximity: searchParams.get('proximity') || KAMPALA_CENTER,
  });
}

async function handleForwardGeocode(
  query: string,
  options: {
    token: string;
    types: string;
    limit: number;
    country: string;
    proximity: string;
  }
) {
  try {
    const params = new URLSearchParams({
      access_token: options.token,
      country: options.country,
      types: options.types,
      limit: String(options.limit),
      proximity: options.proximity,
      autocomplete: 'true',
      fuzzyMatch: 'true',
    });

    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Mapbox geocoding error:', error);
      return NextResponse.json(
        { error: 'Failed to geocode location' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform response to simplified format
    const places = data.features?.map((feature: { id: string; text: string; address?: string; properties?: { address?: string }; place_name: string; center: number[]; place_type: string[]; relevance: number }) => ({
      id: feature.id,
      name: feature.text,
      address: feature.address || feature.properties?.address || '',
      fullAddress: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type,
      relevance: feature.relevance,
    })) || [];

    return NextResponse.json({
      success: true,
      places,
      query: data.query,
      attribution: data.attribution,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to search for places' },
      { status: 500 }
    );
  }
}

async function handleReverseGeocode(lat: number, lng: number, token: string) {
  try {
    const params = new URLSearchParams({
      access_token: token,
      types: PLACE_TYPES,
    });

    // Mapbox expects [lng, lat] format
    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to reverse geocode' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const places = data.features?.map((feature: { id: string; text: string; address?: string; properties?: { address?: string }; place_name: string; center: number[]; place_type: string[] }) => ({
      id: feature.id,
      name: feature.text,
      address: feature.address || feature.properties?.address || '',
      fullAddress: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type,
    })) || [];

    return NextResponse.json({
      success: true,
      places,
      coordinates: { lat, lng },
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode' },
      { status: 500 }
    );
  }
}
