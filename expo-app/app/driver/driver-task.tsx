// ============================================
// SMART RIDE MOBILE - DRIVER TASK SCREEN
// ============================================
// Dark theme with StyleSheet, GlassCard, GradientButton,
// StatusBadge, and Reanimated animations
// ============================================

import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeInUp,
  FadeInDown,
  SlideInDown,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import * as Location from 'expo-location';
import { useTaskStore, useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { StatusBadge } from '@/src/components/StatusBadge';
import { Task, TaskStatus } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TASK_FLOW: Record<TaskStatus, TaskStatus | null> = {
  'CREATED': 'MATCHING',
  'MATCHING': 'ASSIGNED',
  'SEARCHING': 'MATCHING',
  'ASSIGNED': 'ACCEPTED',
  'ACCEPTED': 'ARRIVED',
  'ARRIVED': 'PICKED_UP',
  'PICKED_UP': 'IN_TRANSIT',
  'IN_TRANSIT': 'DELIVERED',
  'DELIVERED': 'COMPLETED',
  'COMPLETED': null,
  'CANCELLED': null,
  'FAILED': null,
};

export default function DriverTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId: string }>();
  const { latitude, longitude } = useLocationStore();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reanimated shared values
  const pulseScale = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);

  useEffect(() => {
    // Pulsing animation for active status indicator
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1, // infinite
      false
    );
  }, []);

  useEffect(() => {
    if (params.taskId) {
      loadTask(params.taskId);
      // Connect socket before joining the task room
      socketService.connect().then(() => {
        socketService.joinTaskRoom(params.taskId);
      });
    }

    // Listen for real-time task status changes
    const unsubscribe = socketService.on('task:status:update', (data: any) => {
      if (data.taskId === task?.id || data.taskId === params.taskId) {
        // Update task state immediately for responsive UI
        setTask(prev => prev ? { ...prev, status: data.status } : prev);

        // If task is completed or cancelled, refresh full task data and alert
        if (['COMPLETED', 'CANCELLED', 'CLOSED', 'FAILED'].includes(data.status)) {
          loadTask(params.taskId);

          if (data.status === 'CANCELLED') {
            Alert.alert(
              'Task Cancelled',
              'This task has been cancelled by the client.',
              [{ text: 'OK', onPress: () => router.replace('/driver') }]
            );
          } else if (data.status === 'FAILED') {
            Alert.alert(
              'Task Failed',
              'This task has failed.',
              [{ text: 'OK', onPress: () => router.replace('/driver') }]
            );
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (params.taskId) {
        socketService.leaveTaskRoom(params.taskId);
      }
    };
  }, [params.taskId]);

  // Animated style for the pulsing dot
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const loadTask = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getTask(taskId);
      if (response.success && response.data) {
        setTask(response.data);
      } else {
        Alert.alert('Error', 'Failed to load task details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const transitionTask = async (taskId: string, toStatus: string) => {
    const result = await api.transitionTask(taskId, toStatus, {
      latitude,
      longitude,
    });
    return result;
  };

  const updateStatus = async (newStatus: TaskStatus) => {
    if (!task) return;

    setIsUpdating(true);
    try {
      const result = await transitionTask(task.id, newStatus);
      if (result.success && result.data?.task) {
        setTask(result.data.task);
      } else {
        Alert.alert('Error', result.error || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNextAction = () => {
    if (!task) return;

    const nextStatus = TASK_FLOW[task.status];
    if (nextStatus) {
      updateStatus(nextStatus);
    }
  };

  const handleCancelTask = () => {
    Alert.alert(
      'Cancel Task',
      'Are you sure you want to cancel this task?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!task) return;

            setIsUpdating(true);
            try {
              const response = await api.cancelTask(task.id, 'Cancelled by driver');
              if (response.success) {
                router.replace('/driver');
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel task');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel task');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    if (task?.client?.phone) {
      Linking.openURL(`tel:${task.client.phone}`);
    }
  };

  const openNavigation = (destLat: number, destLng: number) => {
    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    const url = Platform.select({
      ios: `maps:?daddr=${destLat},${destLng}`,
      android: `geo:?daddr=${destLat},${destLng}`,
    });
    Linking.openURL(url || `https://maps.google.com/?daddr=${destLat},${destLng}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>No task found</Text>
      </View>
    );
  }

  const statusColor = TASK_STATUS_COLORS[task.status] || COLORS.primary;
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
  const nextStatus = TASK_FLOW[task.status];

  // Button label based on current status
  const getButtonLabel = (): string => {
    switch (task.status) {
      case 'ASSIGNED':
        return 'Accept Task';
      case 'ACCEPTED':
        return "I've Arrived";
      case 'ARRIVED':
        return 'Picked Up';
      case 'PICKED_UP':
        return 'Start Delivery';
      case 'IN_TRANSIT':
        return 'Mark Delivered';
      case 'DELIVERED':
        return 'Complete Task';
      default:
        return 'Update Status';
    }
  };

  const handleButtonPress = () => {
    switch (task.status) {
      case 'ASSIGNED':
        updateStatus('ACCEPTED');
        break;
      case 'ACCEPTED':
        updateStatus('ARRIVED');
        break;
      case 'ARRIVED':
        updateStatus('PICKED_UP');
        break;
      case 'PICKED_UP':
        updateStatus('IN_TRANSIT');
        break;
      case 'IN_TRANSIT':
        updateStatus('DELIVERED');
        break;
      case 'DELIVERED':
        updateStatus('COMPLETED');
        break;
      default:
        if (nextStatus) updateStatus(nextStatus);
    }
  };

  const isTaskTerminal = task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'FAILED';

  return (
    <View style={styles.container}>
      {/* Map */}
      <SmartRideMap
        style={styles.map}
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
        showUserLocation
      />

      {/* Bottom Card */}
      <Animated.View
        entering={SlideInDown.duration(400).springify()}
        style={styles.bottomCardWrapper}
      >
        <GlassCard variant="elevated" padding={20} borderRadius={24} style={styles.bottomCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Status Header */}
            <Animated.View
              entering={FadeInDown.duration(300).delay(100)}
              style={styles.statusHeader}
            >
              <View style={styles.statusHeaderLeft}>
                <View style={styles.statusLabelRow}>
                  {/* Pulsing status dot */}
                  {!isTaskTerminal && (
                    <Animated.View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                        pulseAnimatedStyle,
                      ]}
                    />
                  )}
                  <Text style={[styles.statusLabel, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
                <Text style={styles.taskNumber}>{task.taskNumber}</Text>
              </View>
              <StatusBadge
                label={task.taskType.includes('BODA') ? 'Boda' : 'Car'}
                color={statusColor}
                size="md"
              />
            </Animated.View>

            {/* Client Info */}
            {task.client && (
              <Animated.View
                entering={FadeInUp.duration(300).delay(200)}
                style={styles.clientCard}
              >
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={22} color={COLORS.onSurfaceVariant} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{task.client?.name ?? 'Customer'}</Text>
                  <Text style={styles.clientPhone}>{task.client?.phone ?? ''}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallClient}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={18} color={COLORS.secondary} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Route Info */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(300)}
              style={styles.routeContainer}
            >
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.secondary }]} />
                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeAddress}>{task.pickupAddress}</Text>
                </View>
              </View>

              {/* Connecting line */}
              <View style={styles.routeConnector}>
                <View style={[styles.routeConnectorLine, { borderLeftColor: COLORS.border }]} />
              </View>

              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeLabel}>Dropoff</Text>
                  <Text style={styles.routeAddress}>{task.dropoffAddress}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Payment Info */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(400)}
              style={styles.paymentRow}
            >
              <Text style={styles.paymentMethod}>Payment: {task.paymentMethod}</Text>
              <Text style={styles.paymentAmount}>
                UGX {(task.totalAmount ?? 0).toLocaleString()}
              </Text>
            </Animated.View>

            {/* Navigation Button (separate from status transition) */}
            {(task.status === 'ACCEPTED' || task.status === 'ARRIVED' || task.status === 'PICKED_UP' || task.status === 'IN_TRANSIT') && (
              <Animated.View entering={FadeInUp.duration(300).delay(400)}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => {
                    // Navigate to pickup if ACCEPTED/ARRIVED, otherwise to dropoff
                    const isHeadingToPickup = task.status === 'ACCEPTED' || task.status === 'ARRIVED';
                    const destLat = isHeadingToPickup ? task.pickupLatitude : task.dropoffLatitude;
                    const destLng = isHeadingToPickup ? task.pickupLongitude : task.dropoffLongitude;
                    if (destLat && destLng) {
                      openNavigation(destLat, destLng);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="compass-outline" size={18} color={COLORS.secondary} />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Actions */}
            <Animated.View
              entering={FadeInUp.duration(300).delay(500)}
              style={styles.actionsRow}
            >
              <View style={styles.cancelButtonWrapper}>
                <GradientButton
                  title="Cancel"
                  onPress={handleCancelTask}
                  variant="outline"
                  loading={false}
                  disabled={isUpdating || task.status === 'COMPLETED'}
                  fullWidth
                  size="md"
                />
              </View>
              <View style={styles.actionButtonWrapper}>
                <GradientButton
                  title={getButtonLabel()}
                  onPress={handleButtonPress}
                  variant="primary"
                  loading={isUpdating}
                  disabled={isUpdating || task.status === 'COMPLETED'}
                  fullWidth
                  size="md"
                />
              </View>
            </Animated.View>

            {/* Completed Message */}
            {task.status === 'COMPLETED' && (
              <Animated.View
                entering={FadeInUp.duration(400)}
                style={styles.completedCard}
              >
                <Text style={styles.completedText}>
                  Trip Completed Successfully!
                </Text>
                <GradientButton
                  title="Go to Home"
                  onPress={() => router.replace('/driver')}
                  variant="secondary"
                  fullWidth
                  size="md"
                />
              </Animated.View>
            )}
          </ScrollView>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading & empty states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Map
  map: {
    flex: 1,
  },

  // Bottom card
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Status header
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusHeaderLeft: {
    flex: 1,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  taskNumber: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Client info
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientAvatarEmoji: {
    fontSize: 22,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  clientPhone: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonEmoji: {
    fontSize: 18,
  },

  // Route info
  routeContainer: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    marginRight: 12,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 1,
  },
  routeConnector: {
    paddingLeft: 5,
    height: 16,
    justifyContent: 'center',
  },
  routeConnectorLine: {
    borderLeftWidth: 1,
    height: 10,
    marginLeft: 1,
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 16,
  },
  paymentMethod: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
  },

  // Navigation button
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${COLORS.secondary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}30`,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  navigateButtonIcon: {
    fontSize: 18,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButtonWrapper: {
    flex: 1,
  },
  actionButtonWrapper: {
    flex: 1.5,
  },

  // Completed
  completedCard: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
});
