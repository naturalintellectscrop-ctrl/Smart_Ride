// ============================================
// SMART RIDE MOBILE - RIDE REQUEST SCREEN
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
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLocationStore, useTaskStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, RIDE_TYPES, PAYMENT_METHODS, PAYMENT_METHOD_MAP, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';

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
  const { latitude, longitude, address, getCurrentLocation } = useLocationStore();
  const { setPendingTask } = useTaskStore();
  const { user } = useAuthStore(); // FIX: Get user for clientId

  const rideType = params.type === 'CAR' ? RIDE_TYPES.CAR : RIDE_TYPES.BODA;
  const [step, setStep] = useState<'pickup' | 'dropoff' | 'confirm'>('pickup');

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
      // Calculate straight-line distance (simplified)
      const dist = calculateDistance(
        pickupLatitude,
        pickupLongitude,
        destLat,
        destLng
      );
      setDistance(dist);

      // Calculate fare
      const fare = rideType.baseFare + (dist * rideType.perKm);
      setEstimatedFare(Math.round(fare));
    } catch (error) {
      console.error('Fare calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
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

    // FIX: Validate user is logged in
    if (!user?.id) {
      Alert.alert('Error', 'Please login to request a ride');
      router.replace('/auth/login');
      return;
    }

    // FIX: Calculate distance if not already done
    const distanceKm = distance || calculateDistance(
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude
    );

    setIsRequesting(true);
    try {
      const response = await api.requestRide({
        taskType: rideType.id === 'BODA' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE',
        clientId: user.id, // FIX: Send clientId from auth
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        paymentMethod: PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod,
        distanceKm, // FIX: Send distanceKm
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => {
              if (step === 'dropoff') setStep('pickup');
              else if (step === 'confirm') setStep('dropoff');
              else router.back();
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'pickup' ? 'Set Pickup' : 
             step === 'dropoff' ? 'Set Destination' : 'Confirm Ride'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'pickup' && (
          <PickupStep
            rideType={rideType}
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
            rideType={rideType}
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
          />
        )}
      </ScrollView>
    </View>
  );
}

// Pickup Step Component
function PickupStep({ 
  rideType, 
  pickupAddress, 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  isSearching,
  onSelectPlace,
  onUseCurrentLocation 
}: {
  rideType: RideTypeConfig;
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
      {/* Ride Type */}
      <View style={styles.rideTypeCard}>
        <Text style={styles.rideTypeEmoji}>{rideType.id === 'BODA' ? '🏍️' : '🚗'}</Text>
        <View>
          <Text style={styles.rideTypeName}>{rideType.name}</Text>
          <Text style={styles.rideTypeDesc}>{rideType.description}</Text>
        </View>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity 
        style={styles.currentLocationCard}
        onPress={onUseCurrentLocation}
      >
        <Text style={styles.currentLocationEmoji}>📍</Text>
        <View style={styles.currentLocationContent}>
          <Text style={styles.currentLocationLabel}>Use Current Location</Text>
          <Text style={styles.currentLocationAddress} numberOfLines={1}>{pickupAddress}</Text>
        </View>
        <Text style={styles.currentLocationArrow}>→</Text>
      </TouchableOpacity>

      {/* Search Input */}
      <Text style={styles.searchLabel}>Or search for pickup point</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for a place..."
        placeholderTextColor={COLORS.onSurfaceVariant}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Search Results */}
      {isSearching && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          style={styles.searchResultItem}
          onPress={() => onSelectPlace(place)}
        >
          <Text style={{ marginRight: SPACING.md }}>📍</Text>
          <Text style={styles.searchResultText}>{place.place_name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Dropoff Step Component
function DropoffStep({ 
  pickupAddress, 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  isSearching,
  onSelectPlace 
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
      {/* Pickup Summary */}
      <View style={styles.pickupSummary}>
        <Text style={styles.pickupSummaryLabel}>Pickup</Text>
        <Text style={styles.pickupSummaryAddress}>{pickupAddress}</Text>
      </View>

      {/* Search Input */}
      <Text style={styles.searchLabel}>Where are you going?</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search for destination..."
        placeholderTextColor={COLORS.onSurfaceVariant}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoFocus
      />

      {/* Search Results */}
      {isSearching && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          style={styles.searchResultItem}
          onPress={() => onSelectPlace(place)}
        >
          <Text style={{ marginRight: SPACING.md }}>📍</Text>
          <Text style={styles.searchResultText}>{place.place_name}</Text>
        </TouchableOpacity>
      ))}

      {/* Recent Destinations */}
      <Text style={[styles.searchLabel, { marginTop: SPACING.lg }]}>Recent Destinations</Text>
      <View style={styles.recentCard}>
        <Text style={styles.recentEmptyText}>No recent destinations</Text>
      </View>
    </View>
  );
}

// Confirm Step Component
function ConfirmStep({
  rideType,
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
}: {
  rideType: RideTypeConfig;
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
}) {
  return (
    <View>
      {/* Route Summary */}
      <View style={styles.routeSummary}>
        <View style={styles.routeRow}>
          <View style={styles.routeDotSecondary} />
          <View style={styles.routeContent}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeText}>{pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.routeRow}>
          <View style={styles.routeDotPrimary} />
          <View style={styles.routeContent}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeText}>{dropoffAddress}</Text>
          </View>
        </View>
      </View>

      {/* Fare Estimate */}
      <View style={styles.fareCard}>
        <Text style={styles.fareLabel}>Estimated Fare</Text>
        {isCalculating ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <>
            <Text style={styles.fareAmount}>
              UGX {estimatedFare.toLocaleString()}
            </Text>
            {distance && (
              <Text style={styles.fareDistance}>
                ~{distance.toFixed(1)} km
              </Text>
            )}
          </>
        )}
      </View>

      {/* Payment Method */}
      <Text style={styles.paymentLabel}>Payment Method</Text>
      <View style={styles.paymentRow}>
        {PAYMENT_METHODS.slice(0, 3).map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentChip,
              paymentMethod === method.id && styles.paymentChipActive,
            ]}
            onPress={() => setPaymentMethod(method.id as PaymentMethod)}
          >
            <Text style={{ marginRight: SPACING.sm }}>{method.icon === 'phone' ? '📱' : method.icon === 'banknote' ? '💵' : '💳'}</Text>
            <Text style={[
              styles.paymentChipText,
              paymentMethod === method.id && styles.paymentChipTextActive,
            ]}>
              {method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Phone Number for Mobile Money */}
      {paymentMethod !== 'CASH' && (
        <TextInput
          style={styles.phoneInput}
          placeholder="Enter phone number"
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      )}

      {/* Request Button */}
      <TouchableOpacity
        style={[styles.requestButton, isRequesting && styles.requestButtonDisabled]}
        onPress={onRequestRide}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator color={COLORS.onPrimary} />
        ) : (
          <Text style={styles.requestButtonText}>
            Request {rideType.name}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  backButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.headlineMd,
  },
  headerTitle: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  // Pickup step
  rideTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  rideTypeEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  rideTypeName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  rideTypeDesc: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  // Current location
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}10`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  currentLocationEmoji: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  currentLocationContent: {
    flex: 1,
  },
  currentLocationLabel: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  currentLocationAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  currentLocationArrow: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.secondary,
  },
  // Search
  searchLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  searchInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchResultText: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
  },
  // Dropoff step
  pickupSummary: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  pickupSummaryLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  pickupSummaryAddress: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  recentCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  recentEmptyText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outlineVariant,
    textAlign: 'center',
  },
  // Confirm step
  routeSummary: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  routeDotSecondary: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondaryFixedDim,
    marginTop: 4,
    marginRight: SPACING.md,
  },
  routeDotPrimary: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginRight: SPACING.md,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  routeText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
  },
  // Fare
  fareCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  fareLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  fareAmount: {
    ...TYPOGRAPHY.headlineLg,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  fareDistance: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  // Payment
  paymentLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  paymentChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  paymentChipText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  paymentChipTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Phone input
  phoneInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  // Request button
  requestButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: COLORS.primaryContainer,
  },
  requestButtonText: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
