// ============================================
// SMART RIDE MOBILE - ORDERS SCREEN
// ============================================
// VERSION: STITCH-DS-001
// PURPOSE: Merchant orders with filter tabs and order cards
// DESIGN: Stitch Design System — MD3 Green Theme
// - GlowHeader with "Orders" title
// - Order tabs (All, Active, Completed, Cancelled)
// - Order cards with merchant info, item count, status, total amount
// - Empty state with illustration
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
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
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, TASK_STATUS_COLORS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Order } from '@/src/types';
import { GlowHeader } from '@/src/components/GlowHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { StatusBadge } from '@/src/components/StatusBadge';
import { ServiceIcon } from '@/src/components/ServiceIcon';
import { OrderSkeleton } from '@/src/components/Skeleton';

// ============================================
// FILTER TABS CONFIG
// ============================================
type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const ORDER_TABS: { key: OrderFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function OrdersScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getOrders();
      if (response.success && response.data) {
        setOrders(response.data?.data ?? []);
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
      case 'COMPLETED':
        return COLORS.success;
      case 'CANCELLED':
      case 'FAILED':
        return COLORS.error;
      case 'PREPARING':
        return COLORS.warning;
      default:
        return COLORS.primary;
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return !['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(order.status);
    }
    if (activeFilter === 'completed') {
      return ['DELIVERED', 'COMPLETED'].includes(order.status);
    }
    if (activeFilter === 'cancelled') {
      return ['CANCELLED', 'FAILED'].includes(order.status);
    }
    return true;
  });

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
        COLORS={COLORS}
        styles={styles}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlowHeader title="Orders" subtitle="Your order history" />

      {/* Filter Tabs */}
      <Animated.View entering={FadeInUp.duration(400).delay(100).springify()} style={styles.tabsContainer}>
        {ORDER_TABS.map((tab) => (
          <OrderFilterTab
            key={tab.key}
            label={tab.label}
            isActive={activeFilter === tab.key}
            onPress={() => setActiveFilter(tab.key)}
            styles={styles}
          />
        ))}
      </Animated.View>

      {/* Quick Service Actions */}
      <Animated.View entering={FadeInUp.duration(400).delay(150).springify()} style={styles.quickActionsSection}>
        <QuickServiceAction
          icon="restaurant"
          label="Food"
          color={COLORS.primary}
          onPress={() => router.push('/orders/restaurants')}
          styles={styles}
        />
        <QuickServiceAction
          icon="bag"
          label="Shop"
          color={COLORS.secondary}
          onPress={() => router.push('/shopping')}
          styles={styles}
        />
        <QuickServiceAction
          icon="cube"
          label="Delivery"
          color={COLORS.tertiary}
          onPress={() => router.push('/delivery')}
          styles={styles}
        />
        <QuickServiceAction
          icon="medkit"
          label="Health"
          color={COLORS.error}
          onPress={() => router.push('/health')}
          styles={styles}
        />
      </Animated.View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredOrders}
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
              <View style={styles.emptyIconCircle}>
                <Ionicons name="bag-outline" size={40} color={COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'all' ? 'No orders yet' : 
                 activeFilter === 'active' ? 'No active orders' :
                 activeFilter === 'completed' ? 'No completed orders' :
                 'No cancelled orders'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'all' ? 'Order food, shop, or send a package' : 'Try a different filter'}
              </Text>
              <TouchableOpacity style={styles.orderButton} onPress={() => router.push('/orders/restaurants')}>
                <Text style={styles.orderButtonText}>Order Food</Text>
              </TouchableOpacity>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

// ============================================
// ORDER FILTER TAB COMPONENT
// ============================================

function OrderFilterTab({
  isActive,
  onPress,
  label,
  styles,
}: {
  isActive: boolean;
  onPress: () => void;
  label: string;
  styles: any;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, 100);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity 
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedStyle}>
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
      {isActive && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );
}

// ============================================
// QUICK SERVICE ACTION COMPONENT
// ============================================

function QuickServiceAction({
  icon,
  label,
  color,
  onPress,
  styles,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  styles: any;
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
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={styles.quickActionItem}
    >
      <Animated.View style={[styles.quickActionContent, animatedStyle]}>
        <View style={[styles.quickActionIconCircle, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// ORDER CARD COMPONENT
// ============================================

function OrderCard({ item, onPress, getStatusColor, formatDate, COLORS, styles }: { item: Order; onPress: () => void; getStatusColor: (s: string) => string; formatDate: (d: string) => string; COLORS: ThemedColors; styles: any }) {
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

  const statusColor = getStatusColor(item.status);
  const isFoodOrder = item.orderType === 'FOOD_DELIVERY';
  const orderIconName = isFoodOrder ? 'restaurant' : 'bag';
  const iconBgColor = isFoodOrder ? COLORS.primaryFixed : COLORS.tertiaryFixed;
  const iconFgColor = isFoodOrder ? COLORS.onPrimaryFixedVariant : COLORS.onTertiaryFixedVariant;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View style={animatedStyle}>
        <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={{ backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border }}>
          <View style={styles.orderCardContent}>
            {/* Header: icon + order info + status */}
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderLeft}>
                <View style={[styles.orderTypeIconCircle, { backgroundColor: iconBgColor }]}>
                  <Ionicons name={orderIconName as any} size={18} color={iconFgColor} />
                </View>
                <View style={styles.orderHeaderText}>
                  <Text style={styles.orderMerchant}>{item.merchant?.name || 'Order'}</Text>
                  <Text style={styles.orderNumber}>#{item.orderNumber} · {item.items?.length || 0} items</Text>
                </View>
              </View>
              <StatusBadge
                label={item.status.replace('_', ' ')}
                color={statusColor}
                size="sm"
              />
            </View>

            {/* Items Summary */}
            {item.items && item.items.length > 0 && (
              <View style={styles.itemsSection}>
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
            )}

            {/* Footer: date + amount */}
            <View style={styles.orderFooter}>
              <View style={styles.orderFooterLeft}>
                <Ionicons name="time-outline" size={14} color={COLORS.outline} />
                <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.orderAmount}>UGX {(item.totalAmount ?? 0).toLocaleString()}</Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Filter Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.containerMargin,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  tabButtonText: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
  },
  tabButtonTextActive: {
    color: COLORS.onPrimary,
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.onPrimary,
    marginTop: SPACING.xs,
  },

  // Quick Service Actions
  quickActionsSection: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.containerMargin,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  quickActionItem: {
    flex: 1,
  },
  quickActionContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quickActionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },

  // Loading
  skeletonContainer: {
    flex: 1,
    padding: SPACING.containerMargin,
    paddingTop: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: SPACING.md,
  },

  // List
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.containerMargin,
    paddingBottom: 128,
    gap: SPACING.gutter,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  orderButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  orderButtonText: {
    color: COLORS.onPrimary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
  },

  // Order Card
  orderCardContent: {
    padding: SPACING.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.gutter,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
    flex: 1,
  },
  orderTypeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHeaderText: {
    flex: 1,
  },
  orderMerchant: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  orderNumber: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 1,
  },

  // Items Section
  itemsSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.gutter,
    marginBottom: SPACING.gutter,
  },
  itemText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs / 2,
  },
  moreItemsText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  orderFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orderDate: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  orderAmount: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
