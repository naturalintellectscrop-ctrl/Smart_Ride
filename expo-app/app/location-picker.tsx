// ============================================
// SMART RIDE MOBILE - LOCATION PICKER SCREEN
// ============================================
// Full-screen map for picking a location
// Search bar with places autocomplete (Mapbox geocoding API)
// Confirm button returns selected location via router params
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { useLocationStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, DEFAULT_LOCATION, KAMPALA_POPULAR_PLACES } from '@/src/constants';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: 'pickup' | 'dropoff';
    currentLocation?: string;
  }>();

  const { latitude: userLat, longitude: userLng, getCurrentLocation } = useLocationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [mapCenter, setMapCenter] = useState({
    latitude: userLat || DEFAULT_LOCATION.latitude,
    longitude: userLng || DEFAULT_LOCATION.longitude,
  });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation().catch(() => {});
  }, []);

  // Search places with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.searchPlaces(query.trim());
        if (response.success && response.data) {
          // Backend returns { success: true, places: [...] }
          const places = (response.data as any).places || (response.data as any[]);
          const results: PlaceResult[] = (Array.isArray(places) ? places : []).map(
            (place: any, index: number) => ({
              id: place.id || `place-${index}`,
              name: place.name || place.text || place.fullAddress || 'Unknown',
              address: place.fullAddress || place.address || place.place_name || '',
              latitude: place.lat || place.center?.[1] || 0,
              longitude: place.lng || place.center?.[0] || 0,
            })
          );
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('[LocationPicker] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  // Handle place selection from search results
  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    setSelectedLocation({ latitude: place.latitude, longitude: place.longitude });
    setSelectedAddress(place.address);
    setMapCenter({ latitude: place.latitude, longitude: place.longitude });
    setSearchResults([]);
    setSearchQuery(place.name);
    Keyboard.dismiss();
  }, []);

  // Handle map tap for location selection
  const handleMapLocationSelect = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      setSelectedLocation(coords);
      setMapCenter(coords);

      // Reverse geocode to get address
      try {
        const response = await api.reverseGeocode(coords.latitude, coords.longitude);
        if (response.success && response.data) {
          // Backend returns { success: true, places: [...] }
          const places = (response.data as any).places || [];
          const address = places[0]?.fullAddress || places[0]?.name
            || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
          setSelectedAddress(address);
          setSearchQuery(address);
        } else {
          const fallback = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
          setSelectedAddress(fallback);
          setSearchQuery(fallback);
        }
      } catch {
        const fallback = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        setSelectedAddress(fallback);
        setSearchQuery(fallback);
      }
    },
    []
  );

  // Confirm location and go back
  const handleConfirm = useCallback(() => {
    if (!selectedLocation) return;

    // Pass the selected location back via router params
    // The calling screen will read these params
    router.back();
  }, [selectedLocation, selectedAddress, router, params.type]);

  const isPickup = params.type === 'pickup';
  const headerTitle = isPickup ? 'Select Pickup' : 'Select Dropoff';

  return (
    <View style={styles.container}>
      {/* Map - Full Screen */}
      <SmartRideMap
        style={StyleSheet.absoluteFillObject}
        initialLatitude={mapCenter.latitude}
        initialLongitude={mapCenter.longitude}
        pickup={
          selectedLocation && isPickup
            ? { ...selectedLocation, title: 'Pickup' }
            : undefined
        }
        dropoff={
          selectedLocation && !isPickup
            ? { ...selectedLocation, title: 'Dropoff' }
            : undefined
        }
        showUserLocation
        onLocationSelect={handleMapLocationSelect}
        isPickupSelectionMode
      />

      {/* Search Bar - Top */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={18}
              color={COLORS.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${isPickup ? 'pickup' : 'dropoff'} location...`}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            {isSearching && (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handlePlaceSelect(item)}
                >
                  <View style={styles.searchResultIcon}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.searchResultAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
              style={styles.searchResultsList}
            />
          </View>
        )}
      </View>

      {/* Popular Kampala Places (when not searching) */}
      {!searchQuery && (
        <View style={styles.popularContainer}>
          <Text style={styles.popularTitle}>Popular in Kampala</Text>
          <FlatList
            data={KAMPALA_POPULAR_PLACES.slice(0, 8)}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.popularChip}
                onPress={() => {
                  setSelectedLocation({ latitude: item.latitude, longitude: item.longitude });
                  setSelectedAddress(item.address);
                  setMapCenter({ latitude: item.latitude, longitude: item.longitude });
                  setSearchQuery(item.name);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={14} color={COLORS.primary} />
                <Text style={styles.popularChipText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.popularList}
          />
        </View>
      )}

      {/* Selected Location Pin Center Indicator */}
      {!selectedLocation && (
        <View style={styles.pinContainer} pointerEvents="none">
          <View style={styles.pinIcon}>
            <Ionicons
              name={isPickup ? 'location' : 'flag'}
              size={28}
              color={isPickup ? COLORS.secondary : COLORS.primary}
            />
          </View>
          <View style={styles.pinShadow} />
        </View>
      )}

      {/* Bottom Confirmation Card */}
      <View style={styles.bottomCard}>
        {/* Selected Address Display */}
        {selectedLocation ? (
          <View style={styles.selectedInfo}>
            <View style={styles.selectedDotRow}>
              <View
                style={[
                  styles.selectedDot,
                  {
                    backgroundColor: isPickup ? COLORS.secondary : COLORS.primary,
                  },
                ]}
              />
              <Text style={styles.selectedLabel}>
                {isPickup ? 'Pickup Location' : 'Dropoff Location'}
              </Text>
            </View>
            <Text style={styles.selectedAddress} numberOfLines={2}>
              {selectedAddress}
            </Text>
            <Text style={styles.selectedCoords}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        ) : (
          <View style={styles.selectedInfo}>
            <Text style={styles.tapHint}>
              Tap on the map to select a {isPickup ? 'pickup' : 'dropoff'} location
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedLocation && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedLocation}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              selectedLocation
                ? [COLORS.primary, '#00CC6A']
                : [COLORS.textDim, COLORS.textDim]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <Text
              style={[
                styles.confirmText,
                !selectedLocation && styles.confirmTextDisabled,
              ]}
            >
              {selectedLocation ? 'Confirm Location' : 'Select a Location First'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 8,
    paddingRight: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  searchingIndicator: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  searchResultsList: {
    maxHeight: 280,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  searchResultAddress: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -36,
    alignItems: 'center',
  },
  pinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 4,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.backgroundElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  selectedInfo: {
    marginBottom: 16,
  },
  selectedDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  selectedLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  selectedAddress: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  selectedCoords: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tapHint: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 8,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '700',
  },
  confirmTextDisabled: {
    color: COLORS.textMuted,
  },
  // Popular Places
  popularContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 84,
    left: 0,
    right: 0,
    zIndex: 9,
    paddingHorizontal: 16,
  },
  popularTitle: {
    fontSize: 12,
    color: COLORS.textDim,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  popularList: {
    gap: 8,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 36, 0.9)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  popularChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
