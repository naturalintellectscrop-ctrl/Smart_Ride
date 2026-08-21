// ============================================
// SMART RIDE MOBILE — DRIVER / PROVIDER IN-JOURNEY SCREEN
// ============================================
// The provider's single screen for the whole span between "assigned" and
// "settled", across all six service types.
//
// It has no lifecycle of its own. The primary action is whatever the SERVER says
// is legal next, read from `task.allowedTransitions` (published by
// GET /api/tasks/[id] from the same state machine POST /transition enforces).
//
// This replaces a pair of hardcoded flow maps that assumed every delivery ran
// ASSIGNED → ACCEPTED → ARRIVING → PICKED_UP → IN_TRANSIT → DELIVERING →
// DELIVERED. That is ITEM_DELIVERY's graph and no other: FOOD_DELIVERY,
// SHOPPING and SMART_HEALTH_DELIVERY have no ACCEPTED transition at all, so a
// food courier's very first tap died on
//   400 Invalid transition from ASSIGNED to ACCEPTED for task type FOOD_DELIVERY
// and the job could never be started. Asking the server removes the whole class
// of bug rather than patching one instance of it.
// ============================================

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking, Platform, Share } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import {
  JourneyShell,
  JourneyProgress,
  JourneyActions,
  JourneyBanner,
  JourneySecondaryAction,
  JourneyError,
  pickPrimaryTransition,
  requiresProof,
  canCancel,
  providerCopy,
  isRideType,
  isTerminal,
  translateTaskError,
} from '@/src/components/journey';
import { ProofOfDeliverySheet } from '@/src/components/ProofOfDeliverySheet';
import { useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { locationService } from '@/src/services/location.service';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Task, TaskStatus } from '@/src/types';
import { firstName } from '@/src/utils/formatName';
import { isWithinGeofence, ARRIVAL_RADIUS_M } from '@/src/utils/geofence';

/** Statuses during which the provider's position should be published. */
const TRACKED_STATUSES: TaskStatus[] = [
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'PICKED_UP',
  'IN_PROGRESS',
  'IN_TRANSIT',
  'DELIVERING',
];

export default function DriverTaskScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ taskId: string }>();
  const { latitude, longitude } = useLocationStore();

  const [task, setTask] = useState<Task | null>(null);
  // Always-latest task for async callbacks (socket handlers, late refreshes).
  const taskRef = useRef<Task | null>(null);
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProofSheet, setShowProofSheet] = useState(false);
  const [nearDestination, setNearDestination] = useState(false);
  /** Translated failure, shown in the panel rather than as a raw alert. */
  const [journeyError, setJourneyError] = useState<JourneyError | null>(null);
  const arrivalFiredRef = useRef<Set<string>>(new Set());

  const originLocation = useMemo(
    () => (latitude != null && longitude != null ? { latitude, longitude } : null),
    [latitude, longitude]
  );

  // ============================================
  // LOAD + REALTIME
  // ============================================

  const loadTask = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      try {
        const response = await api.getTask(taskId);
        if (response.success && response.data) {
          setTask(response.data);
          setJourneyError(null);
        } else if (!taskRef.current) {
          // Only hard-fail on the INITIAL load. A failed *refresh* — a late
          // socket event firing after we already navigated away — must not
          // bounce the provider out of a job they are still on.
          setJourneyError(translateTaskError(response.error, response.status));
        }
      } catch {
        if (!taskRef.current) {
          setJourneyError(translateTaskError('Network error'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!params.taskId) return;

    loadTask(params.taskId);
    socketService.connect().then(() => {
      socketService.joinTaskRoom(params.taskId);
    });

    const unsubscribe = socketService.on('task:status:update', (data: any) => {
      if (data.taskId !== params.taskId && data.taskId !== taskRef.current?.id) return;

      // A status arriving over realtime changes what is legal next, and
      // allowedTransitions only comes from the API. Patch the status for an
      // instant read, then refetch so the action row is never stale.
      setTask((prev) => (prev ? { ...prev, status: data.status } : prev));
      loadTask(params.taskId);

      if (data.status === 'CANCELLED') {
        Alert.alert('Job cancelled', 'This job was cancelled. You are free for the next offer.', [
          { text: 'OK', onPress: () => router.replace('/driver') },
        ]);
      } else if (data.status === 'FAILED') {
        Alert.alert(
          'Job could not be completed',
          'Support can tell you whether anything is owed on this job.',
          [{ text: 'OK', onPress: () => router.replace('/driver') }]
        );
      }
    });

    return () => {
      unsubscribe();
      if (params.taskId) socketService.leaveTaskRoom(params.taskId);
    };
  }, [params.taskId, loadTask, router]);

  // Publish position while the job is live; stop the moment it is not.
  useEffect(() => {
    if (task && TRACKED_STATUSES.includes(task.status)) {
      locationService.startTracking();
    } else {
      locationService.stopTracking();
    }
    return () => {
      locationService.stopTracking();
    };
  }, [task?.status]);

  // ============================================
  // ACTIONS
  // ============================================

  const updateStatus = useCallback(
    async (newStatus: TaskStatus) => {
      const current = taskRef.current;
      if (!current) return;

      setIsUpdating(true);
      setJourneyError(null);
      try {
        const result = await api.transitionTask(current.id, newStatus, {
          latitude,
          longitude,
        });
        if (result.success && result.data?.task) {
          // The transition response carries the task but not the recomputed
          // allowedTransitions, so refetch to get the next legal step.
          await loadTask(current.id);
        } else {
          setJourneyError(translateTaskError(result.error, result.status));
        }
      } catch {
        setJourneyError(translateTaskError('Network error'));
      } finally {
        setIsUpdating(false);
      }
    },
    [latitude, longitude, loadTask]
  );

  // Auto-arrival at pickup (rides only), and the near-destination hint.
  // Deliveries keep a manual pickup confirmation: arriving at a restaurant is
  // not the same as having the order in hand.
  useEffect(() => {
    if (!task) return;
    const watchStatuses: TaskStatus[] = ['ARRIVING', 'IN_PROGRESS', 'IN_TRANSIT'];
    if (!watchStatuses.includes(task.status)) {
      setNearDestination(false);
      return;
    }

    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 5000 },
        (loc) => {
          const t = taskRef.current;
          if (cancelled || !t) return;
          const here = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

          if (
            t.status === 'ARRIVING' &&
            isRideType(t.taskType) &&
            (t.allowedTransitions ?? []).includes('ARRIVED') &&
            t.pickupLatitude != null &&
            t.pickupLongitude != null
          ) {
            const atPickup = isWithinGeofence(
              here,
              { latitude: t.pickupLatitude, longitude: t.pickupLongitude },
              ARRIVAL_RADIUS_M
            );
            if (atPickup && !arrivalFiredRef.current.has(`pickup-${t.id}`)) {
              arrivalFiredRef.current.add(`pickup-${t.id}`);
              updateStatus('ARRIVED');
            }
          }

          const moving = t.status === 'IN_PROGRESS' || t.status === 'IN_TRANSIT';
          if (moving && t.dropoffLatitude != null && t.dropoffLongitude != null) {
            setNearDestination(
              isWithinGeofence(
                here,
                { latitude: t.dropoffLatitude, longitude: t.dropoffLongitude },
                ARRIVAL_RADIUS_M
              )
            );
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [task?.status, task?.id, updateStatus]);

  // ============================================
  // DERIVED — all of it from the server's own list
  // ============================================

  const nextStatus = task ? pickPrimaryTransition(task) : null;
  const proofGated = requiresProof(task?.taskType, nextStatus);
  const cancellable = task ? canCancel(task) : false;
  const copy = task ? providerCopy(task.status, task.taskType, nextStatus) : null;
  const terminal = task ? isTerminal(task.status) : false;

  const conversationId = task ? `conv-${task.id}` : undefined;

  const handlePrimary = () => {
    if (!task) return;
    // At the handover the next state is earned by proof, not by a tap. The
    // server refuses DELIVERED without evidence, so opening the sheet IS the
    // action here.
    if (proofGated) {
      setShowProofSheet(true);
      return;
    }
    if (nextStatus) updateStatus(nextStatus);
  };

  const handleProofAccepted = async () => {
    setShowProofSheet(false);
    await updateStatus('DELIVERED');
  };

  /**
   * DEV-6: giving back a job you have not started is DECLINING it, not
   * cancelling it.
   *
   * This always called the CANCELLED transition, which the state machine only
   * lets a driver make from IN_PROGRESS on a ride — deliberately, so a driver
   * cannot take an assignment and strand the customer with it. So the button
   * was guaranteed to fail from ASSIGNED, and it failed by showing a courier
   * the state machine's own vocabulary: "Actor 'RIDER' is not authorized to
   * transition from ASSIGNED to CANCELLED".
   *
   * The decline path already existed and had no caller. Before the job starts
   * it hands the task back to dispatch, which is what the driver meant; once
   * they are carrying it, cancelling is the honest word and the server decides
   * whether they may.
   */
  const handleCancel = () => {
    if (!task) return;

    const started = ['PICKED_UP', 'IN_TRANSIT', 'IN_PROGRESS', 'DELIVERING'].includes(task.status);

    Alert.alert(
      started ? 'Cancel this job?' : 'Give this job back?',
      started
        ? 'Cancelling a job you have started affects your reliability score.'
        : 'It goes back to dispatch for another courier. Declining too often affects your acceptance rate.',
      [
        { text: started ? 'Keep job' : 'Keep it', style: 'cancel' },
        {
          text: started ? 'Cancel job' : 'Give it back',
          style: 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            setJourneyError(null);
            try {
              const response = started
                ? await api.cancelTask(task.id, 'Cancelled by provider')
                : await api.declineTask(task.id);
              if (response.success) {
                router.replace('/driver');
              } else {
                setJourneyError(translateTaskError(response.error, response.status));
              }
            } catch {
              setJourneyError(translateTaskError('Network error'));
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  /** In-app voice call to the customer. */
  const callCustomer = () => {
    if (!task?.clientId || !conversationId) {
      Alert.alert('Not available yet', 'Customer contact is not available for this job.');
      return;
    }
    router.push(
      `/call/${task.clientId}?name=${encodeURIComponent(
        firstName(task.client?.name, 'Customer')
      )}&conversationId=${conversationId}&taskId=${task.id}`
    );
  };

  /** Dial the shop, restaurant or pharmacy being collected from. */
  const callPickup = () => {
    const phone = task?.pickupContactPhone;
    if (!phone) {
      Alert.alert(
        'No number on file',
        `${task?.pickupContactName || 'The pickup point'} has not given a contact number.`
      );
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Could not start the call', `Dial ${phone} from your phone instead.`)
    );
  };

  /**
   * Who the courier needs to reach depends on where they are in the job.
   *
   * Before pickup it is almost always the shop — the parcel is not ready, the
   * shutter is down, the courier cannot find the door. After pickup it is the
   * customer. Both were unreachable except the customer, so a courier stuck
   * outside a closed pharmacy had no way to ask anyone about it.
   */
  const handleCall = () => {
    const beforePickup = !!task && !['PICKED_UP', 'IN_TRANSIT', 'DELIVERING', 'DELIVERED', 'COMPLETED'].includes(task.status);
    const pickupLabel = task?.pickupContactName
      ? `Call ${task.pickupContactName}`
      : 'Call the pickup point';

    const options = [
      { text: pickupLabel, onPress: callPickup },
      { text: 'Call the customer', onPress: callCustomer },
      { text: 'Cancel', style: 'cancel' as const },
    ];
    // The likely party first, rather than making the courier read both.
    Alert.alert(
      'Who do you need?',
      beforePickup
        ? 'You have not collected this order yet.'
        : 'The order is with you.',
      beforePickup ? options : [options[1], options[0], options[2]]
    );
  };

  const handleChat = () => {
    if (!conversationId) return;
    router.push(`/chat/${conversationId}` as any);
  };

  const handleSOS = () => {
    if (!task) return;
    Alert.alert('SOS emergency', 'This alerts the Smart Ride emergency response team. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send SOS',
        style: 'destructive',
        onPress: async () => {
          // Prefer the provider's live position — an emergency needs where they
          // ARE, not where the job began. Pickup is the fallback.
          const lat = latitude ?? task.pickupLatitude;
          const lng = longitude ?? task.pickupLongitude;
          if (lat == null || lng == null) {
            Alert.alert(
              'Location unavailable',
              'Smart Ride needs your location to send an SOS. Enable location and try again.'
            );
            return;
          }
          const res = await api.triggerSOS({
            latitude: lat,
            longitude: lng,
            taskId: task.id,
            emergencyType: 'RIDER_SOS',
          });
          if (res.success) {
            Alert.alert('SOS sent', 'The emergency team has been notified and is responding.');
          } else {
            setJourneyError(translateTaskError(res.error, res.status));
          }
        },
      },
    ]);
  };

  const handleShareTrip = async () => {
    if (!task) return;
    try {
      await Share.share({
        message:
          `Smart Ride job ${task.taskNumber}\n` +
          `From: ${task.pickupAddress}\n` +
          `To: ${task.dropoffAddress}\n` +
          `Status: ${copy?.chip ?? task.status}`,
      });
    } catch {
      // The user dismissing the share sheet is not an error.
    }
  };

  const openNavigation = () => {
    if (!task) return;
    // Follow the live leg, never a fixed end of the job.
    const headingToPickup = ['ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED'].includes(task.status) ||
      (task.taskType === 'SHOPPING' && task.status === 'IN_PROGRESS');
    const destLat = headingToPickup ? task.pickupLatitude : task.dropoffLatitude;
    const destLng = headingToPickup ? task.pickupLongitude : task.dropoffLongitude;
    if (destLat == null || destLng == null) {
      Alert.alert('No coordinates', 'This job has no map location for that stop.');
      return;
    }
    const url = Platform.select({
      ios: `maps:?daddr=${destLat},${destLng}`,
      android: `geo:0,0?q=${destLat},${destLng}`,
    });
    Linking.openURL(url || `https://maps.google.com/?daddr=${destLat},${destLng}`);
  };

  const handleErrorAction = () => {
    if (!journeyError) return;
    switch (journeyError.action) {
      case 'REFRESH':
        if (params.taskId) loadTask(params.taskId);
        break;
      case 'LEAVE':
        router.replace('/driver');
        break;
      case 'RETRY':
        setJourneyError(null);
        if (proofGated) setShowProofSheet(true);
        else if (nextStatus) updateStatus(nextStatus);
        break;
      case 'SUPPORT':
        router.push('/help-center' as any);
        break;
      default:
        setJourneyError(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading && !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centeredText}>Loading job…</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <JourneyBanner
          error={journeyError}
          onAction={handleErrorAction}
          tone="error"
          title={journeyError ? undefined : 'Job not found'}
          message={journeyError ? undefined : 'This job could not be loaded.'}
          style={styles.centeredBanner}
        />
        <TouchableOpacity onPress={() => router.replace('/driver')} style={styles.centeredLink}>
          <Text style={styles.centeredLinkText}>Back to dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const secondary: JourneySecondaryAction[] = terminal
    ? []
    : [
        { id: 'nav', icon: 'compass-outline', label: 'Navigate', onPress: openNavigation },
        { id: 'call', icon: 'call-outline', label: 'Call', onPress: handleCall },
        { id: 'chat', icon: 'chatbubble-outline', label: 'Message', onPress: handleChat },
        { id: 'share', icon: 'share-outline', label: 'Share', onPress: handleShareTrip },
        { id: 'sos', icon: 'warning-outline', label: 'SOS', onPress: handleSOS, danger: true },
      ];

  // The near-destination hint must name the step that is actually next — it used
  // to say "complete the trip" to couriers whose next state was DELIVERING.
  const arrivalHint =
    nearDestination && !terminal
      ? `You have reached the destination — ${(copy?.actionLabel ?? 'continue').toLowerCase()}.`
      : null;

  // There is a primary action when the server offers a forward step, when proof
  // is the step, or when the job is done and earnings are the next thing to see.
  const hasForwardAction = !!nextStatus || proofGated;
  const primaryLabel = terminal || hasForwardAction ? copy?.actionLabel : undefined;
  // A finished delivery lands on the proof-and-handover record; a finished ride
  // has no proof to show, so it goes straight to settlement.
  const completionRoute = isRideType(task.taskType)
    ? `/driver/task-settlement?taskId=${task.id}`
    : `/delivery/task-complete?taskId=${task.id}`;
  const onPrimary = terminal
    ? () => router.replace(completionRoute as any)
    : hasForwardAction
      ? handlePrimary
      : undefined;

  const banner = journeyError ? (
    <JourneyBanner
      error={journeyError}
      onAction={handleErrorAction}
      onDismiss={journeyError.retrySafe ? () => setJourneyError(null) : undefined}
    />
  ) : arrivalHint ? (
    <JourneyBanner tone="success" title="At the destination" message={arrivalHint} icon="flag" />
  ) : null;

  return (
    <View style={styles.container}>
      <JourneyShell
        task={task}
        chip={copy?.chip ?? task.status}
        title={copy?.title ?? 'Job in progress'}
        subtitle={copy?.subtitle}
        originLocation={originLocation}
        headerTitle="Current job"
        onBack={() => router.replace('/driver')}
        banner={banner}
        actions={
          <JourneyActions
            primaryLabel={primaryLabel}
            onPrimaryPress={onPrimary}
            primaryLoading={isUpdating}
            primaryDisabled={isUpdating}
            // Only offered when the server lists CANCELLED as legal, so the
            // button can no longer be one that is guaranteed to fail.
            onCancelPress={cancellable && !terminal ? handleCancel : undefined}
            cancelLabel={
              ['PICKED_UP', 'IN_TRANSIT', 'IN_PROGRESS', 'DELIVERING'].includes(task?.status ?? '')
                ? 'Cancel'
                : 'Give back'
            }
            cancelDisabled={isUpdating}
            secondary={secondary}
          />
        }
      >
        {/* Customer */}
        <View style={styles.partyRow}>
          <View style={styles.partyAvatar}>
            <Ionicons name="person" size={ICON.md} color={COLORS.onSurfaceVariant} />
          </View>
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{firstName(task.client?.name, 'Customer')}</Text>
            <Text style={styles.partyMeta}>
              {isRideType(task.taskType) ? 'Passenger' : 'Recipient'}
            </Text>
          </View>
          <Text style={styles.fareAmount}>UGX {(task.totalAmount ?? 0).toLocaleString()}</Text>
        </View>

        {/* Progress trail */}
        <JourneyProgress task={task} />

        {/* Route.
            The PLACE first, then the address. A courier arriving at a parade of
            shops needs "Kyebando Pharmacy", not "Plot 1, Kampala" — the name is
            what is written above the door, and the address only narrows down
            which street to be on. Both flows already store the business name in
            pickupContactName; nothing was showing it. */}
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>Pickup</Text>
              {task.pickupContactName ? (
                <Text style={styles.routePlace} numberOfLines={1}>
                  {task.pickupContactName}
                </Text>
              ) : null}
              <Text style={styles.routeAddress}>{task.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>Drop-off</Text>
              {task.dropoffContactName ? (
                <Text style={styles.routePlace} numberOfLines={1}>
                  {task.dropoffContactName}
                </Text>
              ) : null}
              <Text style={styles.routeAddress}>{task.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Money. Payment METHOD is not payment STATE — a cash job is settled at
            handover, a gateway job is not settled by the trip ending. */}
        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>
            {task.paymentMethod === 'CASH' ? 'Collect in cash' : 'Paid via'} ·{' '}
            {task.paymentMethod}
          </Text>
          {task.riderEarnings != null && (
            <Text style={styles.moneyEarnings}>
              You earn UGX {Number(task.riderEarnings).toLocaleString()}
            </Text>
          )}
        </View>
      </JourneyShell>

      {/* The only route from the handover to a finished delivery. */}
      <ProofOfDeliverySheet
        visible={showProofSheet}
        taskId={task.id}
        dropoffAddress={task.dropoffAddress}
        onDismiss={() => setShowProofSheet(false)}
        onProofAccepted={handleProofAccepted}
      />
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.surface,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lg,
      gap: SPACING.md,
      backgroundColor: COLORS.surface,
    },
    centeredText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    centeredBanner: {
      alignSelf: 'stretch',
    },
    centeredLink: {
      paddingVertical: SPACING.sm,
    },
    centeredLinkText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.primary,
      fontWeight: '700',
    },

    partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      backgroundColor: COLORS.surfaceContainerLow,
      borderRadius: RADIUS.lg,
      padding: SPACING.gutter,
    },
    partyAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    partyInfo: {
      flex: 1,
    },
    partyName: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    partyMeta: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    fareAmount: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.secondary,
      fontWeight: '700',
    },

    routeBlock: {
      gap: 0,
    },
    routeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.gutter,
    },
    routeDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
    },
    routeText: {
      flex: 1,
    },
    routeLabel: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    routeAddress: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
      fontWeight: '500',
    },
    routePlace: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.onSurface,
      marginBottom: 1,
    },
    routeConnector: {
      marginLeft: 5,
      borderLeftWidth: 1,
      borderLeftColor: COLORS.outlineVariant,
      height: SPACING.md,
    },

    moneyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      paddingTop: SPACING.gutter,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
    },
    moneyLabel: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
      flex: 1,
    },
    moneyEarnings: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.primary,
      fontWeight: '700',
    },
  });
