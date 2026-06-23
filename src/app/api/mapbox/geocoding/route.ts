/**
 * Mapbox Geocoding API Route (with curated Kampala POI merge)
 *
 * Server-side proxy for Mapbox Geocoding that ALSO merges a curated Kampala
 * POI database. Mapbox geocoding has poor POI coverage for Uganda — searches
 * like "Acacia Mall" or "Garden City" return zero results from Mapbox alone.
 * We rank curated matches first, then append Mapbox results (deduped).
 *
 * All results use the UnifiedPlace shape (name/lat/lng + place_name/center
 * aliases) so the frontend never branches on data source.
 *
 * SECURITY: Rate limited to prevent Mapbox quota exhaustion.
 *
 * GET /api/mapbox/geocoding?search=acacia            → forward search
 * GET /api/mapbox/geocoding?search=&popular=true     → popular places (empty state)
 * GET /api/mapbox/geocoding?lat=0.34&lng=32.58       → reverse geocode
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { getMapboxToken } from '@/lib/mapbox-token';
import {
  getPopularKampalaPlaces,
  type UnifiedPlace,
} from '@/lib/geo/kampala-places';

const MAPBOX_API_BASE = 'https://api.mapbox.com';
const COUNTRY_CODE = 'ug';
const PLACE_TYPES = 'poi,address,place,locality,neighborhood,poi.landmark';
const KAMPALA_CENTER = '32.58,0.34'; // [lng,lat] proximity bias

export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.search);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('search');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const types = searchParams.get('types');
  const limit = parseInt(searchParams.get('limit') || '10');
  const country = searchParams.get('country') || COUNTRY_CODE;
  const popular = searchParams.get('popular') === 'true';
  const proximity = searchParams.get('proximity') || KAMPALA_CENTER;

  const token = getMapboxToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Mapbox access token not configured' },
      { status: 500 },
    );
  }

  // Reverse geocoding when coordinates are supplied
  if (lat && lng) {
    return handleReverseGeocode(parseFloat(lat), parseFloat(lng), token);
  }

  // Empty query: return curated popular places for the search empty-state
  if (!query || query.trim().length === 0) {
    if (popular) {
      return NextResponse.json({ success: true, places: getPopularKampalaPlaces(8) });
    }
    return NextResponse.json({ success: false, error: 'Search query required' }, { status: 400 });
  }

  return handleForwardGeocode(query, { token, types: types || PLACE_TYPES, limit, country, proximity });
}

const PHOTON_BASE = 'https://photon.komoot.io';

async function handleForwardGeocode(
  query: string,
  options: { token: string; types: string; limit: number; country: string; proximity: string },
) {
  // proximity is "lng,lat" — Photon wants lat/lon separately.
  const [pLng, pLat] = options.proximity.split(',').map(Number);

  // 1. Photon (OpenStreetMap) — the POI source. Real businesses, cafes, malls,
  //    hospitals, fuel, pharmacies, landmarks across Uganda. No key, no hardcoding.
  let photonPlaces: UnifiedPlace[] = [];
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '10',
      lang: 'en',
    });
    if (!Number.isNaN(pLat) && !Number.isNaN(pLng)) {
      params.set('lat', String(pLat));
      params.set('lon', String(pLng));
    }
    const res = await fetch(`${PHOTON_BASE}/api/?${params}`, {
      headers: { 'User-Agent': 'SmartRide/1.0 (smartrideug.vercel.app)' },
    });
    if (res.ok) {
      const data = await res.json();
      photonPlaces = (data.features || [])
        .filter((f: any) => f?.properties?.countrycode === 'UG' && Array.isArray(f?.geometry?.coordinates))
        .map((f: any): UnifiedPlace => {
          const p = f.properties || {};
          const [lng, lat] = f.geometry.coordinates;
          const name = p.name || p.street || p.city || 'Unknown place';
          const streetLine = p.housenumber && p.street ? `${p.street} ${p.housenumber}` : p.street;
          const addr = [streetLine, p.district, p.city, p.state].filter(Boolean).join(', ');
          const fullAddress = addr ? `${name}, ${addr}` : `${name}, Uganda`;
          return {
            id: `photon-${p.osm_type || 'x'}${p.osm_id || Math.random().toString(36).slice(2)}`,
            name,
            address: addr,
            fullAddress,
            lat,
            lng,
            place_name: fullAddress,
            center: [lng, lat],
            category: p.osm_value || p.osm_key,
            source: 'osm',
            relevance: 1,
          } as UnifiedPlace;
        });
    } else {
      console.error('[geocoding] Photon error', res.status);
    }
  } catch (error) {
    console.error('[geocoding] Photon fetch failed:', error);
  }

  // 2. Mapbox geocoding — supplements with any roads/addresses Photon missed.
  let mapboxPlaces: UnifiedPlace[] = [];
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
    if (response.ok) {
      const data = await response.json();
      mapboxPlaces = (data.features || []).map((f: any): UnifiedPlace => ({
        id: f.id,
        name: f.text,
        address: f.address || f.properties?.address || '',
        fullAddress: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
        place_name: f.place_name,
        center: [f.center[0], f.center[1]],
        source: 'mapbox',
        relevance: f.relevance ?? 0.5,
      } as UnifiedPlace));
    }
  } catch (error) {
    console.error('[geocoding] Mapbox fetch failed:', error);
  }

  // 3. Photon (POIs) first, then Mapbox extras (deduped by name).
  const merged: UnifiedPlace[] = [...photonPlaces];
  const seen = new Set(photonPlaces.map((p) => p.name.toLowerCase()));
  for (const mp of mapboxPlaces) {
    const key = mp.name.toLowerCase();
    if (!seen.has(key)) {
      merged.push(mp);
      seen.add(key);
    }
  }

  return NextResponse.json({
    success: true,
    places: merged.slice(0, options.limit + 6),
    query,
  });
}

async function handleReverseGeocode(lat: number, lng: number, token: string) {
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
  }
  try {
    const params = new URLSearchParams({ access_token: token, types: PLACE_TYPES, limit: '1' });
    // Mapbox expects [lng,lat]; correct endpoint is mapbox.places
    const url = `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to reverse geocode' }, { status: 502 });
    }

    const data = await response.json();
    const places: UnifiedPlace[] = (data.features || []).map((f: {
      id: string; text: string; address?: string; properties?: { address?: string };
      place_name: string; center: number[]; place_type: string[];
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

    return NextResponse.json({ success: true, places, coordinates: { lat, lng } });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json({ success: false, error: 'Failed to reverse geocode' }, { status: 500 });
  }
}
