// ============================================
// SMART RIDE MOBILE - ORDER TRACKING SCREEN
// ============================================
// Premium dark theme with vector icons
// ============================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
// Conditional import for web compatibility
const MapView = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps').MapView
  : require('react-native-maps').default;
const { Marker } = Platform.OS === 'web'
  ? require('@/src/mocks/react-native-maps')
  : require('react-native-maps');
import { useLocationStore } from '@/src/store';
import { api, socketService } from '@/src/services';
import { COLORS } from '@/src/constants';
import { Order } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

// Order status flow with vector icons
const ORDER_STATUS_FLOW = [
  { status: 'ORDER_CREATED', label: 'Order Placed', iconName: 'file-text' as const, color: '#8B5CF6' },
  { status: 'MERCHANT_ACCEPTED', label: 'Confirmed', iconName: 'check-circle' as const, color: '#22C55E' },
  { status: 'PREPARING', label: 'Preparing', iconName: 'clock' as const, color: '#F59E0B' },
  { status: 'READY_FOR_PICKUP', label: 'Ready', iconName: 'package' as const, color: '#00FFF3' },
  { status: 'OUT_FOR_DELIVERY', label: 'On the Way', iconName: 'truck' as const, color: '#00FF88' },
  { status: 'DELIVERED', label: 'Delivered', iconName: 'star' as const, color: '#FBBF24' },
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const { address } = useLocationStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.orderId) {
      loadOrder(params.orderId);
    }
  }, [params.orderId]);

  useEffect(() => {
    const unsubscribe = socketService.on('order:status', (data: { orderId: string; status: string }) => {
      if (data.orderId === params.orderId && order) {
        setOrder({ ...order, status: data.status as any });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [params.orderId, order]);

  const loadOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await api.getOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data);
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
    if (order?.merchant?.phone) {
      Linking.openURL(`tel:${order.merchant.phone}`);
    }
  };

  const handleCallDriver = () => {
    Alert.alert('Coming Soon', 'Driver calling will be available soon');
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
      <View style={styles.emptyContainer}>
        <Icon name="package" size="2xl" color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No order found</Text>
      </View>
    );
  }

  const currentStep = getCurrentStep();

  return (
    <View style={styles.container}>
      {/* Map */}
      {order.deliveryLatitude && order.deliveryLongitude && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: order.deliveryLatitude,
            longitude: order.deliveryLongitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          <Marker
            coordinate={{
              latitude: order.deliveryLatitude,
              longitude: order.deliveryLongitude,
            }}
            title="Delivery Location"
            pinColor={COLORS.primary}
          />
        </MapView>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Order Status */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Text style={styles.orderNumber}>
            Order #{order.orderNumber}
          </Text>

          {/* Progress Steps */}
          <View style={styles.progressCard}>
            {ORDER_STATUS_FLOW.map((step, index) => {
              const isActive = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <View key={step.status} style={styles.stepContainer}>
                  {/* Line */}
                  {index > 0 && (
                    <View 
                      style={[
                        styles.stepLine,
                        { backgroundColor: index <= currentStep ? COLORS.secondary : COLORS.border }
                      ]}
                    />
                  )}

                  {/* Icon & Content */}
                  <View style={styles.stepContent}>
                    <View 
                      style={[
                        styles.stepIcon,
                        { backgroundColor: isActive ? `${step.color}15` : COLORS.background }
                      ]}
                    >
                      <Icon 
                        name={step.iconName} 
                        size="sm" 
                        color={isActive ? step.color : COLORS.textMuted} 
                      />
                    </View>
                    <Text style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelActive
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <ActivityIndicator size="small" color={COLORS.secondary} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Merchant Info */}
        {order.merchant && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.card}>
            <Text style={styles.cardLabel}>Restaurant</Text>
            <View style={styles.merchantRow}>
              <View style={styles.merchantIcon}>
                <Icon name="coffee" size="lg" color={IconColors.food} />
              </View>
              <View style={styles.merchantInfo}>
                <Text style={styles.merchantName}>{order.merchant.name}</Text>
                <Text style={styles.merchantAddress}>{order.merchant.address}</Text>
              </View>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCallMerchant}
                activeOpacity={0.8}
              >
                <Icon name="phone" size="md" color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Order Items */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.card}>
          <Text style={styles.cardLabel}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.itemPrice}>
                UGX {item.totalPrice.toLocaleString()}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Delivery Address */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.card}>
          <Text style={styles.cardLabel}>Delivery Address</Text>
          <View style={styles.addressRow}>
            <Icon name="map-pin" size="sm" color={COLORS.primary} />
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>
        </Animated.View>

        {/* Payment Summary */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.card}>
          <Text style={styles.cardLabel}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>UGX {order.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>UGX {order.deliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              UGX {order.totalAmount.toLocaleString()}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.footer}>
        {order.status === 'DELIVERED' ? (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Icon name="check" size="md" color={COLORS.background} />
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => Alert.alert('Coming Soon', 'Order cancellation will be available soon')}
              activeOpacity={0.8}
            >
              <Icon name="x" size="sm" color="#F43F5E" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={handleCallDriver}
              activeOpacity={0.8}
            >
              <Icon name="message-circle" size="sm" color={COLORS.background} />
              <Text style={styles.supportButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
        )}
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
  map: {
    height: 192,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  orderNumber: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLine: {
    width: 2,
    height: 24,
    marginLeft: 15,
    marginBottom: -8,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${IconColors.food}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  merchantAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 14,
  },
  itemPrice: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  doneButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  supportButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: 6,
  },
});
