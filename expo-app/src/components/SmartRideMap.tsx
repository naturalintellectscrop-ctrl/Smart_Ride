// ============================================
// SMART RIDE MOBILE - SMART RIDE MAP
// ============================================
// Unified map component using @rnmapbox/maps (Mapbox GL)
// Only Mapbox is used — react-native-maps has been removed
// to reduce APK size from ~174MB to ~80MB.
// Falls back to a simple placeholder on web platform
// or when Mapbox SDK is not available.
// CRITICAL: All Mapbox init is wrapped in try-catch
// to prevent app crash on open if SDK is missing.
// ============================================

import React, { useEffect, useState, useCallback, useRef, Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, MAPBOX_CONFIG, DEFAULT_LOCATION } from '../constants';

// ============================================
// TYPES
// ============================================

export interface SmartRideMapProps {
  style?: ViewStyle;
  initialLatitude?: number;
  initialLongitude?: number;
  pickup?: { latitude: number; longitude: number; title?: string };
  dropoff?: { latitude: number; longitude: number; title?: string };
  driverLocation?: { latitude: number; longitude: number; heading?: number };
  /** Which family marker the active-trip driver gets (boda / car / delivery). */
  driverKind?: 'boda' | 'car' | 'delivery';
  showUserLocation?: boolean;
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
  isPickupSelectionMode?: boolean;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    color?: string;
    icon?: string;
  }>;
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
  // Uber-style center-pin picker support:
  // - onCameraChanged fires continuously while the user drags the map
  // - onMapIdle fires once the map settles (use this to reverse-geocode)
  // - showCenterPin renders a fixed pin at the screen center
  onCameraChanged?: (center: { latitude: number; longitude: number }) => void;
  onMapIdle?: (center: { latitude: number; longitude: number }) => void;
  showCenterPin?: boolean;
  centerPinType?: 'pickup' | 'dropoff';
  // Live nearby drivers, rendered as branded per-vehicle markers (boda / car /
  // delivery). riderRole beats vehicleType for kind; heading rotates the
  // direction notch so vehicles read as moving along roads.
  driverPoints?: Array<{
    latitude: number;
    longitude: number;
    vehicleType?: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER' | null;
    riderRole?: string | null;
    heading?: number | null;
  }>;
}

// Which marker family member to show for a nearby provider.
export type ProviderKind = 'boda' | 'car' | 'delivery';

export function providerKindFor(d: { vehicleType?: string | null; riderRole?: string | null }): ProviderKind {
  if (d.riderRole === 'DELIVERY_PERSONNEL') return 'delivery';
  if (d.riderRole === 'SMART_CAR_DRIVER' || d.vehicleType === 'CAR') return 'car';
  return 'boda';
}

// ============================================
// SAFE MAPBOX INITIALIZATION
// ============================================
// CRITICAL: We must NOT call any Mapbox native methods at module scope.
// If the native SDK isn't linked properly, it will crash the app immediately.
// Instead, we lazily initialize on first render inside a try-catch.

let MapboxGL: any = null;
let mapboxAvailable = false;
let runtimeTokenFetchStarted = false;

/**
 * Validate the Mapbox token. Rejects obvious placeholders from .env.example
 * (e.g. "your-token-here") so we don't render a black map with a bogus token.
 *
 * IMPORTANT: Mapbox tokens are NOT standard JWTs.
 *   Format:  pk.<base64url-header>.<base64url-signature>
 *   - Header starts with "eyJ" (base64 of '{"').
 *   - Signature is ~22 base64url chars (NOT ~43 like standard JWT HS256).
 *
 * Do NOT reject based on signature length >= 40 — that incorrectly rejects
 * valid Mapbox public tokens and forces the "Map unavailable" fallback.
 * This was the root cause of the blank-map bug.
 */
function isValidMapboxToken(token: string | undefined): token is string {
  if (!token) return false;
  if (token.length <= 10) return false;
  if (!token.startsWith('pk.') && !token.startsWith('sk.')) return false;
  if (token.includes('your-token-here') || token.includes('xxxx')) return false;
  // pk.<header>.<signature> where header starts with "eyJ"
  const mapboxTokenRegex = /^(pk|sk)\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}$/;
  return mapboxTokenRegex.test(token);
}

/**
 * If the token wasn't baked in at build time (empty), fetch it at runtime
 * from the backend /api/config/mapbox-token endpoint. This runs once.
 * After fetching, it sets the token on the native Mapbox SDK and marks the
 * map as available so subsequent renders show the real map.
 */
async function ensureRuntimeToken() {
  if (runtimeTokenFetchStarted) return;
  runtimeTokenFetchStarted = true;
  try {
    const { api } = require('../services/api');
    const response = await api.fetchMapboxToken();
    if (response.success && response.data?.token && isValidMapboxToken(response.data.token)) {
      if (MapboxGL) {
        MapboxGL.setAccessToken(response.data.token);
        mapboxAvailable = true;
        console.log('[SmartRideMap] Mapbox token fetched at runtime — map enabled');
        // Notify any mounted maps to re-render
        runtimeTokenListeners.forEach((cb) => cb());
      }
    } else {
      console.warn('[SmartRideMap] Runtime token fetch returned no valid token');
    }
  } catch (e) {
    console.warn('[SmartRideMap] Runtime token fetch failed:', e);
  }
}

// Listeners that fire when the runtime token becomes available
const runtimeTokenListeners: Array<() => void> = [];

try {
  // Only import and initialize Mapbox on native platforms
  if (Platform.OS !== 'web') {
    MapboxGL = require('@rnmapbox/maps').default;
    const token = MAPBOX_CONFIG.accessToken;
    if (isValidMapboxToken(token) && MapboxGL) {
      MapboxGL.setAccessToken(token);
      mapboxAvailable = true;
      console.log('[SmartRideMap] Mapbox GL initialized with build-time token');
    } else {
      console.warn('[SmartRideMap] No build-time Mapbox token — will fetch at runtime');
      // Kick off the runtime fetch immediately
      ensureRuntimeToken();
    }
  } else {
    console.log('[SmartRideMap] Web platform — map disabled');
  }
} catch (error) {
  console.warn('[SmartRideMap] Mapbox SDK not available:', error);
  MapboxGL = null;
  mapboxAvailable = false;
}

// ============================================
// SMART RIDE MARKER FAMILY
// ============================================
// One cohesive marker system: identical proportions, borders, shadows and the
// Smart Ride green across every member, so the whole map reads as one brand.
// All assets are original (icon fonts already bundled — no third-party art).
//
// Android note: PointAnnotation children are rendered to a static texture, so
// CSS-style animations inside markers freeze. "Pulse" is therefore a layered
// static halo (reads as a glow), and rotation is re-rendered by keying the
// annotation id to the data (cheap — the nearby pool is capped at 8).

const PROVIDER_GLYPH: Record<ProviderKind, { family: 'ion' | 'mci'; name: string }> = {
  boda: { family: 'mci', name: 'motorbike' },
  car: { family: 'ion', name: 'car-sport' },
  delivery: { family: 'mci', name: 'package-variant-closed' },
};

function ProviderGlyph({ kind, size }: { kind: ProviderKind; size: number }) {
  const g = PROVIDER_GLYPH[kind];
  return g.family === 'mci' ? (
    <MaterialCommunityIcons name={g.name as any} size={size} color="#FFFFFF" />
  ) : (
    <Ionicons name={g.name as any} size={size} color="#FFFFFF" />
  );
}

/**
 * Nearby-provider marker: Smart Ride green chip + white vehicle glyph and a
 * direction notch on the rim rotated to the driver's last GPS heading. The
 * glyph itself stays upright for legibility; only the notch rotates.
 */
function ProviderMarker({ kind, heading }: { kind: ProviderKind; heading?: number | null }) {
  return (
    <View style={markerStyles.providerWrap}>
      {/* soft halo for separation from the basemap */}
      <View style={markerStyles.providerHalo} />
      {/* rotating layer: only the direction notch */}
      {heading != null && Number.isFinite(heading) && (
        <View style={[markerStyles.providerRotator, { transform: [{ rotate: `${Math.round(heading)}deg` }] }]}>
          <View style={markerStyles.directionNotch} />
        </View>
      )}
      <View style={markerStyles.providerChip}>
        <ProviderGlyph kind={kind} size={16} />
      </View>
    </View>
  );
}

/** Pickup: filled Smart Ride green pin with a glow halo (active/selected). */
function PickupMarker({ title }: { title?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={markerStyles.pickupHalo} />
      <View style={[markerStyles.pin, markerStyles.pickupPinSolid]}>
        <Ionicons name="location" size={18} color="#FFFFFF" />
      </View>
      <View style={[markerStyles.pinArrow, { borderTopColor: COLORS.primary }]} />
      {title ? (
        <View style={markerStyles.labelContainer}>
          <Text style={[markerStyles.labelText, { color: COLORS.primary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Destination: dark square "flag" pin — clearly distinct from pickup. */
function DropoffMarker({ title }: { title?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, markerStyles.dropoffPinSolid]}>
        <Ionicons name="flag" size={16} color="#FFFFFF" />
      </View>
      <View style={[markerStyles.pinArrow, markerStyles.dropoffArrow]} />
      {title ? (
        <View style={markerStyles.labelContainer}>
          <Text style={[markerStyles.labelText, { color: COLORS.secondary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Active-trip driver: larger family chip + halo + heading notch. */
function DriverMarker({ heading, kind = 'car' }: { heading?: number; kind?: ProviderKind }) {
  return (
    <View style={markerStyles.driverContainer}>
      <View style={markerStyles.driverPulse} />
      {heading != null && Number.isFinite(heading) && (
        <View style={[markerStyles.driverRotator, { transform: [{ rotate: `${Math.round(heading)}deg` }] }]}>
          <View style={markerStyles.directionNotchLarge} />
        </View>
      )}
      <View style={markerStyles.driverPin}>
        <ProviderGlyph kind={kind} size={20} />
      </View>
    </View>
  );
}

function SimpleMarker({ color, icon }: { color?: string; icon?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, { backgroundColor: color || COLORS.primary }]}>
        <Ionicons name={(icon as any) || 'location'} size={18} color="#FFFFFF" />
      </View>
      <View style={markerStyles.pinArrow} />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },

  // ---- Nearby provider chip (32px family member) ----
  providerWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  providerHalo: {
    position: 'absolute', width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(0, 95, 58, 0.12)',
  },
  providerRotator: {
    position: 'absolute', width: 44, height: 44,
    alignItems: 'center', justifyContent: 'flex-start',
  },
  directionNotch: {
    width: 0, height: 0, borderStyle: 'solid',
    borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: COLORS.primary,
  },
  providerChip: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
  },

  // ---- Pickup / destination pins (36px family members) ----
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  pickupHalo: { position: 'absolute', top: -4, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 95, 58, 0.15)' },
  pickupPinSolid: { backgroundColor: COLORS.primary },
  dropoffPinSolid: { backgroundColor: COLORS.secondary, borderRadius: 10 },
  pinArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.primary, marginTop: -2 },
  dropoffArrow: { borderTopColor: COLORS.secondary },
  labelContainer: { backgroundColor: COLORS.backgroundElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, maxWidth: 120, borderWidth: 1, borderColor: COLORS.border },
  labelText: { fontSize: 10, fontWeight: '600' },

  // ---- Active-trip driver (48px family member) ----
  driverContainer: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  driverPulse: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 95, 58, 0.15)' },
  driverRotator: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'flex-start' },
  directionNotchLarge: {
    width: 0, height: 0, borderStyle: 'solid',
    borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: COLORS.primary,
  },
  driverPin: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

// ============================================
// MAPBOX MAP IMPLEMENTATION
// ============================================

function MapboxMapImpl(props: SmartRideMapProps) {
  const {
    style,
    initialLatitude = DEFAULT_LOCATION.latitude,
    initialLongitude = DEFAULT_LOCATION.longitude,
    pickup,
    dropoff,
    driverLocation,
    driverKind = 'car',
    showUserLocation = true,
    onLocationSelect,
    isPickupSelectionMode,
    routeCoordinates,
    markers,
    onMapPress,
    onCameraChanged,
    onMapIdle,
    showCenterPin,
    centerPinType = 'pickup',
    driverPoints,
  } = props;

  const cameraRef = useRef<any>(null);

  // Center-pin picker: report the map center as the camera moves / settles.
  // Mapbox state shape: { properties: { center: [lng, lat], zoom, ... } }
  const handleCameraChanged = useCallback(
    (state: any) => {
      if (!onCameraChanged) return;
      const c = state?.properties?.center;
      if (Array.isArray(c) && c.length >= 2) {
        onCameraChanged({ latitude: c[1], longitude: c[0] });
      }
    },
    [onCameraChanged],
  );

  const handleMapIdle = useCallback(
    (state: any) => {
      if (!onMapIdle) return;
      const c = state?.properties?.center;
      if (Array.isArray(c) && c.length >= 2) {
        onMapIdle({ latitude: c[1], longitude: c[0] });
      }
    },
    [onMapIdle],
  );

  const routeGeoJSON = routeCoordinates && routeCoordinates.length > 1
    ? {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]) },
        }],
      }
    : null;

  const handleMapPress = useCallback(
    (feature: any) => {
      if (onMapPress) {
        const coords = feature.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          onMapPress({ latitude: coords[1], longitude: coords[0] });
          return;
        }
      }
      if (!onLocationSelect || !isPickupSelectionMode) return;
      const coords = feature.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        onLocationSelect({ latitude: coords[1], longitude: coords[0] });
      }
    },
    [onLocationSelect, isPickupSelectionMode, onMapPress]
  );

  useEffect(() => {
    if (driverLocation && cameraRef.current) {
      cameraRef.current.flyTo([driverLocation.longitude, driverLocation.latitude], 800);
    }
  }, [driverLocation]);

  // Safety check: if MapboxGL is null, show fallback
  if (!MapboxGL) {
    return <FallbackPlaceholder style={style} initialLatitude={initialLatitude} initialLongitude={initialLongitude} />;
  }

  return (
    <View style={[styles.map, style]}>
    <MapboxGL.MapView
      style={StyleSheet.absoluteFill}
      styleURL={MAPBOX_CONFIG.style.streets}
      compassEnabled={false}
      onPress={handleMapPress}
      onCameraChanged={onCameraChanged ? handleCameraChanged : undefined}
      onMapIdle={onMapIdle ? handleMapIdle : undefined}
      logoEnabled={false}
      attributionEnabled={false}
    >
      <MapboxGL.Camera
        ref={cameraRef}
        zoomLevel={14}
        centerCoordinate={[initialLongitude, initialLatitude]}
        animationMode="flyTo"
        animationDuration={800}
      />

      {showUserLocation && <MapboxGL.UserLocation visible={showUserLocation} />}

      {pickup && (
        <MapboxGL.PointAnnotation id="pickup" coordinate={[pickup.longitude, pickup.latitude]}>
          <PickupMarker title={pickup.title || 'Pickup'} />
        </MapboxGL.PointAnnotation>
      )}

      {dropoff && (
        <MapboxGL.PointAnnotation id="dropoff" coordinate={[dropoff.longitude, dropoff.latitude]}>
          <DropoffMarker title={dropoff.title || 'Dropoff'} />
        </MapboxGL.PointAnnotation>
      )}

      {driverLocation && (() => {
        // Key by position + heading bucket so Android re-renders the texture as
        // the driver moves/turns (see nearby markers note above).
        const hdg = driverLocation.heading != null && Number.isFinite(driverLocation.heading)
          ? Math.round(driverLocation.heading / 15) * 15
          : undefined;
        const id = `driver-${driverLocation.latitude.toFixed(4)}-${driverLocation.longitude.toFixed(4)}-${hdg ?? 'x'}`;
        return (
          <MapboxGL.PointAnnotation key={id} id={id} coordinate={[driverLocation.longitude, driverLocation.latitude]}>
            <DriverMarker heading={hdg} kind={driverKind} />
          </MapboxGL.PointAnnotation>
        );
      })()}

      {routeGeoJSON && (
        <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="routeLine"
            style={{ lineColor: COLORS.primary, lineWidth: 4, lineOpacity: 0.8, lineCap: 'round', lineJoin: 'round' }}
          />
        </MapboxGL.ShapeSource>
      )}

      {markers?.map((marker, index) => (
        <MapboxGL.PointAnnotation
          key={marker.id || `marker-${index}`}
          id={marker.id || `marker-${index}`}
          coordinate={[marker.longitude, marker.latitude]}
          title={marker.title}
        >
          <SimpleMarker color={marker.color} icon={marker.icon} />
        </MapboxGL.PointAnnotation>
      ))}

      {/* Live nearby providers — branded family markers (boda / car / delivery)
          with heading notches. The pool is capped server-side (≤8) so individual
          annotations stay cheap. The id encodes position+heading because Android
          renders annotation children to a static texture: a changed id forces
          the marker to re-render when the driver moves or turns. */}
      {driverPoints?.map((d, i) => {
        const kind = providerKindFor(d);
        const hdg = d.heading != null && Number.isFinite(d.heading) ? Math.round(d.heading / 15) * 15 : null;
        const id = `nearby-${i}-${kind}-${d.latitude.toFixed(4)}-${d.longitude.toFixed(4)}-${hdg ?? 'x'}`;
        return (
          <MapboxGL.PointAnnotation key={id} id={id} coordinate={[d.longitude, d.latitude]}>
            <ProviderMarker kind={kind} heading={hdg} />
          </MapboxGL.PointAnnotation>
        );
      })}
    </MapboxGL.MapView>

      {/* Uber-style fixed center pin (sits above the map, points at map center) */}
      {showCenterPin && (
        <View style={styles.centerPinWrap} pointerEvents="none">
          <View style={styles.centerPinIcon}>
            <Ionicons
              name={centerPinType === 'dropoff' ? 'flag' : 'location'}
              size={28}
              color={centerPinType === 'dropoff' ? COLORS.primary : COLORS.secondary}
            />
          </View>
          <View style={styles.centerPinStem} />
          <View style={styles.centerPinDot} />
        </View>
      )}
    </View>
  );
}

// ============================================
// FALLBACK PLACEHOLDER (when map is unavailable)
// ============================================

function FallbackPlaceholder({ style, initialLatitude, initialLongitude }: { style?: ViewStyle; initialLatitude: number; initialLongitude: number }) {
  return (
    <View style={[styles.mapFallback, style]}>
      <Ionicons name="map-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.mapFallbackText}>Map unavailable</Text>
      <Text style={styles.mapFallbackSubtext}>
        Location: {initialLatitude.toFixed(4)}, {initialLongitude.toFixed(4)}
      </Text>
    </View>
  );
}

// ============================================
// ERROR BOUNDARY
// ============================================

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

function SmartRideMapImpl(props: SmartRideMapProps) {
  const [ready, setReady] = useState(false);
  // Re-render trigger for when the runtime token becomes available
  const [, setTokenTick] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to runtime token availability. If the token wasn't baked in at
  // build time, it's fetched async from the backend. When it arrives, this
  // listener fires and we re-render to show the real map instead of the fallback.
  useEffect(() => {
    const cb = () => setTokenTick((t) => t + 1);
    runtimeTokenListeners.push(cb);
    return () => {
      const idx = runtimeTokenListeners.indexOf(cb);
      if (idx >= 0) runtimeTokenListeners.splice(idx, 1);
    };
  }, []);

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, props.style]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  // Web platform or no Mapbox: show fallback
  if (!mapboxAvailable || !MapboxGL) {
    return <FallbackPlaceholder style={props.style} initialLatitude={props.initialLatitude || DEFAULT_LOCATION.latitude} initialLongitude={props.initialLongitude || DEFAULT_LOCATION.longitude} />;
  }

  // Native platform with Mapbox: show real map with error boundary
  const fallback = <FallbackPlaceholder style={props.style} initialLatitude={props.initialLatitude || DEFAULT_LOCATION.latitude} initialLongitude={props.initialLongitude || DEFAULT_LOCATION.longitude} />;
  return (
    <MapErrorBoundary fallback={fallback}>
      <MapboxMapImpl {...props} />
    </MapErrorBoundary>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  map: { flex: 1 },
  // Center pin overlay — the icon tip + dot land on the exact map center.
  centerPinWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinIcon: {
    // lift the icon so its bottom tip rests on the geometric center
    marginBottom: 28,
  },
  centerPinStem: {
    position: 'absolute',
    width: 2,
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  centerPinDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundSurface },
  mapFallback: { flex: 1, backgroundColor: COLORS.backgroundSurface, alignItems: 'center', justifyContent: 'center' },
  mapFallbackText: { color: COLORS.textMuted, fontSize: 16, marginTop: 12 },
  mapFallbackSubtext: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});

export const SmartRideMap = SmartRideMapImpl;
export default SmartRideMapImpl;
