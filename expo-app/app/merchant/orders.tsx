// ============================================
// SMART RIDE MOBILE - MERCHANT ORDERS SCREEN
// ============================================
// Order management with tab filters and actions
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { COLORS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { MerchantOrder } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ORDER_CREATED', label: 'New' },
  { key: 'MERCHANT_ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'DELIVERED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function MerchantOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const merchantId = params.merchantId as string;

  const orders = useMerchantStore(s => s.orders);
  const isLoadingOrders = useMerchantStore(s => s.isLoadingOrders);
  const ordersError = useMerchantStore(s => s.ordersError);
  const fetchOrders = useMerchantStore(s => s.fetchOrders);
  const updateOrderStatus = useMerchantStore(s => s.updateOrderStatus);
  const isUpdatingOrder = useMerchantStore(s => s.isUpdatingOrder);

  const [activeTab, setActiveTab] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (merchantId) {
      fetchOrders(merchantId, activeTab === 'ALL' ? undefined : activeTab);
    }
  }, [merchantId, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (merchantId) {
      await fetchOrders(merchantId, activeTab === 'ALL' ? undefined : activeTab);
    }
    setRefreshing(false);
  }, [merchantId, activeTab]);

  const handleOrderPress = (order: MerchantOrder) => {
    router.push(`/merchant/orders/${order.id}?merchantId=${merchantId}`);
  };

  const handleUpdateStatus = async (orderId: string, status: string, e?: any) => {
    if (e) e.stopPropagation();
    setUpdatingOrderId(orderId);
    await updateOrderStatus(orderId, status);
    setUpdatingOrderId(null);
    // Refresh orders
    if (merchantId) {
      fetchOrders(merchantId, activeTab === 'ALL' ? undefined : activeTab);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    return ORDER_STATUS_COLORS[status] || COLORS.textMuted;
  };

  const getAvailableActions = (status: string): { label: string; status: string; variant: 'primary' | 'secondary' | 'danger' }[] => {
    switch (status) {
      case 'ORDER_CREATED':
      case 'PAYMENT_CONFIRMED':
        return [
          { label: 'Accept', status: 'MERCHANT_ACCEPTED', variant: 'primary' },
          { label: 'Reject', status: 'CANCELLED', variant: 'danger' },
        ];
      case 'MERCHANT_ACCEPTED':
        return [
          { label: 'Start Preparing', status: 'PREPARING', variant: 'primary' },
        ];
      case 'PREPARING':
        return [
          { label: 'Mark Ready', status: 'READY_FOR_PICKUP', variant: 'primary' },
        ];
      case 'READY_FOR_PICKUP':
        return [];
      default:
        return [];
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Tab Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.listContent}
      >
        {isLoadingOrders && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : ordersError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{ordersError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => merchantId && fetchOrders(merchantId, activeTab === 'ALL' ? undefined : activeTab)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={32} color={COLORS.outlineVariant} />
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'ALL' ? 'Orders will appear here when customers place them' : `No ${ORDER_STATUS_LABELS[activeTab]?.toLowerCase() || activeTab.toLowerCase()} orders`}
            </Text>
          </View>
        ) : (
          orders.map(order => {
            const actions = getAvailableActions(order.status);
            const statusColor = getStatusColor(order.status);
            const isUpdating = updatingOrderId === order.id;

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => handleOrderPress(order)}
                activeOpacity={0.7}
              >
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>#{order.orderNumber || order.id.slice(-6)}</Text>
                    <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}30` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Text>
                  </View>
                </View>

                {/* Order Details */}
                <View style={styles.orderDetails}>
                  <View style={styles.orderMeta}>
                    <Ionicons name="person-outline" size={14} color={COLORS.onSurfaceVariant} />
                    <Text style={styles.metaText}>{(order as any).customerName || 'Customer'}</Text>
                  </View>
                  <View style={styles.orderMeta}>
                    <Ionicons name="cube-outline" size={14} color={COLORS.onSurfaceVariant} />
                    <Text style={styles.metaText}>{order.items?.length || 0} item(s)</Text>
                  </View>
                  <Text style={styles.orderTotal}>{formatCurrency(order.totalAmount)}</Text>
                </View>

                {/* Action Buttons */}
                {actions.length > 0 && (
                  <View style={styles.actionRow}>
                    {actions.map(action => (
                      <TouchableOpacity
                        key={action.status}
                        style={[
                          styles.actionButton,
                          action.variant === 'primary' && styles.actionPrimary,
                          action.variant === 'danger' && styles.actionDanger,
                          action.variant === 'secondary' && styles.actionSecondary,
                          isUpdating && styles.actionDisabled,
                        ]}
                        onPress={(e) => handleUpdateStatus(order.id, action.status, e)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={action.variant === 'primary' ? COLORS.background : '#FFFFFF'} />
                        ) : (
                          <Text style={[
                            styles.actionButtonText,
                            action.variant === 'primary' && styles.actionPrimaryText,
                            action.variant === 'danger' && styles.actionDangerText,
                            action.variant === 'secondary' && styles.actionSecondaryText,
                          ]}>
                            {action.label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
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
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
  },
  headerSpacer: {
    width: 36,
  },
  tabContainer: {
    backgroundColor: COLORS.surfaceContainerLowest,
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  tabContent: {
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    marginRight: SPACING.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.onPrimary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md - 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.bodySm,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: SPACING.md - 4,
  },
  errorText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  orderCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md - 4,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  orderNumber: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  orderTime: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
    fontSize: 11,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
  },
  orderTotal: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md - 4,
    paddingTop: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionDanger: {
    backgroundColor: `${COLORS.error}15`,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  actionSecondary: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  actionPrimaryText: {
    color: COLORS.onPrimary,
  },
  actionDangerText: {
    color: COLORS.error,
  },
  actionSecondaryText: {
    color: COLORS.onSurface,
  },
});
