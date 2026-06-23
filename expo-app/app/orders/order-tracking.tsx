// ============================================
// SMART RIDE MOBILE - ORDER TRACKING SCREEN
// Stitch Design System Applied
// FIXED: Added polling fallback, fixed event name
// ============================================

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Order } from '@/src/types';
import { firstName } from '@/src/utils/formatName';
import { Ionicons } from '@expo/vector-icons';

// Terminal states where polling should stop
const TERMINAL_STATES = ['DELIVERED', 'CANCELLED', 'COMPLETED'];

// Polling interval in ms
const POLL_INTERVAL = 5000;

const ORDER_STATUS_FLOW = [
  { status: 'ORDER_CREATED', label: 'Order Placed', icon: 'create-outline' },
  { status: 'MERCHANT_ACCEPTED', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { status: 'PREPARING', label: 'Preparing', icon: 'person-outline' },
  { status: 'READY_FOR_PICKUP', label: 'Ready', icon: 'cube-outline' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: 'car-sport-outline' },
  { status: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-outline' },
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ orderId: string }>();
  const { address } = useLocationStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateTimestamp = useRef(0); // Track last state update time to prevent stale poll overwrites

  // ==========================================
  // POLLING FALLBACK
  // ==========================================
  const isTerminalState = (status: string): boolean => {
    return TERMINAL_STATES.includes(status);
  };

  const pollOrderStatus = async () => {
    if (!params.orderId) return;

    // Skip poll if a socket update happened recently (within 5 seconds)
    // This prevents stale poll data from overwriting fresh socket data
    if (Date.now() - lastUpdateTimestamp.current < 5000) {
      return;
    }

    try {
      const response = await api.getOrder(params.orderId);
      if (response.success && response.data) {
        const updatedOrder = response.data;

        setOrder(prev => {
          if (prev && prev.status !== updatedOrder.status) {
            // Status changed
            if (isTerminalState(updatedOrder.status)) {
              stopPolling();
            }
          }
          return updatedOrder;
        });
      }
    } catch (error) {
      console.error('[OrderTracking] Poll error:', error);
    }
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(pollOrderStatus, POLL_INTERVAL);
    console.log('[OrderTracking] Started polling with interval:', POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    console.log('[OrderTracking] Stopped polling');
  };

  useEffect(() => {
    if (params.orderId) {
      loadOrder(params.orderId);
    }

    // Start polling as primary update mechanism
    startPolling();

    return () => {
      stopPolling();
    };
  }, [params.orderId]);

  // Stop polling when order reaches terminal state
  useEffect(() => {
    if (order && isTerminalState(order.status)) {
      stopPolling();
    }
  }, [order?.status]);

  // Determine the taskId for socket room subscription.
  // Orders may have a related task on the backend; use orderId as fallback.
  // Use a ref to avoid re-subscription loops when order state changes.
  const taskIdRef = useRef<string>(params.orderId);
  
  // Update the ref when we get order data with a taskId
  useEffect(() => {
    if ((order as any)?.taskId) {
      taskIdRef.current = (order as any).taskId;
    }
  }, [order]);

  useEffect(() => {
    // Connect socket and join task room (secondary update mechanism)
    const initSocket = async () => {
      try {
        await socketService.connect();
        const taskId = taskIdRef.current;
        if (socketService.isSocketConnected() && taskId) {
          socketService.joinTaskRoom(taskId);
          console.log('[OrderTracking] Socket connected, joined task room:', taskId);
        }
      } catch (error) {
        console.log('[OrderTracking] Socket not available, polling only');
      }
    };

    initSocket();

    // Listen for task status updates via socket (secondary mechanism)
    // FIXED: Event name is 'task:status:update' (matches server emission)
    const unsubscribe = socketService.on('task:status:update', (data: { taskId: string; status: string }) => {
      const taskId = taskIdRef.current;
      if (data.taskId === taskId) {
        lastUpdateTimestamp.current = Date.now(); // Mark socket update as most recent
        setOrder(prev => prev ? { ...prev, status: data.status as any } : prev);

        // Stop polling if terminal state
        if (isTerminalState(data.status)) {
          stopPolling();
        }
      }
    });

    return () => {
      unsubscribe();
      const taskId = taskIdRef.current;
      if (taskId) {
        socketService.leaveTaskRoom(taskId);
      }
    };
  }, [params.orderId]);

  const loadOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data);

        // If already in terminal state, no need to poll
        if (isTerminalState(response.data.status)) {
          stopPolling();
        }
      } else {
        Alert.alert('Error', 'Failed to load order details');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallMerchant = () => {
    if (order?.merchantId) {
      router.push(
        `/call/${order.merchantId}?name=${encodeURIComponent(firstName(order.merchant?.name, 'Merchant'))}`
      );
    } else {
      Alert.alert('Unavailable', 'Merchant contact is not available for this order yet.');
    }
  };

  const handleCallDriver = () => {
    const task = (order as any)?.task;
    const rider = task?.rider;
    const riderId = rider?.id || task?.riderId;
    const riderName = firstName(rider?.fullName, 'Driver');

    if (riderId) {
      router.push(
        `/call/${riderId}?name=${encodeURIComponent(riderName)}`
      );
    } else {
      Alert.alert(
        'Driver Unavailable',
        'No driver has been assigned to this order yet.'
      );
    }
  };

  const handleContactSupport = () => {
    // Opens the Smart Ride support / contact page in the system browser
    Linking.openURL('https://smartrideug.vercel.app/contact').catch(() => {
      Alert.alert('Error', 'Unable to open support page right now.');
    });
  };

  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const response = await api.cancelOrder(order.id);
              if (response.success) {
                // Optimistically update local state so the UI reflects the change
                setOrder(prev => prev ? { ...prev, status: 'CANCELLED' as any } : prev);
                stopPolling();
                Alert.alert('Order Cancelled', 'Your order has been cancelled.');
                router.replace('/(tabs)/orders');
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel order');
              }
            } catch (error: any) {
              const message = error?.message || 'An unexpected error occurred';
              Alert.alert('Error', message);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getCurrentStep = () => {
    if (!order) return 0;
    const index = ORDER_STATUS_FLOW.findIndex(s => s.status === order.status);
    return index >= 0 ? index : 0;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No order found</Text>
      </View>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <View style={styles.container}>
      {/* Map */}
      {order.deliveryLatitude && order.deliveryLongitude && (
        <SmartRideMap
          style={{ height: 192 }}
          initialLatitude={order.deliveryLatitude}
          initialLongitude={order.deliveryLongitude}
          markers={[
            {
              id: 'delivery',
              latitude: order.deliveryLatitude,
              longitude: order.deliveryLongitude,
              title: 'Delivery Location',
            },
          ]}
          showUserLocation
        />
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Order Status */}
          <Text style={styles.orderNumber}>
            Order #{order.orderNumber}
          </Text>

          {/* Progress Steps */}
          <View style={styles.progressCard}>
            {ORDER_STATUS_FLOW.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <View key={step.status} style={styles.stepRow}>
                  {/* Line */}
                  {index > 0 && (
                    <View 
                      style={[
                        styles.stepLine,
                        index <= currentStep ? styles.stepLineActive : styles.stepLineInactive,
                      ]}
                    />
                  )}

                  {/* Icon & Content */}
                  <View style={styles.stepContentRow}>
                    <View 
                      style={[
                        styles.stepIconContainer,
                        isActive ? styles.stepIconActive : styles.stepIconInactive,
                      ]}
                    >
                      <Ionicons name={step.icon as any} size={14} color={isActive ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
                    </View>
                    <Text 
                      style={[
                        styles.stepLabel,
                        isCurrent ? styles.stepLabelCurrent : styles.stepLabelInactive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isCurrent && !isTerminalState(order.status) && (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Merchant Info */}
          {order.merchant && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Restaurant</Text>
              <View style={styles.merchantRow}>
                <View style={styles.merchantImagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName}>{order.merchant?.name ?? 'Merchant'}</Text>
                  <Text style={styles.merchantAddress}>{order.merchant?.address ?? ''}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={handleCallMerchant}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Driver/Rider Info (only show when a rider has been assigned) */}
          {(order as any)?.task?.rider && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Driver</Text>
              <View style={styles.merchantRow}>
                <View style={styles.merchantImagePlaceholder}>
                  <Ionicons name="bicycle-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName}>
                    {firstName((order as any).task.rider.fullName, 'Driver')}
                  </Text>
                  <Text style={styles.merchantAddress}>
                    Contact via in-app call
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={handleCallDriver}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Order Items */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Order Items</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.orderItemRow}>
                <Text style={styles.orderItemName}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.orderItemPrice}>
                  UGX {item.totalPrice.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Delivery Address</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
            </View>
          </View>

          {/* Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>UGX {order.subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>UGX {order.deliveryFee.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>
                UGX {order.totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        {order.status === 'DELIVERED' ? (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.doneButtonText}>
              Done
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
              onPress={handleCancelOrder}
              disabled={isCancelling}
              activeOpacity={0.7}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleContactSupport}
              activeOpacity={0.7}
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodyMd,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  orderNumber: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
    marginBottom: SPACING.md,
  },
  progressCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  stepRow: {
    alignItems: 'flex-start',
  },
  stepLine: {
    width: 2,
    height: SPACING.md + 8,
    marginLeft: 14,
    marginBottom: -SPACING.sm,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepLineInactive: {
    backgroundColor: COLORS.outlineVariant,
  },
  stepContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: SPACING.sm,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: {
    backgroundColor: COLORS.primary,
  },
  stepIconInactive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  stepIcon: {
    fontSize: 14,
  },
  stepLabel: {
    marginLeft: SPACING.md - 4,
    flex: 1,
    ...TYPOGRAPHY.bodySm,
  },
  stepLabelCurrent: {
    color: COLORS.onSurface,
    fontWeight: 'bold',
  },
  stepLabelInactive: {
    color: COLORS.onSurfaceVariant,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginBottom: SPACING.sm,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantImagePlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md - 4,
  },
  merchantEmoji: {
    fontSize: 24,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  merchantAddress: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  callButton: {
    width: 40,
    height: 40,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: {
    fontSize: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm - 2,
  },
  orderItemName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
  },
  orderItemPrice: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: SPACING.sm,
  },
  addressText: {
    color: COLORS.onSurface,
    flex: 1,
    ...TYPOGRAPHY.bodySm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  summaryValue: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    marginTop: SPACING.sm,
  },
  summaryTotalLabel: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  bottomBar: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md - 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: COLORS.error,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  supportButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  supportButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
});
