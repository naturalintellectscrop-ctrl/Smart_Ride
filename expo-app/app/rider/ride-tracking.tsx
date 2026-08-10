// ============================================
// SMART RIDE — ACTIVE RIDE
// ============================================
// Golden Screen #12 · Archetype AR-3 (Operational Map, live).
//
//   compact AppHeader overlay → live map workspace → operations panel:
//   status + RideTimeline → live ETA → DriverCard → action row (Call · Chat ·
//   SOS danger · Cancel)
//
// This is the master real-time screen, so every surface is a Design-System
// primitive (Card, Avatar, Rating, StatusBadge, RideTimeline, Chip,
// GradientButton, StateViews, ConfirmDialog) — no bespoke buttons or cards.
//
// Real-time behaviour is unchanged:
//  - Live map: driver position, pickup, destination, traffic-aware route polyline
//  - Route + ETA update in real time from the driver's streaming GPS (Directions API)
//  - Driver card: Smart Ride avatar, first name, rating, vehicle, masked plate
//  - Communication: internet call (Agora), in-app chat, quick replies — no phone numbers
//  - Arrival estimation from live GPS + route distance + traffic (never hardcoded)
// ============================================

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  AppHeader,
  Avatar,
  Card,
  Chip,
  ConfirmDialog,
  ErrorState,
  GradientButton,
  Rating,
  ResizablePanel,
  RideTimeline,
  Skeleton,
  SmartRideMap,
  StatusBadge,
} from '@/src/components';
import type { TimelineStep } from '@/src/components/RideTimeline';
import { useTaskStore } from '@/src/store';
import { useChatStore } from '@/src/store/chatStore';
import { api, socketService } from '@/src/services';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON,
  BORDER,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Task, TaskStatus } from '@/src/types';
import { firstName } from '@/src/utils/formatName';
import { useLiveRoute } from '@/src/hooks/useLiveRoute';
import {
  Coord,
  maskPlate,
  vehicleSummary,
  formatEta,
  isBeforePickup,
  RIDE_QUICK_REPLIES,
} from '@/src/utils/ride';
import { Ionicons } from '@expo/vector-icons';

// Polling intervals (in ms)
const POLL_INTERVAL_FAST = 3000;  // 3 seconds for active rides

// SLA: the customer must never wait forever. Mirrors the backend hard cap
// (DEFAULT_DISPATCH_CONFIG.matchingTimeoutMs). After this, show a clear failure.
const MAX_SEARCH_MS = 120_000; // 120s
const SEARCHING_STATES = new Set(['CREATED', 'REQUESTED', 'SEARCHING', 'MATCHING']);

export default function RideTrackingScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ taskId: string }>();
  const { pendingTask, setCurrentTask, updateTaskStatus, clearPendingTask } = useTaskStore();
  const sendChatMessage = useChatStore((s) => s.sendMessage);

  const [task, setTask] = useState<Task | null>(pendingTask);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchStartRef = useRef<number | null>(null);
  const taskRef = useRef<Task | null>(pendingTask); // always-latest task for socket callbacks
  const [sentQuickReply, setSentQuickReply] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
  } | null>(null);

  // Polling refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketConnectedRef = useRef(false);
  const lastUpdateTimestamp = useRef(0); // Track last state update time to prevent stale poll overwrites
  // One-shot guard: completion can be observed by BOTH the socket and the poll.
  // Ensure we navigate to the trip summary exactly once.
  const completionHandledRef = useRef(false);

  // POLLING FALLBACK: Fetch task status periodically
  const pollTaskStatus = async () => {
    if (!params.taskId) return;

    // Skip poll if a socket update happened recently (within 5 seconds)
    // This prevents stale poll data from overwriting fresh socket data
    if (Date.now() - lastUpdateTimestamp.current < 5000) {
      return;
    }

    try {
      const response = await api.getTask(params.taskId);
      if (response.success && response.data) {
        const updatedTask = response.data;

        // Check if status changed
        setTask(prev => {
          if (prev && prev.status !== updatedTask.status) {
            // Status changed - update store
            updateTaskStatus(params.taskId, updatedTask.status);

            // Handle completion
            if (updatedTask.status === 'COMPLETED') {
              handleRideCompleted(updatedTask);
            }
          }
          // Preserve rider details across polls (list payloads may omit them)
          return { ...prev, ...updatedTask, rider: updatedTask.rider || prev?.rider } as Task;
        });

        // Update driver location if available
        if (updatedTask.rider?.currentLatitude && updatedTask.rider?.currentLongitude) {
          setDriverLocation({
            latitude: updatedTask.rider.currentLatitude,
            longitude: updatedTask.rider.currentLongitude,
          });
        }
      }
    } catch (error) {
      console.error('[RideTracking] Poll error:', error);
    }
  };

  // Handle ride completion — navigate to trip summary screen
  const handleRideCompleted = (completedTask: Task) => {
    if (completionHandledRef.current) return; // one-shot: socket + poll may both fire
    completionHandledRef.current = true;
    stopPolling();
    clearPendingTask();

    const paymentDetails = (completedTask as any).paymentDetails || {};
    const totalAmount = paymentDetails.fare ?? completedTask.totalAmount ?? 0;
    const paymentMethod = paymentDetails.paymentMethod ?? completedTask.paymentMethod ?? 'CASH';
    const driverName = firstName((completedTask as any).rider?.fullName, '');
    // Waiting charge settled at completion (0 when the driver waited within the
    // free grace window) — passed through so the receipt can itemise it.
    const waitingCharge = Math.round(Number((completedTask as any).waitingCharge ?? 0));
    const waitingMinutes = Math.round(Number((completedTask as any).waitingMinutes ?? 0));

    router.replace({
      pathname: '/rider/trip-summary' as never,
      params: {
        taskId: completedTask.id,
        totalAmount: String(Math.round(totalAmount)),
        paymentMethod,
        pickupAddress: completedTask.pickupAddress || '',
        dropoffAddress: completedTask.dropoffAddress || '',
        distanceKm: String((completedTask as any).distanceKm ?? 0),
        durationMin: String((completedTask as any).estimatedDuration ?? 0),
        waitingCharge: String(waitingCharge),
        waitingMinutes: String(waitingMinutes),
        driverName,
      },
    });
  };

  // Start polling
  const startPolling = (interval: number = POLL_INTERVAL_FAST) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(pollTaskStatus, interval);
    console.log('[RideTracking] Started polling with interval:', interval);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (params.taskId && !pendingTask) {
      loadTask(params.taskId);
    } else if (pendingTask) {
      setTask(pendingTask);
      setIsLoading(false);
    }

    // CRITICAL: ALWAYS start polling for status updates
    // Polling is the PRIMARY mechanism, socket is secondary
    startPolling();
    console.log('[RideTracking] Polling started as primary update mechanism');

    // ATTEMPT SOCKET CONNECTION (secondary, optional)
    const initSocket = async () => {
      try {
        await socketService.connect();
        socketConnectedRef.current = socketService.isSocketConnected();

        if (socketConnectedRef.current && params.taskId) {
          socketService.joinTaskRoom(params.taskId);
          console.log('[RideTracking] Socket connected as secondary mechanism');
        }
      } catch (error) {
        console.log('[RideTracking] Socket not available, polling only');
      }
    };

    initSocket();

    // Listen for task status updates (if socket connects - secondary)
    // Fixed: match server event name 'task:status:update'
    const unsubscribeStatus = socketService.on('task:status:update', (data: { taskId: string; status: string }) => {
      if (data.taskId === params.taskId) {
        lastUpdateTimestamp.current = Date.now(); // Mark socket update as most recent
        updateTaskStatus(data.taskId, data.status);
        setTask(prev => prev ? { ...prev, status: data.status as TaskStatus } : null);

        if (data.status === 'COMPLETED') {
          // Fetch the full task (final fare, waiting charge, driver) and go
          // straight to the trip summary. We must NOT call pollTaskStatus()
          // here: we set lastUpdateTimestamp above, so it would early-return on
          // its 5s skip-guard, and we also just set status to COMPLETED, so its
          // change-detection would see "no change" — both would strand the
          // customer on the tracking sheet. Fetch + complete directly instead.
          api.getTask(params.taskId)
            .then((res) => {
              if (res.success && res.data) {
                handleRideCompleted(res.data as Task);
              } else {
                handleRideCompleted({ ...(taskRef.current as Task), status: 'COMPLETED' as TaskStatus });
              }
            })
            .catch(() => {
              handleRideCompleted({ ...(taskRef.current as Task), status: 'COMPLETED' as TaskStatus });
            });
        }
      }
    });

    // Listen for driver location updates (if socket connects - secondary)
    // Fixed: match server event name 'rider:location:update'
    const unsubscribeLocation = socketService.on('rider:location:update', (data: { latitude: number; longitude: number; heading?: number; driverId?: string }) => {
      // Accept location updates for this task's driver
      lastUpdateTimestamp.current = Date.now(); // Mark socket update as most recent
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
      });
    });

    // Listen for task cancellation (if socket connects - secondary)
    const unsubscribeCancel = socketService.on('task:cancelled', (data: { taskId: string; reason: string }) => {
      if (data.taskId === params.taskId) {
        stopPolling();
        // If the system cancelled while we were still searching (no rider ever
        // assigned), keep the customer here and show the branded "no riders"
        // failure card instead of silently bouncing them home. They can Try
        // Again / Change Ride Type / Cancel from there.
        if (taskRef.current && !taskRef.current.riderId) {
          setSearchFailed(true);
          return;
        }
        clearPendingTask();
        Alert.alert('Ride Cancelled', data.reason);
        router.replace('/(tabs)');
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeLocation();
      unsubscribeCancel();
      stopPolling();
      if (params.taskId) {
        socketService.leaveTaskRoom(params.taskId);
      }
    };
  }, [params.taskId]);

  const loadTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getTask(taskId);
      if (response.success && response.data) {
        setTask(response.data);
        setCurrentTask(response.data);
        if (response.data.rider?.currentLatitude && response.data.rider?.currentLongitude) {
          setDriverLocation({
            latitude: response.data.rider.currentLatitude,
            longitude: response.data.rider.currentLongitude,
          });
        }
      } else {
        Alert.alert('Error', 'Failed to load ride details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // Opens the branded confirm dialog (no more bare system Alert).
  const handleCancel = () => setShowCancelConfirm(true);

  const doCancel = async () => {
    if (!task) return;
    setIsCancelling(true);
    try {
      const response = await api.cancelTask(task.id, 'Cancelled by user');
      if (response.success) {
        setShowCancelConfirm(false);
        router.replace('/(tabs)');
      } else {
        setShowCancelConfirm(false);
        Alert.alert('Error', response.error || 'Failed to cancel ride');
      }
    } catch (error) {
      setShowCancelConfirm(false);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsCancelling(false);
    }
  };

  // Conversation id convention shared with the call/chat screens: conv-<taskId>
  const conversationId = task ? `conv-${task.id}` : undefined;

  // In-app internet call (Agora). NOTE: we deliberately pass NO phone number —
  // the call screen falls back to VoIP only, so personal numbers stay private.
  const handleCallDriver = () => {
    if (task?.riderId && conversationId) {
      router.push(
        `/call/${task.riderId}?name=${encodeURIComponent(firstName(task.rider?.fullName, 'Driver'))}&conversationId=${conversationId}`
      );
    } else {
      Alert.alert('Driver Unavailable', 'No driver has been assigned yet.');
    }
  };

  const handleChatDriver = () => {
    if (task?.riderId && conversationId) {
      router.push(`/chat/${conversationId}` as any);
    } else {
      Alert.alert('Chat Unavailable', 'No driver has been assigned yet.');
    }
  };

  const handleQuickReply = useCallback(async (message: string) => {
    if (!conversationId || !task?.riderId) {
      Alert.alert('Chat Unavailable', 'No driver has been assigned yet.');
      return;
    }
    setSentQuickReply(message);
    try {
      await sendChatMessage(conversationId, { content: message, type: 'TEXT' });
    } catch (e) {
      console.warn('[RideTracking] Quick reply failed:', e);
    }
    // Clear the "sent" affordance after a short beat
    setTimeout(() => setSentQuickReply(null), 2500);
  }, [conversationId, task?.riderId, sendChatMessage]);

  const handleSOS = async () => {
    Alert.alert(
      'SOS Emergency',
      'This will alert our emergency response team. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SOS',
          style: 'destructive',
          onPress: async () => {
            if (task?.pickupLatitude && task?.pickupLongitude) {
              await api.triggerSOS({
                latitude: task.pickupLatitude,
                longitude: task.pickupLongitude,
                taskId: task.id,
                emergencyType: 'RIDER_SOS',
              });
              Alert.alert('SOS Sent', 'Emergency team has been notified');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // LIVE ROUTE + ETA (traffic-aware, never hardcoded)
  // ============================================
  const pickupCoord: Coord | null = task?.pickupLatitude && task?.pickupLongitude
    ? { latitude: task.pickupLatitude, longitude: task.pickupLongitude }
    : null;
  const dropoffCoord: Coord | null = task?.dropoffLatitude && task?.dropoffLongitude
    ? { latitude: task.dropoffLatitude, longitude: task.dropoffLongitude }
    : null;

  const beforePickup = task ? isBeforePickup(task.status) : true;
  const isCarRide = task?.taskType === 'SMART_CAR_RIDE';

  // Which leg are we routing?  driver→pickup (before boarding) or driver→dropoff
  // (en route). If no driver location yet, show the pickup→dropoff overview.
  const routeOrigin: Coord | null = driverLocation
    ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
    : pickupCoord;
  const routeTarget: Coord | null = driverLocation
    ? (beforePickup ? pickupCoord : dropoffCoord)
    : dropoffCoord;

  const liveRoute = useLiveRoute(routeOrigin, routeTarget, isCarRide ? 20 : 24);

  // Keep a ref of the latest task so socket callbacks (registered once) can read
  // current values without stale closures.
  useEffect(() => { taskRef.current = task; }, [task]);

  // SLA guard: once the task is searching (no rider yet), start a 120s window.
  // On expiry (or a backend FAILED terminal) the customer sees a clear failure
  // instead of an endless "searching" spinner.
  useEffect(() => {
    const searching = !!task && !task.riderId && SEARCHING_STATES.has(task.status);
    if (!searching) { searchStartRef.current = null; return; }
    if (searchStartRef.current == null) {
      searchStartRef.current = task?.createdAt ? new Date(task.createdAt).getTime() : Date.now();
    }
    const check = () => {
      if (searchStartRef.current != null && Date.now() - searchStartRef.current >= MAX_SEARCH_MS) setSearchFailed(true);
    };
    check();
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, [task?.status, task?.riderId, task?.createdAt]);

  const handleTryAgain = () => { searchStartRef.current = Date.now(); setSearchFailed(false); };
  const handleChangeRideType = async () => {
    try { if (task && !task.riderId) await api.cancelTask(task.id, 'Changing ride type'); } catch { /* best effort */ }
    router.replace('/rider/ride-request');
  };
  const handleCancelSearch = async () => {
    try { if (task) await api.cancelTask(task.id, 'Cancelled — no riders available'); } catch { /* best effort */ }
    router.replace('/(tabs)');
  };

  // Map-archetype loading skeleton: the panel's shape is already visible, so
  // arrival doesn't shift the layout.
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.mapWorkspace} />
        <View style={styles.panel}>
          <View style={styles.grabberWrap}><View style={styles.grabber} /></View>
          <View style={styles.panelContent}>
            <Skeleton width="52%" height={20} borderRadius={RADIUS.sm} />
            <Skeleton width="100%" height={72} borderRadius={RADIUS.lg} style={styles.skeletonGap} />
            <Skeleton width="100%" height={96} borderRadius={RADIUS.lg} style={styles.skeletonGap} />
          </View>
        </View>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState
          title="No active ride found"
          subtitle="This ride is no longer available."
          retryLabel="Go Home"
          onRetry={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  // No-drivers failure state (SLA expired or backend gave up) — never a dead
  // spinner. A terminal status while still on this screen with no rider ever
  // assigned means the system gave up (user-initiated cancels navigate away),
  // so surface the branded retry card in that case too.
  const NO_SERVICE_STATES = ['FAILED', 'EXPIRED', 'CANCELLED'];
  if (!task.riderId && (searchFailed || NO_SERVICE_STATES.includes(task.status))) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState
          title="No nearby riders available"
          subtitle="We couldn't find a rider for your trip right now. Try again, change your ride type, or cancel."
          retryLabel="Try Again"
          onRetry={handleTryAgain}
        />
        <View style={styles.stateActions}>
          <GradientButton
            title="Change Ride Type"
            onPress={handleChangeRideType}
            variant="outline"
            size="md"
            fullWidth
          />
          <GradientButton
            title="Cancel"
            onPress={handleCancelSearch}
            variant="danger"
            size="md"
            fullWidth
          />
        </View>
      </View>
    );
  }

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;

  // Driver-derived display values (privacy-safe)
  const rider: any = task.rider || {};
  const driverAvatarUrl: string | undefined = rider.avatarUrl || rider.photoUrl || rider.user?.avatarUrl;
  const vehicleText = vehicleSummary(rider.vehicle);
  const maskedPlate = rider.vehicle?.plateNumber ? maskPlate(rider.vehicle.plateNumber) : null;
  const hasDriver = !!task.riderId;

  // ETA hero text
  const isArrived = task.status === 'ARRIVED';
  const isInTransit = ['PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT'].includes(task.status);
  const isSettled = ['COMPLETED', 'CANCELLED', 'FAILED', 'DELIVERED'].includes(task.status);
  const etaValue = formatEta(liveRoute.durationMin);
  const etaLabel = !hasDriver
    ? 'Estimated trip time'
    : isArrived
      ? 'Your driver is here'
      : beforePickup
        ? 'Driver arriving in'
        : 'Arriving at destination in';
  // Don't show a stale countdown once the ride is settled; when the driver has
  // arrived, show a static "at your pickup" line instead of a ticking ETA.
  const showEta = !isSettled && (isArrived || liveRoute.durationMin != null || liveRoute.loading);

  // Ride progress as the shared stepper. One step per phase the customer cares
  // about; the backend's many statuses collapse onto these four.
  const phaseIndex = !hasDriver ? 0
    : isArrived ? 2
    : isInTransit ? 3
    : 1; // driver assigned and en route to pickup
  const timelineSteps: TimelineStep[] = [
    { id: 'matched', label: 'Rider matched', icon: 'search' },
    { id: 'enroute', label: 'On the way to you', icon: 'navigate' },
    { id: 'arrived', label: 'Arrived at pickup', icon: 'location' },
    { id: 'transit', label: 'On the way to destination', icon: 'flag' },
  ].map((s, i) => ({
    ...s,
    status: i < phaseIndex ? 'completed' : i === phaseIndex ? 'active' : 'pending',
  })) as TimelineStep[];

  return (
    <View style={styles.container}>
      {/* ─── Live map workspace ────────────────────────── */}
      <View style={styles.mapWorkspace}>
        <SmartRideMap
          style={StyleSheet.absoluteFill}
          initialLatitude={driverLocation?.latitude || task.pickupLatitude || 0.3476}
          initialLongitude={driverLocation?.longitude || task.pickupLongitude || 32.5825}
          pickup={pickupCoord ? { ...pickupCoord, title: 'Pickup' } : undefined}
          dropoff={dropoffCoord ? { ...dropoffCoord, title: 'Destination' } : undefined}
          driverLocation={driverLocation || undefined}
          driverKind={isCarRide ? 'car' : 'boda'}
          routeCoordinates={liveRoute.routeCoordinates}
          showUserLocation
        />

        <AppHeader
          title={statusLabel}
          onBack={() => router.replace('/(tabs)')}
          style={styles.headerOverlay}
        />
      </View>

      {/* ─── Operations panel ──────────────────────────── */}
      <ResizablePanel initialSnap="half">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Status + reference */}
          <View style={styles.statusRow}>
            <View style={{ flex: 1 }}>
              <StatusBadge label={statusLabel} color={statusColor} size="md" />
              <Text style={styles.taskNumber}>{task.taskNumber}</Text>
            </View>
          </View>

          {/* Live ETA */}
          {showEta && (
            <Card variant="accent" padding={SPACING.md} radius={RADIUS.xl} style={styles.etaCard}>
              <View style={styles.etaRow}>
                <View style={styles.etaIconWrap}>
                  <Ionicons name="time" size={ICON.md} color={COLORS.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etaLabel}>{etaLabel}</Text>
                  {isArrived ? (
                    <Text style={styles.etaValue}>At your pickup point</Text>
                  ) : liveRoute.loading && liveRoute.durationMin == null ? (
                    <Text style={styles.etaValue}>Calculating…</Text>
                  ) : (
                    <Text style={styles.etaValue}>
                      {etaValue}
                      {liveRoute.distanceKm != null && (
                        <Text style={styles.etaDistance}>  ·  {liveRoute.distanceKm.toFixed(1)} km</Text>
                      )}
                    </Text>
                  )}
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Ride progress (shared stepper) */}
          {!isSettled && (
            <Card variant="flat" padding={SPACING.md} radius={RADIUS.xl} style={styles.timelineCard}>
              <RideTimeline steps={timelineSteps} />
            </Card>
          )}

          {/* Driver */}
          {hasDriver && (
            <Card variant="raised" padding={SPACING.md} radius={RADIUS.xl} style={styles.driverCard}>
              <View style={styles.driverRow}>
                <Avatar uri={driverAvatarUrl} name={rider.fullName} size="lg" />
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{firstName(rider.fullName, 'Driver')}</Text>
                  <View style={styles.driverMetaRow}>
                    <Rating value={rider.rating} count={(rider as any).ratingCount} />
                    <Text style={styles.driverTripsSeparator}>•</Text>
                    <Text style={styles.driverTrips}>{rider.totalTrips ?? 0} trips</Text>
                  </View>
                  {(vehicleText || maskedPlate) && (
                    <View style={styles.vehicleRow}>
                      <Ionicons
                        name={isCarRide ? 'car' : 'bicycle'}
                        size={ICON.xs}
                        color={COLORS.onSurfaceVariant}
                      />
                      {!!vehicleText && (
                        <Text style={styles.vehicleText} numberOfLines={1}>{vehicleText}</Text>
                      )}
                      {!!maskedPlate && (
                        <View style={styles.plateChip}>
                          <Text style={styles.plateText}>{maskedPlate}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Contact actions */}
              <View style={styles.contactRow}>
                <GradientButton
                  title="Call"
                  onPress={handleCallDriver}
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  style={styles.contactButton}
                  icon={<Ionicons name="call" size={ICON.sm} color={COLORS.onPrimary} />}
                />
                <GradientButton
                  title="Chat"
                  onPress={handleChatDriver}
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  style={styles.contactButton}
                  icon={<Ionicons name="chatbubble-ellipses" size={ICON.sm} color={COLORS.primary} />}
                />
              </View>
            </Card>
          )}

          {/* Quick replies (privacy-safe canned messages) */}
          {hasDriver && (
            <View style={styles.quickReplySection}>
              <Text style={styles.quickReplyHeading}>Quick messages</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickReplyRow}
              >
                {RIDE_QUICK_REPLIES.map((msg) => {
                  const isSent = sentQuickReply === msg;
                  return (
                    <Chip
                      key={msg}
                      label={isSent ? 'Sent' : msg}
                      icon={isSent ? 'checkmark-circle' : 'chatbox-ellipses-outline'}
                      active={isSent}
                      onPress={isSent ? undefined : () => handleQuickReply(msg)}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Route + fare */}
          <Card variant="flat" padding={SPACING.md} radius={RADIUS.xl} style={styles.routeCard}>
            <View style={styles.routeSection}>
              <View style={styles.routePoint}>
                <View style={styles.routeDotSecondary} />
                <Text style={styles.routePointLabel}>Pickup</Text>
              </View>
              <Text style={styles.routePointAddress} numberOfLines={1}>{task.pickupAddress}</Text>
            </View>
            <View style={styles.routeSection}>
              <View style={styles.routePoint}>
                <View style={styles.routeDotPrimary} />
                <Text style={styles.routePointLabel}>Destination</Text>
              </View>
              <Text style={styles.routePointAddress} numberOfLines={1}>{task.dropoffAddress}</Text>
            </View>

            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>
                UGX {(task.totalAmount ?? 0).toLocaleString()}
              </Text>
            </View>
          </Card>

          {/* Privacy note */}
          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed" size={ICON.xs} color={COLORS.onSurfaceVariant} />
            <Text style={styles.privacyText}>
              Your contact details stay private. Chat &amp; calls are in-app only.
            </Text>
          </View>

          {/* Actions */}
          {/* Once the ride is in transit (passenger aboard) it can no longer be
              cancelled — the backend rejects it too. Hide the Cancel button and
              surface SOS as the only escalation path, with a short explainer. */}
          {isInTransit ? (
            <View>
              <GradientButton
                title="SOS"
                onPress={handleSOS}
                variant="danger"
                size="md"
                fullWidth
                icon={<Ionicons name="warning" size={ICON.sm} color={COLORS.onError} />}
              />
              <View style={styles.privacyNote}>
                <Ionicons name="information-circle" size={ICON.xs} color={COLORS.onSurfaceVariant} />
                <Text style={styles.privacyText}>
                  Your ride is in progress and can no longer be cancelled. Tap SOS if you need help.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <GradientButton
                title={isCancelling ? 'Cancelling...' : 'Cancel Ride'}
                onPress={handleCancel}
                variant="secondary"
                size="md"
                fullWidth={false}
                style={styles.actionButton}
                loading={isCancelling}
                disabled={isCancelling || task.status === 'COMPLETED'}
              />
              <GradientButton
                title="SOS"
                onPress={handleSOS}
                variant="danger"
                size="md"
                fullWidth={false}
                style={styles.actionButton}
                icon={<Ionicons name="warning" size={ICON.sm} color={COLORS.onError} />}
              />
            </View>
          )}
        </ScrollView>
      </ResizablePanel>

      <ConfirmDialog
        visible={showCancelConfirm}
        icon="close-circle-outline"
        destructive
        title="Cancel Ride"
        message="Are you sure you want to cancel this ride?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No"
        loading={isCancelling}
        onConfirm={doCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </View>
  );
}

// ============================================
// STYLES — layout + domain content only.
// Surfaces, buttons, avatars, ratings, badges, chips, the stepper and the
// state views all come from the Design System.
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Full-screen state screens (loading / no ride / no riders)
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  stateActions: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  skeletonGap: {
    marginTop: SPACING.md,
  },

  // Map workspace (AR-3)
  mapWorkspace: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // Operations panel (rounded-26 + grabber, matching SmartBottomSheet)
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '68%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    ...SHADOWS.active,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
  },
  scrollView: {
    flexGrow: 0,
  },
  panelContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  taskNumber: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  // Live ETA
  etaCard: {
    marginBottom: SPACING.gutter,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  etaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  etaValue: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  etaDistance: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  liveText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Ride progress
  timelineCard: {
    marginBottom: SPACING.gutter,
  },

  // Driver
  driverCard: {
    marginBottom: SPACING.gutter,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  driverInfo: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  driverTripsSeparator: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
  },
  driverTrips: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  vehicleText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flexShrink: 1,
  },
  plateChip: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.borderLight,
  },
  plateText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  contactButton: {
    flex: 1,
  },

  // Quick replies
  quickReplySection: {
    marginBottom: SPACING.gutter,
  },
  quickReplyHeading: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  quickReplyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },

  // Route + fare
  routeCard: {
    marginBottom: SPACING.gutter,
  },
  routeSection: {
    marginBottom: SPACING.gutter,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeDotSecondary: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondaryFixed,
  },
  routeDotPrimary: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routePointLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  routePointAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
    marginTop: SPACING.xs,
    marginLeft: 18,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: BORDER.hairline,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: SPACING.gutter,
  },
  fareLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  fareAmount: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.gutter,
    paddingHorizontal: SPACING.xs,
  },
  privacyText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
});