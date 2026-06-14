// ============================================
// SMART RIDE MOBILE - RIDE REQUEST SCREEN
// ============================================
// Stitch Design System — Book a Ride
// Map area at top, floating search card, vehicle
// selection, payment tray, Request Ride CTA
// ============================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, useTaskStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import {
  COLORS,
  RIDE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
} from '@/src/constants';
import { PaymentMethod } from '@/src/types';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { IconInput } from '@/src/components/IconInput';

// Types for search results
interface PlaceResult {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
}

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
  const params = useLocalSearchParams<{ type?: 'BODA' | 'CAR' }>();
  const insets = useSafeAreaInsets();
  const { latitude, longitude, address, getCurrentLocation } = useLocationStore();
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Pricing
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedFare, setEstimatedFare] = useState<number>(rideType.baseFare);
  const [isCalculating, setIsCalculating] = useState(false);

  // Loading
  const [isRequesting, setIsRequesting] = useState(false);

  // Get current ride type config based on selected vehicle
  const currentRideType = selectedVehicle === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Search for places
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.searchPlaces(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a place from search results
  const selectPlace = (place: any) => {
    if (step === 'pickup') {
      setPickupAddress(place.place_name);
      setPickupLatitude(place.center[1]);
      setPickupLongitude(place.center[0]);
      setStep('dropoff');
    } else {
      setDropoffAddress(place.place_name);
      setDropoffLatitude(place.center[1]);
      setDropoffLongitude(place.center[0]);
      setStep('confirm');
      calculateFare(place.center[1], place.center[0]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Calculate fare estimate
  const calculateFare = async (destLat: number, destLng: number) => {
    setIsCalculating(true);
    try {
      const dist = calculateDistance(
        pickupLatitude,
        pickupLongitude,
        destLat,
        destLng
      );
      setDistance(dist);

      const fare = currentRideType.baseFare + (dist * currentRideType.perKm);
      setEstimatedFare(Math.round(fare));
    } catch (error) {
      console.error('Fare calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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

    const distanceKm = distance || calculateDistance(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude
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
              onUseCurrentLocation={() => {
                setPickupAddress(address);
                setPickupLatitude(latitude);
                setPickupLongitude(longitude);
                setStep('dropoff');
              }}
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
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={(v) => {
                setSelectedVehicle(v);
                // Recalculate fare when vehicle changes
                if (dropoffLatitude && dropoffLongitude) {
                  const rt = v === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;
                  const dist = distance || calculateDistance(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);
                  setEstimatedFare(Math.round(rt.baseFare + (dist * rt.perKm)));
                }
              }}
              pickupAddress={pickupAddress}
              dropoffAddress={dropoffAddress}
              distance={distance}
              estimatedFare={estimatedFare}
              isCalculating={isCalculating}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              onRequestRide={handleRequestRide}
              isRequesting={isRequesting}
              currentRideType={currentRideType}
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
function PickupStep({
  pickupAddress,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSelectPlace,
  onUseCurrentLocation,
}: {
  pickupAddress: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPlace: (place: PlaceResult) => void;
  onUseCurrentLocation: () => void;
}) {
  return (
    <View>
      {/* Destination search floating card */}
      <GlassCard variant="elevated" padding={0} borderRadius={RADIUS.xl}>
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

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
      )}

      {searchResults.length > 0 && (
        <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={styles.resultsCard}>
          {searchResults.map((place, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.searchResultItem, index < searchResults.length - 1 && styles.searchResultDivider]}
              onPress={() => onSelectPlace(place)}
              activeOpacity={0.7}
            >
              <View style={styles.resultIconCircle}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.searchResultText} numberOfLines={2}>
                {place.place_name}
              </Text>
            </TouchableOpacity>
          ))}
        </GlassCard>
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
}: {
  pickupAddress: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: PlaceResult[];
  isSearching: boolean;
  onSelectPlace: (place: PlaceResult) => void;
}) {
  return (
    <View>
      {/* Pickup summary + destination search */}
      <GlassCard variant="elevated" padding={0} borderRadius={RADIUS.xl}>
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

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
      )}

      {searchResults.length > 0 && (
        <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={styles.resultsCard}>
          {searchResults.map((place, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.searchResultItem, index < searchResults.length - 1 && styles.searchResultDivider]}
              onPress={() => onSelectPlace(place)}
              activeOpacity={0.7}
            >
              <View style={styles.resultIconCircle}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.searchResultText} numberOfLines={2}>
                {place.place_name}
              </Text>
            </TouchableOpacity>
          ))}
        </GlassCard>
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
  estimatedFare,
  isCalculating,
  paymentMethod,
  setPaymentMethod,
  phoneNumber,
  setPhoneNumber,
  onRequestRide,
  isRequesting,
  currentRideType,
}: {
  selectedVehicle: 'BODA' | 'CAR';
  setSelectedVehicle: (v: 'BODA' | 'CAR') => void;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number | null;
  estimatedFare: number;
  isCalculating: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  onRequestRide: () => void;
  isRequesting: boolean;
  currentRideType: RideTypeConfig;
}) {
  return (
    <View>
      {/* Route Summary Card */}
      <GlassCard variant="elevated" padding={SPACING.md} borderRadius={RADIUS.xl}>
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
      </GlassCard>

      {/* Vehicle Type Selection */}
      <Text style={styles.sectionLabel}>Choose Ride Type</Text>
      <View style={styles.vehicleRow}>
        {/* Boda */}
        <TouchableOpacity
          style={[
            styles.vehicleCard,
            selectedVehicle === 'BODA' && styles.vehicleCardActive,
          ]}
          onPress={() => setSelectedVehicle('BODA')}
          activeOpacity={0.7}
        >
          <View style={[
            styles.vehicleIconCircle,
            selectedVehicle === 'BODA' && styles.vehicleIconCircleActive,
          ]}>
            <Ionicons name="bicycle" size={22} color={
              selectedVehicle === 'BODA' ? COLORS.onPrimaryFixed : COLORS.primary
            } />
          </View>
          <Text style={[
            styles.vehicleName,
            selectedVehicle === 'BODA' && styles.vehicleNameActive,
          ]}>
            Smart Boda
          </Text>
          <Text style={styles.vehicleDesc}>Motorcycle</Text>
          <Text style={styles.vehiclePrice}>
            UGX {RIDE_TYPES.BODA.baseFare.toLocaleString()}+
          </Text>
        </TouchableOpacity>

        {/* Car */}
        <TouchableOpacity
          style={[
            styles.vehicleCard,
            selectedVehicle === 'CAR' && styles.vehicleCardActive,
          ]}
          onPress={() => setSelectedVehicle('CAR')}
          activeOpacity={0.7}
        >
          <View style={[
            styles.vehicleIconCircle,
            selectedVehicle === 'CAR' && styles.vehicleIconCircleActive,
          ]}>
            <Ionicons name="car" size={22} color={
              selectedVehicle === 'CAR' ? COLORS.onPrimaryFixed : COLORS.primary
            } />
          </View>
          <Text style={[
            styles.vehicleName,
            selectedVehicle === 'CAR' && styles.vehicleNameActive,
          ]}>
            Smart Car
          </Text>
          <Text style={styles.vehicleDesc}>4 seats</Text>
          <Text style={styles.vehiclePrice}>
            UGX {RIDE_TYPES.CAR.baseFare.toLocaleString()}+
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fare Estimate Card */}
      <GlassCard variant="accent" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.fareCard}>
        <View style={styles.fareRow}>
          <View>
            <Text style={styles.fareLabel}>Estimated Fare</Text>
            {distance && (
              <Text style={styles.fareDistance}>~{distance.toFixed(1)} km</Text>
            )}
          </View>
          {isCalculating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.fareAmount}>
              UGX {estimatedFare.toLocaleString()}
            </Text>
          )}
        </View>
      </GlassCard>

      {/* Payment Method Tray */}
      <Text style={styles.sectionLabel}>Payment Method</Text>
      <View style={styles.paymentRow}>
        {PAYMENT_METHODS.slice(0, 3).map((method) => {
          const isActive = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentChip,
                isActive && styles.paymentChipActive,
              ]}
              onPress={() => setPaymentMethod(method.id as PaymentMethod)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.paymentIconCircle,
                isActive && styles.paymentIconCircleActive,
              ]}>
                <Ionicons
                  name={method.icon as any}
                  size={16}
                  color={isActive ? COLORS.onPrimary : COLORS.primary}
                />
              </View>
              <Text style={[
                styles.paymentChipText,
                isActive && styles.paymentChipTextActive,
              ]}>
                {method.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Phone Number for Mobile Money */}
      {paymentMethod !== 'CASH' && (
        <View style={styles.phoneInputContainer}>
          <IconInput
            placeholder="Phone number"
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

const styles = StyleSheet.create({
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

  // Vehicle selection
  sectionLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  vehicleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  vehicleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  vehicleIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  vehicleName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  vehicleNameActive: {
    color: COLORS.primary,
  },
  vehicleDesc: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  vehiclePrice: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },

  // Fare card
  fareCard: {
    marginTop: SPACING.lg,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  fareDistance: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  fareAmount: {
    ...TYPOGRAPHY.headlineLg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  paymentChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  paymentIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  paymentChipText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  paymentChipTextActive: {
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
