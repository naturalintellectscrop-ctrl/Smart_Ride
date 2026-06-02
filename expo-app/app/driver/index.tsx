/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - DRIVER HOME SCREEN
// ============================================
// Dark theme with StyleSheet, GlassCard, GlowHeader,
// GradientButton, StatusBadge, Reanimated animations
// ============================================

import React, { useState, useEffect, useCallback, Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
// Conditional import for web compatibility
const MapView = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps').MapView
  : require('react-native-maps').default;
const { Marker } = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps')
  : require('react-native-maps');
type MapViewProps = any;
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
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS, DEFAULT_LOCATION, API_CONFIG } from '@/src/constants';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { GlowHeader } from '@/src/components/GlowHeader';
import { StatusBadge } from '@/src/components/StatusBadge';
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
    <View style={styles.mapFallback}>
      <Text style={styles.mapFallbackEmoji}>🗺️</Text>
      <Text style={styles.mapFallbackText}>Map unavailable</Text>
      <Text style={styles.mapFallbackSubtext}>
        Location: {props.initialRegion?.latitude?.toFixed(4)}, {props.initialRegion?.longitude?.toFixed(4)}
      </Text>
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
        const riderData = response.data;
        const normalizedRider: Rider = {
          id: riderData.id,
          userId: riderData.userId || '',
          fullName: riderData.fullName || 'Driver',
          phone: riderData.phone || '',
          email: riderData.email,
          riderRole: riderData.riderRole || 'SMART_BODA_RIDER',
          status: riderData.status || 'APPROVED',
          isOnline: typeof riderData.isOnline === 'boolean' ? riderData.isOnline : false,
          currentLatitude: riderData.currentLatitude,
          currentLongitude: riderData.currentLongitude,
          rating: typeof riderData.rating === 'number' ? riderData.rating : 5.0,
          totalTrips: riderData.totalTrips || 0,
          completedTrips: riderData.completedTrips || 0,
          walletBalance: riderData.walletBalance || 0,
          vehicle: riderData.vehicle,
        };
        setRider(normalizedRider);
        setIsOnline(normalizedRider.isOnline);
      } else {
        setProfileError(response.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfileError('Unable to load driver profile');
    } finally {
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

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          const { latitude: lat, longitude: lng } = location.coords;

          socketService.updateLocation({
            latitude: lat,
            longitude: lng,
            heading: location.coords.heading,
            speed: location.coords.speed,
          });

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
      const matchId = (incomingRequest as any).matchId;
      if (matchId) {
        const { accessToken } = useAuthStore.getState();
        const dispatchResponse = await fetch(`${API_CONFIG.baseUrl}/dispatch/${matchId}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const dispatchResult = await dispatchResponse.json();
        if (dispatchResult.success) {
          clearIncomingRequest();
          setRequestTimer(null);
          router.push(`/driver/driver-task?taskId=${incomingRequest.task.id}`);
          return;
        }
      }

      const { accessToken } = useAuthStore.getState();
      const response = await fetch(`${API_CONFIG.baseUrl}/tasks/${incomingRequest.task.id}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          toStatus: 'ACCEPTED',
          riderId: rider?.id,
        }),
      });
      const result = await response.json();
      if (result.success) {
        clearIncomingRequest();
        setRequestTimer(null);
        router.push(`/driver/driver-task?taskId=${incomingRequest.task.id}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept request');
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
      const matchId = (incomingRequest as any).matchId;
      if (matchId) {
        const { accessToken } = useAuthStore.getState();
        await fetch(`${API_CONFIG.baseUrl}/dispatch/${matchId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reason: 'Declined by rider',
          }),
        });
      } else {
        const { accessToken } = useAuthStore.getState();
        await fetch(`${API_CONFIG.baseUrl}/tasks/${incomingRequest.task.id}/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            toStatus: 'CANCELLED',
            riderId: rider?.id,
            reason: 'Declined by rider',
          }),
        });
      }
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

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <PulsingLoader />
        <Text style={styles.loadingText}>Loading driver profile...</Text>
      </View>
    );
  }

  // Show error state if rider profile failed to load
  if (profileError && !rider) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Profile Load Error</Text>
        <Text style={styles.errorSubtitle}>{profileError}</Text>
        <GradientButton
          title="Retry"
          onPress={loadRiderProfile}
          variant="primary"
          size="md"
          style={{ marginTop: 24, width: 180 }}
        />
      </View>
    );
  }

  const taskStatus = incomingRequest?.task?.status as string | undefined;

  return (
    <View style={styles.root}>
      {/* Map with Error Boundary */}
      <SafeMapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: latitude || DEFAULT_LOCATION.latitude,
          longitude: longitude || DEFAULT_LOCATION.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* GlowHeader overlay */}
      <Animated.View
        entering={FadeInDown.duration(500).springify()}
        style={styles.headerOverlay}
      >
        <GlowHeader
          title={rider?.fullName || 'Driver'}
          subtitle={isOnline ? '● Online — Receiving requests' : '● Offline'}
          rightAction={
            isOnline
              ? {
                  icon: 'notifications-outline' as const,
                  onPress: () => {},
                }
              : undefined
          }
        >
          {/* Online status card inside the header */}
          <View style={styles.onlineCardRow}>
            <View style={styles.profileRow}>
              <Animated.View entering={ZoomIn.delay(200).duration(300)}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
              </Animated.View>
              <Animated.View entering={SlideInRight.delay(300).duration(300)}>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={styles.ratingText}>{rider?.rating?.toFixed(1) || '5.0'}</Text>
                </View>
                {taskStatus && (
                  <StatusBadge
                    label={TASK_STATUS_LABELS[taskStatus] || taskStatus}
                    color={TASK_STATUS_COLORS[taskStatus] || COLORS.primary}
                    size="sm"
                  />
                )}
              </Animated.View>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: isOnline ? COLORS.primary : COLORS.textMuted }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: COLORS.backgroundSurface, true: 'rgba(0, 255, 136, 0.3)' }}
                thumbColor={isOnline ? COLORS.primary : COLORS.textDim}
              />
            </View>
          </View>
        </GlowHeader>

        {/* Profile Error Banner */}
        {profileError && (
          <Animated.View entering={SlideInRight.duration(300)}>
            <GlassCard variant="accent" style={styles.errorBanner}>
              <View style={styles.errorBannerRow}>
                <Text style={styles.errorBannerText}>{profileError}</Text>
                <TouchableOpacity onPress={loadRiderProfile}>
                  <Text style={styles.errorBannerAction}>Retry</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </Animated.View>

      {/* Incoming Request Modal */}
      {incomingRequest && (
        <Animated.View
          entering={SlideInUp.duration(400).springify()}
          style={styles.requestModal}
        >
          <GlassCard variant="elevated" padding={20} borderRadius={24}>
            {/* Timer & Title */}
            <View style={styles.requestHeaderRow}>
              <Text style={styles.requestTitle}>New Ride Request</Text>
              <Animated.View entering={ZoomIn.duration(300)}>
                <View
                  style={[
                    styles.timerCircle,
                    {
                      backgroundColor:
                        (requestTimer || 0) < 10
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(0, 255, 136, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timerText,
                      {
                        color:
                          (requestTimer || 0) < 10 ? COLORS.error : COLORS.primary,
                      },
                    ]}
                  >
                    {requestTimer}s
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Route Info */}
            <GlassCard variant="default" style={styles.routeCard}>
              <View style={styles.routePointRow}>
                <Animated.View
                  entering={ZoomIn.delay(100).duration(200)}
                  style={styles.pickupDot}
                />
                <View style={styles.routePointContent}>
                  <Text style={styles.routePointLabel}>Pickup</Text>
                  <Text style={styles.routePointAddress}>
                    {incomingRequest.pickup?.address || 'Pickup location'}
                  </Text>
                </View>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePointRow}>
                <Animated.View
                  entering={ZoomIn.delay(200).duration(200)}
                  style={styles.dropoffDot}
                />
                <View style={styles.routePointContent}>
                  <Text style={styles.routePointLabel}>Dropoff</Text>
                  <Text style={styles.routePointAddress}>
                    {incomingRequest.task?.dropoffAddress || 'Dropoff location'}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Fare */}
            <Animated.View
              entering={FadeIn.delay(300).duration(300)}
              style={styles.fareRow}
            >
              <Text style={styles.fareLabel}>Estimated Earnings</Text>
              <Text style={styles.fareValue}>
                UGX {(incomingRequest.task?.totalAmount || 0).toLocaleString()}
              </Text>
            </Animated.View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <AnimatedPressable onPress={handleDeclineRequest}>
                <View style={styles.declineButtonWrapper}>
                  <GradientButton
                    title="Decline"
                    onPress={handleDeclineRequest}
                    variant="secondary"
                    size="lg"
                    fullWidth
                  />
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleAcceptRequest} disabled={isAccepting}>
                <View style={styles.acceptButtonWrapper}>
                  <GradientButton
                    title={isAccepting ? 'Accepting...' : 'Accept'}
                    onPress={handleAcceptRequest}
                    variant={isAccepting ? 'secondary' : 'primary'}
                    loading={isAccepting}
                    disabled={isAccepting}
                    size="lg"
                    fullWidth
                  />
                </View>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* Bottom Stats */}
      {!incomingRequest && (
        <Animated.View
          entering={SlideInUp.duration(500).delay(300).springify()}
          style={styles.bottomStats}
        >
          <GlassCard variant="elevated" padding={20} borderRadius={24}>
            <View style={styles.statsRow}>
              <StatItem
                label="Today's Earnings"
                value={`UGX ${(rider?.walletBalance || 0).toLocaleString()}`}
                delay={400}
              />
              <View style={styles.statsDivider} />
              <StatItem
                label="Trips"
                value={String(rider?.completedTrips || 0)}
                delay={500}
              />
            </View>

            {!isOnline && (
              <Animated.View entering={FadeIn.delay(600).duration(400)}>
                <GlassCard variant="accent" style={styles.offlineHint}>
                  <Text style={styles.offlineHintText}>
                    Go online to start receiving ride requests
                  </Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* Go Online / Go Offline Button */}
            <View style={styles.toggleButtonContainer}>
              <GradientButton
                title={isOnline ? 'Go Offline' : 'Go Online'}
                onPress={() => toggleOnlineStatus(!isOnline)}
                variant={isOnline ? 'danger' : 'primary'}
                size="lg"
                fullWidth
              />
            </View>
          </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

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
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()} style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Animated Pressable Wrapper (for button press scale effect)
function AnimatedPressable({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) {
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
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.95}
      style={{ flex: 1 }}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// STYLESHEET
// ============================================

const styles = StyleSheet.create({
  // Root
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Map fallback
  mapFallback: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFallbackEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapFallbackText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  mapFallbackSubtext: {
    color: COLORS.textDim,
    fontSize: 12,
  },

  // Header overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // Online card row (inside GlowHeader children)
  onlineCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontWeight: '500',
    marginRight: 8,
    fontSize: 14,
  },

  // Error banner
  errorBanner: {
    marginTop: 8,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    color: COLORS.warning,
    fontSize: 13,
    flex: 1,
  },
  errorBannerAction: {
    color: COLORS.warning,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 12,
  },

  // Incoming Request Modal
  requestModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  requestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Route card
  routeCard: {
    marginBottom: 16,
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    marginTop: 4,
    marginRight: 12,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginRight: 12,
  },
  routePointContent: {
    flex: 1,
  },
  routePointLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routePointAddress: {
    color: COLORS.text,
    fontSize: 15,
    marginTop: 2,
  },
  routeDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: COLORS.textDim,
    marginLeft: 5,
    marginVertical: 4,
  },

  // Fare
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fareLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  fareValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButtonWrapper: {
    flex: 1,
  },
  acceptButtonWrapper: {
    flex: 1,
  },

  // Bottom Stats
  bottomStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  // Offline hint
  offlineHint: {
    marginTop: 16,
  },
  offlineHintText: {
    color: COLORS.primary,
    textAlign: 'center',
    fontSize: 14,
  },

  // Toggle button
  toggleButtonContainer: {
    marginTop: 16,
  },
});
