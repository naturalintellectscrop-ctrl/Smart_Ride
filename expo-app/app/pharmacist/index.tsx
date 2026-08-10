// ============================================
// SMART RIDE MOBILE - PHARMACIST DASHBOARD
// ============================================
// Main dashboard for pharmacist/health provider
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
import { TYPOGRAPHY, SPACING } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  DetailSkeleton,
  OnlinePill,
  StatusBadge,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';
import { useProviderApprovalGate } from '@/src/hooks/useProviderApprovalGate';

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
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  // Approval gate: a pharmacist can't use the dashboard until an admin approves.
  const approvalGate = useProviderApprovalGate('PHARMACIST');
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


  // Not approved yet → show the approval-status screen instead of the dashboard.
  if (approvalGate) return approvalGate;

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        title="Pharmacist"
        subtitle={providerStatus.name || 'Dashboard'}
        variant="large"
        rightSlot={
          <OnlinePill
            isOnline={providerStatus.isOpen}
            onToggle={toggleStatus}
            labels={{ on: 'OPEN', off: 'CLOSED' }}
            disabled={isToggling}
          />
        }
        rightActions={[
          { icon: 'settings-outline', onPress: () => router.push('/settings' as never), label: 'Settings' },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Order Summary Cards */}
        <View style={styles.summaryRow}>
          <Card variant="accent" padding={14} style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{orderSummary.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </Card>
          <Card variant="accent" padding={14} style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{orderSummary.processing}</Text>
            <Text style={styles.summaryLabel}>Processing</Text>
          </Card>
          <Card padding={14} style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.success }]}>{orderSummary.completed}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </Card>
        </View>

        {/* Pending Prescriptions Alert */}
        {pendingPrescriptions > 0 && (
          <Card variant="accent" style={styles.alertCard}>
            <View style={styles.alertRow}>
              <Ionicons name="clipboard-outline" size={20} color={COLORS.primary} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Prescriptions Awaiting Review</Text>
                <Text style={styles.alertText}>{pendingPrescriptions} prescription(s) need verification</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/pharmacist/prescriptions')}>
                <Text style={styles.alertAction}>View →</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="cube-outline"
            title="Orders"
            subtitle={`${orderSummary.total} total`}
            onPress={() => router.push('/pharmacist/orders')}
          />
          <QuickActionCard
            icon="clipboard-outline"
            title="Prescriptions"
            subtitle={`${pendingPrescriptions} pending`}
            onPress={() => router.push('/pharmacist/prescriptions')}
          />
          <QuickActionCard
            icon="medkit-outline"
            title="Medicine Catalog"
            subtitle="Manage stock"
            onPress={() => router.push('/pharmacist/catalog')}
          />
          <QuickActionCard
            icon="wallet-outline"
            title="Earnings"
            subtitle="View revenue"
            onPress={() => router.push('/pharmacist/earnings')}
          />
        </View>

        {/* Status Overview */}
        <Text style={styles.sectionTitle}>Status Overview</Text>
        <Card>
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
        </Card>
      </ScrollView>
    </View>
  );
}

function QuickActionCard({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Card padding={SPACING.md} style={styles.actionCard} onPress={onPress} accessibilityLabel={title}>
        <Ionicons name={icon as any} size={24} color={COLORS.primary} />
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </Card>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
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
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  alertCard: {
    marginBottom: SPACING.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
  },
  alertText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  alertAction: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    marginBottom: SPACING.gutter,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    width: '47%',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
  },
  actionSubtitle: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.onSurfaceVariant,
  },
  statusValue: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
  },
  statusDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
});
