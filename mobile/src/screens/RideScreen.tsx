/**
 * Smart Ride - Ride Booking Screen
 * 
 * Main ride booking screen with Mapbox map integration.
 * Features:
 * - Real-time location tracking
 * - Pickup/dropoff location selection
 * - Ride type selection (Boda/Car)
 * - Fare estimation
 * - Driver matching simulation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MapboxMap } from '../components/MapboxMap';
import { useAuthStore, useCurrentLocation } from '../store';
import api from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Ride types
const RIDE_TYPES = [
  {
    id: 'BODA',
    name: 'Smart Boda',
    description: 'Quick motorcycle ride',
    icon: '🏍️',
    baseFare: 3000,
    perKm: 800,
    eta: '2-5 min',
  },
  {
    id: 'CAR',
    name: 'Smart Car',
    description: 'Comfortable car ride',
    icon: '🚗',
    baseFare: 8000,
    perKm: 1500,
    eta: '5-10 min',
  },
];

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

type RideStatus = 'IDLE' | 'SEARCHING' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED';

export function RideScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const storedLocation = useCurrentLocation();
  
  // Location state
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  // Ride state
  const [selectedRideType, setSelectedRideType] = useState('BODA');
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [rideStatus, setRideStatus] = useState<RideStatus>('IDLE');
  const [driver, setDriver] = useState<{
    name: string;
    phone: string;
    rating: number;
    plateNumber: string;
  } | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const bottomSheetHeight = useRef(new Animated.Value(300)).current;
  
  // Set initial pickup location from stored location
  useEffect(() => {
    if (storedLocation && !pickup) {
      setPickup(storedLocation);
      setPickupAddress(storedLocation.address || 'Current Location');
    }
  }, [storedLocation]);

  // Calculate fare when locations or ride type changes
  useEffect(() => {
    if (pickup && dropoff) {
      const distance = calculateDistance(
        pickup.latitude, pickup.longitude,
        dropoff.latitude, dropoff.longitude
      );
      const rideType = RIDE_TYPES.find(r => r.id === selectedRideType);
      if (rideType) {
        const fare = Math.round(rideType.baseFare + (distance * rideType.perKm));
        setEstimatedFare(fare);
      }
    }
  }, [pickup, dropoff, selectedRideType]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleUserLocationChange = (location: Location) => {
    if (!pickup) {
      setPickup(location);
    }
  };

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    if (!pickup) {
      setPickup({ ...coordinate, address: 'Selected Location' });
    } else if (!dropoff) {
      setDropoff({ ...coordinate, address: 'Selected Location' });
    }
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Error', 'Please select pickup and dropoff locations');
      return;
    }

    setIsLoading(true);
    setRideStatus('SEARCHING');

    try {
      // In production, this would call the actual API
      // const response = await api.requestRide({
      //   pickup: { lat: pickup.latitude, lng: pickup.longitude, address: pickup.address || '' },
      //   dropoff: { lat: dropoff.latitude, lng: dropoff.longitude, address: dropoff.address || '' },
      //   rideType: selectedRideType as 'BODA' | 'CAR',
      // });

      // Simulate driver matching
      setTimeout(() => {
        setDriver({
          name: 'John Okello',
          phone: '+256 700 123 456',
          rating: 4.8,
          plateNumber: 'UBF 123A',
        });
        setRideStatus('MATCHED');
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      Alert.alert('Error', 'Failed to request ride. Please try again.');
      setRideStatus('IDLE');
      setIsLoading(false);
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            setRideStatus('IDLE');
            setDriver(null);
            setDropoff(null);
            setDropoffAddress('');
          }
        },
      ]
    );
  };

  // Render different UI based on ride status
  const renderBottomContent = () => {
    switch (rideStatus) {
      case 'SEARCHING':
        return (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#00FF88" />
            <Text style={styles.searchingTitle}>Finding your driver...</Text>
            <Text style={styles.searchingSubtitle}>This usually takes 1-2 minutes</Text>
          </View>
        );

      case 'MATCHED':
        return (
          <View style={styles.matchedContainer}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{driver?.name.charAt(0)}</Text>
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driver?.name}</Text>
                <View style={styles.driverRating}>
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={styles.ratingText}>{driver?.rating}</Text>
                </View>
                <Text style={styles.driverPlate}>{driver?.plateNumber}</Text>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Text style={styles.callButtonText}>📞</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rideSummary}>
              <View style={styles.routeInfo}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: '#00FFF3' }]} />
                  <Text style={styles.routeAddress} numberOfLines={1}>{pickupAddress}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={styles.routeAddress} numberOfLines={1}>{dropoffAddress}</Text>
                </View>
              </View>
              <Text style={styles.etaText}>Arriving in 3 min</Text>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>
            {/* Location Inputs */}
            <View style={styles.locationInputs}>
              <View style={styles.inputRow}>
                <View style={[styles.inputDot, { backgroundColor: '#00FFF3' }]} />
                <TextInput
                  style={styles.input}
                  placeholder="Pickup location"
                  placeholderTextColor="#6B7280"
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                />
              </View>
              <View style={styles.inputConnector} />
              <View style={styles.inputRow}>
                <View style={[styles.inputDot, { backgroundColor: '#7C3AED' }]} />
                <TextInput
                  style={styles.input}
                  placeholder="Where to?"
                  placeholderTextColor="#6B7280"
                  value={dropoffAddress}
                  onChangeText={setDropoffAddress}
                />
              </View>
            </View>

            {/* Ride Type Selection */}
            <Text style={styles.sectionTitle}>Select Ride Type</Text>
            <View style={styles.rideTypes}>
              {RIDE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.rideTypeCard,
                    selectedRideType === type.id && styles.rideTypeCardSelected,
                  ]}
                  onPress={() => setSelectedRideType(type.id)}
                >
                  <Text style={styles.rideTypeIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.rideTypeName,
                    selectedRideType === type.id && styles.rideTypeNameSelected,
                  ]}>
                    {type.name}
                  </Text>
                  <Text style={styles.rideTypeEta}>{type.eta}</Text>
                  {estimatedFare > 0 && selectedRideType === type.id && (
                    <Text style={styles.estimatedFare}>UGX {estimatedFare.toLocaleString()}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Request Button */}
            <TouchableOpacity
              style={[
                styles.requestButton,
                (!pickup || !dropoff) && styles.requestButtonDisabled,
              ]}
              onPress={handleRequestRide}
              disabled={!pickup || !dropoff || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0D0D12" />
              ) : (
                <Text style={styles.requestButtonText}>
                  {estimatedFare > 0 
                    ? `Request ${RIDE_TYPES.find(r => r.id === selectedRideType)?.name} - UGX ${estimatedFare.toLocaleString()}`
                    : 'Select pickup and destination'
                  }
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Mapbox Map */}
      <MapboxMap
        pickup={pickup || undefined}
        dropoff={dropoff || undefined}
        showUserLocation={true}
        mapStyle="dark"
        onUserLocationChange={handleUserLocationChange}
        onMapPress={handleMapPress}
      />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <Text style={styles.headerGreeting}>Hello, {user?.name || 'Guest'}</Text>
        <Text style={styles.headerSubtitle}>Where would you like to go?</Text>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomContainer, { height: bottomSheetHeight }]}>
        {renderBottomContent()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  headerOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  bottomSheet: {
    flex: 1,
    padding: 20,
  },
  locationInputs: {
    backgroundColor: '#0D0D12',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#2D2D3A',
    marginLeft: 5,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  rideTypes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rideTypeCard: {
    flex: 1,
    backgroundColor: '#0D0D12',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D2D3A',
  },
  rideTypeCardSelected: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  rideTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rideTypeNameSelected: {
    color: '#00FF88',
  },
  rideTypeEta: {
    fontSize: 12,
    color: '#6B7280',
  },
  estimatedFare: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00FF88',
    marginTop: 8,
  },
  requestButton: {
    backgroundColor: '#00FF88',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  requestButtonDisabled: {
    backgroundColor: '#3D3D4A',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D12',
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
  },
  searchingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  matchedContainer: {
    flex: 1,
    padding: 20,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D12',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D0D12',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 16,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingStar: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    color: '#FBBF24',
    marginLeft: 4,
    fontWeight: '600',
  },
  driverPlate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 20,
  },
  rideSummary: {
    backgroundColor: '#0D0D12',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeAddress: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#2D2D3A',
    marginLeft: 5,
    marginVertical: 4,
  },
  etaText: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RideScreen;
