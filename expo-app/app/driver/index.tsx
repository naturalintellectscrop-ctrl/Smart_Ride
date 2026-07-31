/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - RIDER HOME (OPERATIONAL)
// ============================================
// Commercial driver-app home (Uber/Bolt/SafeBoda style):
//   compact top bar + animated Online pill, a right-sized map workspace with
//   floating quick actions, and a bottom operations panel (live status,
//   real earnings, rider stats, Go Online). Incoming requests arrive as a
//   premium bottom sheet with a countdown.
//
// UI/UX ONLY — every socket event, dispatch call, ride-lifecycle transition,
// location tracking, gate and timer below is preserved from the previous
// screen. Earnings/stats use REAL /riders/earnings + profile data (no mocks).
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Vibration,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  FadeInDown,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { GRADIENTS, DEFAULT_LOCATION, SPACING, RADIUS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GradientButton } from '@/src/components/GradientButton';
import { Rider } from '@/src/types';
import { formatUGX, formatRating } from '@/src/utils/money';

let COLORS: ThemedColors;
let styles: any;

interface PeriodEarnings { totalEarnings: number; tripCount: number }

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DriverHomeScreen() {
  { const t = useTheme(); COLORS = makeThemedColors(t.isDark); styles = createStyles(COLORS); }
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { incomingRequest, setIncomingRequest, clearIncomingRequest } = useTaskStore();
  const { latitude, longitude, getCurrentLocation } = useLocationStore();

  const [isOnline, setIsOnline] = useState(false);
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [requestTimer, setRequestTimer] = useState<number | null>(null);
  const [today, setToday] = useState<PeriodEarnings | null>(null);
  const [weekEarnings, setWeekEarnings] = useState<number | null>(null);

  // Location tracking
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  // Load rider profile on mount - NON-BLOCKING
  useEffect(() => {
    loadRiderProfile();
    loadEarnings();

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

  // Real earnings for the header card (today + this week). No mock data —
  // an empty result simply shows UGX 0 / 0 trips.
  const loadEarnings = useCallback(async () => {
    try {
      const res = await api.getRiderEarnings('today');
      const e = (res as any)?.data?.earnings;
      if (res.success && e) {
        setToday({ totalEarnings: Number(e.today?.totalEarnings ?? 0), tripCount: Number(e.today?.tripCount ?? 0) });
        setWeekEarnings(Number(e.week?.totalEarnings ?? 0));
      }
    } catch {
      // non-fatal — card falls back to profile trip count / dashes
    }
  }, []);

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
          // Keep null when the rider has no ratings yet — the schema default of
          // 5.0 would otherwise show an unearned "5.00" to every new rider.
          rating: typeof riderData.rating === 'number' ? riderData.rating : null,
          ratingCount: typeof riderData.ratingCount === 'number' ? riderData.ratingCount : 0,
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
    // Idempotence guard: ignore no-op or duplicate/stale calls (e.g. a UI
    // control echoing a programmatic value change). Only a real state change
    // may hit the API — prevents accidental silent offline flips.
    if (value === isOnline) return;
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

    // Haptic alert so the driver notices a request even without looking at the
    // screen (a distinct double-buzz). Push carries the sound when backgrounded.
    Vibration.vibrate([0, 400, 200, 400]);

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

  // Countdown timer effect. When the offer runs out locally, ALSO tell the
  // backend so it expires the match and rotates the offer to the next rider
  // immediately — otherwise reassignment waits for the periodic cron sweep.
  useEffect(() => {
    if (requestTimer === null || requestTimer <= 0) return;

    const interval = setInterval(() => {
      setRequestTimer((prev) => {
        if (prev === null || prev <= 1) {
          const matchId = (incomingRequest as any)?.matchId;
          if (matchId) {
            api.dispatchExpire(matchId).catch(() => {
              // Non-fatal: the cron sweep is the backstop for reassignment.
            });
          }
          clearIncomingRequest();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [requestTimer, clearIncomingRequest, incomingRequest]);

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

  // ── Live status line (drives the operations panel header) ──
  const liveStatus = incomingRequest
    ? { dot: COLORS.warning, text: 'New ride request', sub: 'Respond before the timer runs out' }
    : isOnline
      ? { dot: COLORS.success, text: 'Waiting for requests', sub: 'Finding nearby passengers…' }
      : { dot: COLORS.onSurfaceVariant, text: "You're offline", sub: 'Go online to start earning' };

  const firstName = (rider?.fullName || 'Rider').split(' ')[0];

  return (
    <View style={styles.root}>
      {/* ── MAP WORKSPACE (upper) ── */}
      <View style={styles.mapArea}>
        <SmartRideMap
          style={StyleSheet.absoluteFill}
          initialLatitude={latitude || DEFAULT_LOCATION.latitude}
          initialLongitude={longitude || DEFAULT_LOCATION.longitude}
          showUserLocation
        />

        {/* Compact top app bar */}
        <Animated.View entering={FadeInDown.duration(450)} style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greetingFor()}</Text>
            <Text style={styles.riderName} numberOfLines={1}>{firstName}</Text>
          </View>
          <OnlinePill isOnline={isOnline} onToggle={() => toggleOnlineStatus(!isOnline)} />
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')} activeOpacity={0.8} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        </Animated.View>

        {profileError && rider && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.errorBanner, { top: Math.max(insets.top, 12) + 72 }]}>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.warning} />
            <Text style={styles.errorBannerText} numberOfLines={1}>{profileError}</Text>
            <TouchableOpacity onPress={loadRiderProfile}><Text style={styles.errorBannerAction}>Retry</Text></TouchableOpacity>
          </Animated.View>
        )}

        {/* Floating quick actions */}
        <View style={styles.fabColumn}>
          <Fab icon="warning" bg={COLORS.error} fg="#FFFFFF" onPress={() => router.push('/sos' as never)} label="SOS" />
          <Fab icon="chatbubble-ellipses-outline" bg={COLORS.backgroundElevated} fg={COLORS.onSurface} onPress={() => router.push('/chat' as never)} label="Messages" />
          <Fab icon="help-buoy-outline" bg={COLORS.backgroundElevated} fg={COLORS.onSurface} onPress={() => router.push('/help-center' as never)} label="Support" />
          <Fab icon="locate" bg={COLORS.backgroundElevated} fg={COLORS.primary} onPress={() => getCurrentLocation().catch(() => {})} label="Recenter" />
        </View>
      </View>

      {/* ── OPERATIONS PANEL (lower) ── */}
      <Animated.View entering={SlideInUp.duration(500).springify()} style={styles.panel}>
        <View style={styles.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          {/* Live status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: liveStatus.dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>{liveStatus.text}</Text>
              <Text style={styles.statusSub}>{liveStatus.sub}</Text>
            </View>
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={13} color={COLORS.warning} />
              <Text style={styles.ratingChipText}>{formatRating(rider?.rating, rider?.ratingCount)}</Text>
            </View>
          </View>

          {/* Earnings card */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsTop}>
              <View>
                <Text style={styles.earningsLabel}>Today&apos;s earnings</Text>
                <Text style={styles.earningsValue}>{formatUGX(today?.totalEarnings ?? 0)}</Text>
                <Text style={styles.earningsMeta}>
                  {today?.tripCount ?? 0} trip{(today?.tripCount ?? 0) === 1 ? '' : 's'} today
                  {weekEarnings != null ? `  •  ${formatUGX(weekEarnings)} this week` : ''}
                </Text>
              </View>
              <View style={styles.walletChip}>
                <Ionicons name="wallet-outline" size={14} color={COLORS.onPrimary} />
                <Text style={styles.walletChipText}>{formatUGX(rider?.walletBalance ?? 0)}</Text>
              </View>
            </View>
            <View style={styles.shortcutRow}>
              <Shortcut icon="wallet-outline" label="Wallet" onPress={() => router.push('/rider/wallet' as never)} />
              <Shortcut icon="arrow-up-circle-outline" label="Withdraw" onPress={() => router.push('/rider/wallet' as never)} />
              <Shortcut icon="time-outline" label="History" onPress={() => router.push('/rider/history' as never)} />
              <Shortcut icon="stats-chart-outline" label="Earnings" onPress={() => router.push('/rider/earnings' as never)} />
            </View>
          </View>

          {/* Rider stats */}
          <View style={styles.statsCard}>
            <Stat value={formatRating(rider?.rating, rider?.ratingCount)} label="Rating" />
            <View style={styles.statDivider} />
            <Stat value={String(today?.tripCount ?? 0)} label="Trips today" />
            <View style={styles.statDivider} />
            <Stat value={String(rider?.completedTrips ?? rider?.totalTrips ?? 0)} label="Completed" />
          </View>

          {/* Go online / offline */}
          <View style={{ marginTop: SPACING.md }}>
            <GradientButton
              title={isOnline ? 'Go Offline' : 'Go Online'}
              onPress={() => toggleOnlineStatus(!isOnline)}
              variant={isOnline ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              icon={isOnline
                ? <Ionicons name="power" size={20} color={COLORS.onPrimary} />
                : <Ionicons name="flash" size={20} color={COLORS.onPrimary} />}
            />
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── INCOMING REQUEST BOTTOM SHEET ── */}
      {incomingRequest && (
        <View style={styles.sheetScrim} pointerEvents="box-none">
          <Animated.View entering={SlideInUp.duration(360).springify()} style={[styles.requestSheet, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
            <View style={styles.grabber} />
            <View style={styles.requestHead}>
              <View style={styles.requestTitleRow}>
                <View style={styles.requestIcon}><Ionicons name="navigate" size={16} color={COLORS.onPrimary} /></View>
                <Text style={styles.requestTitle}>New ride request</Text>
              </View>
              <Animated.View entering={ZoomIn.duration(250)}>
                <View style={[styles.timerRing, { borderColor: (requestTimer || 0) < 10 ? COLORS.error : COLORS.primary }]}>
                  <Text style={[styles.timerText, { color: (requestTimer || 0) < 10 ? COLORS.error : COLORS.primary }]}>{requestTimer ?? 0}</Text>
                </View>
              </Animated.View>
            </View>

            <View style={styles.routeCard}>
              <View style={styles.routeRow}>
                <View style={styles.pickupDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeAddr} numberOfLines={1}>{incomingRequest.pickup?.address || 'Pickup location'}</Text>
                </View>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={styles.dropoffDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>Dropoff</Text>
                  <Text style={styles.routeAddr} numberOfLines={1}>{incomingRequest.task?.dropoffAddress || 'Dropoff location'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>You earn</Text>
              <Text style={styles.fareValue}>{formatUGX(incomingRequest.task?.totalAmount || 0)}</Text>
            </View>

            <View style={styles.actionRow}>
              <AnimatedPressable onPress={handleDeclineRequest}>
                <View style={styles.declineBtn}><Text style={styles.declineText}>Decline</Text></View>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleAcceptRequest} disabled={isAccepting}>
                <View style={styles.acceptBtn}>
                  {isAccepting ? <ActivityIndicator color={COLORS.onPrimary} /> : (<>
                    <Ionicons name="checkmark" size={18} color={COLORS.onPrimary} />
                    <Text style={styles.acceptText}>Accept</Text>
                  </>)}
                </View>
              </AnimatedPressable>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Animated Online/Offline pill switch (small — replaces the giant button).
function OnlinePill({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) {
  const p = useSharedValue(isOnline ? 1 : 0);
  useEffect(() => { p.value = withTiming(isOnline ? 1 : 0, { duration: 220 }); }, [isOnline]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 34 }] }));
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.9} accessibilityRole="switch" accessibilityState={{ checked: isOnline }} style={[styles.pill, isOnline && styles.pillOn]}>
      <Animated.View style={[styles.pillKnob, isOnline && styles.pillKnobOn, knob]} />
      <Text style={[styles.pillText, isOnline ? styles.pillTextOn : styles.pillTextOff]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
    </TouchableOpacity>
  );
}

function Fab({ icon, bg, fg, onPress, label }: { icon: string; bg: string; fg: string; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={[styles.fab, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85} accessibilityLabel={label}>
      <Ionicons name={icon as any} size={20} color={fg} />
    </TouchableOpacity>
  );
}

function Shortcut({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.shortcutIcon}><Ionicons name={icon as any} size={19} color={COLORS.primary} /></View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Pulsing Loader Component
function PulsingLoader() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.2, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </Animated.View>
  );
}

function AnimatedPressable({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(MOTION.pressScale, MOTION.spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, MOTION.spring.press); }}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },

  // Loading / error gates
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, gap: 16 },
  loadingText: { color: COLORS.onSurfaceVariant, fontSize: 15 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 32 },
  errorIconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: COLORS.onSurface, textAlign: 'center' },
  errorSubtitle: { fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Map workspace ~56%
  mapArea: { flex: 1.28, overflow: 'hidden' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.md, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '500', textShadowColor: 'rgba(255,255,255,0.6)', textShadowRadius: 6 },
  riderName: { fontSize: 22, fontWeight: '800', color: COLORS.onSurface, textShadowColor: 'rgba(255,255,255,0.6)', textShadowRadius: 6 },
  bellButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },

  // Online pill
  pill: {
    width: 84, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceContainerHigh,
    justifyContent: 'center', paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  pillOn: { backgroundColor: COLORS.primary },
  pillKnob: { position: 'absolute', left: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.onSurfaceVariant },
  pillKnobOn: { backgroundColor: '#FFFFFF' },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center', marginLeft: 8 },
  pillTextOn: { color: COLORS.onPrimary },
  pillTextOff: { color: COLORS.onSurfaceVariant },

  errorBanner: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 9,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.backgroundElevated, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: COLORS.onSurface },
  errorBannerAction: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // Floating quick actions
  fabColumn: { position: 'absolute', right: SPACING.md, bottom: 16, gap: 10, alignItems: 'center' },
  fab: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },

  // Operations panel ~44%
  panel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    marginTop: -22, paddingHorizontal: SPACING.md, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: COLORS.outlineVariant, marginBottom: 12 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  statusSub: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 1 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceContainerLow, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ratingChipText: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface },

  // Earnings
  earningsCard: {
    backgroundColor: COLORS.backgroundElevated, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  earningsTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  earningsLabel: { fontSize: 13, color: COLORS.onSurfaceVariant, fontWeight: '500' },
  earningsValue: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, marginTop: 2 },
  earningsMeta: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 4 },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  walletChipText: { fontSize: 12, fontWeight: '700', color: COLORS.onPrimary },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  shortcut: { alignItems: 'center', gap: 6, flex: 1 },
  shortcutIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 11.5, color: COLORS.onSurfaceVariant, fontWeight: '600' },

  // Stats
  statsCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md,
    backgroundColor: COLORS.backgroundElevated, borderRadius: RADIUS.xl, paddingVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 19, fontWeight: '800', color: COLORS.onSurface },
  statLabel: { fontSize: 11.5, color: COLORS.onSurfaceVariant, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.borderLight },

  // Incoming request sheet
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' },
  requestSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: SPACING.lg, paddingTop: 10,
  },
  requestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  requestTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  requestTitle: { fontSize: 17, fontWeight: '800', color: COLORS.onSurface },
  timerRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 17, fontWeight: '800' },

  routeCard: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, padding: SPACING.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  dropoffDot: { width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.error },
  routeConnector: { width: 2, height: 18, backgroundColor: COLORS.outlineVariant, marginLeft: 5, marginVertical: 2 },
  routeLabel: { fontSize: 11, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  routeAddr: { fontSize: 14.5, color: COLORS.onSurface, fontWeight: '600' },

  fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md },
  fareLabel: { fontSize: 14, color: COLORS.onSurfaceVariant },
  fareValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: SPACING.md },
  declineBtn: { height: 54, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceContainerHigh },
  declineText: { fontSize: 16, fontWeight: '700', color: COLORS.onSurface },
  acceptBtn: { height: 54, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary },
  acceptText: { fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
});
