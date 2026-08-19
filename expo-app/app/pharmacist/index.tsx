// ============================================
// SMART RIDE MOBILE - PHARMACIST DASHBOARD
// ============================================
// The pharmacy's home screen. Built around the one question a pharmacist opens
// the app to answer — "what needs me right now?" — so the three counts that
// answer it come first, and each one is a way through to the work behind it
// rather than a number you can only look at.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { SPACING } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { AppHeader, DetailSkeleton, OnlinePill } from '@/src/components';
import {
  ActionTile,
  MoneyHero,
  OverviewRow,
  Panel,
  SectionTitle,
  Sparkline,
  StatTile,
  TonePill,
} from '@/src/components/pharmacy';
import { Ionicons } from '@expo/vector-icons';
import { useProviderApprovalGate } from '@/src/hooks/useProviderApprovalGate';

interface OrderSummary {
  needsAction: number;
  inProgress: number;
  completed: number;
  total: number;
}

interface ProviderStatus {
  isOpen: boolean;
  name?: string;
  verified?: boolean;
}

const UGX = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PharmacistDashboard() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const approvalGate = useProviderApprovalGate('PHARMACIST');

  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    needsAction: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  });
  const [pendingPrescriptions, setPendingPrescriptions] = useState(0);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({ isOpen: false });
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [week, setWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
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
        const payload: any = ordersRes.value.data;
        const orders = payload.orders || payload.data || payload || [];
        const orderArray: any[] = Array.isArray(orders) ? orders : [];

        // Grouped by what the pharmacist has to DO, using the statuses the
        // server actually issues. This counted PENDING / PROCESSING /
        // ORDER_CREATED / COMPLETED — none of which a ProviderOrder is ever set
        // to — so every tile read zero while real orders sat in the list behind
        // it. Third screen with the same enum drift.
        const needsAction = orderArray.filter((o) => o.status === 'ORDER_RECEIVED').length;
        const inProgress = orderArray.filter((o) =>
          ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'].includes(
            o.status
          )
        ).length;
        const completed = orderArray.filter((o) => o.status === 'DELIVERED').length;
        setOrderSummary({ needsAction, inProgress, completed, total: orderArray.length });

        // Today's takings and the week behind them, from the same order list —
        // the pharmacy's own share, not the customer's total.
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const days = [0, 0, 0, 0, 0, 0, 0];
        let today = 0;
        let todayCount = 0;

        for (const o of orderArray) {
          if (o.status !== 'DELIVERED') continue;
          const when = new Date(o.deliveredAt || o.updatedAt || o.createdAt).getTime();
          if (Number.isNaN(when)) continue;
          const earned = Number(o.providerEarnings ?? 0);
          if (when >= startOfToday) {
            today += earned;
            todayCount += 1;
          }
          const daysAgo = Math.floor((startOfToday - when) / 86_400_000);
          if (daysAgo >= 0 && daysAgo < 7) days[6 - daysAgo] += earned;
          else if (daysAgo < 0) days[6] += earned;
        }
        setTodayEarnings(today);
        setTodayOrders(todayCount);
        setWeek(days);
      }

      if (
        prescriptionsRes.status === 'fulfilled' &&
        prescriptionsRes.value.success &&
        prescriptionsRes.value.data
      ) {
        const payload: any = prescriptionsRes.value.data;
        const prescriptions = payload.prescriptions || payload.data || payload || [];
        setPendingPrescriptions(Array.isArray(prescriptions) ? prescriptions.length : 0);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.success && statusRes.value.data) {
        // GET /health-provider/status answers { success, provider: {...} }, not
        // the usual { success, data }, so the open state lives at
        // provider.isOpenNow.
        const p: any = (statusRes.value.data as any).provider ?? statusRes.value.data;
        setProviderStatus({
          isOpen: p?.isOpenNow ?? p?.isOpen ?? false,
          name: p?.businessName ?? p?.name,
          verified: p?.verificationStatus === 'APPROVED',
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
    // Never show the new state before the server has agreed to it — a pill that
    // flips optimistically and silently fails tells a pharmacist they are open
    // for business when they are not.
    setIsToggling(true);
    const next = !providerStatus.isOpen;
    try {
      const response = await api.updateHealthProviderStatus({ status: next ? 'OPEN' : 'CLOSED' });
      if (response.success) {
        setProviderStatus((prev) => ({ ...prev, isOpen: next }));
      } else {
        Alert.alert(
          'Could not update',
          response.error || 'The pharmacy status was not changed. Please try again.'
        );
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      Alert.alert('Could not update', 'The pharmacy status was not changed. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  if (approvalGate) return approvalGate;
  if (isLoading) return <DetailSkeleton />;

  const weekTotal = week.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      {/* The pharmacy names itself in the greeting below, so the header does
          not repeat it — it carries only the controls. */}
      <AppHeader
        title=""
        rightSlot={
          <OnlinePill
            isOnline={providerStatus.isOpen}
            onToggle={toggleStatus}
            labels={{ on: 'OPEN', off: 'CLOSED' }}
            disabled={isToggling}
          />
        }
        rightActions={[
          {
            icon: 'notifications-outline',
            onPress: () => router.push('/notifications' as never),
            label: 'Notifications',
          },
          {
            icon: 'settings-outline',
            onPress: () => router.push('/settings' as never),
            label: 'Settings',
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Who, and whether the shop is trading */}
        <View style={styles.greeting}>
          <Text style={styles.greetingSmall}>Welcome back,</Text>
          <Text style={styles.greetingName} numberOfLines={2}>
            {providerStatus.name || 'Your pharmacy'}
          </Text>
          <View style={styles.greetingMeta}>
            {providerStatus.verified ? (
              <TonePill label="VERIFIED" tone="green" icon="shield-checkmark" />
            ) : null}
            <TonePill
              label={providerStatus.isOpen ? 'OPEN FOR ORDERS' : 'CLOSED'}
              tone={providerStatus.isOpen ? 'green' : 'amber'}
              icon={providerStatus.isOpen ? 'ellipse' : 'moon'}
            />
          </View>
        </View>

        {/* What needs you, right now */}
        <View style={styles.statRow}>
          <StatTile
            tone="amber"
            icon="bag-handle"
            value={orderSummary.needsAction}
            label="Needs action"
            actionLabel="Open"
            onPress={() => router.push('/pharmacist/orders?tab=NEW' as never)}
          />
          <StatTile
            tone="blue"
            icon="time"
            value={orderSummary.inProgress}
            label="In progress"
            actionLabel="Open"
            onPress={() => router.push('/pharmacist/orders?tab=ACTIVE' as never)}
          />
          <StatTile
            tone="green"
            icon="checkmark-circle"
            value={orderSummary.completed}
            label="Delivered"
            actionLabel="Open"
            onPress={() => router.push('/pharmacist/orders?tab=DELIVERED' as never)}
          />
        </View>

        {/* Money, on its own field so it is never read as an ordinary statistic */}
        <View style={styles.moneyWrap}>
          <MoneyHero
            caption="Today's earnings"
            amount={UGX(todayEarnings)}
            meta={`${todayOrders} order${todayOrders === 1 ? '' : 's'} today · ${UGX(weekTotal)} this week`}
            primaryLabel="View earnings"
            onPrimary={() => router.push('/pharmacist/earnings')}
            trailing={<Text style={styles.moneyPeriod}>Last 7 days</Text>}
          />
          <View style={styles.sparkOverlay} pointerEvents="none">
            <Sparkline values={week} labels={DAY_LABELS} />
          </View>
        </View>

        <SectionTitle title="Quick actions" />
        <View style={styles.actionGrid}>
          <ActionTile
            icon="bag-handle-outline"
            tone="green"
            title="Orders"
            subtitle={`${orderSummary.total} total`}
            badge={orderSummary.needsAction}
            onPress={() => router.push('/pharmacist/orders')}
          />
          <ActionTile
            icon="document-text-outline"
            tone="violet"
            title="Prescriptions"
            subtitle={`${pendingPrescriptions} pending`}
            badge={pendingPrescriptions}
            onPress={() => router.push('/pharmacist/prescriptions')}
          />
        </View>
        <View style={styles.actionGrid}>
          <ActionTile
            icon="medkit-outline"
            tone="blue"
            title="Catalogue"
            subtitle="Manage stock"
            onPress={() => router.push('/pharmacist/catalog')}
          />
          <ActionTile
            icon="wallet-outline"
            tone="amber"
            title="Earnings"
            subtitle="View & withdraw"
            onPress={() => router.push('/pharmacist/earnings')}
          />
        </View>

        <SectionTitle title="Status overview" />
        <Panel>
          <OverviewRow
            first
            icon="storefront"
            tone={providerStatus.isOpen ? 'green' : 'amber'}
            title="Store status"
            subtitle={
              providerStatus.isOpen
                ? 'Customers can place orders with you now.'
                : 'You are closed. New orders are being turned away.'
            }
            right={
              <TouchableOpacity
                onPress={toggleStatus}
                disabled={isToggling}
                accessibilityRole="button"
                accessibilityLabel={
                  providerStatus.isOpen ? 'Close the pharmacy' : 'Open the pharmacy'
                }
              >
                <TonePill
                  label={isToggling ? '…' : providerStatus.isOpen ? 'OPEN' : 'CLOSED'}
                  tone={providerStatus.isOpen ? 'green' : 'amber'}
                />
              </TouchableOpacity>
            }
          />
          <OverviewRow
            icon="cart"
            tone="amber"
            title="Orders waiting"
            subtitle="New orders you have not answered yet"
            value={orderSummary.needsAction}
            valueTone="amber"
            onPress={() => router.push('/pharmacist/orders?tab=NEW' as never)}
          />
          <OverviewRow
            icon="bandage"
            tone="violet"
            title="Prescriptions to verify"
            subtitle="Must be checked before dispensing"
            value={pendingPrescriptions}
            valueTone="violet"
            onPress={() => router.push('/pharmacist/prescriptions')}
          />
          <OverviewRow
            icon="bicycle"
            tone="blue"
            title="With a courier"
            subtitle="Collected or on the way to the customer"
            value={orderSummary.inProgress}
            valueTone="blue"
            onPress={() => router.push('/pharmacist/orders?tab=ACTIVE' as never)}
          />
        </Panel>

        {!providerStatus.isOpen ? (
          <TouchableOpacity
            style={styles.closedNote}
            onPress={toggleStatus}
            disabled={isToggling}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open the pharmacy for orders"
          >
            <Ionicons name="moon" size={17} color={COLORS.onSurfaceVariant} />
            <Text style={styles.closedNoteText}>
              Your pharmacy is closed. Customers cannot place new orders until you open.
            </Text>
            <Text style={styles.closedNoteAction}>Open</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },

    greeting: { marginBottom: SPACING.md },
    greetingSmall: { fontSize: 14, color: COLORS.onSurfaceVariant },
    greetingName: {
      fontSize: 26,
      fontWeight: '800',
      color: COLORS.onSurface,
      letterSpacing: -0.7,
      marginTop: 2,
      lineHeight: 31,
    },
    greetingMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

    statRow: { flexDirection: 'row', gap: SPACING.sm },

    moneyWrap: { marginTop: SPACING.md, position: 'relative' },
    moneyPeriod: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 11,
      fontWeight: '700',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    // The chart sits in the hero's right half: context for the number, not a
    // control, so it takes no touches.
    sparkOverlay: { position: 'absolute', right: SPACING.md, top: 52, width: '50%' },

    actionGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },

    closedNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: SPACING.md,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: COLORS.outlineVariant,
    },
    closedNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: COLORS.onSurfaceVariant },
    closedNoteAction: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  });
