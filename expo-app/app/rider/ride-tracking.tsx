// ============================================
// SMART RIDE MOBILE - RIDE TRACKING SCREEN
// FIXED: Added polling fallback for when socket fails
// ============================================

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { useTaskStore, useAuthStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { Task, TaskStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

// Polling intervals (in ms)
const POLL_INTERVAL_FAST = 3000;  // 3 seconds for active rides
const POLL_INTERVAL_SLOW = 10000; // 10 seconds for searching/matching

export default function RideTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const { pendingTask, setCurrentTask, updateTaskStatus, clearPendingTask } = useTaskStore();
  const { user, accessToken } = useAuthStore();

  const [task, setTask] = useState<Task | null>(pendingTask);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
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
          return updatedTask;
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

  // Handle ride completion - show fare summary + rating prompt
  const handleRideCompleted = (completedTask: Task) => {
    // Stop polling immediately
    stopPolling();
    
    // Clear pending task
    clearPendingTask();
    
    // Extract payment details
    const paymentDetails = (completedTask as any).paymentDetails || {
      fare: completedTask.totalAmount,
      currency: 'UGX',
      paymentMethod: completedTask.paymentMethod || 'CASH',
      paymentStatus: 'PENDING',
    };
    
    // Format payment method for display
    const paymentMethodLabel: Record<string, string> = {
      'CASH': 'Cash',
      'MTN_MOMO': 'MTN MoMo',
      'AIRTEL_MONEY': 'Airtel Money',
      'VISA': 'Visa',
      'MASTERCARD': 'Mastercard',
    };

    const displayMethod = paymentMethodLabel[paymentDetails.paymentMethod ?? 'CASH'] ?? paymentDetails.paymentMethod ?? 'Cash';
    const fareDisplay = paymentDetails.fare?.toLocaleString() ?? completedTask.totalAmount?.toLocaleString() ?? 'N/A';
    
    const submitRating = async (stars: number) => {
      if (completedTask.id) {
        try {
          await api.rateTask(completedTask.id, stars);
        } catch (e) {
          console.error('Rating failed:', e);
        }
      }
      router.replace('/(tabs)');
    };

    // Show completion alert with star-rating buttons
    Alert.alert(
      'Ride Completed!',
      `Total Fare: UGX ${fareDisplay}\nPayment: ${displayMethod}\n\n${paymentDetails.paymentMethod === 'CASH' ? 'Please pay the driver in cash.' : 'Payment will be processed automatically.'}`,
      [
        { text: '★★★★★ (5 stars)', onPress: () => submitRating(5) },
        { text: '★★★★ (4 stars)', onPress: () => submitRating(4) },
        { text: '★★★ (3 stars)', onPress: () => submitRating(3) },
        { text: 'Skip', style: 'cancel', onPress: () => router.replace('/(tabs)') },
      ],
      { cancelable: false }
    );
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

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!task) return;
            
            setIsCancelling(true);
            try {
              const response = await api.cancelTask(task.id, 'Cancelled by user');
              if (response.success) {
                router.replace('/(tabs)');
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel ride');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleCallDriver = () => {
    if (task?.rider?.phone) {
      Linking.openURL(`tel:${task.rider.phone}`);
    }
  };

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

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;

  return (
    <View style={styles.container}>
      {/* Map */}
      <SmartRideMap
        style={{ flex: 1 }}
        initialLatitude={task.pickupLatitude || 0.3476}
        initialLongitude={task.pickupLongitude || 32.5825}
        pickup={
          task.pickupLatitude
            ? { latitude: task.pickupLatitude, longitude: task.pickupLongitude || 32.5825, title: 'Pickup' }
            : undefined
        }
        dropoff={
          task.dropoffLatitude && task.dropoffLongitude
            ? { latitude: task.dropoffLatitude, longitude: task.dropoffLongitude, title: 'Dropoff' }
            : undefined
        }
        driverLocation={driverLocation || undefined}
        showUserLocation
      />

      {/* Status Card */}
      <View style={styles.statusCard}>
        {/* Status */}
        <View style={styles.statusRow}>
          <View>
            <Text 
              style={[styles.statusLabel, { color: statusColor }]}
            >
              {statusLabel}
            </Text>
            <Text style={styles.taskNumber}>
              {task.taskNumber}
            </Text>
          </View>
          <View 
            style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}
          >
            <ActivityIndicator size="small" color={statusColor} />
          </View>
        </View>

        {/* Driver Info */}
        {task.rider && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={24} color={COLORS.onSurfaceVariant} />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{task.rider.fullName}</Text>
              <View style={styles.driverRatingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRating}>{(task.rider?.rating ?? 0).toFixed(1)}</Text>
                <Text style={styles.driverTripsSeparator}>•</Text>
                <Text style={styles.driverTrips}>{task.rider.totalTrips} trips</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallDriver}
            >
              <Ionicons name="call-outline" size={20} color={COLORS.onPrimary} />
            </TouchableOpacity>
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
            <Text style={styles.routePointLabel}>Dropoff</Text>
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
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOS}
          >
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    ...SHADOWS.active,
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
  driverAvatarEmoji: {
    fontSize: 24,
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
  },
  driverRatingStar: {
    ...TYPOGRAPHY.bodySm,
    marginRight: SPACING.xs,
  },
  driverRating: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
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
  callButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  sosButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onError,
    fontWeight: '600',
  },
});
