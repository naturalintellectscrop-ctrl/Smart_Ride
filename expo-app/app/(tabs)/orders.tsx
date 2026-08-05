// ============================================
// SMART RIDE MOBILE - ORDERS SCREEN
// ============================================
// VERSION: STITCH-DS-001
// PURPOSE: Merchant orders with filter tabs and order cards
// DESIGN: Stitch Design System — MD3 Green Theme
// - AppHeader with "Orders" title
// - Order tabs (All, Active, Completed, Cancelled)
// - Order cards with merchant info, item count, status, total amount
// - Empty state with illustration
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  MOTION,
  ICON,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Order } from '@/src/types';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  OrderSkeleton,
  SearchInput,
  StatusBadge,
} from '@/src/components';

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
  const [query, setQuery] = useState('');

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

  // Status filter (rail) then free-text search over order number and merchant.
  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === 'all' ? true
        : activeFilter === 'active' ? !['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(order.status)
        : activeFilter === 'completed' ? ['DELIVERED', 'COMPLETED'].includes(order.status)
        : ['CANCELLED', 'FAILED'].includes(order.status);
      if (!matchesFilter) return false;
      if (!q) return true;
      return [order.orderNumber, (order as any).merchant?.businessName, (order as any).merchantName]
        .some((f?: string | null) => f?.toLowerCase().includes(q));
    });
  }, [orders, activeFilter, query]);

  const renderOrder = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View
      entering={SlideInRight.duration(MOTION.duration.slower).delay(Math.min(index * 40, 240)).springify()}
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
      <AppHeader title="Orders" subtitle="Your order history" variant="large" />

      <Animated.View entering={FadeInUp.duration(MOTION.duration.slower).delay(100)} style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by order number or merchant"
        />
      </Animated.View>

      {/* Filter rail */}
      <Animated.View entering={FadeInUp.duration(MOTION.duration.slower).delay(140)} style={styles.filterRail}>
        {ORDER_TABS.map((tab) => (
          <Chip
            key={tab.key}
            label={tab.label}
            active={activeFilter === tab.key}
            onPress={() => setActiveFilter(tab.key)}
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
            <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
              {query.trim() ? (
                <EmptyState
                  icon="search-outline"
                  title="No orders match your search"
                  subtitle="Try a different order number or merchant."
                  actionLabel="Clear search"
                  onAction={() => setQuery('')}
                />
              ) : (
                <EmptyState
                  icon="bag-outline"
                  title={
                    activeFilter === 'all' ? 'No orders yet'
                    : activeFilter === 'active' ? 'No active orders'
                    : activeFilter === 'completed' ? 'No completed orders'
                    : 'No cancelled orders'
                  }
                  subtitle={activeFilter === 'all' ? 'Order food, shop, or send a package' : 'Try a different filter'}
                  actionLabel={activeFilter === 'all' ? 'Order Food' : undefined}
                  onAction={activeFilter === 'all' ? () => router.push('/orders/restaurants') : undefined}
                />
              )}
            </Animated.View>
          }
        />
      )}
    </View>
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
  // Press motion comes from Card so this tile presses exactly like every other
  // tappable surface, rather than re-deriving its own spring.
  return (
    <Card
      variant="flat"
      padding={SPACING.sm}
      radius={RADIUS.xl}
      style={styles.quickActionItem}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <View style={styles.quickActionContent}>
        <View style={[styles.quickActionIconCircle, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={ICON.lg} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </View>
    </Card>
  );
}

// ============================================
// ORDER CARD COMPONENT
// ============================================

function OrderCard({ item, onPress, getStatusColor, formatDate, COLORS, styles }: { item: Order; onPress: () => void; getStatusColor: (s: string) => string; formatDate: (d: string) => string; COLORS: ThemedColors; styles: any }) {
  const statusColor = getStatusColor(item.status);
  const isFoodOrder = item.orderType === 'FOOD_DELIVERY';
  const orderIconName = isFoodOrder ? 'restaurant' : 'bag';
  const iconBgColor = isFoodOrder ? COLORS.primaryFixed : COLORS.tertiaryFixed;
  const iconFgColor = isFoodOrder ? COLORS.onPrimaryFixedVariant : COLORS.onTertiaryFixedVariant;

  return (
    <Card
      variant="raised"
      padding={SPACING.md}
      radius={RADIUS.xl}
      onPress={onPress}
      accessibilityLabel={`Order ${item.orderNumber}`}
    >
      <View>
            {/* Header: icon + order info + status */}
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderLeft}>
                <View style={[styles.orderTypeIconCircle, { backgroundColor: iconBgColor }]}>
                  <Ionicons name={orderIconName as any} size={ICON.md} color={iconFgColor} />
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
                <Ionicons name="time-outline" size={ICON.xs} color={COLORS.outline} />
                <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.orderAmount}>UGX {(item.totalAmount ?? 0).toLocaleString()}</Text>
        </View>
      </View>
    </Card>
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
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  stateWrap: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  // Filter Tabs

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

  // Order Card
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
