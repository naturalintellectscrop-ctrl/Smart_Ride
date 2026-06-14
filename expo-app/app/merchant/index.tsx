// ============================================
// SMART RIDE MOBILE - MERCHANT DASHBOARD
// ============================================
// Stitch Design System — Merchant Orders
// Order tabs with badges, order cards, Accept/Reject
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useMerchantStore } from '@/src/store';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '@/src/constants';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { GlowHeader } from '@/src/components/GlowHeader';

// ============================================
// LOCAL CONSTANTS (not yet in shared constants)
// ============================================

type OrderTab = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';

const ORDER_TABS: { key: OrderTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'NEW', label: 'New', icon: 'alert-circle-outline' },
  { key: 'PREPARING', label: 'Preparing', icon: 'restaurant-outline' },
  { key: 'READY', label: 'Ready', icon: 'checkmark-circle-outline' },
  { key: 'COMPLETED', label: 'Completed', icon: 'checkmark-done-circle-outline' },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.tertiary,
  NEW: '#F59E0B',
  CONFIRMED: COLORS.primary,
  PREPARING: COLORS.primaryContainer,
  READY: COLORS.secondary,
  COMPLETED: COLORS.primary,
  CANCELLED: COLORS.error,
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  NEW: 'New Order',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Mock orders for Stitch design demonstration
interface MockOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: OrderTab;
  time: string;
}

const MOCK_ORDERS: MockOrder[] = [
  { id: '1', orderNumber: '#SR-1024', customerName: 'Alice Namuli', itemCount: 3, total: 25000, status: 'NEW', time: '2 min ago' },
  { id: '2', orderNumber: '#SR-1023', customerName: 'Bob Mukasa', itemCount: 1, total: 8500, status: 'NEW', time: '5 min ago' },
  { id: '3', orderNumber: '#SR-1022', customerName: 'Carol Achieng', itemCount: 2, total: 18000, status: 'PREPARING', time: '12 min ago' },
  { id: '4', orderNumber: '#SR-1021', customerName: 'David Ochieng', itemCount: 4, total: 42000, status: 'READY', time: '20 min ago' },
  { id: '5', orderNumber: '#SR-1020', customerName: 'Esther Nalubega', itemCount: 2, total: 15000, status: 'COMPLETED', time: '1 hr ago' },
];

export default function MerchantDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    merchant,
    analytics,
    fetchProfile,
    fetchAnalytics,
    toggleAvailability,
    isTogglingAvailability,
    isLoadingProfile,
    isLoadingAnalytics,
    profileError,
    analyticsError,
  } = useMerchantStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderTab>('NEW');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchProfile();
    const state = useMerchantStore.getState();
    if (state.merchant?.id) {
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
  }, []);

  const handleToggleAvailability = async () => {
    if (!merchant?.id) return;
    await toggleAvailability(merchant.id);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${(amount || 0).toLocaleString()}`;
  };

  // Count orders per tab
  const getTabCount = (tab: OrderTab): number => {
    return MOCK_ORDERS.filter(o => o.status === tab).length;
  };

  // Filter orders by active tab
  const filteredOrders = MOCK_ORDERS.filter(o => o.status === activeTab);

  // Loading state
  if (isLoadingProfile && !merchant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Error state
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
        {/* Order Tabs with Badges — Stitch Design */}
        <View style={styles.tabsContainer}>
          {ORDER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? COLORS.onPrimary : COLORS.onSurfaceVariant}
                />
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.tabBadge,
                    isActive ? styles.tabBadgeActive : styles.tabBadgeInactive,
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      isActive && styles.tabBadgeTextActive,
                    ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order Cards */}
        {filteredOrders.length === 0 ? (
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
              onAccept={() => {}}
              onReject={() => {}}
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
            onPress={() => {}}
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
  onAccept,
  onReject,
  onTap,
}: {
  order: MockOrder;
  onAccept: () => void;
  onReject: () => void;
  onTap: () => void;
}) {
  const statusColor = ORDER_STATUS_COLORS[order.status] || COLORS.onSurfaceVariant;
  const isNew = order.status === 'NEW';

  return (
    <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={styles.orderCard}>
      <TouchableOpacity onPress={onTap} activeOpacity={0.7}>
        <View style={styles.orderCardInner}>
          {/* Order header row */}
          <View style={styles.orderHeaderRow}>
            <View style={styles.orderHeaderLeft}>
              <View style={[styles.orderStatusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            </View>
            <Text style={styles.orderTime}>{order.time}</Text>
          </View>

          {/* Customer & Items */}
          <View style={styles.orderDetailsRow}>
            <View style={styles.customerInfo}>
              <View style={styles.customerIconCircle}>
                <Ionicons name="person-outline" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.customerName}>{order.customerName}</Text>
            </View>
            <View style={styles.orderMeta}>
              <View style={styles.itemCountBadge}>
                <Ionicons name="bag-outline" size={12} color={COLORS.onSurfaceVariant} />
                <Text style={styles.itemCountText}>{order.itemCount} items</Text>
              </View>
              <Text style={styles.orderTotal}>UGX {order.total.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action buttons for NEW orders */}
          {isNew && (
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={onReject}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={COLORS.error} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={onAccept}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={16} color={COLORS.onPrimary} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
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

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  tabLabelActive: {
    color: COLORS.onPrimary,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.onPrimary,
  },
  tabBadgeInactive: {
    backgroundColor: COLORS.outlineVariant,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  tabBadgeTextActive: {
    color: COLORS.primary,
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

  // Order card
  orderCard: {
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  orderCardInner: {
    padding: SPACING.md,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  orderStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderNumber: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  orderTime: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  orderDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  itemCountText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  orderTotal: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '700',
    color: COLORS.onSurface,
  },

  // Order actions
  orderActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
  },
  rejectButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onErrorContainer,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
  },
  acceptButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
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
