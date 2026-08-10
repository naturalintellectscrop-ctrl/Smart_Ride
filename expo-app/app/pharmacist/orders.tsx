// ============================================
// SMART RIDE MOBILE - PHARMACIST ORDERS SCREEN
// ============================================
// Health order management with status tabs
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { statusColor } from '@/src/theme/statusColors';
import {
  AppHeader,
  Card,
  EmptyState,
  ListSkeleton,
  StatusBadge,
} from '@/src/components';

type OrderTab = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

const ORDER_TABS: { key: OrderTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// Status colours resolve through the shared semantic mapping rather than a
// local hex table — this was one of several near-identical copies.


export default function PharmacistOrdersScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderTab>('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const statusFilter = activeTab === 'ALL' ? undefined : activeTab;
      const response = await api.getHealthOrders(statusFilter);
      if (response.success && response.data) {
        const orderData = response.data.orders || response.data.data || response.data;
        setOrders(Array.isArray(orderData) ? orderData : []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setIsLoading(true);
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Orders" onBack={() => router.back()} />

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {ORDER_TABS.map(tab => (
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
      {isLoading ? (
      <ListSkeleton />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {orders.length > 0 ? (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => router.push(`/pharmacist/orders/${order.id}`)}
                activeOpacity={0.7}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber || order.id?.slice(-6)}</Text>
                    <StatusBadge
                      label={order.status || 'UNKNOWN'}
                      color={statusColor(order.status, COLORS)}
                      size="sm"
                    />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderLabel}>Patient</Text>
                    <Text style={styles.orderValue}>{order.patientName || order.customerName || order.client?.name || 'N/A'}</Text>
                  </View>
                  {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderLabel}>Items</Text>
                      <Text style={styles.orderValue} numberOfLines={2}>
                        {order.items.map((i: any) => i.name || i.medicineName || 'Item').join(', ')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.orderFooter}>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    <Text style={styles.orderAmount}>{formatCurrency(order.totalAmount || order.amount)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="cube-outline"
              title="No orders found"
              subtitle={"{activeTab === 'ALL' ? 'Orders will appear here when patients place them' : `No ${activeTab.toLowerCase()} orders`}"}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  tabsContainer: {
    maxHeight: 52,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: `${COLORS.primary}40`,
    borderWidth: 1,
  },
  tabText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.gutter,
    paddingBottom: 40,
  },
  orderCard: {
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
  },
  orderInfo: {
    marginBottom: 6,
  },
  orderLabel: {
    fontSize: 11,
    color: COLORS.outline,
    textTransform: 'uppercase',
  },
  orderValue: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
  },
  orderAmount: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.primary,
  },
});
