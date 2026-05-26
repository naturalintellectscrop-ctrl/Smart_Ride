// ============================================
// SMART RIDE MOBILE - SMART RIDE MAP
// ============================================
// Unified map component that uses @rnmapbox/maps (Mapbox GL)
// when EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is available,
// and falls back to react-native-maps otherwise.
// Dark themed, custom markers, route lines, Kampala default.
// ============================================

import React, { useEffect, useState, useCallback, useRef, Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
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
}

// ============================================
// MAPBOX AVAILABILITY CHECK
// ============================================

let MapboxGL: any = null;
let mapboxAvailable = false;

try {
  // Only attempt import if token is configured
  if (MAPBOX_CONFIG.accessToken && Platform.OS !== 'web') {
    MapboxGL = require('@rnmapbox/maps');
    // Set the access token
    MapboxGL.default.setAccessToken(MAPBOX_CONFIG.accessToken);
    mapboxAvailable = true;
    console.log('[SmartRideMap] Mapbox GL available, using Mapbox maps');
  } else {
    console.log('[SmartRideMap] No Mapbox token or web platform, using react-native-maps fallback');
  }
} catch (e) {
  console.log('[SmartRideMap] @rnmapbox/maps not installed, using react-native-maps fallback');
  mapboxAvailable = false;
}

// ============================================
// REACT-NATIVE-MAPS IMPORT
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
  container: {
    alignItems: 'center',
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  pickupPin: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: COLORS.secondary,
  },
  dropoffPin: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: COLORS.primary,
  },
  selectionPin: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  pinArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.secondary,
    marginTop: -2,
  },
  dropoffArrow: {
    borderTopColor: COLORS.primary,
  },
  labelContainer: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  driverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  driverPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
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

  // Build GeoJSON for route line
  const routeGeoJSON = routeCoordinates && routeCoordinates.length > 1
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]),
            },
          },
        ],
      }
    : null;

  // Handle map press for location selection
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

  // Fly to driver when location changes
  useEffect(() => {
    if (driverLocation && cameraRef.current) {
      cameraRef.current.flyTo(
        [driverLocation.longitude, driverLocation.latitude],
        800
      );
    }
  }, [driverLocation]);

  return (
    <MapboxGL.default.MapView
      style={[styles.map, style]}
      styleURL={MAPBOX_CONFIG.style.dark}
      compassEnabled={false}
      onPress={handleMapPress}
    >
      <MapboxGL.default.Camera
        ref={cameraRef}
        zoomLevel={14}
        centerCoordinate={[
          initialLongitude,
          initialLatitude,
        ]}
        animationMode="flyTo"
        animationDuration={800}
      />

      {/* User Location */}
      {showUserLocation && (
        <MapboxGL.default.UserLocation visible={showUserLocation} />
      )}

      {/* Pickup Marker */}
      {pickup && (
        <MapboxGL.default.PointAnnotation
          id="pickup"
          coordinate={[pickup.longitude, pickup.latitude]}
        >
          <PickupMarker title={pickup.title || 'Pickup'} />
        </MapboxGL.default.PointAnnotation>
      )}

      {/* Dropoff Marker */}
      {dropoff && (
        <MapboxGL.default.PointAnnotation
          id="dropoff"
          coordinate={[dropoff.longitude, dropoff.latitude]}
        >
          <DropoffMarker title={dropoff.title || 'Dropoff'} />
        </MapboxGL.default.PointAnnotation>
      )}

      {/* Driver Marker */}
      {driverLocation && (
        <MapboxGL.default.PointAnnotation
          id="driver"
          coordinate={[driverLocation.longitude, driverLocation.latitude]}
        >
          <DriverMarker
            heading={driverLocation.heading}
            isBoda={false}
          />
        </MapboxGL.default.PointAnnotation>
      )}

      {/* Route Line */}
      {routeGeoJSON && (
        <MapboxGL.default.ShapeSource id="routeSource" shape={routeGeoJSON}>
          <MapboxGL.default.LineLayer
            id="routeLine"
            style={{
              lineColor: COLORS.primary,
              lineWidth: 4,
              lineOpacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.default.ShapeSource>
      )}
    </MapboxGL.default.MapView>
  );
}

// ============================================
// REACT-NATIVE-MAPS FALLBACK IMPLEMENTATION
// ============================================

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function FallbackMap(props: SmartRideMapProps) {
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

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Handle map press for location selection
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

  const initialRegion = {
    latitude: initialLatitude,
    longitude: initialLongitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const mapFallback = (
    <View style={[styles.mapFallback, style]}>
      <Ionicons name="map-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.mapFallbackText}>Map unavailable</Text>
      <Text style={styles.mapFallbackSubtext}>
        Location: {initialLatitude.toFixed(4)}, {initialLongitude.toFixed(4)}
      </Text>
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
        {/* Pickup Marker */}
        {pickup && (
          <RNMarker
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            title={pickup.title || 'Pickup'}
          >
            <PickupMarker title={pickup.title} />
          </RNMarker>
        )}

        {/* Dropoff Marker */}
        {dropoff && (
          <RNMarker
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            title={dropoff.title || 'Dropoff'}
          >
            <DropoffMarker title={dropoff.title} />
          </RNMarker>
        )}

        {/* Driver Marker */}
        {driverLocation && (
          <RNMarker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Driver"
          >
            <DriverMarker heading={driverLocation.heading} />
          </RNMarker>
        )}

        {/* Selection Marker */}
        {selectedLocation && isPickupSelectionMode && (
          <RNMarker coordinate={selectedLocation}>
            <SelectionMarker />
          </RNMarker>
        )}

        {/* Route Line */}
        {routeCoordinates && routeCoordinates.length > 1 && (
          <RNPolyline
            coordinates={routeCoordinates.map(c => ({
              latitude: c.latitude,
              longitude: c.longitude,
            }))}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={undefined}
          />
        )}
      </RNMapView>
    </MapErrorBoundary>
  );
}

// ============================================
// DARK MAP STYLE FOR REACT-NATIVE-MAPS
// ============================================

const darkMapStyle = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A24' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1A24' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#252530' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2A2A38' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0D0D12' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A24' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#152515' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A24' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#121218' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#252530' }],
  },
];

// ============================================
// MAIN SMART RIDE MAP COMPONENT
// ============================================

function SmartRideMapImpl(props: SmartRideMapProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay to allow map setup
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

  // Use Mapbox if token is available and package loaded
  if (mapboxAvailable && MapboxGL) {
    return <MapboxMap {...props} />;
  }

  // Fallback to react-native-maps
  return <FallbackMap {...props} />;
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundSurface,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 12,
  },
  mapFallbackSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});

// Named + default export for flexibility
export const SmartRideMap = SmartRideMapImpl;
export default SmartRideMapImpl;
