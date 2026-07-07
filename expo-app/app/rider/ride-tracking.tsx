// ============================================
// SMART RIDE MOBILE - RIDE TRACKING SCREEN
// ============================================
// Real-time ride experience:
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
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useTaskStore, useAuthStore } from '@/src/store';
import { useChatStore } from '@/src/store/chatStore';
import { api, socketService } from '@/src/services';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
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
const POLL_INTERVAL_SLOW = 10000; // 10 seconds for searching/matching

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
  const { user, accessToken } = useAuthStore();
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
          // Fetch full task and handle completion
          pollTaskStatus();
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noRideText}>No active ride found</Text>
        <TouchableOpacity
          style={styles.goHomeButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.goHomeButtonText}>Go Home</Text>
        </TouchableOpacity>
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
      <View style={styles.loadingContainer}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: `${COLORS.error}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="car-outline" size={44} color={COLORS.error} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.onSurface, textAlign: 'center' }}>No nearby riders available</Text>
        <Text style={{ fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 28, lineHeight: 21 }}>
          We couldn&apos;t find a rider for your trip right now. Try again, change your ride type, or cancel.
        </Text>
        <TouchableOpacity onPress={handleTryAgain} activeOpacity={0.85}
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: RADIUS.lg, marginTop: 24 }}>
          <Ionicons name="refresh" size={18} color={COLORS.onPrimary} />
          <Text style={{ color: COLORS.onPrimary, fontWeight: '700' }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleChangeRideType} activeOpacity={0.85}
          style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.outline, marginTop: 12 }}>
          <Text style={{ color: COLORS.onSurface, fontWeight: '600' }}>Change Ride Type</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCancelSearch} style={{ padding: 12, marginTop: 8 }}>
          <Text style={{ color: COLORS.error, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
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
  const etaValue = formatEta(liveRoute.durationMin);
  const etaLabel = !hasDriver
    ? 'Estimated trip time'
    : beforePickup
      ? 'Driver arriving in'
      : 'Arriving at destination in';
  const showEta = liveRoute.durationMin != null || liveRoute.loading;

  return (
    <View style={styles.container}>
      {/* Map */}
      <SmartRideMap
        style={{ flex: 1 }}
        initialLatitude={driverLocation?.latitude || task.pickupLatitude || 0.3476}
        initialLongitude={driverLocation?.longitude || task.pickupLongitude || 32.5825}
        pickup={pickupCoord ? { ...pickupCoord, title: 'Pickup' } : undefined}
        dropoff={dropoffCoord ? { ...dropoffCoord, title: 'Destination' } : undefined}
        driverLocation={driverLocation || undefined}
        driverKind={isCarRide ? 'car' : 'boda'}
        routeCoordinates={liveRoute.routeCoordinates}
        showUserLocation
      />

      {/* Status Card (scrollable bottom sheet) */}
      <ScrollView
        style={styles.statusCard}
        contentContainerStyle={styles.statusCardContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Grab handle */}
        <View style={styles.grabHandle} />

        {/* Status + ETA hero */}
        <View style={styles.statusRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={styles.taskNumber}>{task.taskNumber}</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}>
            <ActivityIndicator size="small" color={statusColor} />
          </View>
        </View>

        {showEta && (
          <View style={styles.etaCard}>
            <View style={styles.etaIconWrap}>
              <Ionicons name="time" size={20} color={COLORS.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.etaLabel}>{etaLabel}</Text>
              {liveRoute.loading && liveRoute.durationMin == null ? (
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
        )}

        {/* Driver Info */}
        {hasDriver && (
          <View style={styles.driverCard}>
            {driverAvatarUrl ? (
              <Image source={{ uri: driverAvatarUrl }} style={styles.driverAvatarImg} />
            ) : (
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={COLORS.onSurfaceVariant} />
              </View>
            )}
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{firstName(rider.fullName, 'Driver')}</Text>
              <View style={styles.driverRatingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRating}>{(rider.rating ?? 0).toFixed(1)}</Text>
                <Text style={styles.driverTripsSeparator}>•</Text>
                <Text style={styles.driverTrips}>{rider.totalTrips ?? 0} trips</Text>
              </View>
              {(vehicleText || maskedPlate) && (
                <View style={styles.vehicleRow}>
                  <Ionicons
                    name={isCarRide ? 'car' : 'bicycle'}
                    size={13}
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
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={18} color={COLORS.onPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatButton} onPress={handleChatDriver}>
                <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
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
                  <TouchableOpacity
                    key={msg}
                    style={[styles.quickReplyChip, isSent && styles.quickReplyChipSent]}
                    onPress={() => handleQuickReply(msg)}
                    activeOpacity={0.7}
                    disabled={isSent}
                  >
                    <Ionicons
                      name={isSent ? 'checkmark-circle' : 'chatbox-ellipses-outline'}
                      size={14}
                      color={isSent ? COLORS.onPrimary : COLORS.primary}
                    />
                    <Text style={[styles.quickReplyText, isSent && styles.quickReplyTextSent]}>
                      {isSent ? 'Sent' : msg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Route Info */}
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

        {/* Fare */}
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>
            UGX {(task.totalAmount ?? 0).toLocaleString()}
          </Text>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={12} color={COLORS.onSurfaceVariant} />
          <Text style={styles.privacyText}>
            Your contact details stay private. Chat & calls are in-app only.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isCancelling || task.status === 'COMPLETED'}
          >
            <Text style={styles.cancelButtonText}>
              {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
            <Ionicons name="warning" size={16} color={COLORS.onError} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
  },
  noRideText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  goHomeButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  goHomeButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  // Status card (bottom sheet)
  statusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '64%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.active,
  },
  statusCardContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
    marginBottom: SPACING.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statusLabel: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: 'bold',
  },
  taskNumber: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ETA hero card
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  etaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onPrimaryContainer,
    fontWeight: '600',
  },
  etaValue: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onPrimaryContainer,
    fontWeight: 'bold',
  },
  etaDistance: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onPrimaryContainer,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: 0.5,
  },
  // Driver card
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  driverAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    marginRight: SPACING.md,
    backgroundColor: COLORS.surfaceContainer,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRating: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginLeft: SPACING.xs,
  },
  driverTripsSeparator: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outlineVariant,
    marginHorizontal: SPACING.sm,
  },
  driverTrips: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  vehicleText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flexShrink: 1,
  },
  plateChip: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: 1,
  },
  driverActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  callButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Quick replies
  quickReplySection: {
    marginBottom: SPACING.md,
  },
  quickReplyHeading: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  quickReplyRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.primaryFixed,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  quickReplyChipSent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickReplyText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickReplyTextSent: {
    color: COLORS.onPrimary,
  },
  // Route section
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  routeDotSecondary: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondaryFixedDim,
    marginRight: SPACING.sm,
  },
  routeDotPrimary: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  routePointLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  routePointAddress: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    flex: 1,
  },
  // Fare
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  fareLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  fareAmount: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  privacyText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.error,
    fontWeight: '600',
  },
  sosButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  sosButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onError,
    fontWeight: '600',
  },
});
