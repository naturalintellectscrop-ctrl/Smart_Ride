// ============================================
// SMART RIDE MOBILE - MERCHANT DASHBOARD
// ============================================
// Main merchant dashboard with analytics overview
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
import { useAuthStore, useMerchantStore } from '@/src/store';
import { COLORS, ORDER_STATUS_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchProfile();
    // After profile is loaded, fetch analytics with the merchant ID
    const state = useMerchantStore.getState();
    if (state.merchant?.id) {
      fetchAnalytics(state.merchant.id);
    }
  };

  // When merchant data loads, fetch analytics
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
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorText}>{profileError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md || 56 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Merchant Dashboard</Text>
            <Text style={styles.merchantName}>{merchant?.name || user?.name || 'Merchant'}</Text>
          </View>
          <View style={styles.availabilityContainer}>
            <Text style={[styles.availabilityLabel, merchant?.isOpen ? styles.openText : styles.closedText]}>
              {merchant?.isOpen ? 'Open' : 'Closed'}
            </Text>
            <Switch
              value={merchant?.isOpen ?? false}
              onValueChange={handleToggleAvailability}
              disabled={isTogglingAvailability || !merchant}
              trackColor={{ false: '#374151', true: COLORS.primary }}
              thumbColor={merchant?.isOpen ? '#FFFFFF' : '#6B7280'}
            />
          </View>
        </View>
      </View>

      {/* Revenue Cards */}
      <View style={styles.revenueSection}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <View style={styles.revenueGrid}>
          <RevenueCard
            label="Today"
            amount={formatCurrency(analytics?.todayRevenue || 0)}
            icon="📊"
            color={COLORS.primary}
          />
          <RevenueCard
            label="This Week"
            amount={formatCurrency(analytics?.weekRevenue || 0)}
            icon="📈"
            color="#F59E0B"
          />
          <RevenueCard
            label="This Month"
            amount={formatCurrency(analytics?.monthRevenue || 0)}
            icon="💰"
            color="#8B5CF6"
          />
        </View>
      </View>

      {/* Orders Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orders Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <SummaryItem label="Active Orders" value={String(analytics?.activeOrders || 0)} color="#F59E0B" />
            <View style={styles.summaryDivider} />
            <SummaryItem label="Total Orders" value={String(analytics?.totalOrders || 0)} color={COLORS.primary} />
            <View style={styles.summaryDivider} />
            <SummaryItem label="Completed" value={String(analytics?.completedOrders || 0)} color="#22C55E" />
          </View>
          {analytics && analytics.cancelledOrders > 0 && (
            <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
              <SummaryItem label="Cancelled" value={String(analytics.cancelledOrders)} color="#EF4444" />
              <View style={styles.summaryDivider} />
              <SummaryItem label="Avg Rating" value={analytics.averageRating?.toFixed(1) || '-'} color="#F59E0B" />
              <View style={styles.summaryDivider} />
              <SummaryItem label="Customers" value={String(analytics.totalCustomers || 0)} color={COLORS.info} />
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="📋"
            label="Orders"
            subtitle="Manage orders"
            color={COLORS.primary}
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/orders?merchantId=${merchant.id}`);
              }
            }}
          />
          <QuickAction
            icon="🍽️"
            label="Menu"
            subtitle="Manage items"
            color="#F59E0B"
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/menu?merchantId=${merchant.id}`);
              }
            }}
          />
          <QuickAction
            icon="💵"
            label="Earnings"
            subtitle="View earnings"
            color="#8B5CF6"
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/earnings?merchantId=${merchant.id}`);
              }
            }}
          />
          <QuickAction
            icon="📦"
            label="Profile"
            subtitle="Edit details"
            color="#14B8A6"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Recent Orders Quick View */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity
            onPress={() => {
              if (merchant?.id) {
                router.push(`/merchant/orders?merchantId=${merchant.id}`);
              }
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No recent orders</Text>
          <Text style={styles.emptySubtext}>New orders will appear here</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function RevenueCard({ label, amount, icon, color }: { label: string; amount: string; icon: string; color: string }) {
  return (
    <View style={[styles.revenueCard, { borderColor: `${color}20` }]}>
      <Text style={styles.revenueIcon}>{icon}</Text>
      <Text style={styles.revenueAmount}>{amount}</Text>
      <Text style={[styles.revenueLabel, { color }]}>{label}</Text>
    </View>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, subtitle, color, onPress }: { icon: string; label: string; subtitle: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
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
  errorEmoji: {
    fontSize: 48,
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
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md - 4,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginBottom: SPACING.xs,
  },
  merchantName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineLgMobile,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  availabilityLabel: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  openText: {
    color: COLORS.primary,
  },
  closedText: {
    color: COLORS.error,
  },
  revenueSection: {
    paddingHorizontal: SPACING.md + 4,
    marginTop: SPACING.md + 4,
  },
  sectionTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
    marginBottom: SPACING.md - 4,
  },
  revenueGrid: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  revenueIcon: {
    fontSize: 20,
    marginBottom: SPACING.sm,
  },
  revenueAmount: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  revenueLabel: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: SPACING.md + 4,
    marginTop: SPACING.lg,
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...TYPOGRAPHY.headlineLgMobile,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    marginTop: SPACING.xs,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.outlineVariant,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm + 2,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm + 2,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md - 4,
  },
  seeAllText: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.md - 4,
  },
  emptyText: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
});
