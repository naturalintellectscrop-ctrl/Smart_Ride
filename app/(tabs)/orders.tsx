// ============================================
// SMART RIDE MOBILE - ORDERS SCREEN
// ============================================
// Premium orders UI with vector icons
// Matches admin dashboard design language
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
  Layout,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { Order } from '@/src/types';
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  food: '#F59E0B',
  shopping: '#8B5CF6',
  delivery: '#14B8A6',
  health: '#F43F5E',
  warning: '#FBBF24',
  success: '#22C55E',
};

// Quick actions config
const QUICK_ACTIONS: Array<{
  icon: IconName;
  label: string;
  route: string;
  color: string;
}> = [
  { icon: 'coffee', label: 'Food', route: '/orders/restaurants', color: COLORS.food },
  { icon: 'shopping-bag', label: 'Shopping', route: '/shopping', color: COLORS.shopping },
  { icon: 'package', label: 'Delivery', route: '/delivery', color: COLORS.delivery },
  { icon: 'heart', label: 'Health', route: '/health', color: COLORS.health },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getOrders();
      if (response.success && response.data) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return COLORS.success;
      case 'CANCELLED':
        return COLORS.warning;
      case 'PREPARING':
        return COLORS.accent;
      default:
        return COLORS.primary;
    }
  };

  const renderOrder = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View
      entering={SlideInRight.duration(400).delay(index * 80).springify()}
      layout={Layout.springify()}
    >
      <OrderCard
        item={item}
        onPress={() => router.push(`/orders/order-tracking?orderId=${item.id}`)}
        getStatusColor={getStatusColor}
        formatDate={formatDate}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInUp.duration(400).delay(100).springify()} style={styles.quickActionsContainer}>
        {QUICK_ACTIONS.map((action, index) => (
          <QuickAction
            key={action.label}
            icon={action.icon}
            label={action.label}
            onPress={() => router.push(action.route as any)}
            delay={150 + index * 50}
            color={action.color}
          />
        ))}
      </Animated.View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.delivery}15` }]}>
                <Icon name="package" size="2xl" color={COLORS.delivery} />
              </View>
              <Text style={styles.emptyText}>No orders yet</Text>
              <AnimatedButton onPress={() => router.push('/orders/restaurants')}>
                <View style={styles.orderButton}>
                  <Icon name="coffee" size="sm" color={COLORS.background} style={{ marginRight: 8 }} />
                  <Text style={styles.orderButtonText}>Order Food</Text>
                </View>
              </AnimatedButton>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

// Quick Action with Animation
function QuickAction({
  icon,
  label,
  onPress,
  delay,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  delay: number;
  color: string;
}) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(300).springify()} style={styles.quickActionWrapper}>
      <AnimatedButton onPress={onPress}>
        <View style={[styles.quickActionCard, { borderColor: `${color}20` }]}>
          <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
            <Icon name={icon} size="lg" color={color} />
          </View>
          <Text style={styles.quickActionLabel}>{label}</Text>
        </View>
      </AnimatedButton>
    </Animated.View>
  );
}

// Order Card with Animation
function OrderCard({
  item,
  onPress,
  getStatusColor,
  formatDate,
}: {
  item: Order;
  onPress: () => void;
  getStatusColor: (s: string) => string;
  formatDate: (d: string) => string;
}) {
  const statusColor = getStatusColor(item.status);

  const getOrderIcon = (): { icon: IconName; color: string } => {
    if (item.orderType === 'FOOD_DELIVERY') {
      return { icon: 'coffee', color: COLORS.food };
    }
    return { icon: 'shopping-bag', color: COLORS.shopping };
  };

  const orderIcon = getOrderIcon();

  return (
    <AnimatedButton onPress={onPress}>
      <View style={[styles.orderCard, { borderColor: `${statusColor}20` }]}>
        <View style={styles.orderCardHeader}>
          <View style={styles.orderInfo}>
            <View style={[styles.orderIconContainer, { backgroundColor: `${orderIcon.color}15` }]}>
              <Icon name={orderIcon.icon} size="md" color={orderIcon.color} />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.merchantName}>{item.merchant?.name || 'Order'}</Text>
            </View>
          </View>
          <Animated.View
            entering={ZoomIn.duration(300)}
            style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </Animated.View>
        </View>

        {/* Items Summary */}
        <View style={styles.itemsContainer}>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <Text key={index} style={styles.itemText} numberOfLines={1}>
              {orderItem.quantity}x {orderItem.name}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItemsText}>+{item.items.length - 2} more items</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderAmount}>UGX {item.totalAmount.toLocaleString()}</Text>
        </View>
      </View>
    </AnimatedButton>
  );
}

// Animated Button
function AnimatedButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.95}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickActionWrapper: {
    flex: 1,
  },
  quickActionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  orderButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  merchantName: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemsContainer: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  itemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  moreItemsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
