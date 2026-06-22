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
import { Ionicons } from '@expo/vector-icons';
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
 */
function isValidMapboxToken(token: string | undefined): token is string {
  if (!token) return false;
  if (token.length <= 10) return false;
  if (!token.startsWith('pk.')) return false;
  if (token.includes('your-token-here') || token.includes('xxxx')) return false;
  return true;
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
// CUSTOM MARKER COMPONENTS
// ============================================

function PickupMarker({ title }: { title?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, markerStyles.pickupPin]}>
        <Ionicons name="location" size={18} color={COLORS.secondary} />
      </View>
      <View style={markerStyles.pinArrow} />
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

function DropoffMarker({ title }: { title?: string }) {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, markerStyles.dropoffPin]}>
        <Ionicons name="flag" size={18} color={COLORS.primary} />
      </View>
      <View style={[markerStyles.pinArrow, markerStyles.dropoffArrow]} />
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

function DriverMarker({ heading, isBoda }: { heading?: number; isBoda?: boolean }) {
  return (
    <View style={markerStyles.driverContainer}>
      <View style={markerStyles.driverPulse} />
      <View style={markerStyles.driverPin}>
        <Ionicons
          name={isBoda ? 'bicycle' : 'car'}
          size={18}
          color={COLORS.background}
        />
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
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  pickupPin: { backgroundColor: 'rgba(0, 110, 47, 0.15)', borderColor: COLORS.secondary },
  dropoffPin: { backgroundColor: 'rgba(0, 95, 58, 0.15)', borderColor: COLORS.primary },
  pinArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.secondary, marginTop: -2 },
  dropoffArrow: { borderTopColor: COLORS.primary },
  labelContainer: { backgroundColor: COLORS.backgroundElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, maxWidth: 120, borderWidth: 1, borderColor: COLORS.border },
  labelText: { fontSize: 10, fontWeight: '600' },
  driverContainer: { alignItems: 'center', justifyContent: 'center' },
  driverPulse: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 95, 58, 0.15)' },
  driverPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.background, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
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
    showUserLocation = true,
    onLocationSelect,
    isPickupSelectionMode,
    routeCoordinates,
    markers,
    onMapPress,
  } = props;

  const cameraRef = useRef<any>(null);

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
    <MapboxGL.MapView
      style={[styles.map, style]}
      styleURL={MAPBOX_CONFIG.style.streets}
      compassEnabled={false}
      onPress={handleMapPress}
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

      {driverLocation && (
        <MapboxGL.PointAnnotation id="driver" coordinate={[driverLocation.longitude, driverLocation.latitude]}>
          <DriverMarker heading={driverLocation.heading} isBoda={false} />
        </MapboxGL.PointAnnotation>
      )}

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
    </MapboxGL.MapView>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundSurface },
  mapFallback: { flex: 1, backgroundColor: COLORS.backgroundSurface, alignItems: 'center', justifyContent: 'center' },
  mapFallbackText: { color: COLORS.textMuted, fontSize: 16, marginTop: 12 },
  mapFallbackSubtext: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});

export const SmartRideMap = SmartRideMapImpl;
export default SmartRideMapImpl;
