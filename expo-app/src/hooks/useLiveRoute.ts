// ============================================
// SMART RIDE MOBILE - useLiveRoute
// ============================================
// Computes a live driving route (polyline) and a traffic-aware ETA between a
// moving origin (the driver's live GPS) and a destination (pickup or dropoff).
//
// The route + ETA come from the backend Directions API (Mapbox), NOT hardcoded.
// As the driver's position streams in (socket + poll), this refetches — but
// throttled so we don't spam the routing API: at most ~once / REFETCH_MS, and
// only when the origin has actually moved MIN_MOVE_KM (or the destination
// changed, e.g. pickup → dropoff after the passenger boards).
//
// If Directions fails, it degrades gracefully to a straight-line polyline and
// a haversine-based ETA so the UI never goes blank.
// ============================================

import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Coord, haversineKm, estimateEtaMinutes } from '../utils/ride';

export interface LiveRoute {
  routeCoordinates: Coord[];
  distanceKm: number | null;
  durationMin: number | null;
  loading: boolean;
}

// Don't refetch the route more than once per this window …
const REFETCH_MS = 8000;
// … unless the origin (driver) moved at least this far (≈40 m) or the
// destination changed. Prevents jitter-driven refetch storms.
const MIN_MOVE_KM = 0.04;

const EMPTY: LiveRoute = {
  routeCoordinates: [],
  distanceKm: null,
  durationMin: null,
  loading: false,
};

export function useLiveRoute(
  origin?: Coord | null,
  destination?: Coord | null,
  avgSpeedKmh?: number,
): LiveRoute {
  const [state, setState] = useState<LiveRoute>(EMPTY);
  const lastFetchAt = useRef(0);
  const lastOrigin = useRef<Coord | null>(null);
  const lastDest = useRef<Coord | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      setState(EMPTY);
      return;
    }

    const now = Date.now();
    const first = lastFetchAt.current === 0;
    const destChanged =
      !lastDest.current || haversineKm(lastDest.current, destination) > MIN_MOVE_KM;
    const originMoved =
      !lastOrigin.current || haversineKm(lastOrigin.current, origin) > MIN_MOVE_KM;
    const throttled = now - lastFetchAt.current < REFETCH_MS;

    // Always fetch on first run or when the destination leg changes. Otherwise
    // only fetch if the driver moved enough AND we're outside the throttle window.
    if (!first && !destChanged && (throttled || !originMoved)) return;

    let cancelled = false;
    lastFetchAt.current = now;
    lastOrigin.current = origin;
    lastDest.current = destination;
    setState((s) => ({ ...s, loading: true }));

    const fallback = (): LiveRoute => {
      const km = haversineKm(origin, destination);
      return {
        routeCoordinates: [origin, destination],
        distanceKm: km,
        durationMin: estimateEtaMinutes(km, avgSpeedKmh),
        loading: false,
      };
    };

    api
      .getDirections(origin, destination)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data && Array.isArray(res.data.geometry) && res.data.geometry.length > 1) {
          setState({
            routeCoordinates: res.data.geometry,
            distanceKm: res.data.distanceKm ?? null,
            durationMin: res.data.durationMin ?? null,
            loading: false,
          });
        } else {
          setState(fallback());
        }
      })
      .catch(() => {
        if (!cancelled) setState(fallback());
      });

    return () => {
      cancelled = true;
    };
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, avgSpeedKmh]);

  return state;
}
