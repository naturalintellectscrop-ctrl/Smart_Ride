# Task 7-c: Consolidate Duplicate Mapbox Services

## Summary
Consolidated two duplicate Mapbox service files into a single unified service at `/src/lib/mapbox/mapbox-service.ts`.

## Files Modified
1. **`/src/lib/mapbox/mapbox-service.ts`** — Complete rewrite combining all functionality from both files
2. **`/src/lib/maps/mapbox-service.ts`** — Replaced with thin re-export + deprecation notice
3. **`/src/components/maps/place-search.tsx`** — Updated imports to `@/lib/mapbox/mapbox-service`, function names updated
4. **`/src/components/maps/mapbox-map.tsx`** — Updated imports to `@/lib/mapbox/mapbox-service`, function names updated

## Key Design Decisions
- Both calling conventions preserved: simple (PlaceResult/RouteResult) and detailed (GeocodingResult/DirectionsResult)
- `searchPlaces` returns PlaceResult[] (with Kampala fallback), `searchPlacesDetailed` returns GeocodingResult[]
- `reverseGeocode` accepts both `(lat, lng)` and `(Coordinates)`, `reverseGeocodeDetailed` returns GeocodingResult
- `getDirections` supports both patterns, `getDirectionsMulti` for full multi-waypoint with driving-traffic
- Secondary file maps old names: searchPlaces→searchPlacesDetailed, reverseGeocode→reverseGeocodeDetailed, getDirections→getDirectionsMulti
- MapboxService class with static methods for class-based usage pattern

## Lint
Zero errors
