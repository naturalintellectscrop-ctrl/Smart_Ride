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
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

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
  /** Which family marker the active-trip driver gets. */
  driverKind?: ProviderKind;
  /** Active-trip driver state: 'assigned' (en route) → 'busy' (on trip). */
  driverState?: RiderState;
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
    /** Branded POI marker (restaurant / shop / pharmacy / pickup / destination). */
    poiType?: PoiType;
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
    vehicleType?: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER' | 'VAN' | 'TRUCK' | null;
    riderRole?: string | null;
    heading?: number | null;
    /** Optional real state from the backend; defaults to available/moving. */
    state?: RiderState;
  }>;
}

// Which marker family member to show for a nearby provider.
// boda/car/delivery share the green rider palette; errand + parcel are distinct
// service classes with their own colours (see Smart Ride Map Marker System).
export type ProviderKind = 'boda' | 'car' | 'delivery' | 'errand' | 'parcel';

// Rider marker states from the design system. Only 'available' and 'moving'
// are derivable from the nearby endpoint today (it returns online riders + an
// optional heading); the rest are honoured when the backend supplies them so
// the system is complete without inventing data.
export type RiderState =
  | 'available'
  | 'moving'
  | 'assigned'
  | 'busy'
  | 'offline'
  | 'low_battery'
  | 'out_of_service';

// ── Smart Ride Map Marker System — colour tokens (exact spec hex) ──
export const MARKER_COLORS = {
  rider: '#16A34A', // Boda / Car / Delivery
  errand: '#8B5CF6', // Errand Runner
  parcel: '#F59E0B', // Parcel / Logistics
  yourLocation: '#3B82F6', // Your Location (blue pulse)
  pickup: '#10B981', // Pickup Point
  destination: '#EF4444', // Destination / Important
  offline: '#94A3B8', // Offline / Inactive
  restaurant: '#F59E0B',
  shop: '#8B5CF6',
  pharmacy: '#16A34A',
  lowBattery: '#F59E0B',
  outOfService: '#EF4444',
} as const;

/** #RRGGBB → rgba() so halos can share the marker's exact colour at low alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Base brand colour for a vehicle/service class. */
export function kindColor(kind: ProviderKind): string {
  if (kind === 'errand') return MARKER_COLORS.errand;
  if (kind === 'parcel') return MARKER_COLORS.parcel;
  return MARKER_COLORS.rider; // boda / car / delivery
}

/** The effective marker colour once state is applied (busy/offline → grey). */
export function stateColor(kind: ProviderKind, state: RiderState): string {
  if (state === 'busy' || state === 'offline' || state === 'out_of_service') {
    return state === 'out_of_service' ? kindColor(kind) : MARKER_COLORS.offline;
  }
  return kindColor(kind);
}

export function providerKindFor(d: { vehicleType?: string | null; riderRole?: string | null }): ProviderKind {
  // Future service classes map to their own markers; unknown roles fall back to
  // the green rider family so nothing ever renders a generic pin.
  if (d.riderRole === 'ERRAND_RUNNER') return 'errand';
  if (d.riderRole === 'PARCEL_DRIVER' || d.vehicleType === 'VAN' || d.vehicleType === 'TRUCK') return 'parcel';
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
  delivery: { family: 'mci', name: 'moped' },
  errand: { family: 'mci', name: 'bag-personal' },
  parcel: { family: 'mci', name: 'truck' },
};

function ProviderGlyph({ kind, size, color = '#FFFFFF' }: { kind: ProviderKind; size: number; color?: string }) {
  const g = PROVIDER_GLYPH[kind];
  return g.family === 'mci' ? (
    <MaterialCommunityIcons name={g.name as any} size={size} color={color} />
  ) : (
    <Ionicons name={g.name as any} size={size} color={color} />
  );
}

/**
 * Nearby-provider marker — the core of the Smart Ride Map Marker System.
 * A coloured chip (green riders / purple errand / orange parcel) carries the
 * white vehicle glyph; a direction notch on the rim rotates to the last GPS
 * heading (glyph stays upright for legibility). `state` restyles the marker:
 *   available     → soft halo + small status dot
 *   moving        → heading notch
 *   assigned      → bright, enlarged glow ring
 *   busy/offline  → grey chip (offline also dimmed)
 *   low_battery   → orange battery badge
 *   out_of_service→ red wrench badge
 * `size` follows the spec size guide (24 / 32 / 40 default / 56).
 */
function ProviderMarker({
  kind,
  heading,
  state = 'available',
  size = 40,
}: {
  kind: ProviderKind;
  heading?: number | null;
  state?: RiderState;
  size?: number;
}) {
  const chip = size; // chip diameter
  const wrap = size + 14; // room for halo + notch + badge
  const color = stateColor(kind, state);
  const glyphSize = Math.round(size * 0.5);
  const showNotch = (state === 'moving' || state === 'available' || state === 'assigned') && heading != null && Number.isFinite(heading);
  const assigned = state === 'assigned';
  const dimmed = state === 'offline';

  return (
    <View style={[markerStyles.providerWrap, { width: wrap, height: wrap, opacity: dimmed ? 0.6 : 1 }]}>
      {/* halo — brighter + larger when assigned to a ride */}
      <View
        style={[
          markerStyles.providerHalo,
          {
            width: assigned ? wrap : chip + 8,
            height: assigned ? wrap : chip + 8,
            borderRadius: wrap / 2,
            backgroundColor: hexToRgba(color, assigned ? 0.28 : 0.14),
          },
        ]}
      />
      {showNotch && (
        <View style={[markerStyles.providerRotator, { width: wrap, height: wrap, transform: [{ rotate: `${Math.round(heading as number)}deg` }] }]}>
          <View style={[markerStyles.directionNotch, { borderBottomColor: color }]} />
        </View>
      )}
      <View style={[markerStyles.providerChip, { width: chip, height: chip, borderRadius: chip / 2, backgroundColor: color }]}>
        <ProviderGlyph kind={kind} size={glyphSize} />
      </View>

      {/* state badge / status dot, bottom-anchored */}
      {state === 'available' && (
        <View style={[markerStyles.statusDot, { backgroundColor: color }]} />
      )}
      {state === 'low_battery' && (
        <View style={[markerStyles.stateBadge, { backgroundColor: MARKER_COLORS.lowBattery }]}>
          <MaterialCommunityIcons name="battery-alert-variant-outline" size={11} color="#FFFFFF" />
        </View>
      )}
      {state === 'out_of_service' && (
        <View style={[markerStyles.stateBadge, { backgroundColor: MARKER_COLORS.outOfService }]}>
          <MaterialCommunityIcons name="wrench" size={10} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

// Points of interest share one teardrop-pin shape; only glyph + colour change,
// so pickup/destination/restaurant/shop/pharmacy read as one family.
export type PoiType = 'pickup' | 'destination' | 'restaurant' | 'shop' | 'pharmacy';

const POI_SPEC: Record<PoiType, { family: 'ion' | 'mci'; name: string; color: string }> = {
  pickup: { family: 'mci', name: 'flag-variant', color: MARKER_COLORS.pickup },
  destination: { family: 'ion', name: 'flag', color: MARKER_COLORS.destination },
  restaurant: { family: 'ion', name: 'restaurant', color: MARKER_COLORS.restaurant },
  shop: { family: 'ion', name: 'bag-handle', color: MARKER_COLORS.shop },
  pharmacy: { family: 'mci', name: 'medical-bag', color: MARKER_COLORS.pharmacy },
};

/** Unified POI teardrop pin. Pickup gets a soft glow (it's the active target). */
function PoiMarker({ type, title }: { type: PoiType; title?: string }) {
  const spec = POI_SPEC[type];
  return (
    <View style={markerStyles.container}>
      {type === 'pickup' && <View style={[markerStyles.pickupHalo, { backgroundColor: hexToRgba(spec.color, 0.15) }]} />}
      <View style={[markerStyles.pin, { backgroundColor: spec.color }]}>
        {spec.family === 'mci'
          ? <MaterialCommunityIcons name={spec.name as any} size={18} color="#FFFFFF" />
          : <Ionicons name={spec.name as any} size={16} color="#FFFFFF" />}
      </View>
      <View style={[markerStyles.pinArrow, { borderTopColor: spec.color }]} />
      {title ? (
        <View style={markerStyles.labelContainer}>
          <Text style={[markerStyles.labelText, { color: spec.color }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Pickup: green teardrop flag pin. */
function PickupMarker({ title }: { title?: string }) {
  return <PoiMarker type="pickup" title={title} />;
}

/** Destination: red teardrop flag pin — clearly distinct from pickup. */
function DropoffMarker({ title }: { title?: string }) {
  return <PoiMarker type="destination" title={title} />;
}

/** Active-trip driver: larger family chip + halo + heading notch (56px). */
function DriverMarker({ heading, kind = 'car', state = 'assigned' }: { heading?: number; kind?: ProviderKind; state?: RiderState }) {
  const color = stateColor(kind, state);
  return (
    <View style={markerStyles.driverContainer}>
      <View style={[markerStyles.driverPulse, { backgroundColor: hexToRgba(color, 0.18) }]} />
      {heading != null && Number.isFinite(heading) && (
        <View style={[markerStyles.driverRotator, { transform: [{ rotate: `${Math.round(heading)}deg` }] }]}>
          <View style={[markerStyles.directionNotchLarge, { borderBottomColor: color }]} />
        </View>
      )}
      <View style={[markerStyles.driverPin, { backgroundColor: color }]}>
        <ProviderGlyph kind={kind} size={20} />
      </View>
    </View>
  );
}

function SimpleMarker({ color, icon }: { color?: string; icon?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, { backgroundColor: color || MARKER_COLORS.rider }]}>
        <Ionicons name={(icon as any) || 'location'} size={18} color="#FFFFFF" />
      </View>
      <View style={[markerStyles.pinArrow, { borderTopColor: color || MARKER_COLORS.rider }]} />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },

  // ---- Nearby provider chip (size-driven family member) ----
  providerWrap: { alignItems: 'center', justifyContent: 'center' },
  providerHalo: { position: 'absolute' },
  providerRotator: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'flex-start',
  },
  directionNotch: {
    width: 0, height: 0, borderStyle: 'solid',
    borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: MARKER_COLORS.rider,
  },
  providerChip: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
  },
  // small "available" pulse dot, bottom-anchored
  statusDot: {
    position: 'absolute', bottom: 2, width: 9, height: 9, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  // battery / wrench state badge, bottom-right
  stateBadge: {
    position: 'absolute', bottom: 0, right: 2, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF',
  },

  // ---- Pickup / destination pins (36px family members) ----
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  pickupHalo: { position: 'absolute', top: -4, width: 44, height: 44, borderRadius: 22, backgroundColor: hexToRgba(MARKER_COLORS.pickup, 0.15) },
  pinArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: MARKER_COLORS.rider, marginTop: -2 },
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
    driverState = 'assigned',
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
  const { isDark } = useTheme();
  // Route line color must stay visible on the dark map style.
  const routeLineColor = isDark ? '#7cd9a4' : COLORS.primary;

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
      styleURL={isDark ? MAPBOX_CONFIG.style.dark : MAPBOX_CONFIG.style.streets}
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
        const id = `driver-${driverLocation.latitude.toFixed(4)}-${driverLocation.longitude.toFixed(4)}-${hdg ?? 'x'}-${driverState}`;
        return (
          <MapboxGL.PointAnnotation key={id} id={id} coordinate={[driverLocation.longitude, driverLocation.latitude]}>
            <DriverMarker heading={hdg} kind={driverKind} state={driverState} />
          </MapboxGL.PointAnnotation>
        );
      })()}

      {routeGeoJSON && (
        <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="routeLine"
            style={{ lineColor: routeLineColor, lineWidth: 4, lineOpacity: 0.8, lineCap: 'round', lineJoin: 'round' }}
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
          {marker.poiType
            ? <PoiMarker type={marker.poiType} title={marker.title} />
            : <SimpleMarker color={marker.color} icon={marker.icon} />}
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
        // Real state only: honour a backend-supplied state, else a rider with a
        // heading reads as 'moving' and one without as 'available'. Offline
        // riders are simply absent from driverPoints, so they vanish on the next
        // update (spec: "remove immediately when a rider goes offline").
        const state: RiderState = d.state ?? (hdg != null ? 'moving' : 'available');
        const id = `nearby-${i}-${kind}-${state}-${d.latitude.toFixed(4)}-${d.longitude.toFixed(4)}-${hdg ?? 'x'}`;
        return (
          <MapboxGL.PointAnnotation key={id} id={id} coordinate={[d.longitude, d.latitude]}>
            <ProviderMarker kind={kind} heading={hdg} state={state} />
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
  const { isDark } = useTheme();
  const themed = makeThemedColors(isDark);
  return (
    <View style={[styles.mapFallback, { backgroundColor: themed.backgroundSurface }, style]}>
      <Ionicons name="map-outline" size={48} color={themed.textMuted} />
      <Text style={[styles.mapFallbackText, { color: themed.textMuted }]}>Map unavailable</Text>
      <Text style={[styles.mapFallbackSubtext, { color: themed.textMuted }]}>
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
  const { isDark } = useTheme();
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
    const themed = makeThemedColors(isDark);
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themed.backgroundSurface }, props.style]}>
        <ActivityIndicator size="small" color={themed.primary} />
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
