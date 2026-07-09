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
  searchKampalaPlaces,
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
const GEOAPIFY_BASE = 'https://api.geoapify.com/v1/geocode/autocomplete';

/** fetch with an abort timeout so a slow provider can't hang the request. */
async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Photon (komoot public instance) — free, no key. Default POI provider. */
async function searchPhoton(query: string, pLat: number, pLng: number): Promise<UnifiedPlace[]> {
  const params = new URLSearchParams({ q: query, limit: '10', lang: 'en' });
  if (!Number.isNaN(pLat) && !Number.isNaN(pLng)) {
    params.set('lat', String(pLat));
    params.set('lon', String(pLng));
  }
  const res = await fetchWithTimeout(`${PHOTON_BASE}/api/?${params}`, {
    headers: { 'User-Agent': 'SmartRide/1.0 (smartrideug.vercel.app)' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || [])
    .filter((f: any) => f?.properties?.countrycode === 'UG' && Array.isArray(f?.geometry?.coordinates))
    .map((f: any): UnifiedPlace => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const name = p.name || p.street || p.city || 'Unknown place';
      const streetLine = p.housenumber && p.street ? `${p.street} ${p.housenumber}` : p.street;
      const addr = [streetLine, p.district, p.city, p.state].filter(Boolean).join(', ');
      const fullAddress = addr ? `${name}, ${addr}` : `${name}, Uganda`;
      return {
        id: `osm-${p.osm_type || 'x'}${p.osm_id || Math.random().toString(36).slice(2)}`,
        name, address: addr, fullAddress, lat, lng,
        place_name: fullAddress, center: [lng, lat],
        category: p.osm_value || p.osm_key, source: 'osm', relevance: 1,
      } as UnifiedPlace;
    });
}

/** Geoapify — production OSM search (free tier + key, has an SLA). */
async function searchGeoapify(query: string, pLat: number, pLng: number, key: string): Promise<UnifiedPlace[]> {
  const params = new URLSearchParams({
    text: query, limit: '10', apiKey: key, filter: 'countrycode:ug', format: 'geojson',
  });
  if (!Number.isNaN(pLat) && !Number.isNaN(pLng)) params.set('bias', `proximity:${pLng},${pLat}`);
  const res = await fetchWithTimeout(`${GEOAPIFY_BASE}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || [])
    .filter((f: any) => Array.isArray(f?.geometry?.coordinates))
    .map((f: any): UnifiedPlace => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const name = p.name || p.address_line1 || p.formatted || 'Unknown place';
      const fullAddress = p.formatted || name;
      return {
        id: `geoapify-${p.place_id || Math.random().toString(36).slice(2)}`,
        name, address: p.address_line2 || '', fullAddress, lat, lng,
        place_name: fullAddress, center: [lng, lat],
        category: p.category, source: 'osm', relevance: 1,
      } as UnifiedPlace;
    });
}

// ============================================
// CATEGORY SEARCH (Geoapify Places API)
// ============================================
// Text search alone fails category-style queries: "fuel station" used to
// return a place literally NAMED "Fuel Station" in Karamoja instead of the
// Shell 500m away (runtime-audited). When the query looks like a category,
// we ALSO run a radius-bound Geoapify Places category search and rank those
// results first. Keys are matched as whole words against the query.
const CATEGORY_LEXICON: Array<{ match: RegExp; categories: string }> = [
  { match: /\b(fuel|petrol|gas station|shell|total energies|stabex|rubis)\b/i, categories: 'service.vehicle.fuel' },
  { match: /\b(pharmac\w*|chemist|drug ?shop)\b/i, categories: 'healthcare.pharmacy' },
  { match: /\b(clinic|hospital|health cent\w*|medical cent\w*)\b/i, categories: 'healthcare.hospital,healthcare.clinic_or_praxis' },
  { match: /\b(atm)\b/i, categories: 'service.financial.atm' },
  { match: /\b(bank)\b/i, categories: 'service.financial' },
  { match: /\b(supermarket|grocer\w*)\b/i, categories: 'commercial.supermarket' },
  { match: /\b(restaurant|food)\b/i, categories: 'catering.restaurant,catering.fast_food' },
  { match: /\b(cafe|café|coffee)\b/i, categories: 'catering.cafe' },
  { match: /\b(hotel|lodge|guest ?house)\b/i, categories: 'accommodation.hotel,accommodation.guest_house' },
  { match: /\b(school)\b/i, categories: 'education.school' },
  { match: /\b(university|campus)\b/i, categories: 'education.university' },
  { match: /\b(mall|shopping cent\w*)\b/i, categories: 'commercial.shopping_mall' },
  { match: /\b(police)\b/i, categories: 'service.police' },
];
const CATEGORY_RADIUS_M = 10_000;

/** Geoapify Places: find POIs BY KIND near the user (not by name). */
async function searchGeoapifyCategories(
  categories: string,
  pLat: number,
  pLng: number,
  key: string,
): Promise<UnifiedPlace[]> {
  if (Number.isNaN(pLat) || Number.isNaN(pLng)) return [];
  const params = new URLSearchParams({
    categories,
    filter: `circle:${pLng},${pLat},${CATEGORY_RADIUS_M}`,
    bias: `proximity:${pLng},${pLat}`,
    limit: '8',
    apiKey: key,
  });
  const res = await fetchWithTimeout(`https://api.geoapify.com/v2/places?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || [])
    .filter((f: any) => Array.isArray(f?.geometry?.coordinates) && f?.properties?.name)
    .map((f: any): UnifiedPlace => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const fullAddress = p.formatted || `${p.name}, Uganda`;
      return {
        id: `geoapify-${p.place_id || Math.random().toString(36).slice(2)}`,
        name: p.name, address: p.address_line2 || '', fullAddress, lat, lng,
        place_name: fullAddress, center: [lng, lat],
        category: Array.isArray(p.categories) ? p.categories[0] : undefined,
        source: 'osm', relevance: 1,
      } as UnifiedPlace;
    });
}

/**
 * POI search via OpenStreetMap. Uses Geoapify when GEOAPIFY_API_KEY is set
 * (production, SLA-backed); otherwise the free public Photon instance. Either
 * failure falls back to Photon, then to an empty list — never throws.
 */
async function fetchOsmPois(query: string, pLat: number, pLng: number): Promise<UnifiedPlace[]> {
  const key = process.env.GEOAPIFY_API_KEY;
  try {
    if (key) {
      const r = await searchGeoapify(query, pLat, pLng, key);
      if (r.length > 0) return r;
    }
    return await searchPhoton(query, pLat, pLng);
  } catch (e) {
    console.error('[geocoding] OSM POI provider failed:', (e as Error).message);
    try { return await searchPhoton(query, pLat, pLng); } catch { return []; }
  }
}

async function handleForwardGeocode(
  query: string,
  options: { token: string; types: string; limit: number; country: string; proximity: string },
) {
  // proximity is "lng,lat"; providers want lat/lng separately.
  const [pLng, pLat] = options.proximity.split(',').map(Number);

  // 1a. Category detection: "fuel station" / "pharmacy" / "clinic"-style
  //     queries also get a radius-bound Places-by-category search so nearby
  //     POIs of that KIND rank first (text search only matches names).
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  const lexiconHit = CATEGORY_LEXICON.find((c) => c.match.test(query));

  // 1b. OpenStreetMap POIs (Geoapify if keyed, else Photon) — real businesses,
  //     cafes, malls, hospitals, fuel, pharmacies, landmarks. No hardcoding.
  //     Category + text searches run in parallel.
  const [categoryPlaces, photonPlaces] = await Promise.all([
    lexiconHit && geoapifyKey
      ? searchGeoapifyCategories(lexiconHit.categories, pLat, pLng, geoapifyKey).catch((e) => {
          console.warn('[geocoding] category search failed:', (e as Error).message);
          return [] as UnifiedPlace[];
        })
      : Promise.resolve([] as UnifiedPlace[]),
    fetchOsmPois(query, pLat, pLng),
  ]);

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

  // 3. Merge: curated Kampala POIs FIRST (fuzzy/substring matched — this is
  //    what makes "aci" → Acacia Mall and "kol" → Kololo work), then OSM POIs
  //    sorted by distance to the proximity point (Photon largely ignores its
  //    bias param, which used to rank Mpigi villages above Kampala places),
  //    then Mapbox extras. Deduped by normalized name.
  const curatedPlaces = searchKampalaPlaces(query, 5);

  const distTo = (p: UnifiedPlace) => {
    if (Number.isNaN(pLat) || Number.isNaN(pLng)) return 0;
    const dLat = ((p.lat - pLat) * Math.PI) / 180;
    const dLng = ((p.lng - pLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((pLat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  // Text results sorted by distance; anything farther than ~100km from the
  // proximity point is demoted behind everything else (an exact-name match in
  // Karamoja must not outrank a nearby partial match).
  const FAR_KM = 100;
  const hasProx = !Number.isNaN(pLat) && !Number.isNaN(pLng);
  const sorted = [...photonPlaces].sort((a, b) => distTo(a) - distTo(b));
  const osmNear = hasProx ? sorted.filter((p) => distTo(p) <= FAR_KM) : sorted;
  const osmFar = hasProx ? sorted.filter((p) => distTo(p) > FAR_KM) : [];
  const categoryByProximity = [...categoryPlaces].sort((a, b) => distTo(a) - distTo(b));

  const merged: UnifiedPlace[] = [];
  const seen = new Set<string>();
  const push = (p: UnifiedPlace) => {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(p);
  };
  curatedPlaces.forEach(push);
  categoryByProximity.forEach(push); // nearby POIs of the requested kind
  osmNear.forEach(push);
  mapboxPlaces.forEach(push);
  osmFar.forEach(push); // distant text matches last

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
