/**
 * Smart Ride - Mapbox Map Component for React Native
 * 
 * A comprehensive map component using Mapbox GL for the mobile app.
 * Features:
 * - Real-time location tracking
 * - Ride route visualization
 * - Pickup/dropoff markers
 * - Driver location tracking
 * - Dark theme with Smart Ride branding
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapboxGL from '@rnmapbox/maps';

// Mapbox Configuration
// IMPORTANT: Replace with your actual Mapbox public token
// Get your token from: https://account.mapbox.com/access-tokens/
// You can also set this as an environment variable: MAPBOX_ACCESS_TOKEN
const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_PUBLIC_TOKEN_HERE';

// Initialize Mapbox
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
MapboxGL.setConnected(true);

// Kampala, Uganda coordinates (default center)
const KAMPALA_COORDINATES: [number, number] = [32.5825, 0.3476];

// Types
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface MapboxMapProps {
  // Pickup and dropoff locations
  pickup?: Location;
  dropoff?: Location;
  
  // Driver location for tracking
  driverLocation?: Location;
  
  // Route coordinates for drawing the path
  routeCoordinates?: Coordinate[];
  
  // Show current location marker
  showUserLocation?: boolean;
  
  // Map style variant
  mapStyle?: 'dark' | 'light' | 'satellite' | 'streets';
  
  // Callback when map is ready
  onMapReady?: () => void;
  
  // Callback when user location changes
  onUserLocationChange?: (location: Location) => void;
  
  // Callback when map is pressed
  onMapPress?: (coordinate: Coordinate) => void;
}

// Map style URLs
const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
};

export function MapboxMap({
  pickup,
  dropoff,
  driverLocation,
  routeCoordinates,
  showUserLocation = true,
  mapStyle = 'dark',
  onMapReady,
  onUserLocationChange,
  onMapPress,
}: MapboxMapProps) {
  const camera = useRef<MapboxGL.Camera>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Request location permissions
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Get current location
  useEffect(() => {
    if (hasPermission && showUserLocation) {
      getCurrentLocation();
    }
  }, [hasPermission, showUserLocation]);

  // Fit bounds when pickup and dropoff change
  useEffect(() => {
    if (pickup && dropoff && camera.current) {
      fitToBounds(pickup, dropoff);
    }
  }, [pickup, dropoff]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Smart Ride Location Permission',
            message: 'Smart Ride needs access to your location to show nearby drivers and calculate routes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn('Location permission error:', err);
        setHasPermission(false);
      }
    } else {
      // iOS handles permissions automatically
      setHasPermission(true);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        onUserLocationChange?.({ latitude, longitude });
        setIsLoading(false);
      },
      (error) => {
        console.warn('Location error:', error);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fitToBounds = (start: Location, end: Location) => {
    camera.current?.fitBounds(
      [start.longitude, start.latitude],
      [end.longitude, end.latitude],
      [80, 80, 80, 300], // padding: top, right, bottom, left
      1000 // animation duration
    );
  };

  const handleMapPress = (feature: any) => {
    if (onMapPress && feature.geometry?.coordinates) {
      const [longitude, latitude] = feature.geometry.coordinates;
      onMapPress({ latitude, longitude });
    }
  };

  // Smart Ride brand colors
  const colors = {
    primary: '#00FF88', // Neon green
    secondary: '#00FFF3', // Cyan
    accent: '#7C3AED', // Purple
    warning: '#FBBF24', // Yellow
    danger: '#EF4444', // Red
    background: '#0D0D12', // Dark background
  };

  // Convert coordinates to GeoJSON for route line
  const routeGeoJSON = routeCoordinates ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]),
      },
    }],
  } : null;

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Location permission required to show the map
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestLocationPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <MapboxGL.MapView
        style={styles.map}
        styleURL={MAP_STYLES[mapStyle]}
        onDidFinishLoadingMap={() => {
          setIsLoading(false);
          onMapReady?.();
        }}
        onPress={handleMapPress}
        compassEnabled={true}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={camera}
          zoomLevel={14}
          centerCoordinate={userLocation 
            ? [userLocation.longitude, userLocation.latitude] 
            : KAMPALA_COORDINATES
          }
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User location indicator */}
        {showUserLocation && userLocation && (
          <MapboxGL.PointAnnotation
            id="userLocation"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Pickup marker */}
        {pickup && (
          <MapboxGL.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
          >
            <View style={styles.pickupMarker}>
              <View style={styles.pickupMarkerInner}>
                <Text style={styles.markerText}>P</Text>
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Dropoff marker */}
        {dropoff && (
          <MapboxGL.PointAnnotation
            id="dropoff"
            coordinate={[dropoff.longitude, dropoff.latitude]}
          >
            <View style={styles.dropoffMarker}>
              <View style={styles.dropoffMarkerInner}>
                <Text style={styles.markerText}>D</Text>
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Driver location marker */}
        {driverLocation && (
          <MapboxGL.PointAnnotation
            id="driver"
            coordinate={[driverLocation.longitude, driverLocation.latitude]}
          >
            <View style={styles.driverMarker}>
              <View style={styles.driverMarkerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Route line */}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON as any}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: colors.primary,
                lineWidth: 4,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 18, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#00FF88',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0D0D12',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#0D0D12',
    fontSize: 16,
    fontWeight: '600',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pickupMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00FFF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropoffMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  driverMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  driverMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00FF88',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default MapboxMap;
