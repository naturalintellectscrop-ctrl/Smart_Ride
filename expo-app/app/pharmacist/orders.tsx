// ============================================
// SMART RIDE MOBILE - PHARMACIST ORDERS SCREEN
// ============================================
// Health order management with status tabs
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

type OrderTab = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

const ORDER_TABS: { key: OrderTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: COLORS.warning,
  ORDER_CREATED: COLORS.info,
  PROCESSING: '#F97316',
  PREPARING: '#F97316',
  COMPLETED: COLORS.success,
  DELIVERED: COLORS.success,
  READY_FOR_PICKUP: COLORS.primary,
  CANCELLED: COLORS.error,
};

export default function PharmacistOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundElevated]}
        style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
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
                <GlassCard style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber || order.id?.slice(-6)}</Text>
                    <StatusBadge
                      label={order.status || 'UNKNOWN'}
                      color={STATUS_COLORS[order.status] || COLORS.textMuted}
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
                </GlassCard>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ALL' ? 'Orders will appear here when patients place them' : `No ${activeTab.toLowerCase()} orders`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: TYPOGRAPHY.headlineLg.fontSize,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  glowBorder: {
    height: 1,
    marginTop: SPACING.md,
  },
  tabsContainer: {
    maxHeight: 52,
    backgroundColor: COLORS.backgroundElevated,
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
    backgroundColor: COLORS.backgroundSurface,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: `${COLORS.primary}40`,
    borderWidth: 1,
  },
  tabText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.textMuted,
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
    color: COLORS.text,
  },
  orderInfo: {
    marginBottom: 6,
  },
  orderLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  orderValue: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.textMuted,
  },
  orderAmount: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
