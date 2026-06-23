// ============================================
// SMART RIDE MOBILE - MERCHANT DASHBOARD
// ============================================
// Stitch Design System — Merchant Orders
// Order tabs with badges, order cards, Accept/Reject
// Wired to real API via useMerchantStore
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useMerchantStore } from '@/src/store';
import { MerchantOrder } from '@/src/types';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { GlowHeader } from '@/src/components/GlowHeader';

// ============================================
// LOCAL CONSTANTS
// ============================================

type OrderTab = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';

const ORDER_TABS: { key: OrderTab; label: string; icon: keyof typeof Ionicons.glyphMap; statuses: string[] }[] = [
  { key: 'NEW', label: 'New', icon: 'alert-circle-outline', statuses: ['NEW', 'PENDING'] },
  { key: 'PREPARING', label: 'Preparing', icon: 'restaurant-outline', statuses: ['CONFIRMED', 'PREPARING'] },
  { key: 'READY', label: 'Ready', icon: 'checkmark-circle-outline', statuses: ['READY'] },
  { key: 'COMPLETED', label: 'Completed', icon: 'checkmark-done-circle-outline', statuses: ['COMPLETED', 'DELIVERED'] },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#4b5264',
  NEW: '#F59E0B',
  CONFIRMED: '#005f3a',
  PREPARING: '#0e7a4d',
  READY: '#006e2f',
  COMPLETED: '#005f3a',
  DELIVERED: '#005f3a',
  CANCELLED: '#ba1a1a',
  REJECTED: '#ba1a1a',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  NEW: 'New Order',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  COMPLETED: 'Delivered',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Map a MerchantOrder status to a tab key for filtering */
function statusToTab(status: string): OrderTab {
  for (const tab of ORDER_TABS) {
    if (tab.statuses.includes(status)) return tab.key;
  }
  return 'NEW';
}

/** Format an ISO date string into a relative time string */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
}

// ============================================
// MAIN SCREEN
// ============================================

let COLORS: ThemedColors;
let styles: any;

export default function MerchantDashboardScreen() {
  { const t = useTheme(); COLORS = makeThemedColors(t.isDark); styles = createStyles(COLORS); }
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    merchant,
    orders,
    analytics,
    fetchProfile,
    fetchOrders,
    fetchAnalytics,
    toggleAvailability,
    updateOrderStatus,
    isTogglingAvailability,
    isLoadingProfile,
    isLoadingOrders,
    isLoadingAnalytics,
    isUpdatingOrder,
    profileError,
    ordersError,
  } = useMerchantStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderTab>('NEW');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Fetch orders when merchant is loaded or tab changes
  useEffect(() => {
    if (merchant?.id) {
      const tab = ORDER_TABS.find(t => t.key === activeTab);
      // Fetch orders filtered by the statuses for the active tab
      // Use the first status as the API filter; we'll also include all tab statuses in client-side filter
      fetchOrders(merchant.id, tab?.statuses[0], 1);
    }
  }, [merchant?.id, activeTab]);

  const loadData = async () => {
    await fetchProfile();
    const state = useMerchantStore.getState();
    if (state.merchant?.id) {
      const tab = ORDER_TABS.find(t => t.key === activeTab);
      fetchOrders(state.merchant.id, tab?.statuses[0], 1);
      fetchAnalytics(state.merchant.id);
    }
  };

  useEffect(() => {
    if (merchant?.id && !analytics && !isLoadingAnalytics) {
      fetchAnalytics(merchant.id);
    }
  }, [merchant?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  const handleToggleAvailability = async () => {
    if (!merchant?.id) return;
    await toggleAvailability(merchant.id);
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'CONFIRMED');
      // Refresh orders after status change
      if (merchant?.id) {
        const tab = ORDER_TABS.find(t => t.key === activeTab);
        fetchOrders(merchant.id, tab?.statuses[0], 1);
      }
    } catch {
      Alert.alert('Error', 'Failed to accept order. Please try again.');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, 'REJECTED');
              // Refresh orders after status change
              if (merchant?.id) {
                const tab = ORDER_TABS.find(t => t.key === activeTab);
                fetchOrders(merchant.id, tab?.statuses[0], 1);
              }
            } catch {
              Alert.alert('Error', 'Failed to reject order. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${(amount || 0).toLocaleString()}`;
  };

  // Filter orders by active tab (client-side filtering across all statuses for the tab)
  const filteredOrders = orders.filter(o => {
    const tab = ORDER_TABS.find(t => t.key === activeTab);
    return tab ? tab.statuses.includes(o.status) : false;
  });

  // Count orders per tab from the full orders list
  const getTabCount = (tab: OrderTab): number => {
    const tabConfig = ORDER_TABS.find(t => t.key === tab);
    return tabConfig ? orders.filter(o => tabConfig.statuses.includes(o.status)).length : 0;
  };

  // Loading state (profile loading with no merchant)
  if (isLoadingProfile && !merchant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Error state (profile error with no merchant)
  if (profileError && !merchant) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
        </View>
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorText}>{profileError}</Text>
        <GradientButton
          title="Retry"
          onPress={loadData}
          variant="primary"
          size="md"
          style={{ marginTop: 24, width: 180 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header with GlowHeader */}
      <GlowHeader
        title="Merchant Dashboard"
        subtitle={merchant?.name || user?.name || 'Merchant'}
        rightAction={{
          icon: 'settings-outline' as const,
          onPress: () => {},
        }}
      >
        {/* Online/Offline toggle + Revenue summary */}
        <View style={styles.headerContent}>
          {/* Toggle */}
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityPill}>
              <View style={[
                styles.availabilityDot,
                merchant?.isOpen ? styles.availabilityDotOpen : styles.availabilityDotClosed,
              ]} />
              <Text style={[
                styles.availabilityLabel,
                merchant?.isOpen ? styles.openText : styles.closedText,
              ]}>
                {merchant?.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
            <Switch
              value={merchant?.isOpen ?? false}
              onValueChange={handleToggleAvailability}
              disabled={isTogglingAvailability || !merchant}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
              thumbColor={merchant?.isOpen ? COLORS.onPrimary : COLORS.outlineVariant}
            />
          </View>

          {/* Quick Revenue Stats */}
          <View style={styles.revenueRow}>
            <View style={styles.revenueItem}>
              <View style={styles.revenueIconCircle}>
                <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.revenueItemLabel}>Today</Text>
                <Text style={styles.revenueItemValue}>
                  {formatCurrency(analytics?.todayRevenue || 0)}
                </Text>
              </View>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueItem}>
              <View style={[styles.revenueIconCircle, { backgroundColor: COLORS.tertiaryFixed }]}>
                <Ionicons name="stats-chart-outline" size={18} color={COLORS.tertiary} />
              </View>
              <View>
                <Text style={styles.revenueItemLabel}>Orders</Text>
                <Text style={styles.revenueItemValue}>
                  {analytics?.totalOrders || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </GlowHeader>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Tabs — count above label (Stitch style) */}
        <View style={styles.tabsContainer}>
          {ORDER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  {count}
                </Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section label with auto-refresh indicator */}
        <View style={styles.ordersHeaderRow}>
          <Text style={styles.ordersHeaderLabel}>
            {activeTab === 'NEW' ? 'New Incoming Orders' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Orders`}
          </Text>
          <View style={styles.autoRefreshBadge}>
            <Ionicons name="refresh-outline" size={11} color={COLORS.onSurfaceVariant} />
            <Text style={styles.autoRefreshText}>Auto-refresh: 30s</Text>
          </View>
        </View>

        {/* Orders Loading State */}
        {isLoadingOrders && orders.length === 0 && (
          <View style={styles.ordersLoadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.ordersLoadingText}>Loading orders...</Text>
          </View>
        )}

        {/* Orders Error State */}
        {ordersError && orders.length === 0 && !isLoadingOrders && (
          <GlassCard variant="default" padding={SPACING.xl} borderRadius={RADIUS.xl} style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cloud-offline-outline" size={32} color={COLORS.error} />
            </View>
            <Text style={styles.emptyTitle}>Failed to load orders</Text>
            <Text style={styles.emptySubtitle}>{ordersError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (merchant?.id) {
                  const tab = ORDER_TABS.find(t => t.key === activeTab);
                  fetchOrders(merchant.id, tab?.statuses[0], 1);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={COLORS.onPrimary} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Order Cards */}
        {!isLoadingOrders && !ordersError && filteredOrders.length === 0 ? (
          <GlassCard variant="default" padding={SPACING.xl} borderRadius={RADIUS.xl} style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={32} color={COLORS.onSurfaceVariant} />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} orders</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'NEW'
                ? 'New orders will appear here when customers place them'
                : `No orders in ${activeTab.toLowerCase()} status right now`}
            </Text>
          </GlassCard>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isUpdating={isUpdatingOrder}
              onAccept={() => handleAcceptOrder(order.id)}
              onReject={() => handleRejectOrder(order.id)}
              onTap={() => {
                if (merchant?.id) {
                  router.push(`/merchant/orders/${order.id}?merchantId=${merchant.id}`);
                }
              }}
            />
          ))
        )}

        {/* Quick Actions Section */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/orders?merchantId=${merchant.id}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="receipt-outline" size={22} color={COLORS.onPrimaryFixed} />
            </View>
            <Text style={styles.actionLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/menu?merchantId=${merchant.id}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.tertiaryFixed }]}>
              <Ionicons name="restaurant-outline" size={22} color={COLORS.onTertiaryFixed} />
            </View>
            <Text style={styles.actionLabel}>Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/earnings?merchantId=${merchant.id}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.secondaryFixed }]}>
              <Ionicons name="wallet-outline" size={22} color={COLORS.onSecondaryFixed} />
            </View>
            <Text style={styles.actionLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.surfaceContainerHighest }]}>
              <Ionicons name="person-outline" size={22} color={COLORS.onSurface} />
            </View>
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// ORDER CARD COMPONENT
// ============================================

function OrderCard({
  order,
  isUpdating,
  onAccept,
  onReject,
  onTap,
}: {
  order: MerchantOrder;
  isUpdating: boolean;
  onAccept: () => void;
  onReject: () => void;
  onTap: () => void;
}) {
  const statusColor = ORDER_STATUS_COLORS[order.status] || COLORS.onSurfaceVariant;
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const isNew = ['NEW', 'PENDING'].includes(order.status);
  const itemCount = order.items?.length || 0;

  const paymentLabel = (order as any).paymentMethod === 'CASH'
    ? 'Pay on Delivery'
    : (order as any).paymentMethod === 'MTN_MOMO'
    ? 'Mobile Money Paid'
    : (order as any).paymentMethod === 'AIRTEL_MONEY'
    ? 'Airtel Money Paid'
    : statusLabel;

  return (
    <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={styles.orderCard}>
      <TouchableOpacity onPress={onTap} activeOpacity={0.7} disabled={isUpdating}>
        <View style={styles.orderCardInner}>
          {/* Order header: number + time left, amount + payment badge */}
          <View style={styles.orderHeaderRow}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>{order.orderNumber || `ORDER #SR-${order.id.slice(-4).toUpperCase()}`}</Text>
              {order.createdAt ? (
                <View style={styles.orderTimeRow}>
                  <Ionicons name="time-outline" size={12} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.orderTime}>Estimated pickup: {isNew ? '15 mins' : formatRelativeTime(order.createdAt)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.orderAmountBlock}>
              <Text style={styles.orderTotal}>UGX {(order.totalAmount || 0).toLocaleString()}</Text>
              <View style={[styles.paymentBadge, { backgroundColor: isNew ? COLORS.primaryFixed : COLORS.surfaceContainerHigh }]}>
                <Text style={[styles.paymentBadgeText, { color: isNew ? COLORS.primary : COLORS.onSurfaceVariant }]}>
                  {paymentLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Items list */}
          {order.items && order.items.length > 0 ? (
            <View style={styles.itemsList}>
              {order.items.slice(0, 3).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                </View>
              ))}
              {order.items.length > 3 && (
                <Text style={styles.moreItems}>+{order.items.length - 3} more items</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noItemsText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          )}

          {/* Action buttons for NEW orders */}
          {isNew && (
            <View style={styles.orderActions}>
              {/* Accept Order — full width primary */}
              <TouchableOpacity
                style={[styles.acceptButton, isUpdating && styles.actionDisabled]}
                onPress={onAccept}
                activeOpacity={0.7}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.onPrimary} />
                    <Text style={styles.acceptButtonText}>Accept Order</Text>
                  </>
                )}
              </TouchableOpacity>
              {/* Secondary row: Reject (outline error) + Call (outline) */}
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.callButton, isUpdating && styles.actionDisabled]}
                  onPress={onTap}
                  activeOpacity={0.7}
                  disabled={isUpdating}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.callButtonText}>In-app Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectButton, isUpdating && styles.actionDisabled]}
                  onPress={onReject}
                  activeOpacity={0.7}
                  disabled={isUpdating}
                >
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </GlassCard>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.bodySm,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  errorTitle: {
    color: COLORS.error,
    ...TYPOGRAPHY.headlineMd,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  // Header content
  headerContent: {
    marginTop: SPACING.sm,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityDotOpen: {
    backgroundColor: COLORS.primary,
  },
  availabilityDotClosed: {
    backgroundColor: COLORS.error,
  },
  availabilityLabel: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
  },
  openText: {
    color: COLORS.primary,
  },
  closedText: {
    color: COLORS.error,
  },

  // Revenue stats row
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  revenueItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  revenueIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueItemLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  revenueItemValue: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  revenueDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.outlineVariant,
    marginHorizontal: SPACING.md,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabCount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
  tabCountActive: {
    color: COLORS.primary,
  },
  tabLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Orders loading
  ordersLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  ordersLoadingText: {
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.bodySm,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },

  // Retry button
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  retryButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // Order card
  orderCard: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  orderCardInner: {
    padding: SPACING.md,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  orderNumber: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  orderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  orderTime: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  orderAmountBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  orderTotal: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  paymentBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  paymentBadgeText: {
    ...TYPOGRAPHY.labelMd,
    fontSize: 10,
    fontWeight: '600',
  },

  // Items list
  itemsList: {
    gap: 4,
    marginBottom: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  itemQtyBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  itemQtyText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  itemName: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
  },
  moreItems: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
    marginLeft: 36,
  },
  noItemsText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },

  // Order actions
  orderActions: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
  },
  acceptButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm + 2,
  },
  callButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm + 2,
  },
  rejectButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.error,
    fontWeight: '600',
  },
  actionDisabled: {
    opacity: 0.6,
  },

  // Orders section header
  ordersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  ordersHeaderLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  autoRefreshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  autoRefreshText: {
    ...TYPOGRAPHY.labelMd,
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },

  // Section label
  sectionLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  // Quick actions row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  actionCard: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
});
