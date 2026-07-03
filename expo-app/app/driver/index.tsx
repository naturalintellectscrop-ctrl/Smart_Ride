/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - DRIVER HOME SCREEN
// ============================================
// Stitch Design System — Rider Dashboard
// Online/Offline toggle, Earnings card with
// glass/gradient, Ride request cards, Accept/Decline
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { SmartRideMap } from '@/src/components/SmartRideMap';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { GRADIENTS, TASK_STATUS_COLORS, TASK_STATUS_LABELS, DEFAULT_LOCATION, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { GlowHeader } from '@/src/components/GlowHeader';
import { StatusBadge } from '@/src/components/StatusBadge';
import { Task, Rider } from '@/src/types';

let COLORS: ThemedColors;
let styles: any;

export default function DriverHomeScreen() {
  { const t = useTheme(); COLORS = makeThemedColors(t.isDark); styles = createStyles(COLORS); }
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

    // Connect socket and listen for ride requests
    const initSocket = async () => {
      try {
        await socketService.connect();
        console.log('[DriverHome] Socket connected');
      } catch (e) {
        console.warn('[DriverHome] Socket connection failed, will retry:', e);
      }
    };
    initSocket();

    const unsubscribeRequest = socketService.on('driver:request', handleIncomingRequest);
    const unsubscribeExpired = socketService.on('driver:request:expired', handleRequestExpired);

    return () => {
      unsubscribeRequest();
      unsubscribeExpired();
      stopLocationTracking();
      socketService.disconnect();
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
          const driverId = rider?.id || user?.id;
          if (driverId) {
            try {
              await socketService.joinDriverRoom(driverId);
              console.log('[DriverHome] Joined driver room:', driverId);
            } catch (e) {
              console.warn('[DriverHome] Failed to join driver room:', e);
            }
          }
        } else {
          const driverId = rider?.id || user?.id;
          if (driverId) {
            socketService.leaveDriverRoom(driverId);
          }
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
        const dispatchResult = await api.dispatchAccept(matchId);
        if (dispatchResult.success) {
          clearIncomingRequest();
          setRequestTimer(null);
          router.push(`/driver/driver-task?taskId=${incomingRequest.task.id}`);
          return;
        }
      }

      const result = await api.transitionTask(incomingRequest.task.id, 'ACCEPTED', {
        riderId: rider?.id,
      });
      if (result.success) {
        clearIncomingRequest();
        setRequestTimer(null);
        router.push(`/driver/driver-task?taskId=${incomingRequest.task.id}`);
      } else {
        Alert.alert('Error', (result as any).error || 'Failed to accept request');
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
        await api.dispatchReject(matchId, 'Declined by rider');
      } else {
        await api.transitionTask(incomingRequest.task.id, 'CANCELLED', {
          riderId: rider?.id,
          reason: 'Declined by rider',
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
    const isRiderRole = user?.role === 'RIDER';
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name={isRiderRole ? 'bicycle-outline' : 'alert-circle-outline'} size={40} color={isRiderRole ? COLORS.primary : COLORS.error} />
        </View>
        <Text style={styles.errorTitle}>{isRiderRole ? 'Complete Your Profile' : 'Profile Load Error'}</Text>
        <Text style={styles.errorSubtitle}>
          {isRiderRole
            ? 'You need to complete rider onboarding before you can go online and accept trips.'
            : profileError}
        </Text>
        {isRiderRole ? (
          <GradientButton
            title="Start Onboarding"
            onPress={() => router.replace('/rider/onboarding')}
            variant="primary"
            size="md"
            style={{ marginTop: 24, width: 200 }}
            icon={<Ionicons name="arrow-forward" size={18} color={COLORS.onPrimary} />}
          />
        ) : (
          <GradientButton
            title="Retry"
            onPress={loadRiderProfile}
            variant="primary"
            size="md"
            style={{ marginTop: 24, width: 180 }}
          />
        )}
      </View>
    );
  }

  // Waiting-for-approval gate — a rider/driver/delivery cannot operate until an
  // admin approves them. Mirrors the merchant/pharmacist ProviderApprovalGate.
  const riderStatus = (rider as { status?: string } | null)?.status;
  if (rider && riderStatus && riderStatus !== 'APPROVED') {
    const rejected = riderStatus === 'REJECTED';
    const suspended = riderStatus === 'SUSPENDED';
    const reason = (rider as { rejectionReason?: string }).rejectionReason;
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons
            name={rejected || suspended ? 'close-circle-outline' : 'time-outline'}
            size={40}
            color={rejected || suspended ? COLORS.error : COLORS.primary}
          />
        </View>
        <Text style={styles.errorTitle}>
          {rejected ? 'Application not approved' : suspended ? 'Account suspended' : 'Application under review'}
        </Text>
        <Text style={styles.errorSubtitle}>
          {rejected
            ? (reason ? `Your application was not approved. Reason: ${reason}` : 'Your application was not approved. Please contact Smart Ride support.')
            : suspended
              ? 'Your account has been suspended. Please contact Smart Ride support.'
              : "Your application has been submitted and is being reviewed. You'll be able to go online and accept trips once an admin approves it."}
        </Text>
        <GradientButton
          title="Check status again"
          onPress={loadRiderProfile}
          variant="primary"
          size="md"
          style={{ marginTop: 24, width: 220 }}
          icon={<Ionicons name="refresh" size={18} color={COLORS.onPrimary} />}
        />
      </View>
    );
  }

  const taskStatus = incomingRequest?.task?.status as string | undefined;

  return (
    <View style={styles.root}>
      {/* Map with Error Boundary */}
      <SmartRideMap
        style={StyleSheet.absoluteFill}
        initialLatitude={latitude || DEFAULT_LOCATION.latitude}
        initialLongitude={longitude || DEFAULT_LOCATION.longitude}
        showUserLocation
      />

      {/* GlowHeader overlay */}
      <Animated.View
        entering={FadeInDown.duration(500).springify()}
        style={styles.headerOverlay}
      >
        <GlowHeader
          title={rider?.fullName || 'Driver'}
          subtitle={isOnline ? 'Online — Receiving requests' : 'Offline'}
          rightAction={{
            icon: 'notifications-outline' as const,
            onPress: () => { router.push('/notifications'); },
          }}
        >
          {/* Online/Offline toggle pill — Stitch Design */}
          <View style={styles.toggleCardRow}>
            <View style={styles.profileRow}>
              <Animated.View entering={ZoomIn.delay(200).duration(300)}>
                <TouchableOpacity onPress={() => router.push('/settings' as never)} activeOpacity={0.7}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={22} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View entering={SlideInRight.delay(300).duration(300)}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.warning} />
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

            {/* Stitch Online/Offline Toggle */}
            <View style={styles.togglePillContainer}>
              <Animated.View
                style={[
                  styles.togglePillSlider,
                  {
                    alignSelf: isOnline ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <LinearGradient
                  colors={isOnline ? (GRADIENTS.primary as unknown as [string, string]) : [COLORS.outlineVariant, COLORS.outlineVariant]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.togglePillGradient}
                >
                  <Text style={[styles.togglePillText, { color: isOnline ? COLORS.onPrimary : COLORS.onSurfaceVariant }]}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </LinearGradient>
              </Animated.View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.surfaceContainerHigh }}
                thumbColor={COLORS.surfaceContainerLowest}
                style={styles.hiddenSwitch}
              />
            </View>
          </View>
        </GlowHeader>

        {/* Profile Error Banner */}
        {profileError && (
          <Animated.View entering={SlideInRight.duration(300)}>
            <GlassCard variant="accent" style={styles.errorBanner}>
              <View style={styles.errorBannerRow}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                <Text style={styles.errorBannerText}>{profileError}</Text>
                <TouchableOpacity onPress={loadRiderProfile}>
                  <Text style={styles.errorBannerAction}>Retry</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </Animated.View>

      {/* Incoming Ride Request Card */}
      {incomingRequest && (
        <Animated.View
          entering={SlideInUp.duration(400).springify()}
          style={styles.requestModal}
        >
          <GlassCard variant="elevated" padding={20} borderRadius={RADIUS.xl}>
            {/* Timer & Title */}
            <View style={styles.requestHeaderRow}>
              <View style={styles.requestTitleRow}>
                <View style={styles.requestIconCircle}>
                  <Ionicons name="navigate" size={18} color={COLORS.onPrimary} />
                </View>
                <Text style={styles.requestTitle}>New Ride Request</Text>
              </View>
              <Animated.View entering={ZoomIn.duration(300)}>
                <View
                  style={[
                    styles.timerCircle,
                    {
                      backgroundColor:
                        (requestTimer || 0) < 10
                          ? COLORS.errorContainer
                          : COLORS.primaryFixed,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timerText,
                      {
                        color:
                          (requestTimer || 0) < 10 ? COLORS.onErrorContainer : COLORS.onPrimaryFixedVariant,
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

            {/* Accept/Decline Actions */}
            <View style={styles.actionRow}>
              <AnimatedPressable onPress={handleDeclineRequest}>
                <View style={styles.declineButtonWrapper}>
                  <GradientButton
                    title="Decline"
                    onPress={handleDeclineRequest}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    icon={<Ionicons name="close" size={18} color={COLORS.onSurface} />}
                  />
                </View>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleAcceptRequest} disabled={isAccepting}>
                <View style={styles.acceptButtonWrapper}>
                  <GradientButton
                    title={isAccepting ? 'Accepting...' : 'Accept Ride'}
                    onPress={handleAcceptRequest}
                    variant={isAccepting ? 'secondary' : 'primary'}
                    loading={isAccepting}
                    disabled={isAccepting}
                    size="lg"
                    fullWidth
                    icon={!isAccepting ? <Ionicons name="checkmark" size={18} color={COLORS.onPrimary} /> : undefined}
                  />
                </View>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* Bottom Earnings Card — Stitch glass design */}
      {!incomingRequest && (
        <Animated.View
          entering={SlideInUp.duration(500).delay(300).springify()}
          style={styles.bottomStats}
        >
          <GlassCard variant="elevated" padding={0} borderRadius={RADIUS.xl}>
            {/* Earnings gradient header */}
            <LinearGradient
              colors={GRADIENTS.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.earningsGradient}
            >
              <TouchableOpacity style={styles.earningsRow} onPress={() => router.push('/rider/wallet')} activeOpacity={0.8}>
                <View style={styles.earningsIconCircle}>
                  <Ionicons name="wallet" size={22} color={COLORS.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earningsLabel}>Wallet balance</Text>
                  <Text style={styles.earningsValue}>
                    UGX {(rider?.walletBalance || 0).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.onPrimary} />
              </TouchableOpacity>
              <View style={styles.tripsBadge}>
                <Ionicons name="car" size={14} color={COLORS.onPrimary} />
                <Text style={styles.tripsBadgeText}>
                  {rider?.completedTrips || 0} trips
                </Text>
              </View>
            </LinearGradient>

            {/* Offline hint */}
            {!isOnline && (
              <Animated.View entering={FadeIn.delay(600).duration(400)}>
                <View style={styles.offlineHint}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.offlineHintText}>
                    Go online to start receiving ride requests
                  </Text>
                </View>
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
                icon={
                  isOnline
                    ? <Ionicons name="log-out-outline" size={20} color={COLORS.onPrimary} />
                    : <Ionicons name="flash" size={20} color={COLORS.onPrimary} />
                }
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

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  // Root
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  errorTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  errorSubtitle: {
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    ...TYPOGRAPHY.bodySm,
    marginBottom: SPACING.sm,
  },

  // Header overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // Toggle card row (inside GlowHeader children)
  toggleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
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
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },

  // Stitch Online/Offline Toggle Pill
  togglePillContainer: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.full,
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  togglePillSlider: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  togglePillGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillText: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hiddenSwitch: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  // Error banner
  errorBanner: {
    marginTop: SPACING.sm,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorBannerText: {
    color: COLORS.warning,
    ...TYPOGRAPHY.bodySm,
    flex: 1,
  },
  errorBannerAction: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.warning,
    fontWeight: '600' as const,
    marginLeft: SPACING.md,
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
    marginBottom: SPACING.md,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requestIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: 'bold',
  },

  // Route card
  routeCard: {
    marginBottom: SPACING.md,
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondaryFixed,
    marginTop: 4,
    marginRight: SPACING.md,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginRight: SPACING.md,
  },
  routePointContent: {
    flex: 1,
  },
  routePointLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routePointAddress: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  routeDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: COLORS.outlineVariant,
    marginLeft: 5,
    marginVertical: SPACING.xs,
  },

  // Fare
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  fareLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  fareValue: {
    ...TYPOGRAPHY.headlineLgMobile,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  declineButtonWrapper: {
    flex: 1,
  },
  acceptButtonWrapper: {
    flex: 1,
  },

  // Bottom Earnings Card
  bottomStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  earningsGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md + 4,
    paddingVertical: SPACING.md + 4,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  earningsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsLabel: {
    ...TYPOGRAPHY.labelMd,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  earningsValue: {
    ...TYPOGRAPHY.headlineLgMobile,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },
  tripsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
  },
  tripsBadgeText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },

  // Offline hint
  offlineHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  offlineHintText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
  },

  // Toggle button
  toggleButtonContainer: {
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md + 4,
  },
});
