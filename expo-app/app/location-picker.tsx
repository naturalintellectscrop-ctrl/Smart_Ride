// ============================================
// SMART RIDE MOBILE - LOCATION PICKER (Uber-style center pin)
// ============================================
// The pin stays fixed at the screen center. The user MOVES THE MAP under it.
// As the map settles, the center coordinate is reverse-geocoded and the
// address updates. A search bar (Mapbox autocomplete + curated POIs) lets the
// user jump the map to a place. Confirm writes the chosen point to the store.
//
// No hardcoded/sample locations. Everything comes from GPS, map gestures,
// the geocoding API, and the search API.
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { DEFAULT_LOCATION, GRADIENTS, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ type: 'pickup' | 'dropoff' }>();
  const isPickup = params.type === 'pickup';

  const {
    latitude: userLat,
    longitude: userLng,
    getCurrentLocation,
    setPickupLocation,
    setDropoffLocation,
  } = useLocationStore();

  // Camera target (only changes on mount/search — drives flyTo)
  const [mapCenter, setMapCenter] = useState({
    latitude: userLat || DEFAULT_LOCATION.latitude,
    longitude: userLng || DEFAULT_LOCATION.longitude,
  });
  // Live center under the pin (updated by map gestures)
  const centerRef = useRef({ ...mapCenter });
  const [address, setAddress] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseSeq = useRef(0);

  // Center the map on the user's real GPS position on mount.
  useEffect(() => {
    getCurrentLocation().catch(() => {});
  }, []);

  useEffect(() => {
    // When GPS resolves after mount, recenter (only if user hasn't moved yet).
    if (userLat && userLng && !address) {
      setMapCenter({ latitude: userLat, longitude: userLng });
    }
  }, [userLat, userLng]);

  // Reverse-geocode the current map center (called when the map settles).
  const resolveCenter = useCallback(async (coords: { latitude: number; longitude: number }) => {
    const seq = ++reverseSeq.current;
    setIsResolving(true);
    try {
      const response = await api.reverseGeocode(coords.latitude, coords.longitude);
      if (seq !== reverseSeq.current) return; // a newer move superseded this one
      const places = (response.data as any)?.places || [];
      const resolved =
        places[0]?.fullAddress ||
        places[0]?.name ||
        `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      setAddress(resolved);
    } catch {
      if (seq !== reverseSeq.current) return;
      setAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    } finally {
      if (seq === reverseSeq.current) setIsResolving(false);
    }
  }, []);

  // Map gesture: user is dragging — hide the stale address.
  const handleCameraChanged = useCallback((c: { latitude: number; longitude: number }) => {
    centerRef.current = c;
    setIsMoving(true);
  }, []);

  // Map settled — lock in the center and reverse-geocode it.
  const handleMapIdle = useCallback(
    (c: { latitude: number; longitude: number }) => {
      centerRef.current = c;
      setIsMoving(false);
      resolveCenter(c);
    },
    [resolveCenter],
  );

  // Tap-to-select: tapping anywhere on the map jumps the pin to that point and
  // reverse-geocodes it (complements the drag-the-map-under-the-pin gesture).
  const handleMapPress = useCallback(
    (c: { latitude: number; longitude: number }) => {
      setMapCenter(c);
      centerRef.current = c;
      setIsMoving(false);
      resolveCenter(c);
    },
    [resolveCenter],
  );

  // Search autocomplete (debounced) — proximity-biased to the current center.
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.searchPlaces(query.trim(), centerRef.current);
        const places = Array.isArray(response.data) ? response.data : [];
        const results: PlaceResult[] = places.map((p: any, i: number) => ({
          id: p.id || `place-${i}`,
          name: p.name || p.text || p.fullAddress || 'Unknown',
          address: p.fullAddress || p.address || p.place_name || '',
          latitude: p.lat ?? p.center?.[1] ?? 0,
          longitude: p.lng ?? p.center?.[0] ?? 0,
        }));
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  // Pick a search result — fly the map there; onMapIdle will refine the address.
  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    if (!place.latitude || !place.longitude) return;
    setMapCenter({ latitude: place.latitude, longitude: place.longitude });
    centerRef.current = { latitude: place.latitude, longitude: place.longitude };
    setAddress(place.address || place.name);
    setSearchResults([]);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const handleConfirm = useCallback(() => {
    const c = centerRef.current;
    const data = { latitude: c.latitude, longitude: c.longitude, address: address || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}` };
    if (isPickup) setPickupLocation(data);
    else setDropoffLocation(data);
    router.back();
  }, [address, isPickup, setPickupLocation, setDropoffLocation, router]);

  return (
    <View style={styles.container}>
      {/* Full-screen map with fixed center pin */}
      <SmartRideMap
        style={StyleSheet.absoluteFillObject}
        initialLatitude={mapCenter.latitude}
        initialLongitude={mapCenter.longitude}
        showUserLocation
        showCenterPin
        centerPinType={isPickup ? 'pickup' : 'dropoff'}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}
        onMapPress={handleMapPress}
      />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.onSurfaceMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${isPickup ? 'pickup' : 'destination'}…`}
              placeholderTextColor={COLORS.onSurfaceMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {(searchResults.length > 0 || isSearching) && (
          <View style={styles.searchResultsContainer}>
            {isSearching && (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.searchResultsList}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchResultItem} onPress={() => handlePlaceSelect(item)}>
                  <View style={styles.searchResultIcon}>
                    <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultAddress} numberOfLines={1}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom confirmation card */}
      <View style={styles.bottomCard}>
        <View style={styles.selectedDotRow}>
          <View style={[styles.selectedDot, { backgroundColor: isPickup ? COLORS.secondary : COLORS.primary }]} />
          <Text style={styles.selectedLabel}>{isPickup ? 'Pickup location' : 'Destination'}</Text>
        </View>

        <View style={styles.addressRow}>
          {isMoving || isResolving ? (
            <View style={styles.movingRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.movingText}>{isMoving ? 'Move the map to set location…' : 'Finding address…'}</Text>
            </View>
          ) : (
            <Text style={styles.selectedAddress} numberOfLines={2}>
              {address || 'Move the map to set location'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, (isMoving || !address) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isMoving || !address}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              !isMoving && address
                ? (GRADIENTS.primary as [string, string])
                : [COLORS.onSurfaceDim, COLORS.onSurfaceDim]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <Text style={styles.confirmText}>
              {isPickup ? 'Confirm Pickup' : 'Confirm Destination'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  searchContainer: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 16, zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.outlineVariant,
    paddingLeft: 8, paddingRight: 12, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 48 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.onSurface, fontSize: 15, paddingVertical: 0 },
  searchResultsContainer: {
    backgroundColor: COLORS.surfaceContainerLowest, borderRadius: RADIUS.lg, marginTop: 8, maxHeight: 300,
    borderWidth: 1, borderColor: COLORS.outlineVariant, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'hidden',
  },
  searchingIndicator: { paddingVertical: 8, alignItems: 'center' },
  searchResultsList: { maxHeight: 280 },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant,
  },
  searchResultIcon: {
    width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFixedDim,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  searchResultText: { flex: 1 },
  searchResultName: { color: COLORS.onSurface, fontWeight: '600', fontSize: 14 },
  searchResultAddress: { color: COLORS.outline, fontSize: 12, marginTop: 2 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.outlineVariant, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  selectedDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  selectedDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  selectedLabel: { color: COLORS.onSurfaceSecondary, fontSize: 12, fontWeight: '500' },
  addressRow: { minHeight: 44, justifyContent: 'center', marginBottom: 16 },
  movingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  movingText: { color: COLORS.onSurfaceVariant, fontSize: 14 },
  selectedAddress: { color: COLORS.onSurface, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  confirmButton: { borderRadius: RADIUS.full, overflow: 'hidden' },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: COLORS.onPrimary, fontSize: 17, fontWeight: '700' },
});
