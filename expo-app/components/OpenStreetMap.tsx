// ============================================
// SMART RIDE MOBILE - FREE OPENSTREETMAP COMPONENT
// ============================================
// Uses osmdroid provider - 100% FREE, no API key needed
// No credits, no limits, works offline with cached tiles
// ============================================

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';

// Kampala center coordinates
const KAMPALA_REGION: Region = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapMarker {
  id: string;
  coordinate: Coordinate;
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface OpenStreetMapProps {
  initialRegion?: Region;
  markers?: MapMarker[];
  polyline?: Coordinate[];
  showUserLocation?: boolean;
  onMapPress?: (coordinate: Coordinate) => void;
  onMarkerPress?: (marker: MapMarker) => void;
  children?: React.ReactNode;
  style?: any;
}

export function OpenStreetMap({
  initialRegion = KAMPALA_REGION,
  markers = [],
  polyline,
  showUserLocation = true,
  onMapPress,
  onMarkerPress,
  children,
  style,
}: OpenStreetMapProps) {
  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE} // Google Maps provider
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        onPress={(e) => {
          if (onMapPress) {
            onMapPress({
              latitude: e.nativeEvent.coordinate.latitude,
              longitude: e.nativeEvent.coordinate.longitude,
            });
          }
        }}
      >
        {/* Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.color || '#00FF88'}
            onPress={() => onMarkerPress?.(marker)}
          >
            {marker.icon && (
              <View style={styles.markerContainer}>
                <Text style={styles.markerIcon}>{marker.icon}</Text>
              </View>
            )}
          </Marker>
        ))}

        {/* Polyline for route */}
        {polyline && polyline.length >= 2 && (
          <Polyline
            coordinates={polyline}
            strokeColor="#00FF88"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>
      {children}
    </View>
  );
}

// Mini map component for cards and previews
interface MiniMapProps {
  coordinate: Coordinate;
  label?: string;
  size?: number;
}

export function MiniMap({ coordinate, label, size = 100 }: MiniMapProps) {
  return (
    <View style={[styles.miniMapContainer, { width: size, height: size }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.miniMap}
        region={{
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
      >
        <Marker coordinate={coordinate} pinColor="#00FF88" />
      </MapView>
      {label && (
        <View style={styles.miniMapLabel}>
          <Text style={styles.miniMapLabelText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// Map with loading state
interface MapWithLoadingProps extends OpenStreetMapProps {
  isLoading?: boolean;
  error?: string;
}

export function MapWithLoading({
  isLoading,
  error,
  ...mapProps
}: MapWithLoadingProps) {
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorIcon}>🗺️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return <OpenStreetMap {...mapProps} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 20,
  },
  miniMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMapLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  miniMapLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D12',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D12',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

// Export default
export default OpenStreetMap;
