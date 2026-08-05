// ============================================
// SMART RIDE — DRIVER DASHBOARD
// ============================================
// Golden Screen #13 · Archetype AR-3 (Operational Map). Incoming requests are
// Golden Screen #14 (time-boxed decision).
//
//   AppHeader (greeting + OnlinePill + notifications) → map workspace + FAB
//   cluster → operations panel (live status, real earnings, stats, Go Online)
//
// UI/UX ONLY — every socket event, dispatch call, ride-lifecycle transition,
// location tracking, gate and timer below is preserved from the previous
// screen. Earnings/stats use REAL /riders/earnings + profile data (no mocks).
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Vibration,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import {
  DEFAULT_LOCATION,
  SPACING,
  RADIUS,
  MOTION,
  TYPOGRAPHY,
  SHADOWS,
  ICON,
  BORDER,
  OPACITY,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  GradientButton,
  OnlinePill,
  Rating,
  Skeleton,
  SmartBottomSheet,
  SmartRideMap,
} from '@/src/components';
import { Rider } from '@/src/types';
import { formatUGX, formatRating } from '@/src/utils/money';

interface PeriodEarnings { totalEarnings: number; tripCount: number }

/**
 * How often an online rider reports in. Must stay comfortably under the
 * server's RIDER_HEARTBEAT_STALE_MS (90s) or dispatch stops considering this
 * rider eligible for offers.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DriverHomeScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
  // Last known coords, kept in a ref so the heartbeat timer below always has
  // something to send without re-subscribing or re-rendering.
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

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

  // Keep-alive heartbeat.
  //
  // Dispatch only offers rides to riders whose lastHeartbeatAt is within
  // RIDER_HEARTBEAT_STALE_MS (90s) — that check is what stops offers going to
  // "ghost" riders whose app is closed but whose isOnline flag is stuck. But
  // the ONLY heartbeat we sent came from the watchPositionAsync callback,
  // which fires on movement (distanceInterval: 10m). A rider sitting at a
  // stage waiting for work does not move, so they stopped heartbeating,
  // went stale after 90s, and silently received zero requests while their own
  // screen still read ONLINE. Verified on device: online 30 minutes,
  // one heartbeat, and a booked ride sat in SEARCHING and never reached them.
  //
  // So heartbeat on a timer as well, independent of movement, at well under
  // the staleness window.
  useEffect(() => {
    if (!isOnline) return;

    const beat = () => {
      const coords = lastCoordsRef.current
        ?? (latitude != null && longitude != null ? { latitude, longitude } : null);
      if (!coords) return;
      api.sendHeartbeat(coords).catch(() => {});
    };

    beat(); // don't wait a full interval to become eligible
    const id = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isOnline, latitude, longitude]);

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
          lastCoordsRef.current = { latitude: lat, longitude: lng };

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

  // Ringtone while a request is awaiting accept/decline. handleIncomingRequest
  // already vibrates once on arrival, but a single buzz is easy to miss and
  // gives no audible cue at all — a real ringtone/alert-tone asset isn't
  // bundled in this app, so this plays the device's own notification sound
  // repeatedly (via a local, immediate notification) for as long as the
  // request sheet is showing. Keyed on `incomingRequest` itself rather than
  // wired into each accept/decline/expire handler individually, so it stops
  // the instant any of them clears the request — same pattern as the
  // countdown timer effect above.
  useEffect(() => {
    if (!incomingRequest) return;

    const ring = () => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'New ride request',
          body: incomingRequest.pickup?.address || 'Respond before it expires',
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
      Vibration.vibrate([0, 300, 150, 300]);
    };

    ring();
    const interval = setInterval(ring, 3500);
    return () => clearInterval(interval);
  }, [incomingRequest]);

  // Map-archetype loading skeleton — the panel shape is already there, so the
  // dashboard doesn't jump when the profile lands.
  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.mapArea} />
        <View style={styles.panel}>
          <View style={styles.grabber} />
          <Skeleton width="58%" height={20} borderRadius={RADIUS.sm} />
          <Skeleton width="100%" height={132} borderRadius={RADIUS.xl} style={styles.skeletonGap} />
          <Skeleton width="100%" height={72} borderRadius={RADIUS.xl} style={styles.skeletonGap} />
          <Skeleton width="100%" height={56} borderRadius={RADIUS.full} style={styles.skeletonGap} />
        </View>
      </View>
    );
  }

  // Show error state if rider profile failed to load
  if (profileError && !rider) {
    const isRiderRole = user?.role === 'RIDER';
    return (
      <View style={styles.gateContainer}>
        {isRiderRole ? (
          <EmptyState
            icon="bicycle-outline"
            title="Complete your profile"
            subtitle="You need to complete rider onboarding before you can go online and accept trips."
            actionLabel="Start Onboarding"
            onAction={() => router.replace('/rider/onboarding')}
          />
        ) : (
          <ErrorState
            title="Profile load error"
            subtitle={profileError}
            retryLabel="Retry"
            onRetry={loadRiderProfile}
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
    const gateTitle = rejected
      ? 'Application not approved'
      : suspended
        ? 'Account suspended'
        : 'Application under review';
    const gateSubtitle = rejected
      ? (reason ? `Your application was not approved. Reason: ${reason}` : 'Your application was not approved. Please contact Smart Ride support.')
      : suspended
        ? 'Your account has been suspended. Please contact Smart Ride support.'
        : "Your application has been submitted and is being reviewed. You'll be able to go online and accept trips once an admin approves it.";
    return (
      <View style={styles.gateContainer}>
        {rejected || suspended ? (
          <ErrorState
            title={gateTitle}
            subtitle={gateSubtitle}
            retryLabel="Check status again"
            onRetry={loadRiderProfile}
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title={gateTitle}
            subtitle={gateSubtitle}
            actionLabel="Check status again"
            onAction={loadRiderProfile}
          />
        )}
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

        {/* Compact header: greeting + availability + notifications */}
        <Animated.View entering={FadeInDown.duration(MOTION.duration.slower)} style={styles.headerOverlay}>
          <AppHeader
            title={firstName}
            subtitle={greetingFor()}
            rightSlot={<OnlinePill isOnline={isOnline} onToggle={() => toggleOnlineStatus(!isOnline)} />}
            rightActions={[
              { icon: 'notifications-outline', onPress: () => router.push('/notifications'), label: 'Notifications' },
            ]}
          />
        </Animated.View>

        {profileError && rider && (
          <Animated.View
            entering={FadeIn.duration(MOTION.duration.base)}
            style={[styles.errorBanner, { top: Math.max(insets.top, 12) + 78 }]}
          >
            <Ionicons name="alert-circle-outline" size={ICON.sm} color={COLORS.warning} />
            <Text style={styles.errorBannerText} numberOfLines={1}>{profileError}</Text>
            <TouchableOpacity onPress={loadRiderProfile} accessibilityRole="button" accessibilityLabel="Retry loading profile">
              <Text style={styles.errorBannerAction}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Floating quick actions */}
        <View style={styles.fabColumn}>
          <Fab icon="warning" bg={COLORS.error} fg={COLORS.onError} onPress={() => router.push('/sos' as never)} label="SOS" styles={styles} />
          <Fab icon="chatbubble-ellipses-outline" bg={COLORS.backgroundElevated} fg={COLORS.onSurface} onPress={() => router.push('/chat' as never)} label="Messages" styles={styles} />
          <Fab icon="help-buoy-outline" bg={COLORS.backgroundElevated} fg={COLORS.onSurface} onPress={() => router.push('/help-center' as never)} label="Support" styles={styles} />
          <Fab icon="locate" bg={COLORS.backgroundElevated} fg={COLORS.primary} onPress={() => getCurrentLocation().catch(() => {})} label="Recenter" styles={styles} />
        </View>
      </View>

      {/* ── OPERATIONS PANEL (lower) ── */}
      <Animated.View entering={SlideInUp.duration(MOTION.duration.slower).springify()} style={styles.panel}>
        <View style={styles.grabber} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + SPACING.sm }}>
          {/* Live status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: liveStatus.dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>{liveStatus.text}</Text>
              <Text style={styles.statusSub}>{liveStatus.sub}</Text>
            </View>
            <Rating value={rider?.rating} count={rider?.ratingCount} />
          </View>

          {/* Earnings */}
          <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl}>
            <View style={styles.earningsTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.earningsLabel}>Today&apos;s earnings</Text>
                <Text style={styles.earningsValue}>{formatUGX(today?.totalEarnings ?? 0)}</Text>
                <Text style={styles.earningsMeta}>
                  {today?.tripCount ?? 0} trip{(today?.tripCount ?? 0) === 1 ? '' : 's'} today
                  {weekEarnings != null ? `  •  ${formatUGX(weekEarnings)} this week` : ''}
                </Text>
              </View>
              <View style={styles.walletChip}>
                <Ionicons name="wallet-outline" size={ICON.xs} color={COLORS.onPrimary} />
                <Text style={styles.walletChipText}>{formatUGX(rider?.walletBalance ?? 0)}</Text>
              </View>
            </View>
            <View style={styles.shortcutRow}>
              <Shortcut icon="wallet-outline" label="Wallet" onPress={() => router.push('/rider/wallet' as never)} COLORS={COLORS} styles={styles} />
              <Shortcut icon="arrow-up-circle-outline" label="Withdraw" onPress={() => router.push('/rider/wallet' as never)} COLORS={COLORS} styles={styles} />
              <Shortcut icon="time-outline" label="History" onPress={() => router.push('/rider/history' as never)} COLORS={COLORS} styles={styles} />
              <Shortcut icon="stats-chart-outline" label="Earnings" onPress={() => router.push('/rider/earnings' as never)} COLORS={COLORS} styles={styles} />
            </View>
          </Card>

          {/* Rider stats */}
          <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <Stat value={formatRating(rider?.rating, rider?.ratingCount)} label="Rating" styles={styles} />
              <View style={styles.statDivider} />
              <Stat value={String(today?.tripCount ?? 0)} label="Trips today" styles={styles} />
              <View style={styles.statDivider} />
              <Stat value={String(rider?.completedTrips ?? rider?.totalTrips ?? 0)} label="Completed" styles={styles} />
            </View>
          </Card>

          {/* Go online / offline */}
          <View style={styles.goOnlineWrap}>
            <GradientButton
              title={isOnline ? 'Go Offline' : 'Go Online'}
              onPress={() => toggleOnlineStatus(!isOnline)}
              variant={isOnline ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              icon={isOnline
                ? <Ionicons name="power" size={ICON.md} color={COLORS.onPrimary} />
                : <Ionicons name="flash" size={ICON.md} color={COLORS.onPrimary} />}
            />
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── INCOMING REQUEST (Golden Screen #14) ── */}
      {/* Declining is an explicit decision — a stray tap beside the sheet must
          not cost the driver the offer, so the scrim does not dismiss. */}
      <SmartBottomSheet
        visible={!!incomingRequest}
        onDismiss={handleDeclineRequest}
        dismissOnBackdrop={false}
      >
        {incomingRequest ? (
          <View>
            <View style={styles.requestHead}>
              <View style={styles.requestTitleRow}>
                <View style={styles.requestIcon}>
                  <Ionicons name="navigate" size={ICON.sm} color={COLORS.onPrimary} />
                </View>
                <Text style={styles.requestTitle}>New ride request</Text>
              </View>
              <Animated.View entering={ZoomIn.duration(MOTION.duration.base)}>
                <View style={[styles.timerRing, { borderColor: (requestTimer || 0) < 10 ? COLORS.error : COLORS.primary }]}>
                  <Text style={[styles.timerText, { color: (requestTimer || 0) < 10 ? COLORS.error : COLORS.primary }]}>
                    {requestTimer ?? 0}
                  </Text>
                </View>
              </Animated.View>
            </View>

            <Card variant="flat" padding={SPACING.md} radius={RADIUS.lg}>
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
            </Card>

            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>You earn</Text>
              <Text style={styles.fareValue}>{formatUGX(incomingRequest.task?.totalAmount || 0)}</Text>
            </View>

            <View style={styles.actionRow}>
              <GradientButton
                title="Decline"
                onPress={handleDeclineRequest}
                variant="secondary"
                size="lg"
                fullWidth={false}
                style={styles.actionButton}
                disabled={isAccepting}
              />
              <GradientButton
                title="Accept"
                onPress={handleAcceptRequest}
                variant="primary"
                size="lg"
                fullWidth={false}
                style={styles.actionButton}
                loading={isAccepting}
                disabled={isAccepting}
                icon={!isAccepting ? <Ionicons name="checkmark" size={ICON.md} color={COLORS.onPrimary} /> : undefined}
              />
            </View>
          </View>
        ) : null}
      </SmartBottomSheet>
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================
// Each takes the styles it needs. The screen previously assigned COLORS and
// styles to module-level `let`s so these could read them — shared mutable
// module state that only worked while exactly one instance was mounted.

function Fab({ icon, bg, fg, onPress, label, styles }: { icon: string; bg: string; fg: string; onPress: () => void; label: string; styles: any }) {
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon as any} size={ICON.md} color={fg} />
    </TouchableOpacity>
  );
}

function Shortcut({ icon, label, onPress, COLORS, styles }: { icon: string; label: string; onPress: () => void; COLORS: ThemedColors; styles: any }) {
  return (
    <TouchableOpacity
      style={styles.shortcut}
      onPress={onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.shortcutIcon}><Ionicons name={icon as any} size={ICON.md} color={COLORS.primary} /></View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stat({ value, label, styles }: { value: string; label: string; styles: any }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ============================================
// STYLES — layout + domain content only.
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },

  // Gates
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  skeletonGap: { marginTop: SPACING.md },

  // Map workspace ~56%
  mapArea: { flex: 1.28, overflow: 'hidden', backgroundColor: COLORS.surfaceContainerLow },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },

  errorBanner: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 9,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.backgroundElevated, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.gutter, paddingVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  errorBannerText: { flex: 1, ...TYPOGRAPHY.labelMd, color: COLORS.onSurface },
  errorBannerAction: { ...TYPOGRAPHY.labelMd, fontWeight: '700', color: COLORS.primary },

  // Floating quick actions
  fabColumn: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, gap: SPACING.sm + 2, alignItems: 'center' },
  fab: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.active,
  },

  // Operations panel ~44% (rounded-26 + grabber, matching SmartBottomSheet)
  panel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    marginTop: -(RADIUS.xl - 2),
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    ...SHADOWS.active,
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: RADIUS.full,
    backgroundColor: COLORS.outlineVariant, marginBottom: SPACING.gutter,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.gutter, marginBottom: SPACING.md },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { ...TYPOGRAPHY.bodyMd, fontWeight: '700', color: COLORS.onSurface },
  statusSub: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, marginTop: 1 },

  // Earnings
  earningsTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  earningsLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, fontWeight: '500' },
  earningsValue: { ...TYPOGRAPHY.displayLg, color: COLORS.onSurface, marginTop: 2 },
  earningsMeta: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, marginTop: SPACING.xs },
  walletChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2, paddingVertical: 6,
  },
  walletChipText: { ...TYPOGRAPHY.labelMd, fontWeight: '700', color: COLORS.onPrimary },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  shortcut: { alignItems: 'center', gap: SPACING.xs + 2, flex: 1, minHeight: 44 },
  shortcutIcon: {
    width: 46, height: 46, borderRadius: RADIUS.md + 3,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  shortcutLabel: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, fontWeight: '600' },

  // Stats
  statsCard: { marginTop: SPACING.md },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...TYPOGRAPHY.headlineMd, fontWeight: '800', color: COLORS.onSurface },
  statLabel: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, marginTop: 2 },
  statDivider: { width: BORDER.hairline, height: 30, backgroundColor: COLORS.borderLight },

  goOnlineWrap: { marginTop: SPACING.md },

  // Incoming request
  requestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  requestTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2, flex: 1 },
  requestIcon: {
    width: 34, height: 34, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  requestTitle: { ...TYPOGRAPHY.bodyLg, fontWeight: '800', color: COLORS.onSurface },
  timerRing: {
    width: 46, height: 46, borderRadius: RADIUS.full, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { ...TYPOGRAPHY.bodyLg, fontWeight: '800' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.gutter },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  dropoffDot: { width: 12, height: 12, borderRadius: RADIUS.sm - 1, backgroundColor: COLORS.error },
  routeConnector: { width: 2, height: 18, backgroundColor: COLORS.outlineVariant, marginLeft: 5, marginVertical: 2 },
  routeLabel: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  routeAddr: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurface, fontWeight: '600' },

  fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md },
  fareLabel: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  fareValue: { ...TYPOGRAPHY.headlineLg, color: COLORS.primary },

  actionRow: { flexDirection: 'row', gap: SPACING.gutter, marginTop: SPACING.md },
  actionButton: { flex: 1 },
});