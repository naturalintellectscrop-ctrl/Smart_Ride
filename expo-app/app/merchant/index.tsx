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
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useMerchantStore } from '@/src/store';
import { useProviderApprovalGate } from '@/src/hooks/useProviderApprovalGate';
import { MerchantOrder } from '@/src/types';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GradientButton } from '@/src/components/GradientButton';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  OnlinePill,
  SegmentedControl,
  StatusBadge,
} from '@/src/components';
import { statusColor } from '@/src/theme/statusColors';

// ============================================
// LOCAL CONSTANTS
// ============================================

type OrderTab = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';

// Real OrderStatus values, not invented ones.
//
// These tabs were filtering on 'NEW', 'PENDING', 'CONFIRMED', 'READY' and
// 'COMPLETED' — five names that do not exist in the OrderStatus enum. Prisma
// rejected the invalid value and the whole request 500'd, so the dashboard read
// "Failed to load orders" on every tab except by accident. Only 'PREPARING' and
// 'DELIVERED' were ever real.
//
// Each tab is a PHASE, so it carries every status belonging to that phase and
// nothing falls through the gaps: an order picked up by a courier is still
// visible to the merchant, and an order awaiting acceptance shows whether or
// not payment has landed yet.
const ORDER_TABS: { key: OrderTab; label: string; icon: keyof typeof Ionicons.glyphMap; statuses: string[] }[] = [
  { key: 'NEW', label: 'New', icon: 'alert-circle-outline', statuses: ['ORDER_CREATED', 'PAYMENT_CONFIRMED'] },
  { key: 'PREPARING', label: 'Preparing', icon: 'restaurant-outline', statuses: ['MERCHANT_ACCEPTED', 'PREPARING'] },
  { key: 'READY', label: 'Ready', icon: 'checkmark-circle-outline', statuses: ['READY_FOR_PICKUP', 'PICKED_UP'] },
  { key: 'COMPLETED', label: 'Completed', icon: 'checkmark-done-circle-outline', statuses: ['DELIVERED'] },
];

// Status colours come from the shared semantic mapping. This table was the
// seventh hardcoded copy found during the migration.

// Keyed on real OrderStatus values. The old table was keyed on the same
// invented names as the tabs, so an order card fell through to showing the raw
// enum — "PAYMENT_CONFIRMED" in a status pill meant for a human.
const ORDER_STATUS_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Awaiting payment',
  PAYMENT_CONFIRMED: 'New order',
  MERCHANT_ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'With the courier',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Map a MerchantOrder status to a tab key for filtering */

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


export default function MerchantDashboardScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { user } = useAuthStore();
  // Approval gate: a merchant can't use the dashboard until an admin approves.
  const approvalGate = useProviderApprovalGate('MERCHANT');
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
      fetchOrders(merchant.id, tab?.statuses.join(","), 1);
    }
  }, [merchant?.id, activeTab]);

  const loadData = async () => {
    await fetchProfile();
    const state = useMerchantStore.getState();
    if (state.merchant?.id) {
      const tab = ORDER_TABS.find(t => t.key === activeTab);
      fetchOrders(state.merchant.id, tab?.statuses.join(","), 1);
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
        fetchOrders(merchant.id, tab?.statuses.join(","), 1);
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
                fetchOrders(merchant.id, tab?.statuses.join(","), 1);
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

  // Not approved yet → show the approval-status screen instead of the dashboard.
  if (approvalGate) return approvalGate;

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
      <AppHeader
        title="Merchant Dashboard"
        subtitle={merchant?.name || user?.name || 'Merchant'}
        rightSlot={
          <OnlinePill
            isOnline={merchant?.isOpen ?? false}
            onToggle={handleToggleAvailability}
            labels={{ on: 'OPEN', off: 'CLOSED' }}
            disabled={isTogglingAvailability || !merchant}
          />
        }
        rightActions={[
          { icon: 'notifications-outline', onPress: () => router.push('/notifications'), label: 'Notifications' },
        ]}
      />

        {/* Availability now lives in the header as OnlinePill; this block kept
            its own duplicate pill and a bare RN <Switch>, which §4 bans. */}
        <View style={styles.headerContent}>
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


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status filter. Counts ride in the label so the segmented control
            carries the same information the bespoke tabs did. */}
        <View style={styles.tabsWrap}>
          <SegmentedControl
            segments={ORDER_TABS.map((tab) => ({
              value: tab.key,
              label: `${tab.label} ${getTabCount(tab.key)}`,
            }))}
            value={activeTab}
            onChange={(v) => setActiveTab(v as typeof activeTab)}
          />
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
          <ListSkeleton rows={3} />
        )}

        {/* Orders Error State */}
        {ordersError && orders.length === 0 && !isLoadingOrders && (
          <ErrorState
            title="Failed to load orders"
            subtitle={ordersError}
            onRetry={() => {
              if (merchant?.id) {
                const tab = ORDER_TABS.find((t) => t.key === activeTab);
                fetchOrders(merchant.id, tab?.statuses.join(","), 1);
              }
            }}
          />
        )}

        {/* Order Cards */}
        {!isLoadingOrders && !ordersError && filteredOrders.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={`No ${activeTab.toLowerCase()} orders`}
            subtitle={
              activeTab === 'NEW'
                ? 'New orders will appear here when customers place them.'
                : `No orders in ${activeTab.toLowerCase()} status right now.`
            }
          />
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
            onPress={() => router.push('/settings' as never)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: COLORS.surfaceContainerHighest }]}>
              <Ionicons name="settings-outline" size={22} color={COLORS.onSurface} />
            </View>
            <Text style={styles.actionLabel}>Settings</Text>
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
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const statusTint = statusColor(order.status, COLORS);
  const statusText = ORDER_STATUS_LABELS[order.status] || order.status;
  // Awaiting the merchant's decision. This tested for 'NEW' and 'PENDING',
  // neither of which is an OrderStatus, so it was permanently false and the
  // Accept and Reject buttons never rendered — the merchant could see an order
  // and had no way to act on it.
  //
  // Only PAYMENT_CONFIRMED is offered: the backend refuses accept before the
  // customer has paid ('Order must be in PAYMENT_CONFIRMED status'), so showing
  // the button on ORDER_CREATED would promise an action the server rejects.
  const isNew = order.status === 'PAYMENT_CONFIRMED';
  const itemCount = order.items?.length || 0;

  const paymentLabel = (order as any).paymentMethod === 'CASH'
    ? 'Pay on Delivery'
    : (order as any).paymentMethod === 'MTN_MOMO'
    ? 'Mobile Money Paid'
    : (order as any).paymentMethod === 'AIRTEL_MONEY'
    ? 'Airtel Money Paid'
    : statusText;

  return (
    <Card variant="raised" padding={0} radius={RADIUS.xl} style={styles.orderCard}>
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
              <StatusBadge label={statusText} color={statusTint} size="sm" />
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
    </Card>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  tabsWrap: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.gutter },
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

  // Orders loading

  // Empty state

  // Retry button

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
