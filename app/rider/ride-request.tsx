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
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLocationStore, useTaskStore, useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, RIDE_TYPES, PAYMENT_METHODS } from '@/src/constants';
import { PaymentMethod } from '@/src/types';

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
        paymentMethod,
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
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-primary-500 pt-12 pb-4 px-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              if (step === 'dropoff') setStep('pickup');
              else if (step === 'confirm') setStep('dropoff');
              else router.back();
            }}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3"
          >
            <Text className="text-white text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">
            {step === 'pickup' ? 'Set Pickup' : 
             step === 'dropoff' ? 'Set Destination' : 'Confirm Ride'}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 py-4">
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
}: any) {
  return (
    <View>
      {/* Ride Type */}
      <View className="flex-row items-center bg-primary-50 rounded-xl p-4 mb-4">
        <Text className="text-3xl mr-3">{rideType.id === 'BODA' ? '🏍️' : '🚗'}</Text>
        <View>
          <Text className="font-bold text-gray-900">{rideType.name}</Text>
          <Text className="text-gray-500">{rideType.description}</Text>
        </View>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity 
        className="flex-row items-center bg-secondary-50 rounded-xl p-4 mb-4"
        onPress={onUseCurrentLocation}
      >
        <Text className="text-2xl mr-3">📍</Text>
        <View className="flex-1">
          <Text className="font-medium text-gray-900">Use Current Location</Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>{pickupAddress}</Text>
        </View>
        <Text className="text-secondary-500">→</Text>
      </TouchableOpacity>

      {/* Search Input */}
      <Text className="text-gray-600 font-medium mb-2">Or search for pickup point</Text>
      <TextInput
        className="bg-gray-100 rounded-xl px-4 py-4 text-base"
        placeholder="Search for a place..."
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Search Results */}
      {isSearching && <ActivityIndicator size="large" color={COLORS.primary} className="mt-4" />}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          className="flex-row items-center py-3 border-b border-gray-100"
          onPress={() => onSelectPlace(place)}
        >
          <Text className="mr-3">📍</Text>
          <Text className="flex-1 text-gray-900">{place.place_name}</Text>
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
}: any) {
  return (
    <View>
      {/* Pickup Summary */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4">
        <Text className="text-gray-500 text-sm mb-1">Pickup</Text>
        <Text className="text-gray-900 font-medium">{pickupAddress}</Text>
      </View>

      {/* Search Input */}
      <Text className="text-gray-600 font-medium mb-2">Where are you going?</Text>
      <TextInput
        className="bg-gray-100 rounded-xl px-4 py-4 text-base"
        placeholder="Search for destination..."
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoFocus
      />

      {/* Search Results */}
      {isSearching && <ActivityIndicator size="large" color={COLORS.primary} className="mt-4" />}
      
      {searchResults.map((place, index) => (
        <TouchableOpacity
          key={index}
          className="flex-row items-center py-3 border-b border-gray-100"
          onPress={() => onSelectPlace(place)}
        >
          <Text className="mr-3">📍</Text>
          <Text className="flex-1 text-gray-900">{place.place_name}</Text>
        </TouchableOpacity>
      ))}

      {/* Recent Destinations */}
      <Text className="text-gray-600 font-medium mt-6 mb-2">Recent Destinations</Text>
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-400 text-center">No recent destinations</Text>
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
}: any) {
  return (
    <View>
      {/* Route Summary */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4">
        <View className="flex-row items-start mb-3">
          <View className="w-3 h-3 rounded-full bg-secondary-500 mt-1.5 mr-3" />
          <View className="flex-1">
            <Text className="text-gray-500 text-xs">Pickup</Text>
            <Text className="text-gray-900">{pickupAddress}</Text>
          </View>
        </View>
        <View className="flex-row items-start">
          <View className="w-3 h-3 rounded-full bg-primary-500 mt-1.5 mr-3" />
          <View className="flex-1">
            <Text className="text-gray-500 text-xs">Dropoff</Text>
            <Text className="text-gray-900">{dropoffAddress}</Text>
          </View>
        </View>
      </View>

      {/* Fare Estimate */}
      <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <Text className="text-gray-500 text-sm mb-2">Estimated Fare</Text>
        {isCalculating ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <>
            <Text className="text-3xl font-bold text-gray-900">
              UGX {estimatedFare.toLocaleString()}
            </Text>
            {distance && (
              <Text className="text-gray-500 text-sm mt-1">
                ~{distance.toFixed(1)} km
              </Text>
            )}
          </>
        )}
      </View>

      {/* Payment Method */}
      <Text className="text-gray-600 font-medium mb-2">Payment Method</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {PAYMENT_METHODS.slice(0, 3).map((method) => (
          <TouchableOpacity
            key={method.id}
            className={`flex-row items-center px-4 py-3 rounded-xl border ${
              paymentMethod === method.id 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 bg-white'
            }`}
            onPress={() => setPaymentMethod(method.id)}
          >
            <Text className="mr-2">{method.icon === 'phone' ? '📱' : method.icon === 'banknote' ? '💵' : '💳'}</Text>
            <Text className={paymentMethod === method.id ? 'text-primary-500 font-medium' : 'text-gray-700'}>
              {method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Phone Number for Mobile Money */}
      {paymentMethod !== 'CASH' && (
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-4 text-base mb-4"
          placeholder="Enter phone number"
          placeholderTextColor="#9CA3AF"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      )}

      {/* Request Button */}
      <TouchableOpacity
        className={`rounded-xl py-4 ${isRequesting ? 'bg-primary-300' : 'bg-primary-500'}`}
        onPress={onRequestRide}
        disabled={isRequesting}
      >
        {isRequesting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-semibold">
            Request {rideType.name}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
