// ============================================
// SMART RIDE MOBILE - PHARMACIST DASHBOARD
// ============================================
// Main dashboard for pharmacist/health provider
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS, GRADIENTS } from '@/src/constants';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

interface OrderSummary {
  pending: number;
  processing: number;
  completed: number;
  total: number;
}

interface ProviderStatus {
  isOpen: boolean;
  name?: string;
}

export default function PharmacistDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ pending: 0, processing: 0, completed: 0, total: 0 });
  const [pendingPrescriptions, setPendingPrescriptions] = useState(0);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({ isOpen: false });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [ordersRes, prescriptionsRes, statusRes] = await Promise.allSettled([
        api.getHealthProviderOrders(),
        api.getPrescriptions('PENDING'),
        api.getHealthProviderStatus(),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.success && ordersRes.value.data) {
        const orders = ordersRes.value.data.orders || ordersRes.value.data.data || ordersRes.value.data || [];
        const orderArray = Array.isArray(orders) ? orders : [];
        const pending = orderArray.filter((o: any) => o.status === 'PENDING' || o.status === 'ORDER_CREATED').length;
        const processing = orderArray.filter((o: any) => o.status === 'PROCESSING' || o.status === 'PREPARING').length;
        const completed = orderArray.filter((o: any) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;
        setOrderSummary({ pending, processing, completed, total: orderArray.length });
      }

      if (prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value.success && prescriptionsRes.value.data) {
        const prescriptions = prescriptionsRes.value.data.prescriptions || prescriptionsRes.value.data.data || prescriptionsRes.value.data || [];
        setPendingPrescriptions(Array.isArray(prescriptions) ? prescriptions.length : 0);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.success && statusRes.value.data) {
        setProviderStatus({
          isOpen: statusRes.value.data.isOpen ?? statusRes.value.data.status === 'OPEN',
          name: statusRes.value.data.name,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const toggleStatus = async () => {
    setIsToggling(true);
    try {
      const newStatus = !providerStatus.isOpen;
      const response = await api.updateHealthProviderStatus({ status: newStatus ? 'OPEN' : 'CLOSED' });
      if (response.success) {
        setProviderStatus(prev => ({ ...prev, isOpen: newStatus }));
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundElevated]}
        style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>💊 Pharmacist</Text>
            <Text style={styles.headerSubtitle}>
              {providerStatus.name || 'Dashboard'}
            </Text>
          </View>
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: providerStatus.isOpen ? COLORS.primary : COLORS.textMuted }]}>
              {providerStatus.isOpen ? 'Open' : 'Closed'}
            </Text>
            <Switch
              value={providerStatus.isOpen}
              onValueChange={toggleStatus}
              disabled={isToggling}
              trackColor={{ false: COLORS.backgroundSurface, true: `${COLORS.primary}40` }}
              thumbColor={providerStatus.isOpen ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Order Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassCard variant="accent" padding={14} style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{orderSummary.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </GlassCard>
          <GlassCard variant="cyan" padding={14} style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{orderSummary.processing}</Text>
            <Text style={styles.summaryLabel}>Processing</Text>
          </GlassCard>
          <GlassCard padding={14} style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.success }]}>{orderSummary.completed}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </GlassCard>
        </View>

        {/* Pending Prescriptions Alert */}
        {pendingPrescriptions > 0 && (
          <GlassCard variant="accent" style={styles.alertCard}>
            <View style={styles.alertRow}>
              <Text style={styles.alertIcon}>📋</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Prescriptions Awaiting Review</Text>
                <Text style={styles.alertText}>{pendingPrescriptions} prescription(s) need verification</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/pharmacist/prescriptions')}>
                <Text style={styles.alertAction}>View →</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="📦"
            title="Orders"
            subtitle={`${orderSummary.total} total`}
            onPress={() => router.push('/pharmacist/orders')}
          />
          <QuickActionCard
            icon="📋"
            title="Prescriptions"
            subtitle={`${pendingPrescriptions} pending`}
            onPress={() => router.push('/pharmacist/prescriptions')}
          />
          <QuickActionCard
            icon="💊"
            title="Medicine Catalog"
            subtitle="Manage stock"
            onPress={() => router.push('/pharmacist/catalog')}
          />
          <QuickActionCard
            icon="💰"
            title="Earnings"
            subtitle="View revenue"
            onPress={() => router.push('/pharmacist/earnings')}
          />
        </View>

        {/* Status Overview */}
        <Text style={styles.sectionTitle}>Status Overview</Text>
        <GlassCard>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Store Status</Text>
            <StatusBadge
              label={providerStatus.isOpen ? 'OPEN' : 'CLOSED'}
              color={providerStatus.isOpen ? COLORS.success : COLORS.error}
              size="md"
            />
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pending Orders</Text>
            <Text style={styles.statusValue}>{orderSummary.pending}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Prescriptions</Text>
            <Text style={styles.statusValue}>{pendingPrescriptions}</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function QuickActionCard({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard padding={14} style={styles.actionCard}>
        <Text style={styles.actionIcon}>{icon}</Text>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </GlassCard>
    </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  glowBorder: {
    height: 1,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  alertCard: {
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  alertAction: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
