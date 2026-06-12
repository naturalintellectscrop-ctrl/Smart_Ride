/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - DRIVER HOME SCREEN
// ============================================

import React, { useState, useEffect, useCallback, Component, ReactNode } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, MapViewProps } from 'react-native-maps';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInUp,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';
import { useAuthStore, useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS, DEFAULT_LOCATION } from '@/src/constants';
import { Task, Rider } from '@/src/types';

// Error Boundary for Map Component
class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Safe Map Component with fallback
function SafeMapView(props: MapViewProps) {
  const fallback = (
    <View className="flex-1 bg-gray-100 items-center justify-center">
      <Text className="text-4xl mb-2">🗺️</Text>
      <Text className="text-gray-500">Map unavailable</Text>
      <Text className="text-gray-400 text-sm">Location: {props.initialRegion?.latitude?.toFixed(4)}, {props.initialRegion?.longitude?.toFixed(4)}</Text>
    </View>
  );

  return (
    <MapErrorBoundary fallback={fallback}>
      <MapView {...props} />
    </MapErrorBoundary>
  );
}

export default function DriverHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { incomingRequest, setIncomingRequest, clearIncomingRequest } = useTaskStore();
  const { latitude, longitude, getCurrentLocation } = useLocationStore();

  const [isOnline, setIsOnline] = useState(false);
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [requestTimer, setRequestTimer] = useState<number | null>(null);

  // Location tracking
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  // Load rider profile on mount - NON-BLOCKING
  useEffect(() => {
    loadRiderProfile();

    // Listen for ride requests
    const unsubscribeRequest = socketService.on('driver:request', handleIncomingRequest);
    const unsubscribeExpired = socketService.on('driver:request:expired', handleRequestExpired);

    return () => {
      unsubscribeRequest();
      unsubscribeExpired();
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnline]);

  // Load rider profile - NON-BLOCKING with proper error handling and data validation
  const loadRiderProfile = useCallback(async () => {
    setIsLoading(true);
    setProfileError(null);
    
    try {
      const response = await api.getRiderProfile();
      if (response.success && response.data) {
        // VALIDATE: Ensure we have required fields
        const riderData = response.data;
        setRider({
          id: riderData.id || 'guest',
          fullName: riderData.fullName || riderData.name || user?.name || 'Driver',
          phone: riderData.phone || user?.phone || '',
          isOnline: typeof riderData.isOnline === 'boolean' ? riderData.isOnline : false,
          rating: typeof riderData.rating === 'number' ? riderData.rating : 5.0,
          totalTrips: riderData.totalTrips || 0,
          completedTrips: riderData.completedTrips || 0,
          walletBalance: riderData.walletBalance || 0,
          ...riderData, // Keep any additional fields
        } as Rider);
        setIsOnline(typeof riderData.isOnline === 'boolean' ? riderData.isOnline : false);
      } else {
        setProfileError(response.error || 'Failed to load profile');
        // Still allow driver to use app with default values
        setRider({
          id: 'guest',
          fullName: user?.name || 'Driver',
          phone: user?.phone || '',
          isOnline: false,
          rating: 5.0,
          totalTrips: 0,
          completedTrips: 0,
          walletBalance: 0,
        } as Rider);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfileError('Unable to load driver profile');
      // Set default rider so UI can still render
      setRider({
        id: 'guest',
        fullName: user?.name || 'Driver',
        phone: user?.phone || '',
        isOnline: false,
        rating: 5.0,
        totalTrips: 0,
        completedTrips: 0,
        walletBalance: 0,
      } as Rider);
    } finally {
      // ALWAYS set loading to false
      setIsLoading(false);
    }
  }, [user]);

  const toggleOnlineStatus = async (value: boolean) => {
    try {
      const response = await api.setRiderOnline(value);
      if (response.success) {
        setIsOnline(value);
        if (value) {
          getCurrentLocation().catch(() => {});
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for driver mode');
        return;
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Update every 5 seconds
        },
        (location) => {
          const { latitude: lat, longitude: lng } = location.coords;
          
          // Send location update to server (don't await - fire and forget)
          socketService.updateLocation({
            latitude: lat,
            longitude: lng,
            heading: location.coords.heading,
            speed: location.coords.speed,
          });

          // Send heartbeat (don't await - fire and forget)
          api.sendHeartbeat({
            latitude: lat,
            longitude: lng,
            heading: location.coords.heading,
            speed: location.coords.speed,
          }).catch(() => {});
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const handleIncomingRequest = (data: any) => {
    setIncomingRequest(data);
    
    // Start countdown timer
    const expiresAt = new Date(data.expiresAt).getTime();
    const now = Date.now();
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
    
    setRequestTimer(secondsLeft);
  };

  const handleRequestExpired = (data: { taskId: string }) => {
    if (incomingRequest?.task.id === data.taskId) {
      clearIncomingRequest();
      setRequestTimer(null);
    }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    setIsAccepting(true);
    try {
      const response = await api.acceptTask(incomingRequest.task.id);
      if (response.success) {
        clearIncomingRequest();
        setRequestTimer(null);
        router.push(`/driver/driver-task?taskId=${incomingRequest.task.id}`);
      } else {
        Alert.alert('Error', response.error || 'Failed to accept request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;

    try {
      await api.declineTask(incomingRequest.task.id);
      clearIncomingRequest();
      setRequestTimer(null);
    } catch (error) {
      console.error('Failed to decline request:', error);
      clearIncomingRequest();
      setRequestTimer(null);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (requestTimer === null || requestTimer <= 0) return;

    const interval = setInterval(() => {
      setRequestTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearIncomingRequest();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [requestTimer, clearIncomingRequest]);

  // Show loading state but with timeout
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <PulsingLoader />
        <Text className="mt-4 text-gray-500">Loading driver profile...</Text>
        <Animated.View entering={FadeIn.delay(2000).duration(300)}>
          <TouchableOpacity 
            className="mt-4 bg-gray-200 rounded-xl px-6 py-3"
            onPress={() => {
              setIsLoading(false);
              setRider({
                id: 'guest',
                fullName: user?.name || 'Driver',
                phone: user?.phone || '',
                isOnline: false,
                rating: 5.0,
                totalTrips: 0,
                completedTrips: 0,
                walletBalance: 0,
              } as Rider);
            }}
          >
            <Text className="text-gray-600 font-medium">Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Map with Error Boundary */}
      <SafeMapView
        className="flex-1"
        initialRegion={{
          latitude: latitude || DEFAULT_LOCATION.latitude,
          longitude: longitude || DEFAULT_LOCATION.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Top Bar */}
      <Animated.View 
        entering={FadeInDown.duration(500).springify()}
        className="absolute top-12 left-4 right-4"
      >
        <View className="bg-white rounded-2xl p-4 shadow-lg flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Animated.View entering={ZoomIn.delay(200).duration(300)}>
              <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-3">
                <Text className="text-2xl">👤</Text>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInRight.delay(300).duration(300)}>
              <Text className="font-bold text-gray-900">{rider?.fullName || 'Driver'}</Text>
              <View className="flex-row items-center">
                <Text className="text-yellow-500 mr-1">⭐</Text>
                <Text className="text-gray-600">{rider?.rating?.toFixed(1) || '5.0'}</Text>
              </View>
            </Animated.View>
          </View>
          <View className="flex-row items-center">
            <Text className={`font-medium mr-2 ${isOnline ? 'text-secondary-500' : 'text-gray-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={isOnline ? COLORS.secondary : '#F4F4F5'}
            />
          </View>
        </View>
        
        {/* Profile Error Banner */}
        {profileError && (
          <Animated.View 
            entering={SlideInRight.duration(300)}
            className="mt-2 bg-yellow-100 rounded-xl p-3 flex-row items-center justify-between"
          >
            <Text className="text-yellow-800 text-sm flex-1">{profileError}</Text>
            <TouchableOpacity onPress={loadRiderProfile}>
              <Text className="text-yellow-800 font-medium">Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* Incoming Request Modal */}
      {incomingRequest && (
        <Animated.View 
          entering={SlideInUp.duration(400).springify()}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 shadow-lg"
        >
          {/* Timer */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">New Ride Request</Text>
            <Animated.View 
              entering={ZoomIn.duration(300)}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                (requestTimer || 0) < 10 ? 'bg-red-100' : 'bg-primary-100'
              }`}
            >
              <Text className={`font-bold ${
                (requestTimer || 0) < 10 ? 'text-red-500' : 'text-primary-500'
              }`}>
                {requestTimer}s
              </Text>
            </Animated.View>
          </View>

          {/* Route Info */}
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="flex-row items-start mb-3">
              <Animated.View 
                entering={ZoomIn.delay(100).duration(200)}
                className="w-3 h-3 rounded-full bg-secondary-500 mt-1 mr-3" 
              />
              <View className="flex-1">
                <Text className="text-gray-500 text-xs">Pickup</Text>
                <Text className="text-gray-900">{incomingRequest.pickup?.address || 'Pickup location'}</Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <Animated.View 
                entering={ZoomIn.delay(200).duration(200)}
                className="w-3 h-3 rounded-full bg-primary-500 mt-1 mr-3" 
              />
              <View className="flex-1">
                <Text className="text-gray-500 text-xs">Dropoff</Text>
                <Text className="text-gray-900">{incomingRequest.task?.dropoffAddress || 'Dropoff location'}</Text>
              </View>
            </View>
          </View>

          {/* Fare */}
          <Animated.View 
            entering={FadeIn.delay(300).duration(300)}
            className="flex-row justify-between items-center mb-4"
          >
            <Text className="text-gray-500">Estimated Earnings</Text>
            <Text className="text-2xl font-bold text-secondary-500">
              UGX {(incomingRequest.task?.totalAmount || 0).toLocaleString()}
            </Text>
          </Animated.View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <AnimatedButton 
              className="flex-1 bg-gray-100 rounded-xl py-4"
              onPress={handleDeclineRequest}
            >
              <Text className="text-gray-600 text-center font-semibold">Decline</Text>
            </AnimatedButton>
            <AnimatedButton 
              className={`flex-1 rounded-xl py-4 ${isAccepting ? 'bg-secondary-300' : 'bg-secondary-500'}`}
              onPress={handleAcceptRequest}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold">Accept</Text>
              )}
            </AnimatedButton>
          </View>
        </Animated.View>
      )}

      {/* Bottom Stats */}
      {!incomingRequest && (
        <Animated.View 
          entering={SlideInUp.duration(500).delay(300).springify()}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 shadow-lg"
        >
          <View className="flex-row justify-around">
            <StatItem 
              label="Today's Earnings" 
              value={`UGX ${(rider?.walletBalance || 0).toLocaleString()}`}
              delay={400}
            />
            <StatItem 
              label="Trips" 
              value={String(rider?.completedTrips || 0)}
              delay={500}
            />
          </View>

          {!isOnline && (
            <Animated.View 
              entering={FadeIn.delay(600).duration(400)}
              className="mt-4 bg-primary-50 rounded-xl p-4"
            >
              <Text className="text-primary-500 text-center">
                Go online to start receiving ride requests
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// Pulsing Loader Component
function PulsingLoader() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </Animated.View>
  );
}

// Animated Stat Item
function StatItem({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(400).springify()}
      className="items-center"
    >
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-gray-500 text-sm">{label}</Text>
    </Animated.View>
  );
}

// Animated Button Component
function AnimatedButton({ children, onPress, disabled, className }: any) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      className={className}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.95}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// FadeInRight animation helper
const FadeInRight = SlideInRight.duration(300);
