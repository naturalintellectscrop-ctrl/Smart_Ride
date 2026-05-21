// ============================================
// SMART RIDE MOBILE - RIDE REQUEST SCREEN
// ============================================
// Premium dark theme with vector icons
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
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';
import { useLocationStore, useTaskStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, RIDE_TYPES, PAYMENT_METHODS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

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
  const { user } = useAuthStore();

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
      const dist = calculateDistance(
        pickupLatitude,
        pickupLongitude,
        destLat,
        destLng
      );
      setDistance(dist);
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
        taskType: rideType.id === 'BODA' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE',
        clientId: user.id,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        paymentMethod,
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

  const getStepTitle = () => {
    switch (step) {
      case 'pickup': return 'Set Pickup';
      case 'dropoff': return 'Set Destination';
      case 'confirm': return 'Confirm Ride';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => {
            if (step === 'dropoff') setStep('pickup');
            else if (step === 'confirm') setStep('dropoff');
            else router.back();
          }}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size="md" color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getStepTitle()}</Text>
      </Animated.View>

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
  const rideTypeIcon = rideType.id === 'BODA' ? 'navigation' : 'car';
  const rideTypeColor = rideType.id === 'BODA' ? IconColors.primary : IconColors.accent;

  return (
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      {/* Ride Type Card */}
      <View style={[styles.rideTypeCard, { borderColor: rideTypeColor }]}>
        <View style={[styles.rideTypeIcon, { backgroundColor: `${rideTypeColor}15` }]}>
          <Icon name={rideTypeIcon} size="xl" color={rideTypeColor} />
        </View>
        <View style={styles.rideTypeInfo}>
          <Text style={styles.rideTypeName}>{rideType.name}</Text>
          <Text style={styles.rideTypeDesc}>{rideType.description}</Text>
        </View>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity 
        style={styles.currentLocationCard}
        onPress={onUseCurrentLocation}
        activeOpacity={0.8}
      >
        <View style={styles.currentLocationIcon}>
          <Icon name="map-pin" size="md" color={COLORS.secondary} />
        </View>
        <View style={styles.currentLocationInfo}>
          <Text style={styles.currentLocationTitle}>Use Current Location</Text>
          <Text style={styles.currentLocationAddress} numberOfLines={1}>{pickupAddress}</Text>
        </View>
        <Icon name="chevron-right" size="sm" color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Search Input */}
      <Text style={styles.inputLabel}>Or search for pickup point</Text>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size="md" color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      )}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          style={styles.searchResult}
          onPress={() => onSelectPlace(place)}
          activeOpacity={0.7}
        >
          <View style={styles.searchResultIcon}>
            <Icon name="map-pin" size="sm" color={COLORS.primary} />
          </View>
          <Text style={styles.searchResultText} numberOfLines={1}>{place.place_name}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
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
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      {/* Pickup Summary */}
      <View style={styles.pickupSummary}>
        <View style={styles.pickupDot} />
        <View>
          <Text style={styles.pickupLabel}>Pickup</Text>
          <Text style={styles.pickupAddress}>{pickupAddress}</Text>
        </View>
      </View>

      {/* Search Input */}
      <Text style={styles.inputLabel}>Where are you going?</Text>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size="md" color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for destination..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      {/* Search Results */}
      {isSearching && (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      )}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          style={styles.searchResult}
          onPress={() => onSelectPlace(place)}
          activeOpacity={0.7}
        >
          <View style={styles.searchResultIcon}>
            <Icon name="map-pin" size="sm" color={COLORS.primary} />
          </View>
          <Text style={styles.searchResultText} numberOfLines={1}>{place.place_name}</Text>
        </TouchableOpacity>
      ))}

      {/* Recent Destinations */}
      <Text style={styles.sectionTitle}>Recent Destinations</Text>
      <View style={styles.emptyState}>
        <Icon name="clock" size="lg" color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No recent destinations</Text>
      </View>
    </Animated.View>
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
  const rideTypeIcon = rideType.id === 'BODA' ? 'navigation' : 'car';
  const rideTypeColor = rideType.id === 'BODA' ? IconColors.primary : IconColors.accent;

  // Payment method icons
  const getPaymentIcon = (methodId: string): 'phone' | 'dollar-sign' | 'credit-card' => {
    if (methodId === 'MTN_MOMO' || methodId === 'AIRTEL_MONEY') return 'phone';
    if (methodId === 'CASH') return 'dollar-sign';
    return 'credit-card';
  };

  return (
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      {/* Route Summary */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress}>{pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeAddress}>{dropoffAddress}</Text>
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
            <Text style={styles.fareAmount}>UGX {estimatedFare.toLocaleString()}</Text>
            {distance && (
              <Text style={styles.distanceText}>~{distance.toFixed(1)} km</Text>
            )}
          </>
        )}
      </View>

      {/* Payment Method */}
      <Text style={styles.sectionTitle}>Payment Method</Text>
      <View style={styles.paymentMethods}>
        {PAYMENT_METHODS.slice(0, 3).map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              paymentMethod === method.id && styles.paymentMethodActive
            ]}
            onPress={() => setPaymentMethod(method.id as PaymentMethod)}
            activeOpacity={0.8}
          >
            <Icon 
              name={getPaymentIcon(method.id)} 
              size="sm" 
              color={paymentMethod === method.id ? COLORS.background : COLORS.text} 
            />
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === method.id && styles.paymentMethodTextActive
            ]}>
              {method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Phone Number for Mobile Money */}
      {paymentMethod !== 'CASH' && (
        <View style={styles.searchInputContainer}>
          <Icon name="phone" size="md" color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter phone number"
            placeholderTextColor={COLORS.textMuted}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>
      )}

      {/* Request Button */}
      <TouchableOpacity
        style={[styles.requestButton, isRequesting && styles.requestButtonDisabled]}
        onPress={onRequestRide}
        disabled={isRequesting}
        activeOpacity={0.8}
      >
        {isRequesting ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Icon name={rideTypeIcon} size="md" color={COLORS.background} />
            <Text style={styles.requestButtonText}>
              Request {rideType.name}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: COLORS.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  rideTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  rideTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rideTypeInfo: {
    flex: 1,
  },
  rideTypeName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rideTypeDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentLocationInfo: {
    flex: 1,
  },
  currentLocationTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  currentLocationAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 10,
  },
  loader: {
    marginTop: 20,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  pickupSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    marginRight: 12,
  },
  pickupLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  pickupAddress: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  routeCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  routeAddress: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  fareCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  fareLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  fareAmount: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  distanceText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentMethodActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  paymentMethodTextActive: {
    color: COLORS.background,
  },
  requestButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  requestButtonDisabled: {
    backgroundColor: COLORS.backgroundSurface,
  },
  requestButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
