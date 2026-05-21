// ============================================
// SMART RIDE MOBILE - MAPBOX MAP COMPONENT
// ============================================
// Uses @rnmapbox/maps for native Mapbox tiles
// Requires EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in .env
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';

// Safe token access - uses environment variable or empty string
// The token is set via EAS secrets: RNMAPBOX_MAPS_DOWNLOAD_TOKEN for builds
// EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN for runtime
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Track if Mapbox was initialized
let isMapboxInitialized = false;

// Initialize Mapbox SAFELY - only if token exists
if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.length > 10) {
  try {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    isMapboxInitialized = true;
    console.log('[Mapbox] Initialized successfully');
  } catch (error) {
    console.error('[Mapbox] Failed to initialize:', error);
  }
} else {
  console.warn('[Mapbox] No valid access token found - map features disabled');
}

// Kampala center coordinates
const KAMPALA_CENTER: [number, number] = [32.5825, 0.3476]; // [longitude, latitude]

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  id: string;
  place_name: string;
  name: string;
  center: [number, number]; // [longitude, latitude]
  place_type?: string[];
}

interface MapMarker {
  id: string;
  coordinate: Coordinate;
  title?: string;
  description?: string;
  color?: string;
}

interface MapboxMapProps {
  initialCenter?: [number, number]; // [longitude, latitude]
  pickup?: Coordinate;
  dropoff?: Coordinate;
  markers?: MapMarker[];
  showUserLocation?: boolean;
  showSearch?: boolean;
  onPickupSelect?: (coordinate: Coordinate, address: string) => void;
  onDropoffSelect?: (coordinate: Coordinate, address: string) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  onRegionChange?: (center: [number, number]) => void;
  children?: React.ReactNode;
  style?: any;
}

// ============================================
// Geocoding Service
// ============================================

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!query || query.length < 2) return [];
  
  const token = MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.warn('Mapbox token not configured');
    return [];
  }

  try {
    // Focus on Uganda with proximity to Kampala
    const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?access_token=${token}&country=ug&limit=10&proximity=32.5825,0.3476`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    return data.features?.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
      name: feature.text || feature.place_name?.split(',')[0],
      center: feature.center as [number, number],
      place_type: feature.place_type,
    })) || [];
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = MAPBOX_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const url = `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?access_token=${token}&limit=1`;
    const response = await fetch(url);
    
    if (!response.ok) return null;

    const data = await response.json();
    return data.features?.[0]?.place_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// ============================================
// Main Map Component
// ============================================

export function MapboxMap({
  initialCenter = KAMPALA_CENTER,
  pickup,
  dropoff,
  markers = [],
  showUserLocation = true,
  showSearch = false,
  onPickupSelect,
  onDropoffSelect,
  onMapPress,
  onRegionChange,
  children,
  style,
}: MapboxMapProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Handle map press
  const handleMapPress = async (e: any) => {
    const { geometry } = e;
    if (geometry?.coordinates) {
      const [lng, lat] = geometry.coordinates;
      onMapPress?.({ latitude: lat, longitude: lng });
    }
  };

  // Animate to show both pickup and dropoff
  useEffect(() => {
    if (pickup && dropoff && cameraRef.current) {
      // Calculate bounds
      const minLng = Math.min(pickup.longitude, dropoff.longitude);
      const maxLng = Math.max(pickup.longitude, dropoff.longitude);
      const minLat = Math.min(pickup.latitude, dropoff.latitude);
      const maxLat = Math.max(pickup.latitude, dropoff.latitude);
      
      const centerLng = (minLng + maxLng) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      cameraRef.current.flyTo([centerLng, centerLat], 1000);
    }
  }, [pickup, dropoff]);

  // Fit bounds when both pickup and dropoff are set
  const fitToCoordinates = useCallback(() => {
    if (pickup && dropoff && mapRef.current) {
      cameraRef.current?.fitBounds(
        [Math.min(pickup.longitude, dropoff.longitude), Math.min(pickup.latitude, dropoff.latitude)],
        [Math.max(pickup.longitude, dropoff.longitude), Math.max(pickup.latitude, dropoff.latitude)],
        [100, 50, 100, 50],
        1000
      );
    }
  }, [pickup, dropoff]);

  // Get user location on mount
  useEffect(() => {
    if (showUserLocation) {
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.log('Location error:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [showUserLocation]);

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        onMapIdle={(e) => {
          if (e.properties?.center) {
            onRegionChange?.(e.properties.center as [number, number]);
          }
        }}
        onPress={handleMapPress}
        compassEnabled={true}
        scaleBarEnabled={true}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={initialCenter}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User Location */}
        {showUserLocation && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            onUpdate={(location) => {
              if (location?.coords) {
                setUserLocation([location.coords.longitude, location.coords.latitude]);
                setIsLoading(false);
              }
            }}
          />
        )}

        {/* Pickup Marker */}
        {pickup && (
          <Mapbox.PointAnnotation
            id="pickup"
            coordinate={[pickup.longitude, pickup.latitude]}
            title="Pickup"
            snippet="Your pickup location"
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, styles.pickupMarker]}>
                <Text style={styles.markerText}>P</Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Dropoff Marker */}
        {dropoff && (
          <Mapbox.PointAnnotation
            id="dropoff"
            coordinate={[dropoff.longitude, dropoff.latitude]}
            title="Dropoff"
            snippet="Your destination"
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, styles.dropoffMarker]}>
                <Text style={styles.markerText}>D</Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Custom Markers */}
        {markers.map((marker) => (
          <Mapbox.PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.coordinate.longitude, marker.coordinate.latitude]}
            title={marker.title}
            snippet={marker.description}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, { backgroundColor: marker.color || '#00FF88' }]}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        ))}

        {/* Route Line */}
        {pickup && dropoff && (
          <Mapbox.ShapeSource
            id="routeSource"
            shape={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [pickup.longitude, pickup.latitude],
                      [dropoff.longitude, dropoff.latitude],
                    ],
                  },
                  properties: {},
                },
              ],
            }}
          >
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: '#00FF88',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00FF88" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {children}
    </View>
  );
}

// ============================================
// Location Search Component
// ============================================

interface LocationSearchProps {
  placeholder?: string;
  onPlaceSelect: (place: PlaceResult) => void;
  autoFocus?: boolean;
}

export function LocationSearch({
  placeholder = 'Search for a place...',
  onPlaceSelect,
  autoFocus = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    
    if (text.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const places = await searchPlaces(text);
      setResults(places);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectPlace = (place: PlaceResult) => {
    setQuery(place.name);
    setShowResults(false);
    Keyboard.dismiss();
    onPlaceSelect(place);
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleSearch}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          autoFocus={autoFocus}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#00FF88" />
        )}
      </View>

      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.resultIcon}>📍</Text>
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {item.place_name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </View>
      )}
    </View>
  );
}

// ============================================
// Map with Search Component
// ============================================

interface MapWithSearchProps {
  onPickupSelect?: (coordinate: Coordinate, address: string) => void;
  onDropoffSelect?: (coordinate: Coordinate, address: string) => void;
  pickup?: Coordinate;
  dropoff?: Coordinate;
  mode?: 'pickup' | 'dropoff';
  style?: any;
}

export function MapWithSearch({
  onPickupSelect,
  onDropoffSelect,
  pickup,
  dropoff,
  mode = 'pickup',
  style,
}: MapWithSearchProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(KAMPALA_CENTER);

  const handlePlaceSelect = (place: PlaceResult) => {
    const coordinate: Coordinate = {
      latitude: place.center[1],
      longitude: place.center[0],
    };

    if (mode === 'pickup') {
      onPickupSelect?.(coordinate, place.place_name);
    } else {
      onDropoffSelect?.(coordinate, place.place_name);
    }

    setMapCenter(place.center);
  };

  return (
    <View style={[styles.container, style]}>
      <MapboxMap
        initialCenter={mapCenter}
        pickup={pickup}
        dropoff={dropoff}
        showUserLocation={true}
      />
      <View style={styles.searchOverlay}>
        <LocationSearch
          placeholder={mode === 'pickup' ? 'Search pickup location...' : 'Search destination...'}
          onPlaceSelect={handlePlaceSelect}
          autoFocus
        />
      </View>
    </View>
  );
}

// ============================================
// Mini Map Component
// ============================================

interface MiniMapProps {
  coordinate: Coordinate;
  label?: string;
  size?: number;
}

export function MiniMap({ coordinate, label, size = 100 }: MiniMapProps) {
  return (
    <View style={[styles.miniMapContainer, { width: size, height: size }]}>
      <Mapbox.MapView
        style={styles.miniMap}
        styleURL="mapbox://styles/mapbox/streets-v12"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          zoomLevel={14}
          centerCoordinate={[coordinate.longitude, coordinate.latitude]}
        />
        <Mapbox.PointAnnotation
          id="minimap-marker"
          coordinate={[coordinate.longitude, coordinate.latitude]}
        >
          <View style={styles.miniMarker}>
            <Text style={styles.miniMarkerText}>📍</Text>
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>
      {label && (
        <View style={styles.miniMapLabel}>
          <Text style={styles.miniMapLabelText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 18, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: '#00FF88',
  },
  dropoffMarker: {
    backgroundColor: '#F97316',
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 300,
  },
  resultsList: {
    padding: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultAddress: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  miniMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A24',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMarkerText: {
    fontSize: 16,
  },
  miniMapLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  miniMapLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

// Export default
export default MapboxMap;
