/**
 * Kampala Popular Places API
 *
 * Returns curated Kampala locations. Data lives in the shared module
 * @/lib/geo/kampala-places (single source of truth, also merged into
 * /api/mapbox/geocoding search results).
 *
 * Supports:
 *  - Category filtering (?category=shopping)
 *  - Search filtering (?search=ntinda)
 *  - Popular only (?popular=true)
 *  - Nearby sorting (?lat=0.34&lng=32.58)
 *
 * SECURITY: Rate limited to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { KAMPALA_PLACES, CATEGORY_LABELS, toUnifiedPlace } from '@/lib/geo/kampala-places';

export async function GET(request: NextRequest) {
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.search);
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const popularOnly = searchParams.get('popular') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');

  let places = [...KAMPALA_PLACES];

  if (category) {
    const categories = category.split(',');
    places = places.filter((p) => categories.includes(p.category));
  }

  if (popularOnly) {
    places = places.filter((p) => p.popular);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    places = places.filter((p) => {
      const searchable = `${p.name} ${p.address} ${p.fullAddress} ${p.description || ''}`.toLowerCase();
      return words.every((w) => w.length > 0 && searchable.includes(w));
    });
  }

  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    places.sort((a, b) => {
      const distA = Math.hypot(a.lat - latNum, a.lng - lngNum);
      const distB = Math.hypot(b.lat - latNum, b.lng - lngNum);
      return distA - distB;
    });
  }

  const sliced = places.slice(0, limit);

  return NextResponse.json({
    success: true,
    // Unified shape so this endpoint is interchangeable with /geocoding
    places: sliced.map((p) => toUnifiedPlace(p, 1)),
    categories: CATEGORY_LABELS,
    total: KAMPALA_PLACES.length,
    filtered: sliced.length,
  });
}
