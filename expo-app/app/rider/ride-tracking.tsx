// ============================================
// SMART RIDE MOBILE - RIDE TRACKING SCREEN
// ============================================
// Premium dark theme with vector icons
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
  Platform,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
// Conditional import for web compatibility
const MapView = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps').MapView
  : require('react-native-maps').default;
const { Marker, Polyline } = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps')
  : require('react-native-maps');
import { useTaskStore, useAuthStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/src/constants';
import { Task, TaskStatus } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

// Polling intervals (in ms)
const POLL_INTERVAL_FAST = 3000;
const POLL_INTERVAL_SLOW = 10000;

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
  
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketConnectedRef = useRef(false);

  const pollTaskStatus = async () => {
    if (!params.taskId) return;
    
    try {
      const response = await api.getTask(params.taskId);
      if (response.success && response.data) {
        const updatedTask = response.data;
        
        setTask(prev => {
          if (prev && prev.status !== updatedTask.status) {
            updateTaskStatus(params.taskId, updatedTask.status);
            
            if (updatedTask.status === 'COMPLETED') {
              handleRideCompleted(updatedTask);
            }
          }
          return updatedTask;
        });
        
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

  const handleRideCompleted = (completedTask: Task) => {
    stopPolling();
    clearPendingTask();
    
    const paymentDetails = (completedTask as any).paymentDetails || {
      fare: completedTask.totalAmount,
      currency: 'UGX',
      paymentMethod: completedTask.paymentMethod || 'CASH',
      paymentStatus: 'PENDING',
    };
    
    const paymentMethodLabel: Record<string, string> = {
      'CASH': 'Cash',
      'MTN_MOMO': 'MTN MoMo',
      'AIRTEL_MONEY': 'Airtel Money',
      'VISA': 'Visa',
      'MASTERCARD': 'Mastercard',
    };
    
    Alert.alert(
      'Ride Completed!',
      `Total Fare: ${paymentDetails.currency} ${paymentDetails.fare?.toLocaleString() || 'N/A'}\n\nPayment Method: ${paymentMethodLabel[paymentDetails.paymentMethod] || paymentDetails.paymentMethod}\n\n${paymentDetails.paymentMethod === 'CASH' ? 'Please pay the driver in cash.' : 'Payment will be processed automatically.'}`,
      [
        {
          text: 'Rate Driver',
          onPress: () => router.replace('/(tabs)'),
        },
        {
          text: 'Done',
          style: 'default',
          onPress: () => router.replace('/(tabs)'),
        },
      ],
      { cancelable: false }
    );
  };

  const startPolling = (interval: number = POLL_INTERVAL_FAST) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(pollTaskStatus, interval);
    console.log('[RideTracking] Started polling with interval:', interval);
  };

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

    startPolling();
    console.log('[RideTracking] Polling started as primary update mechanism');

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

    const unsubscribeStatus = socketService.on('task:status', (data: { taskId: string; status: string }) => {
      if (data.taskId === params.taskId) {
        updateTaskStatus(data.taskId, data.status);
        setTask(prev => prev ? { ...prev, status: data.status as TaskStatus } : null);
        
        if (data.status === 'COMPLETED') {
          pollTaskStatus();
        }
      }
    });

    const unsubscribeLocation = socketService.on('location:update', (data: { riderId: string; latitude: number; longitude: number; heading?: number }) => {
      if (task?.riderId === data.riderId) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        });
      }
    });

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
      <View style={styles.emptyContainer}>
        <Icon name="car" size="2xl" color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No active ride found</Text>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const rideTypeIcon = task.taskType.includes('BODA') ? 'navigation' : 'car';
  const rideTypeColor = task.taskType.includes('BODA') ? IconColors.primary : IconColors.accent;

  const region = {
    latitude: task.pickupLatitude || 0.3476,
    longitude: task.pickupLongitude || 32.5825,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={{
            latitude: task.pickupLatitude || 0.3476,
            longitude: task.pickupLongitude || 32.5825,
          }}
          title="Pickup"
          pinColor={COLORS.secondary}
        />

        {/* Dropoff Marker */}
        {task.dropoffLatitude && task.dropoffLongitude && (
          <Marker
            coordinate={{
              latitude: task.dropoffLatitude,
              longitude: task.dropoffLongitude,
            }}
            title="Dropoff"
            pinColor={COLORS.primary}
          />
        )}

        {/* Driver Location */}
        {driverLocation && (
          <Marker
            coordinate={{
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }}
            title="Driver"
          >
            <View style={[styles.driverMarker, { backgroundColor: rideTypeColor }]}>
              <Icon name={rideTypeIcon} size="md" color={COLORS.background} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Status Card */}
      <View style={styles.statusCard}>
        {/* Status */}
        <Animated.View entering={FadeInUp.duration(400).springify()} style={styles.statusHeader}>
          <View>
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>
            <Text style={styles.taskNumber}>
              {task.taskNumber}
            </Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}>
            <ActivityIndicator size="small" color={statusColor} />
          </View>
        </Animated.View>

        {/* Driver Info */}
        {task.rider && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>
                {task.rider.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'D'}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{task.rider.fullName}</Text>
              <View style={styles.driverStats}>
                <Icon name="star" size="xs" color="#FBBF24" />
                <Text style={styles.driverRating}>{task.rider.rating.toFixed(1)}</Text>
                <Text style={styles.driverDot}>•</Text>
                <Text style={styles.driverTrips}>{task.rider.totalTrips} trips</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={handleCallDriver}
              activeOpacity={0.8}
            >
              <Icon name="phone" size="md" color={COLORS.background} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Route Info */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
            <View>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>{task.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
            <View>
              <Text style={styles.routeLabel}>Dropoff</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>{task.dropoffAddress}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Fare */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.fareRow}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>
            UGX {task.totalAmount.toLocaleString()}
          </Text>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isCancelling || task.status === 'COMPLETED'}
            activeOpacity={0.8}
          >
            <Icon name="x" size="sm" color="#F43F5E" />
            <Text style={styles.cancelButtonText}>
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOS}
            activeOpacity={0.8}
          >
            <Icon name="alert-circle" size="sm" color={COLORS.background} />
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 16,
  },
  homeButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  homeButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.backgroundElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskNumber: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInitials: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  driverRating: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  driverDot: {
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  driverTrips: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSection: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  routeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  routeAddress: {
    color: COLORS.text,
    fontSize: 14,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fareLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  fareAmount: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  cancelButtonText: {
    color: '#F43F5E',
    fontWeight: '600',
    marginLeft: 6,
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F43F5E',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sosButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: 6,
  },
});
