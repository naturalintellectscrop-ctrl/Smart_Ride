// ============================================
// SMART RIDE MOBILE - ORDERS SCREEN
// ============================================
// Premium dark theme with Smart Ride branding
// Uses vector icons instead of emojis
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  StyleSheet
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
import { COLORS } from '@/src/constants';
import { Order } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

// Quick action configuration with icons
const QUICK_ACTIONS = [
  { id: 'food', icon: 'coffee' as const, label: 'Food', color: '#F59E0B', route: '/orders/restaurants' },
  { id: 'shop', icon: 'shopping-bag' as const, label: 'Shop', color: '#8B5CF6', route: '/shopping' },
  { id: 'delivery', icon: 'package' as const, label: 'Delivery', color: '#14B8A6', route: '/delivery' },
  { id: 'health', icon: 'heart' as const, label: 'Health', color: '#F43F5E', route: '/health' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return COLORS.success;
      case 'CANCELLED':
        return COLORS.error;
      case 'PREPARING':
        return COLORS.warning;
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
      <Animated.View entering={FadeInUp.duration(400).delay(100).springify()} style={styles.quickActions}>
        {QUICK_ACTIONS.map((action, index) => (
          <QuickAction 
            key={action.id}
            icon={action.icon} 
            label={action.label}
            color={action.color}
            onPress={() => router.push(action.route)}
            delay={150 + index * 50}
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
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="package" size="2xl" color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>No orders yet</Text>
              <TouchableOpacity style={styles.orderButton} onPress={() => router.push('/orders/restaurants')}>
                <Icon name="coffee" size="sm" color={COLORS.background} style={{ marginRight: 8 }} />
                <Text style={styles.orderButtonText}>Order Food</Text>
              </TouchableOpacity>
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
  color,
  onPress, 
  delay 
}: { 
  icon: 'coffee' | 'shopping-bag' | 'package' | 'heart'; 
  label: string; 
  color: string;
  onPress: () => void; 
  delay: number 
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(300).springify()} style={styles.quickActionItem}>
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.quickActionContent, animatedStyle]}>
          <View style={[styles.quickActionIconContainer, { backgroundColor: `${color}15` }]}>
            <Icon name={icon} size="md" color={color} />
          </View>
          <Text style={styles.quickActionLabel}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Order Card with Animation
function OrderCard({ 
  item, 
  onPress, 
  getStatusColor, 
  formatDate 
}: { 
  item: Order; 
  onPress: () => void; 
  getStatusColor: (s: string) => string; 
  formatDate: (d: string) => string 
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Determine order type
  const getOrderTypeInfo = () => {
    if (item.orderType === 'FOOD_DELIVERY') {
      return { icon: 'coffee' as const, color: '#F59E0B' };
    }
    return { icon: 'shopping-bag' as const, color: '#8B5CF6' };
  };

  const orderType = getOrderTypeInfo();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.orderCard, animatedStyle]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <View style={[styles.orderIconContainer, { backgroundColor: `${orderType.color}15` }]}>
              <Icon name={orderType.icon} size="md" color={orderType.color} />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.orderMerchant}>{item.merchant?.name || 'Order'}</Text>
            </View>
          </View>
          <Animated.View 
            entering={ZoomIn.duration(300)}
            style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
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
            <Text style={styles.moreItemsText}>
              +{item.items.length - 2} more items
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderAmount}>UGX {item.totalAmount.toLocaleString()}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
  },
  quickActionContent: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  quickActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  orderButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    fontWeight: 'bold',
    color: COLORS.text,
    fontSize: 16,
  },
  orderMerchant: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  moreItemsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
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
    color: COLORS.textMuted,
    fontSize: 12,
  },
  orderAmount: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontSize: 14,
  },
});
