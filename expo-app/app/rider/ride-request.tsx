// ============================================
// SMART RIDE — BOOK A RIDE
// ============================================
// Golden Screens #8–#10 · Archetype AR-3 (Operational Map, progressive).
//
//   compact AppHeader overlay → map workspace → operations panel (rounded-26,
//   grabber, live content → primary action)
//
// The flow is one decision per step: pickup → destination → confirm. Every
// surface here is a Design-System primitive (Card, SearchInput, Chip,
// SegmentedControl, SmartBottomSheet, GradientButton, StateViews); the screen
// contributes layout and domain content only, no bespoke cards or buttons.
//
// Business logic — place search/debounce, recents, directions, fare estimates,
// nearby drivers, payment mapping and task creation — is unchanged.
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
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
  MOTION,
  ICON,
  BORDER,
  OPACITY,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { PaymentMethod } from '@/src/types';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  GradientButton,
  IconInput,
  SearchInput,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SmartBottomSheet,
  SmartRideMap,
} from '@/src/components';

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

/** Entrance stagger for list rows — `base` step, capped at 240ms (DS motion). */
const rowDelay = (index: number) => Math.min(index * 40, 240);

// Types for ride type
interface RideTypeConfig {
  id: string;
  name: string;
  description: string;
  baseFare: number;
  perKm: number;
  capacity: number;
}

type Step = 'pickup' | 'dropoff' | 'confirm';

const STEP_TITLE: Record<Step, string> = {
  pickup: 'Set pickup',
  dropoff: 'Where to?',
  confirm: 'Confirm ride',
};

export default function RideRequestScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ type?: 'BODA' | 'CAR' }>();
  const insets = useSafeAreaInsets();
  const {
    latitude, longitude, address, getCurrentLocation,
    pickupLocation, dropoffLocation, clearPickupLocation, clearDropoffLocation,
  } = useLocationStore();
  const { setPendingTask } = useTaskStore();
  const { user } = useAuthStore();

  const rideType = params.type === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;
  // Start on the DESTINATION step when we already know the pickup (the user's
  // current GPS location). They arrived here via "Set destination", so the very
  // first place they choose is their destination — not a new pickup. They can
  // still tap the pickup chip (or the back arrow) to change pickup. Previously
  // this always began at 'pickup', so the first selection overwrote the pickup.
  const [step, setStep] = useState<Step>(
    address && latitude != null && longitude != null ? 'dropoff' : 'pickup'
  );
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
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);

  // Route + pricing state (all from real APIs)
  const [distance, setDistance] = useState<number | null>(null);      // road km
  const [duration, setDuration] = useState<number | null>(null);      // drive minutes
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [bodaFare, setBodaFare] = useState<number | null>(null);
  const [carFare, setCarFare]   = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Record<string, any> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Nearby drivers (live dots + nearest ETA)
  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    etaMin: number;
    vehicleType?: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER' | null;
    riderRole?: string | null;
    heading?: number | null;
  }>>([]);
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
          vehicleType: d.vehicleType, riderRole: d.riderRole, heading: d.heading,
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

  const onChangeQuery = (q: string) => {
    setSearchQuery(q);
    searchPlaces(q);
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

  // Back steps through the flow before leaving the screen.
  const handleBack = () => {
    if (step === 'dropoff') setStep('pickup');
    else if (step === 'confirm') setStep('dropoff');
    else router.back();
  };

  return (
    <View style={styles.container}>
      {/* ─── Map workspace ─────────────────────────────── */}
      <View style={styles.mapWorkspace}>
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
          driverPoints={nearbyDrivers.map((d) => ({
            latitude: d.latitude, longitude: d.longitude,
            vehicleType: d.vehicleType, riderRole: d.riderRole, heading: d.heading,
          }))}
          showUserLocation
        />

        {/* Compact header overlays the map (AR-3) */}
        <AppHeader
          title={STEP_TITLE[step]}
          onBack={handleBack}
          style={styles.headerOverlay}
        />
      </View>

      {/* ─── Operations panel ──────────────────────────── */}
      <View style={styles.panel}>
        <View style={styles.grabberWrap}>
          <View style={styles.grabber} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.lg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step !== 'confirm' ? (
            <PlaceSearchStep
              mode={step}
              pickupAddress={pickupAddress}
              searchQuery={searchQuery}
              onChangeQuery={onChangeQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSelectPlace={selectPlace}
              popularPlaces={popularPlaces}
              recentPlaces={recentPlaces}
              onPickOnMap={() =>
                router.push(`/location-picker?type=${step === 'pickup' ? 'pickup' : 'dropoff'}` as any)
              }
              onUseCurrentLocation={() => {
                setPickupAddress(address);
                setPickupLatitude(latitude);
                setPickupLongitude(longitude);
                setStep('dropoff');
              }}
              onEditPickup={() => setStep('pickup')}
              COLORS={COLORS}
              styles={styles}
            />
          ) : (
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
              onChangePayment={() => setPaymentSheetOpen(true)}
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

      {/* ─── Payment selection (overlay, Golden Screen #10) ─── */}
      <SmartBottomSheet
        visible={paymentSheetOpen}
        title="Payment method"
        onDismiss={() => setPaymentSheetOpen(false)}
      >
        <View style={styles.paymentOptions}>
          {PAYMENT_METHODS.map((method) => {
            const active = method.id === paymentMethod;
            return (
              <Card
                key={method.id}
                variant={active ? 'accent' : 'flat'}
                padding={SPACING.md}
                radius={RADIUS.lg}
                onPress={() => {
                  setPaymentMethod(method.id as PaymentMethod);
                  setPaymentSheetOpen(false);
                }}
                accessibilityLabel={method.name}
                style={active ? styles.paymentOptionActive : undefined}
              >
                <View style={styles.paymentOptionRow}>
                  <Text style={[styles.paymentOptionLabel, active && styles.paymentOptionLabelActive]}>
                    {method.name}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={ICON.lg} color={COLORS.primary} />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      </SmartBottomSheet>
    </View>
  );
}

// ============================================
// PLACE SEARCH STEP (pickup + destination)
// ============================================
// Golden Screen #8 (Location / Destination Search). Pickup and destination were
// two near-identical copies before; they are one component with a `mode`.

// Single tappable place row (name + secondary address line + ↗ jump icon)
function PlaceRow({ place, icon, onPress, COLORS, styles }: { place: PlaceResult; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; COLORS: ThemedColors; styles: any }) {
  const primary = place.name || place.place_name || 'Location';
  const secondary = place.address || place.fullAddress || place.place_name || '';
  return (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={primary}
    >
      <View style={styles.resultIconCircle}>
        <Ionicons name={icon} size={ICON.sm} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.searchResultText} numberOfLines={1}>{primary}</Text>
        {secondary && secondary !== primary ? (
          <Text style={styles.searchResultSubtext} numberOfLines={1}>{secondary}</Text>
        ) : null}
      </View>
      <Ionicons name="arrow-forward" size={ICON.sm} color={COLORS.onSurfaceVariant} style={styles.resultJumpIcon} />
    </TouchableOpacity>
  );
}

/** A grouped list of places on one flat Card, dividers between rows. */
function PlaceList({
  places,
  icon,
  keyPrefix,
  onSelectPlace,
  COLORS,
  styles,
}: {
  places: PlaceResult[];
  icon: keyof typeof Ionicons.glyphMap;
  keyPrefix: string;
  onSelectPlace: (p: PlaceResult) => void;
  COLORS: ThemedColors;
  styles: any;
}) {
  return (
    <Card variant="flat" padding={0} radius={RADIUS.xl} style={styles.resultsCard}>
      {places.map((p, i) => (
        <Animated.View
          key={`${keyPrefix}-${p.id}-${i}`}
          entering={FadeInUp.delay(rowDelay(i)).duration(MOTION.duration.base)}
          style={i < places.length - 1 ? styles.searchResultDivider : undefined}
        >
          <PlaceRow place={p} icon={icon} onPress={() => onSelectPlace(p)} COLORS={COLORS} styles={styles} />
        </Animated.View>
      ))}
    </Card>
  );
}

function PlaceSearchStep({
  mode,
  pickupAddress,
  searchQuery,
  onChangeQuery,
  searchResults,
  isSearching,
  onSelectPlace,
  popularPlaces,
  recentPlaces,
  onPickOnMap,
  onUseCurrentLocation,
  onEditPickup,
  COLORS,
  styles,
}: {
  mode: 'pickup' | 'dropoff';
  pickupAddress: string;
  searchQuery: string;
  onChangeQuery: (q: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPlace: (place: PlaceResult) => void;
  popularPlaces: PlaceResult[];
  recentPlaces: PlaceResult[];
  onPickOnMap: () => void;
  onUseCurrentLocation: () => void;
  onEditPickup: () => void;
  COLORS: ThemedColors;
  styles: any;
}) {
  const isPickup = mode === 'pickup';
  const showSuggestions = !isSearching && searchResults.length === 0 && searchQuery.trim().length < 2;
  const noResults = !isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2;

  return (
    <View>
      {/* Route rail: pickup chip above, destination search below */}
      <Card variant="elevated" padding={SPACING.md} radius={RADIUS.xl}>
        <View style={styles.searchCardInner}>
          <View style={styles.searchIconRow}>
            <View style={styles.pickupDot} />
            <View style={styles.dottedLine} />
            <View style={styles.dropoffDot} />
          </View>
          <View style={styles.searchInputsColumn}>
            {/* Pickup is tappable so the user can change it (defaults to their
                current location); the field below is auto-focused. */}
            <TouchableOpacity
              style={styles.locationChip}
              onPress={isPickup ? onUseCurrentLocation : onEditPickup}
              activeOpacity={OPACITY.pressed}
              accessibilityRole="button"
              accessibilityLabel={isPickup ? 'Use current location as pickup' : 'Change pickup'}
            >
              {isPickup ? (
                <Ionicons name="locate" size={ICON.sm} color={COLORS.primary} />
              ) : null}
              <Text style={styles.locationChipText} numberOfLines={1}>
                {pickupAddress || 'Current Location'}
              </Text>
              <Ionicons name="chevron-forward" size={ICON.sm} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>

            <SearchInput
              value={searchQuery}
              onChangeText={onChangeQuery}
              placeholder={isPickup ? 'Search pickup point' : 'Where to?'}
              loading={isSearching}
              autoFocus
            />
          </View>
        </View>
      </Card>

      {/* Pick-on-map entry point (Uber-style centre-pin picker) */}
      <View style={styles.setOnMapRow}>
        <Chip
          label={isPickup ? 'Set pickup on map' : 'Set destination on map'}
          icon="map-outline"
          onPress={onPickOnMap}
        />
      </View>

      {/* Results */}
      {searchResults.length > 0 ? (
        <PlaceList
          places={searchResults}
          icon="location-outline"
          keyPrefix="result"
          onSelectPlace={onSelectPlace}
          COLORS={COLORS}
          styles={styles}
        />
      ) : null}

      {noResults ? (
        <EmptyState
          icon="location-outline"
          title="No places found"
          subtitle="Try a different name, or set the point on the map."
          actionLabel="Set on map"
          onAction={onPickOnMap}
        />
      ) : null}

      {/* Empty state: recent + popular suggestions */}
      {showSuggestions && recentPlaces.length > 0 ? (
        <>
          <SectionHeader title="Recent" />
          <PlaceList
            places={recentPlaces}
            icon="time-outline"
            keyPrefix="recent"
            onSelectPlace={onSelectPlace}
            COLORS={COLORS}
            styles={styles}
          />
        </>
      ) : null}

      {showSuggestions && popularPlaces.length > 0 ? (
        <>
          <SectionHeader title="Popular places" />
          <PlaceList
            places={popularPlaces}
            icon="star-outline"
            keyPrefix="popular"
            onSelectPlace={onSelectPlace}
            COLORS={COLORS}
            styles={styles}
          />
        </>
      ) : null}
    </View>
  );
}

// ============================================
// CONFIRM STEP
// ============================================
// Golden Screen #10 — vehicle via SegmentedControl, fare + ETA on a Card,
// payment through the shared sheet, one primary action.
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
  onChangePayment,
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
  onChangePayment: () => void;
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

  const vehicle = selectedVehicle === 'CAR'
    ? { icon: 'car' as const, name: 'Smart Car', desc: 'Comfort · AC · up to 4', fare: carFare }
    : { icon: 'bicycle' as const, name: 'Smart Boda', desc: 'Fast & affordable', fare: bodaFare };

  return (
    <View>
      {/* Route summary */}
      <Card variant="elevated" padding={SPACING.md} radius={RADIUS.xl}>
        <View style={styles.routeRow}>
          <View style={styles.routeDotsColumn}>
            <View style={[styles.routeCircle, { backgroundColor: COLORS.secondaryFixed }]} />
            <View style={styles.routeDottedLine} />
            <View style={[styles.routeCircle, { backgroundColor: COLORS.primary }]} />
          </View>
          <View style={styles.routeTextColumn}>
            <View>
              <Text style={styles.routePointLabel}>Pickup</Text>
              <Text style={styles.routePointAddress} numberOfLines={1}>{pickupAddress}</Text>
            </View>
            <View>
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
      </Card>

      {/* Vehicle choice */}
      <SectionHeader title="Choose your ride" />
      <SegmentedControl
        segments={[
          { value: 'BODA', label: 'Smart Boda' },
          { value: 'CAR', label: 'Smart Car' },
        ]}
        value={selectedVehicle}
        onChange={setSelectedVehicle}
      />

      {/* Selected vehicle: fare + driver ETA */}
      <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.vehicleCard}>
        <View style={styles.vehicleRow}>
          <View style={styles.rideIconCircle}>
            <Ionicons name={vehicle.icon} size={ICON.lg} color={COLORS.primary} />
          </View>
          <View style={styles.vehicleContent}>
            <Text style={styles.vehicleName} numberOfLines={1}>{vehicle.name}</Text>
            <Text style={styles.vehicleDesc} numberOfLines={1}>{vehicle.desc}</Text>
          </View>
          <View style={styles.vehiclePriceWrap}>
            {isCalculating ? (
              <Skeleton width={104} height={16} borderRadius={RADIUS.sm} />
            ) : (
              <Text style={styles.vehiclePrice} numberOfLines={1}>{fareRange(vehicle.fare) ?? '---'}</Text>
            )}
          </View>
        </View>

        {nearestEtaMin != null && !isCalculating ? (
          <View style={styles.driverEtaBadge}>
            <Ionicons name="time-outline" size={ICON.xs} color={COLORS.primary} />
            <Text style={styles.driverEtaText}>Driver ~{nearestEtaMin} min away</Text>
          </View>
        ) : null}
      </Card>

      {/* Fare breakdown for the selected vehicle */}
      {fareBreakdown && !isCalculating && (
        <Card variant="flat" padding={SPACING.md} radius={RADIUS.lg} style={styles.fareBreakdown}>
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
        </Card>
      )}

      {/* Payment method — opens the shared sheet */}
      <Card
        variant="flat"
        padding={SPACING.md}
        radius={RADIUS.xl}
        style={styles.paymentBar}
        onPress={onChangePayment}
        accessibilityLabel="Change payment method"
      >
        <View style={styles.paymentBarRow}>
          <View style={styles.paymentBarLeft}>
            <Ionicons name="wallet-outline" size={ICON.md} color={COLORS.primary} />
            <Text style={styles.paymentBarLabel}>
              {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name ?? paymentMethod}
            </Text>
          </View>
          <Text style={styles.paymentChangeText}>Change</Text>
        </View>
      </Card>

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

      {/* One primary action */}
      <View style={styles.ctaContainer}>
        <GradientButton
          title={isRequesting ? 'Requesting...' : `Request ${currentRideType.name}`}
          onPress={onRequestRide}
          variant="primary"
          size="lg"
          fullWidth
          loading={isRequesting}
          disabled={isRequesting}
          icon={!isRequesting ? <Ionicons name="navigate" size={ICON.md} color={COLORS.onPrimary} /> : undefined}
        />
      </View>
    </View>
  );
}

// ============================================
// STYLES — layout + domain content only.
// Surfaces, buttons, fields, sheets and states come from the Design System.
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Map workspace (AR-3 ~55%)
  mapWorkspace: {
    flex: 1,
    position: 'relative',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // Operations panel (AR-3 ~45%, rounded-26 + grabber to match SmartBottomSheet)
  panel: {
    flex: 1.2,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    marginTop: -(RADIUS.xl + 2),
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },

  // Route rail inside the search card
  searchCardInner: {
    flexDirection: 'row',
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
    minHeight: 44,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  locationChipText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },

  // Pick-on-map entry point
  setOnMapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.gutter,
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
    minHeight: 44,
  },
  searchResultDivider: {
    borderBottomWidth: BORDER.hairline,
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
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  searchResultSubtext: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 1,
  },
  resultJumpIcon: {
    transform: [{ rotate: '-45deg' }],
    marginLeft: SPACING.sm,
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
  routeMeta: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },

  // Selected vehicle
  vehicleCard: {
    marginTop: SPACING.gutter,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rideIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleContent: {
    flex: 1,
    minWidth: 0, // allow text to ellipsize instead of forcing the row to wrap
    flexShrink: 1,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  vehicleDesc: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  vehiclePriceWrap: {
    alignItems: 'flex-end',
    flexShrink: 0, // keep the price on one line; content column shrinks instead
    paddingLeft: SPACING.sm,
  },
  vehiclePrice: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  driverEtaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginTop: SPACING.gutter,
  },
  driverEtaText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Fare breakdown
  fareBreakdown: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareRowLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  fareRowValue: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurface },
  fareTotalRow: {
    borderTopWidth: BORDER.hairline,
    borderTopColor: COLORS.outlineVariant,
    marginTop: SPACING.xs,
    paddingTop: 6,
  },
  fareTotalLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, fontWeight: '700' },
  fareTotalValue: { ...TYPOGRAPHY.bodyMd, color: COLORS.primary, fontWeight: '700' },
  fareNote: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, fontStyle: 'italic', marginTop: 2 },

  // Payment
  paymentBar: {
    marginTop: SPACING.gutter,
  },
  paymentBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
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
  paymentOptions: {
    gap: SPACING.sm,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    borderWidth: BORDER.emphasis,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  paymentOptionLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  paymentOptionLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Phone input
  phoneInputContainer: {
    marginTop: SPACING.sm,
  },

  // CTA
  ctaContainer: {
    marginTop: SPACING.lg,
  },
});
