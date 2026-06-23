/**
 * Geohash encoding (no external dependency).
 * A geohash encodes a lat/lng into a short string where shared prefixes mean
 * geographic proximity. We store it on riders so nearby lookups can do a cheap
 * indexed prefix match as a pre-filter before exact distance refinement.
 *
 * Precision guide (cell size):
 *   5 chars ≈ 4.9km × 4.9km   6 chars ≈ 1.2km × 0.6km   7 chars ≈ 153m × 153m
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude: number, longitude: number, precision = 7): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; }
      else { idx = idx * 2; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude >= latMid) { idx = idx * 2 + 1; latMin = latMid; }
      else { idx = idx * 2; latMax = latMid; }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

/**
 * The 8 neighbouring geohash cells (+ the cell itself) at the same precision.
 * Used so a proximity search isn't blind to drivers just across a cell border.
 */
export function geohashNeighbors(geohash: string): string[] {
  // Lightweight approach: decode to a point, then re-encode points nudged by
  // roughly one cell in each direction. Good enough for a coarse pre-filter.
  const { latitude, longitude, latErr, lonErr } = decodeGeohash(geohash);
  const p = geohash.length;
  const set = new Set<string>([geohash]);
  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      set.add(encodeGeohash(latitude + dLat * latErr * 2, longitude + dLon * lonErr * 2, p));
    }
  }
  return Array.from(set);
}

export function decodeGeohash(geohash: string): { latitude: number; longitude: number; latErr: number; lonErr: number } {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (const c of geohash) {
    const idx = BASE32.indexOf(c);
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) lonMin = lonMid; else lonMax = lonMid;
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) latMin = latMid; else latMax = latMid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
    latErr: (latMax - latMin) / 2,
    lonErr: (lonMax - lonMin) / 2,
  };
}
