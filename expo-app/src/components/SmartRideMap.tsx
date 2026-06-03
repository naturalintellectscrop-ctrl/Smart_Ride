// ============================================
// SMART RIDE MOBILE - SMART RIDE MAP
// ============================================
// Unified map component using @rnmapbox/maps (Mapbox GL)
// when EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is available,
// falling back to react-native-maps otherwise.
// Dark themed, custom markers, route lines, Kampala default.
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
import MapboxGL from '@rnmapbox/maps';

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
}

// ============================================
// MAPBOX INITIALIZATION
// ============================================

const mapboxAvailable = !!MAPBOX_CONFIG.accessToken && Platform.OS !== 'web';

if (mapboxAvailable) {
  MapboxGL.setAccessToken(MAPBOX_CONFIG.accessToken);
  console.log('[SmartRideMap] Mapbox GL initialized');
} else {
  console.log('[SmartRideMap] No Mapbox token or web platform, using react-native-maps fallback');
}

// ============================================
// REACT-NATIVE-MAPS IMPORT (for fallback)
// ============================================

let RNMapView: any;
let RNMarker: any;
let RNPolyline: any;

if (Platform.OS === 'web') {
  const mockMaps = require('../mocks/react-native-maps');
  RNMapView = mockMaps.MapView;
  RNMarker = mockMaps.Marker;
  RNPolyline = mockMaps.Polyline;
} else {
  RNMapView = require('react-native-maps').default;
  const rnMaps = require('react-native-maps');
  RNMarker = rnMaps.Marker;
  RNPolyline = rnMaps.Polyline;
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

function SelectionMarker() {
  return (
    <View style={markerStyles.container}>
      <View style={[markerStyles.pin, markerStyles.selectionPin]}>
        <Ionicons name="search" size={18} color="#FFFFFF" />
      </View>
      <View style={markerStyles.pinArrow} />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  pickupPin: { backgroundColor: 'rgba(0, 212, 255, 0.15)', borderColor: COLORS.secondary },
  dropoffPin: { backgroundColor: 'rgba(0, 255, 136, 0.15)', borderColor: COLORS.primary },
  selectionPin: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: '#8B5CF6' },
  pinArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.secondary, marginTop: -2 },
  dropoffArrow: { borderTopColor: COLORS.primary },
  labelContainer: { backgroundColor: COLORS.backgroundElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, maxWidth: 120, borderWidth: 1, borderColor: COLORS.border },
  labelText: { fontSize: 10, fontWeight: '600' },
  driverContainer: { alignItems: 'center', justifyContent: 'center' },
  driverPulse: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0, 255, 136, 0.15)' },
  driverPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.background, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

// ============================================
// MAPBOX MAP IMPLEMENTATION
// ============================================

function MapboxMap(props: SmartRideMapProps) {
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
      if (!onLocationSelect || !isPickupSelectionMode) return;
      const coords = feature.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        onLocationSelect({ latitude: coords[1], longitude: coords[0] });
      }
    },
    [onLocationSelect, isPickupSelectionMode]
  );

  useEffect(() => {
    if (driverLocation && cameraRef.current) {
      cameraRef.current.flyTo([driverLocation.longitude, driverLocation.latitude], 800);
    }
  }, [driverLocation]);

  return (
    <MapboxGL.MapView
      style={[styles.map, style]}
      styleURL={MAPBOX_CONFIG.style.dark}
      compassEnabled={false}
      onPress={handleMapPress}
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
    </MapboxGL.MapView>
  );
}

// ============================================
// REACT-NATIVE-MAPS FALLBACK
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

function FallbackMap(props: SmartRideMapProps) {
  const {
    style, initialLatitude = DEFAULT_LOCATION.latitude, initialLongitude = DEFAULT_LOCATION.longitude,
    pickup, dropoff, driverLocation, showUserLocation = true, onLocationSelect, isPickupSelectionMode, routeCoordinates,
  } = props;

  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleMapPress = useCallback(
    (event: any) => {
      if (!onLocationSelect || !isPickupSelectionMode) return;
      const coords = event.nativeEvent?.coordinate;
      if (coords) {
        setSelectedLocation(coords);
        onLocationSelect({ latitude: coords.latitude, longitude: coords.longitude });
      }
    },
    [onLocationSelect, isPickupSelectionMode]
  );

  const initialRegion = { latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  const mapFallback = (
    <View style={[styles.mapFallback, style]}>
      <Ionicons name="map-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.mapFallbackText}>Map unavailable</Text>
      <Text style={styles.mapFallbackSubtext}>Location: {initialLatitude.toFixed(4)}, {initialLongitude.toFixed(4)}</Text>
    </View>
  );

  return (
    <MapErrorBoundary fallback={mapFallback}>
      <RNMapView
        style={[styles.map, style]}
        initialRegion={initialRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
        onPress={handleMapPress}
      >
        {pickup && (
          <RNMarker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} title={pickup.title || 'Pickup'}>
            <PickupMarker title={pickup.title} />
          </RNMarker>
        )}
        {dropoff && (
          <RNMarker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} title={dropoff.title || 'Dropoff'}>
            <DropoffMarker title={dropoff.title} />
          </RNMarker>
        )}
        {driverLocation && (
          <RNMarker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Driver">
            <DriverMarker heading={driverLocation.heading} />
          </RNMarker>
        )}
        {selectedLocation && isPickupSelectionMode && (
          <RNMarker coordinate={selectedLocation}><SelectionMarker /></RNMarker>
        )}
        {routeCoordinates && routeCoordinates.length > 1 && (
          <RNPolyline
            coordinates={routeCoordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}
      </RNMapView>
    </MapErrorBoundary>
  );
}

// ============================================
// DARK MAP STYLE (react-native-maps)
// ============================================

const darkMapStyle = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252530' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A2A38' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D0D12' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#152515' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#121218' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#252530' }] },
];

// ============================================
// MAIN COMPONENT
// ============================================

function SmartRideMapImpl(props: SmartRideMapProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, props.style]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  // Use Mapbox if token is configured and on native platform
  if (mapboxAvailable) {
    return <MapboxMap {...props} />;
  }

  // Fallback to react-native-maps
  return <FallbackMap {...props} />;
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
