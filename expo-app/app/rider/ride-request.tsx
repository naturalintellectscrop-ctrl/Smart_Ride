// ============================================
// SMART RIDE MOBILE - RIDE REQUEST SCREEN
// ============================================
// Stitch Design System — Book a Ride
// Map area at top, floating search card, vehicle
// selection, payment tray, Request Ride CTA
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, useTaskStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import {
  RIDE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { PaymentMethod } from '@/src/types';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { IconInput } from '@/src/components/IconInput';

// Types for search results
interface PlaceResult {
  id: string;
  // Unified shape from the backend: canonical fields + Mapbox-compatible aliases
  name?: string;
  address?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  place_name: string;          // = fullAddress
  center: [number, number];    // [lng, lat]
  category?: string;
  source?: 'curated' | 'mapbox';
  text?: string;
}

const RECENT_PLACES_KEY = 'smart-ride-recent-destinations';

// Types for ride type
interface RideTypeConfig {
  id: string;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  capacity: number;
}

export default function RideRequestScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const cardBg = { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border };
  const params = useLocalSearchParams<{ type?: 'BODA' | 'CAR' }>();
  const insets = useSafeAreaInsets();
  const {
    latitude, longitude, address, getCurrentLocation,
    pickupLocation, dropoffLocation, clearPickupLocation, clearDropoffLocation,
  } = useLocationStore();
  const { setPendingTask } = useTaskStore();
  const { user } = useAuthStore();

  const rideType = params.type === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;
  const [step, setStep] = useState<'pickup' | 'dropoff' | 'confirm'>('pickup');
  const [selectedVehicle, setSelectedVehicle] = useState<'BODA' | 'CAR'>(
    params.type === 'CAR' ? 'CAR' : 'BODA'
  );

  // Locations
  const [pickupAddress, setPickupAddress] = useState(address || '');
  const [pickupLatitude, setPickupLatitude] = useState(latitude);
  const [pickupLongitude, setPickupLongitude] = useState(longitude);

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLatitude, setDropoffLatitude] = useState<number | null>(null);
  const [dropoffLongitude, setDropoffLongitude] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<PlaceResult[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Route + pricing state (all from real APIs)
  const [distance, setDistance] = useState<number | null>(null);      // road km
  const [duration, setDuration] = useState<number | null>(null);      // drive minutes
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [bodaFare, setBodaFare] = useState<number | null>(null);
  const [carFare, setCarFare]   = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Record<string, any> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Nearby drivers (live dots + nearest ETA)
  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{ id: string; latitude: number; longitude: number; etaMin: number }>>([]);
  const [nearestEtaMin, setNearestEtaMin] = useState<number | null>(null);

  // Loading
  const [isRequesting, setIsRequesting] = useState(false);

  // Derived fare for the currently selected vehicle
  const estimatedFare = selectedVehicle === 'CAR' ? carFare : bodaFare;

  // Get current ride type config based on selected vehicle
  const currentRideType = selectedVehicle === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;

  useEffect(() => {
    getCurrentLocation();
    loadRecentPlaces();
    loadPopularPlaces();
  }, []);

  // Apply a pickup chosen on the map (location-picker writes it to the store).
  useEffect(() => {
    if (!pickupLocation) return;
    setPickupAddress(pickupLocation.address);
    setPickupLatitude(pickupLocation.latitude);
    setPickupLongitude(pickupLocation.longitude);
    clearPickupLocation();
    // If a destination already exists, refresh route + fares with the new origin.
    if (dropoffLatitude != null && dropoffLongitude != null) {
      fetchRouteAndFares(dropoffLatitude, dropoffLongitude, pickupLocation.latitude, pickupLocation.longitude);
    } else if (step === 'pickup') {
      setStep('dropoff');
    }
  }, [pickupLocation]);

  // Fetch nearby online drivers around the pickup, refreshed when the rider
  // changes vehicle type (boda vs car have different pools / ETAs).
  const fetchNearbyDrivers = async (lat: number, lng: number, vehicle: 'BODA' | 'CAR') => {
    try {
      const taskType = vehicle === 'CAR' ? 'SMART_CAR_RIDE' : 'SMART_BODA_RIDE';
      const res = await api.getNearbyDrivers(lat, lng, taskType);
      if (res.success && res.data) {
        setNearbyDrivers(res.data.drivers.map((d) => ({
          id: d.id, latitude: d.latitude, longitude: d.longitude, etaMin: d.etaMin,
        })));
        setNearestEtaMin(res.data.nearestEtaMin);
      }
    } catch {
      // non-fatal — dots/ETA just won't show
    }
  };

  useEffect(() => {
    if (pickupLatitude && pickupLongitude) {
      fetchNearbyDrivers(pickupLatitude, pickupLongitude, selectedVehicle);
    }
  }, [pickupLatitude, pickupLongitude, selectedVehicle]);

  // Apply a destination chosen on the map.
  useEffect(() => {
    if (!dropoffLocation) return;
    setDropoffAddress(dropoffLocation.address);
    setDropoffLatitude(dropoffLocation.latitude);
    setDropoffLongitude(dropoffLocation.longitude);
    clearDropoffLocation();
    setStep('confirm');
    fetchRouteAndFares(dropoffLocation.latitude, dropoffLocation.longitude);
  }, [dropoffLocation]);

  // Load recently used destinations from device storage
  const loadRecentPlaces = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_PLACES_KEY);
      if (raw) setRecentPlaces(JSON.parse(raw));
    } catch {
      // non-fatal
    }
  };

  // Load curated popular places (proximity-sorted to the user when available)
  const loadPopularPlaces = async () => {
    try {
      const prox = latitude && longitude ? { latitude, longitude } : undefined;
      const res = await api.getPopularPlaces(prox);
      if (res.success && res.data) setPopularPlaces(res.data as PlaceResult[]);
    } catch {
      // non-fatal — empty state just won't show suggestions
    }
  };

  // Persist a chosen destination to the recents list (max 5, de-duplicated)
  const saveRecentPlace = async (place: PlaceResult) => {
    try {
      const next = [place, ...recentPlaces.filter((p) => p.id !== place.id)].slice(0, 5);
      setRecentPlaces(next);
      await AsyncStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(next));
    } catch {
      // non-fatal
    }
  };

  // Debounced place search (fires 350ms after the user stops typing)
  const searchPlaces = (query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const prox = latitude && longitude ? { latitude, longitude } : undefined;
        const response = await api.searchPlaces(query, prox);
        if (response.success && Array.isArray(response.data)) {
          setSearchResults(response.data as PlaceResult[]);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Resolve coordinates + label from a unified place (robust to either shape)
  const resolvePlace = (place: PlaceResult) => {
    const lat = place.lat ?? place.center?.[1];
    const lng = place.lng ?? place.center?.[0];
    const label = place.place_name || place.fullAddress || place.name || 'Selected location';
    return { lat, lng, label };
  };

  // Select a place from search results / suggestions
  const selectPlace = (place: PlaceResult) => {
    const { lat, lng, label } = resolvePlace(place);
    if (lat == null || lng == null) {
      Alert.alert('Error', 'This location is missing coordinates. Please pick another.');
      return;
    }

    if (step === 'pickup') {
      setPickupAddress(label);
      setPickupLatitude(lat);
      setPickupLongitude(lng);
      setStep('dropoff');
    } else {
      setDropoffAddress(label);
      setDropoffLatitude(lat);
      setDropoffLongitude(lng);
      setStep('confirm');
      saveRecentPlace(place);
      fetchRouteAndFares(lat, lng);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  /**
   * Fetch driving route from Mapbox and then get accurate fares from backend.
   * Called when the user confirms their dropoff location.
   */
  const fetchRouteAndFares = async (
    destLat: number,
    destLng: number,
    originLat?: number,
    originLng?: number,
  ) => {
    const oLat = originLat ?? pickupLatitude;
    const oLng = originLng ?? pickupLongitude;
    if (!oLat || !oLng) return;
    setIsCalculating(true);
    try {
      // 1 — Get actual driving route (road distance + duration + polyline)
      const dirRes = await api.getDirections(
        { latitude: oLat, longitude: oLng },
        { latitude: destLat, longitude: destLng },
      );

      let roadKm: number;
      let driveMin: number;

      if (dirRes.success && dirRes.data) {
        roadKm  = dirRes.data.distanceKm;
        driveMin = dirRes.data.durationMin;
        setDistance(roadKm);
        setDuration(driveMin);
        setRouteCoordinates(dirRes.data.geometry);
      } else {
        // Fallback to Haversine if directions API fails
        roadKm  = haversineKm(oLat, oLng, destLat, destLng);
        driveMin = Math.round(roadKm * 3); // rough estimate: 3 min/km urban
        setDistance(roadKm);
        setDuration(driveMin);
        setRouteCoordinates([]);
      }

      // 2 — Get backend fare estimates (same logic as task creation)
      const fareRes = await api.getFareEstimate(roadKm, driveMin);
      if (fareRes.success && fareRes.data?.estimates) {
        const { estimates } = fareRes.data;
        setEstimates(estimates);
        setBodaFare(estimates['SMART_BODA_RIDE']?.totalAmount ?? null);
        setCarFare(estimates['SMART_CAR_RIDE']?.totalAmount ?? null);
      } else {
        // Fallback: local calculation using backend rates
        setBodaFare(Math.max(Math.round(2000 + roadKm * 150 * 1.05), 3000));
        setCarFare(Math.max(Math.round(5000 + roadKm * 300 * 1.05), 8000));
      }
    } catch (error) {
      console.error('[ride-request] fetchRouteAndFares error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Haversine fallback (straight-line distance)
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Request ride
  const handleRequestRide = async () => {
    if (!dropoffLatitude || !dropoffLongitude) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login to request a ride');
      router.replace('/auth/login');
      return;
    }

    const distanceKm = distance || haversineKm(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude,
    );

    setIsRequesting(true);
    try {
      const response = await api.requestRide({
        taskType: currentRideType.id === 'BODA' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE',
        clientId: user.id,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        paymentMethod: PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod,
        distanceKm,
        durationMin: duration ?? undefined,
      });

      if (response.success && response.data) {
        setPendingTask(response.data);
        router.replace(`/rider/ride-tracking?taskId=${response.data.id}`);
      } else {
        Alert.alert('Error', response.error || 'Failed to request ride');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map area at top */}
      <View style={styles.mapContainer}>
        <SmartRideMap
          style={StyleSheet.absoluteFill}
          initialLatitude={pickupLatitude || 0.3476}
          initialLongitude={pickupLongitude || 32.5825}
          pickup={
            pickupLatitude && pickupLongitude
              ? { latitude: pickupLatitude, longitude: pickupLongitude, title: pickupAddress || 'Pickup' }
              : undefined
          }
          dropoff={
            dropoffLatitude && dropoffLongitude
              ? { latitude: dropoffLatitude, longitude: dropoffLongitude, title: dropoffAddress || 'Destination' }
              : undefined
          }
          routeCoordinates={routeCoordinates.length > 0 ? routeCoordinates : undefined}
          driverPoints={nearbyDrivers.map((d) => ({ latitude: d.latitude, longitude: d.longitude }))}
          showUserLocation
        />

        {/* Back button overlay */}
        <TouchableOpacity
          style={[styles.mapBackButton, { top: insets.top + SPACING.sm || 48 }]}
          onPress={() => {
            if (step === 'dropoff') setStep('pickup');
            else if (step === 'confirm') setStep('dropoff');
            else router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Floating bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'pickup' && (
            <PickupStep
              pickupAddress={pickupAddress}
              searchQuery={searchQuery}
              setSearchQuery={(q) => { setSearchQuery(q); searchPlaces(q); }}
              searchResults={searchResults}
              isSearching={isSearching}
              onSelectPlace={selectPlace}
              popularPlaces={popularPlaces}
              recentPlaces={recentPlaces}
              onPickOnMap={() => router.push('/location-picker?type=pickup' as any)}
              onUseCurrentLocation={() => {
                setPickupAddress(address);
                setPickupLatitude(latitude);
                setPickupLongitude(longitude);
                setStep('dropoff');
              }}
              COLORS={COLORS}
              styles={styles}
            />
          )}

          {step === 'dropoff' && (
            <DropoffStep
              pickupAddress={pickupAddress}
              searchQuery={searchQuery}
              setSearchQuery={(q) => { setSearchQuery(q); searchPlaces(q); }}
              searchResults={searchResults}
              isSearching={isSearching}
              onSelectPlace={selectPlace}
              popularPlaces={popularPlaces}
              recentPlaces={recentPlaces}
              onPickOnMap={() => router.push('/location-picker?type=dropoff' as any)}
              COLORS={COLORS}
              styles={styles}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={setSelectedVehicle}
              pickupAddress={pickupAddress}
              dropoffAddress={dropoffAddress}
              distance={distance}
              duration={duration}
              bodaFare={bodaFare}
              carFare={carFare}
              isCalculating={isCalculating}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              onRequestRide={handleRequestRide}
              isRequesting={isRequesting}
              currentRideType={currentRideType}
              nearestEtaMin={nearestEtaMin}
              fareBreakdown={estimates ? estimates[selectedVehicle === 'CAR' ? 'SMART_CAR_RIDE' : 'SMART_BODA_RIDE'] : null}
              COLORS={COLORS}
              styles={styles}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ============================================
// PICKUP STEP
// ============================================
// Single tappable place row (name + secondary address line + ↗ jump icon)
function PlaceRow({ place, icon, onPress, COLORS, styles }: { place: PlaceResult; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; COLORS: ThemedColors; styles: any }) {
  const primary = place.name || place.place_name || 'Location';
  const secondary = place.address || place.fullAddress || place.place_name || '';
  return (
    <TouchableOpacity style={styles.searchResultItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.resultIconCircle}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.searchResultText} numberOfLines={1}>{primary}</Text>
        {secondary && secondary !== primary ? (
          <Text style={styles.searchResultSubtext} numberOfLines={1}>{secondary}</Text>
        ) : null}
      </View>
      <Ionicons name="arrow-forward" size={16} color={COLORS.onSurfaceVariant} style={styles.resultJumpIcon} />
    </TouchableOpacity>
  );
}

// Empty-state suggestions: recent destinations + popular places
function PlaceSuggestions({
  recentPlaces,
  popularPlaces,
  onSelectPlace,
  COLORS,
  styles,
}: {
  recentPlaces: PlaceResult[];
  popularPlaces: PlaceResult[];
  onSelectPlace: (p: PlaceResult) => void;
  COLORS: ThemedColors;
  styles: any;
}) {
  if (recentPlaces.length === 0 && popularPlaces.length === 0) return null;
  const cardBg = { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border };
  return (
    <View style={{ marginTop: SPACING.md }}>
      {recentPlaces.length > 0 && (
        <>
          <Text style={styles.suggestionHeader}>Recent</Text>
          <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={[styles.resultsCard, cardBg]}>
            {recentPlaces.map((p, i) => (
              <View key={`recent-${p.id}-${i}`} style={i < recentPlaces.length - 1 ? styles.searchResultDivider : undefined}>
                <PlaceRow place={p} icon="time-outline" onPress={() => onSelectPlace(p)} COLORS={COLORS} styles={styles} />
              </View>
            ))}
          </GlassCard>
        </>
      )}
      {popularPlaces.length > 0 && (
        <>
          <Text style={styles.suggestionHeader}>Popular places</Text>
          <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={[styles.resultsCard, cardBg]}>
            {popularPlaces.map((p, i) => (
              <View key={`pop-${p.id}-${i}`} style={i < popularPlaces.length - 1 ? styles.searchResultDivider : undefined}>
                <PlaceRow place={p} icon="star-outline" onPress={() => onSelectPlace(p)} COLORS={COLORS} styles={styles} />
              </View>
            ))}
          </GlassCard>
        </>
      )}
    </View>
  );
}

function PickupStep({
  pickupAddress,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSelectPlace,
  popularPlaces,
  recentPlaces,
  onPickOnMap,
  onUseCurrentLocation,
  COLORS,
  styles,
}: {
  pickupAddress: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPlace: (place: PlaceResult) => void;
  popularPlaces: PlaceResult[];
  recentPlaces: PlaceResult[];
  onPickOnMap: () => void;
  onUseCurrentLocation: () => void;
  COLORS: ThemedColors;
  styles: any;
}) {
  const cardBg = { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border };
  return (
    <View>
      {/* Destination search floating card */}
      <GlassCard variant="elevated" padding={0} borderRadius={RADIUS.xl} style={cardBg}>
        <View style={styles.searchCardInner}>
          <View style={styles.searchIconRow}>
            <View style={styles.pickupDot} />
            <View style={styles.dottedLine} />
            <View style={styles.dropoffDot} />
          </View>
          <View style={styles.searchInputsColumn}>
            <TouchableOpacity
              style={styles.locationChip}
              onPress={onUseCurrentLocation}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={16} color={COLORS.primary} />
              <Text style={styles.locationChipText} numberOfLines={1}>
                {pickupAddress || 'Current Location'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
            <View style={styles.searchInputRow}>
              <Ionicons name="search" size={18} color={COLORS.onSurfaceVariant} style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Where to?"
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Set pickup on map (Uber-style center-pin picker) */}
      <TouchableOpacity style={styles.setOnMapRow} onPress={onPickOnMap} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={18} color={COLORS.primary} />
        <Text style={styles.setOnMapText}>Set pickup on map</Text>
      </TouchableOpacity>

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
      )}

      {!isSearching && searchResults.length > 0 && (
        <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={[styles.resultsCard, cardBg]}>
          {searchResults.map((place, index) => (
            <View key={`${place.id}-${index}`} style={index < searchResults.length - 1 ? styles.searchResultDivider : undefined}>
              <PlaceRow place={place} icon="location-outline" onPress={() => onSelectPlace(place)} COLORS={COLORS} styles={styles} />
            </View>
          ))}
        </GlassCard>
      )}

      {/* Empty state: recent + popular suggestions */}
      {!isSearching && searchResults.length === 0 && searchQuery.trim().length < 2 && (
        <PlaceSuggestions recentPlaces={recentPlaces} popularPlaces={popularPlaces} onSelectPlace={onSelectPlace} COLORS={COLORS} styles={styles} />
      )}
    </View>
  );
}

// ============================================
// DROPOFF STEP
// ============================================
function DropoffStep({
  pickupAddress,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSelectPlace,
  popularPlaces,
  recentPlaces,
  onPickOnMap,
  COLORS,
  styles,
}: {
  pickupAddress: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPlace: (place: PlaceResult) => void;
  popularPlaces: PlaceResult[];
  recentPlaces: PlaceResult[];
  onPickOnMap: () => void;
  COLORS: ThemedColors;
  styles: any;
}) {
  const cardBg = { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border };
  return (
    <View>
      {/* Pickup summary + destination search */}
      <GlassCard variant="elevated" padding={0} borderRadius={RADIUS.xl} style={cardBg}>
        <View style={styles.searchCardInner}>
          <View style={styles.searchIconRow}>
            <View style={styles.pickupDot} />
            <View style={styles.dottedLine} />
            <View style={styles.dropoffDot} />
          </View>
          <View style={styles.searchInputsColumn}>
            <View style={styles.locationChipStatic}>
              <Text style={styles.locationChipText} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <View style={styles.searchInputRow}>
              <Ionicons name="search" size={18} color={COLORS.onSurfaceVariant} style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Enter destination"
                placeholderTextColor={COLORS.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Set destination on map (Uber-style center-pin picker) */}
      <TouchableOpacity style={styles.setOnMapRow} onPress={onPickOnMap} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={18} color={COLORS.primary} />
        <Text style={styles.setOnMapText}>Set destination on map</Text>
      </TouchableOpacity>

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
      )}

      {!isSearching && searchResults.length > 0 && (
        <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={[styles.resultsCard, cardBg]}>
          {searchResults.map((place, index) => (
            <View key={`${place.id}-${index}`} style={index < searchResults.length - 1 ? styles.searchResultDivider : undefined}>
              <PlaceRow place={place} icon="location-outline" onPress={() => onSelectPlace(place)} COLORS={COLORS} styles={styles} />
            </View>
          ))}
        </GlassCard>
      )}

      {/* Empty state: recent + popular suggestions */}
      {!isSearching && searchResults.length === 0 && searchQuery.trim().length < 2 && (
        <PlaceSuggestions recentPlaces={recentPlaces} popularPlaces={popularPlaces} onSelectPlace={onSelectPlace} COLORS={COLORS} styles={styles} />
      )}
    </View>
  );
}

// ============================================
// CONFIRM STEP
// ============================================
function ConfirmStep({
  selectedVehicle,
  setSelectedVehicle,
  pickupAddress,
  dropoffAddress,
  distance,
  duration,
  bodaFare,
  carFare,
  isCalculating,
  paymentMethod,
  setPaymentMethod,
  phoneNumber,
  setPhoneNumber,
  onRequestRide,
  isRequesting,
  currentRideType,
  nearestEtaMin,
  fareBreakdown,
  COLORS,
  styles,
}: {
  selectedVehicle: 'BODA' | 'CAR';
  setSelectedVehicle: (v: 'BODA' | 'CAR') => void;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number | null;
  duration: number | null;
  bodaFare: number | null;
  carFare: number | null;
  isCalculating: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  onRequestRide: () => void;
  isRequesting: boolean;
  currentRideType: RideTypeConfig;
  nearestEtaMin: number | null;
  fareBreakdown: { baseFare: number; distanceFare: number; timeFare?: number; waitingCharge?: number; serviceFee: number; surcharges: number; totalAmount: number; minimumApplied: boolean } | null;
  COLORS: ThemedColors;
  styles: any;
}) {
  const cardBg = { backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border };
  const etaLabel = duration != null ? `~${duration} min drive` : '...';

  // SafeBoda-style fare range: bracket the exact fare to a tidy UGX window.
  // The precise amount is computed from real road distance; the range simply
  // communicates that traffic/time can move it a little, like Bolt/SafeBoda.
  const fareRange = (fare: number | null): string | null => {
    if (fare == null) return null;
    const low = Math.floor(fare / 500) * 500;
    const high = low + 1000;
    return `UGX ${low.toLocaleString()} ~ ${high.toLocaleString()}`;
  };

  return (
    <View>
      {/* Route Summary Card */}
      <GlassCard variant="elevated" padding={SPACING.md} borderRadius={RADIUS.xl} style={cardBg}>
        <View style={styles.routeRow}>
          <View style={styles.routeDotsColumn}>
            <View style={[styles.routeCircle, { backgroundColor: COLORS.secondaryFixed }]} />
            <View style={styles.routeDottedLine} />
            <View style={[styles.routeCircle, { backgroundColor: COLORS.primary }]} />
          </View>
          <View style={styles.routeTextColumn}>
            <View style={styles.routePoint}>
              <Text style={styles.routePointLabel}>Pickup</Text>
              <Text style={styles.routePointAddress} numberOfLines={1}>{pickupAddress}</Text>
            </View>
            <View style={styles.routePoint}>
              <Text style={styles.routePointLabel}>Dropoff</Text>
              <Text style={styles.routePointAddress} numberOfLines={1}>{dropoffAddress}</Text>
            </View>
          </View>
        </View>
        {distance != null && (
          <Text style={styles.routeMeta}>
            {distance.toFixed(1)} km · {etaLabel}
          </Text>
        )}
      </GlassCard>

      {/* Estimated cost header */}
      <View style={styles.estCostHeader}>
        <View style={styles.estCostLeft}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.estCostText}>ESTIMATED COST</Text>
        </View>
        {isCalculating ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : nearestEtaMin != null ? (
          <View style={styles.driverEtaBadge}>
            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
            <Text style={styles.driverEtaText}>Driver ~{nearestEtaMin} min away</Text>
          </View>
        ) : null}
      </View>

      {/* Ride option: Smart Boda */}
      <TouchableOpacity
        style={[styles.rideRow, selectedVehicle === 'BODA' && styles.rideRowSelected]}
        onPress={() => setSelectedVehicle('BODA')}
        activeOpacity={0.75}
      >
        <View style={[styles.rideIconCircle, selectedVehicle === 'BODA' && styles.rideIconCircleActive]}>
          <Ionicons name="bicycle" size={22} color={selectedVehicle === 'BODA' ? COLORS.onPrimary : COLORS.primary} />
        </View>
        <View style={styles.rideCardContent}>
          <Text numberOfLines={1} style={[styles.rideCardName, selectedVehicle === 'BODA' && styles.rideCardNameActive]}>Smart Boda</Text>
          <Text numberOfLines={1} style={styles.rideCardDesc}>Fast &amp; affordable</Text>
        </View>
        <View style={styles.rideCardRight}>
          {isCalculating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text numberOfLines={1} style={styles.rideCardPrice}>{fareRange(bodaFare) ?? '---'}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Ride option: Smart Car */}
      <TouchableOpacity
        style={[styles.rideRow, selectedVehicle === 'CAR' && styles.rideRowSelected]}
        onPress={() => setSelectedVehicle('CAR')}
        activeOpacity={0.75}
      >
        <View style={[styles.rideIconCircle, selectedVehicle === 'CAR' && styles.rideIconCircleActive]}>
          <Ionicons name="car" size={22} color={selectedVehicle === 'CAR' ? COLORS.onPrimary : COLORS.primary} />
        </View>
        <View style={styles.rideCardContent}>
          <Text numberOfLines={1} style={[styles.rideCardName, selectedVehicle === 'CAR' && styles.rideCardNameActive]}>Smart Car</Text>
          <Text numberOfLines={1} style={styles.rideCardDesc}>Comfort · AC · up to 4</Text>
        </View>
        <View style={styles.rideCardRight}>
          {isCalculating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text numberOfLines={1} style={styles.rideCardPrice}>{fareRange(carFare) ?? '---'}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Fare breakdown for the selected vehicle */}
      {fareBreakdown && !isCalculating && (
        <View style={styles.fareBreakdown}>
          <View style={styles.fareRow}>
            <Text style={styles.fareRowLabel}>Base fare</Text>
            <Text style={styles.fareRowValue}>UGX {fareBreakdown.baseFare.toLocaleString()}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareRowLabel}>Distance{distance != null ? ` (${distance.toFixed(1)} km)` : ''}</Text>
            <Text style={styles.fareRowValue}>UGX {fareBreakdown.distanceFare.toLocaleString()}</Text>
          </View>
          {!!fareBreakdown.timeFare && fareBreakdown.timeFare > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareRowLabel}>Time{duration != null ? ` (${duration} min)` : ''}</Text>
              <Text style={styles.fareRowValue}>UGX {fareBreakdown.timeFare.toLocaleString()}</Text>
            </View>
          )}
          {!!fareBreakdown.waitingCharge && fareBreakdown.waitingCharge > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareRowLabel}>Waiting</Text>
              <Text style={styles.fareRowValue}>UGX {fareBreakdown.waitingCharge.toLocaleString()}</Text>
            </View>
          )}
          {fareBreakdown.surcharges > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareRowLabel}>Peak / night surcharge</Text>
              <Text style={styles.fareRowValue}>UGX {fareBreakdown.surcharges.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.fareRow}>
            <Text style={styles.fareRowLabel}>Service fee</Text>
            <Text style={styles.fareRowValue}>UGX {fareBreakdown.serviceFee.toLocaleString()}</Text>
          </View>
          <View style={[styles.fareRow, styles.fareTotalRow]}>
            <Text style={styles.fareTotalLabel}>Estimated total</Text>
            <Text style={styles.fareTotalValue}>UGX {fareBreakdown.totalAmount.toLocaleString()}</Text>
          </View>
          {fareBreakdown.minimumApplied && (
            <Text style={styles.fareNote}>Minimum fare applied</Text>
          )}
        </View>
      )}

      {/* Payment Method — single bar with Change */}
      <View style={styles.paymentBar}>
        <View style={styles.paymentBarLeft}>
          <View style={styles.paymentBarBadge}>
            <Text style={styles.paymentBarBadgeText}>
              {paymentMethod === 'CASH' ? 'CASH'
                : paymentMethod === 'MTN_MOMO' ? 'MTN'
                : paymentMethod === 'AIRTEL_MONEY' ? 'AIRTEL'
                : 'VISA'}
            </Text>
          </View>
          <Text style={styles.paymentBarLabel}>
            {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name ?? paymentMethod}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const options: PaymentMethod[] = ['CASH', 'MTN_MOMO', 'AIRTEL_MONEY', 'VISA'];
            const idx = options.indexOf(paymentMethod);
            setPaymentMethod(options[(idx + 1) % options.length]);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.paymentChangeText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Phone number for mobile money (MTN / Airtel only) */}
      {(paymentMethod === 'MTN_MOMO' || paymentMethod === 'AIRTEL_MONEY') && (
        <View style={styles.phoneInputContainer}>
          <IconInput
            placeholder="Phone number for mobile money"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            icon="phone-portrait-outline"
            keyboardType="phone-pad"
          />
        </View>
      )}

      {/* Request Ride CTA Button */}
      <View style={styles.ctaContainer}>
        <GradientButton
          title={isRequesting ? 'Requesting...' : `Request ${currentRideType.name}`}
          onPress={onRequestRide}
          variant="primary"
          size="lg"
          fullWidth
          loading={isRequesting}
          disabled={isRequesting}
          icon={!isRequesting ? <Ionicons name="navigate" size={20} color={COLORS.onPrimary} /> : undefined}
        />
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Map
  mapContainer: {
    height: '40%',
    position: 'relative',
  },
  mapBackButton: {
    position: 'absolute',
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },

  // Bottom sheet
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    marginTop: -RADIUS.xl,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Search card (shared)
  searchCardInner: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  searchIconRow: {
    width: 20,
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondaryFixed,
  },
  dottedLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    marginVertical: SPACING.xs,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  searchInputsColumn: {
    flex: 1,
    gap: SPACING.sm,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  locationChipStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  locationChipText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
  },
  searchInputIcon: {
    marginRight: SPACING.sm,
  },
  searchTextInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    paddingVertical: SPACING.md - 2,
  },

  // "Set on map" entry point
  setOnMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryFixed,
  },
  setOnMapText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Results
  resultsCard: {
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  searchResultDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  resultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  searchResultText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  searchResultSubtext: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },
  suggestionHeader: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  // Route summary
  routeRow: {
    flexDirection: 'row',
  },
  routeDotsColumn: {
    width: 20,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  routeCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDottedLine: {
    width: 2,
    height: 24,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.outlineVariant,
    marginVertical: SPACING.xs,
  },
  routeTextColumn: {
    flex: 1,
    gap: SPACING.md,
  },
  routePoint: {},
  routePointLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  routePointAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
    marginTop: 2,
  },

  // Available rides header
  availableRidesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
  },
  // Ride list cards (Stitch vertical layout)
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  rideCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  rideIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  rideCardContent: {
    flex: 1,
    minWidth: 0, // allow text to ellipsize instead of forcing the row to wrap
    flexShrink: 1,
  },
  rideCardName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  rideCardNameActive: {
    color: COLORS.primary,
  },
  rideCardDesc: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  rideCardRight: {
    alignItems: 'flex-end',
    flexShrink: 0, // keep the price on one line; content column shrinks instead
    paddingLeft: SPACING.sm,
  },
  rideCardPrice: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  // SafeBoda-style estimated-cost header
  estCostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  estCostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estCostText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fareBreakdown: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    gap: 4,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareRowLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  fareRowValue: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurface },
  fareTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    marginTop: 4,
    paddingTop: 6,
  },
  fareTotalLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, fontWeight: '700' },
  fareTotalValue: { ...TYPOGRAPHY.bodyMd, color: COLORS.primary, fontWeight: '700' },
  fareNote: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, fontStyle: 'italic', marginTop: 2 },
  driverEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  driverEtaText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // SafeBoda-style ride rows (left accent border when selected)
  rideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  rideRowSelected: {
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primaryFixed,
  },
  resultJumpIcon: {
    transform: [{ rotate: '-45deg' }],
    marginLeft: SPACING.sm,
  },
  routeMeta: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },

  // Payment bar (Stitch single-row with Change)
  paymentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  paymentBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  paymentBarBadge: {
    backgroundColor: '#FFC107',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  paymentBarBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: '#000',
    fontWeight: '700',
  },
  paymentBarLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  paymentChangeText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Phone input
  phoneInputContainer: {
    marginTop: SPACING.sm,
  },

  // CTA
  ctaContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
});
