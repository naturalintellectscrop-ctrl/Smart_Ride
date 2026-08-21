// ============================================
// SMART RIDE MOBILE - PHARMACIST EARNINGS
// ============================================
// What the pharmacy has earned, what it can withdraw right now, and every
// delivered order the money came from.
//
// The withdrawal is the point of the screen, so the balance a pharmacist can
// actually take out is the first and largest thing on it — and it is a real
// figure now: the summary it reads used to aggregate a table with no rows in
// it, and report every OTHER pharmacy's outstanding payout as this one's
// available balance.
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
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { AppHeader, ListSkeleton, EmptyState, ConfirmDialog } from '@/src/components';
import { MoneyHero, Panel, SectionTitle, StatTile, TonePill } from '@/src/components/storefront';
import { Ionicons } from '@expo/vector-icons';

type PeriodFilter = 'daily' | 'weekly' | 'monthly';

const PERIODS: { key: PeriodFilter; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
];

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function PharmacistEarningsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [period, setPeriod] = useState<PeriodFilter>('daily');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const loadEarnings = useCallback(async () => {
    try {
      const response = await api.getPharmacyEarnings(period);
      if (response.success && response.data) {
        const payload: any = response.data;
        setData(payload.earnings || payload);
        setLoadError(null);
      } else {
        setData(null);
        setLoadError(response.error || 'We could not load your earnings.');
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
      setData(null);
      setLoadError('We could not reach the server. Pull down to try again.');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setIsLoading(true);
    loadEarnings();
  }, [loadEarnings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  };

  const summary = data?.summary ?? {};
  const totalEarnings = Number(data?.totalEarnings ?? summary.totalProviderEarnings ?? 0);
  const availableBalance = Number(data?.availableBalance ?? data?.pendingPayouts ?? 0);
  const todayEarnings = Number(data?.todayEarnings ?? summary.todayEarnings ?? 0);
  const weekEarnings = Number(data?.weekEarnings ?? summary.weekEarnings ?? 0);
  const monthEarnings = Number(data?.monthEarnings ?? summary.monthEarnings ?? 0);
  const totalOrders = Number(summary.totalOrders ?? 0);
  const transactions: any[] = Array.isArray(data?.transactions) ? data.transactions : [];

  const periodAmount =
    period === 'daily' ? todayEarnings : period === 'weekly' ? weekEarnings : monthEarnings;

  const withdraw = async () => {
    setConfirmWithdraw(false);
    setIsWithdrawing(true);
    try {
      const response = await api.requestPharmacyPayout(availableBalance);
      if (response.success) {
        Alert.alert(
          'Withdrawal requested',
          `${UGX(availableBalance)} is on its way to your registered mobile money or bank account.`
        );
        await loadEarnings();
      } else {
        Alert.alert('Could not withdraw', response.error || 'Please try again.');
      }
    } catch (err: any) {
      console.error('Pharmacy payout error:', err);
      Alert.alert('Could not withdraw', err?.message || 'Please check your connection.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Earnings" onBack={() => router.back()} />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {loadError ? (
            <TouchableOpacity style={styles.errorBox} onPress={onRefresh} activeOpacity={0.85}>
              <Ionicons name="cloud-offline-outline" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{loadError}</Text>
              <Text style={styles.errorRetry}>Retry</Text>
            </TouchableOpacity>
          ) : null}

          {/* What you can take out right now */}
          <MoneyHero
            caption="Available to withdraw"
            amount={UGX(availableBalance)}
            meta={
              availableBalance > 0
                ? 'Earned from delivered orders and not yet paid out.'
                : 'Your share of an order becomes available once it is delivered.'
            }
            primaryLabel={availableBalance > 0 ? 'Withdraw' : undefined}
            onPrimary={availableBalance > 0 ? () => setConfirmWithdraw(true) : undefined}
            busy={isWithdrawing}
            trailing={<Text style={styles.heroBadge}>{UGX(totalEarnings)} lifetime</Text>}
          />

          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodBtn, active && styles.periodBtnActive]}
                  onPress={() => setPeriod(p.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.periodText, active && styles.periodTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.statRow}>
            <StatTile tone="green" icon="today" value={UGX(todayEarnings)} label="Today" />
            <StatTile tone="blue" icon="calendar" value={UGX(weekEarnings)} label="7 days" />
            <StatTile tone="violet" icon="stats-chart" value={UGX(monthEarnings)} label="30 days" />
          </View>

          <SectionTitle title="How it adds up" />
          <Panel padding={SPACING.md}>
            <Line label="Delivered orders" value={String(totalOrders)} />
            <Line label="Customers paid" value={UGX(summary.totalRevenue)} />
            <Line label="Delivery fees (to couriers)" value={`− ${UGX(summary.totalDeliveryFees)}`} />
            <Line label="Smart Ride commission" value={`− ${UGX(summary.totalPlatformCommission)}`} />
            <View style={styles.divider} />
            <Line label="Your earnings" value={UGX(totalEarnings)} strong />
            <Line label="Already withdrawn" value={UGX(Math.max(0, totalEarnings - availableBalance))} />
            <Line label="Available now" value={UGX(availableBalance)} strong />
          </Panel>

          <SectionTitle title={`Recent orders${periodAmount ? ` · ${UGX(periodAmount)}` : ''}`} />
          {transactions.length > 0 ? (
            <Panel>
              {transactions.map((tx, i) => (
                <View key={tx.id || i} style={[styles.tx, i > 0 && styles.txBorder]}>
                  <View style={styles.txIcon}>
                    <Ionicons name="medkit" size={16} color={COLORS.success} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.orderNumber || 'Order'}
                    </Text>
                    <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                  </View>
                  <View style={styles.txAmount}>
                    <Text style={styles.txValue}>+{UGX(tx.amount)}</Text>
                    {tx.paymentMethod ? (
                      <TonePill
                        label={String(tx.paymentMethod).replace(/_/g, ' ')}
                        tone={String(tx.paymentMethod).toUpperCase() === 'CASH' ? 'amber' : 'green'}
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </Panel>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No earnings yet"
              subtitle="Once you deliver an order, your share of it appears here and becomes available to withdraw."
            />
          )}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirmWithdraw}
        title={`Withdraw ${UGX(availableBalance)}?`}
        message="The money is sent to the mobile money or bank account registered to your pharmacy."
        confirmLabel="Withdraw"
        cancelLabel="Not now"
        loading={isWithdrawing}
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, flexShrink: 1 }}>{label}</Text>
      <Text
        style={{
          fontSize: strong ? 15 : 13.5,
          fontWeight: strong ? '800' : '600',
          color: COLORS.onSurface,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.error,
      marginBottom: SPACING.md,
    },
    errorText: { flex: 1, fontSize: 12.5, color: COLORS.onSurface, lineHeight: 17 },
    errorRetry: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

    heroBadge: {
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

    periodRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
    periodBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      alignItems: 'center',
    },
    periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    periodText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
    periodTextActive: { color: '#FFFFFF' },

    statRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },

    divider: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: SPACING.sm },

    tx: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md },
    txBorder: { borderTopWidth: 1, borderTopColor: COLORS.outlineVariant },
    txIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${COLORS.success}22`,
    },
    txInfo: { flex: 1, minWidth: 0 },
    txDesc: { fontSize: 13.5, fontWeight: '700', color: COLORS.onSurface },
    txDate: { fontSize: 11.5, color: COLORS.onSurfaceVariant, marginTop: 1 },
    txAmount: { alignItems: 'flex-end', gap: 4 },
    txValue: { fontSize: 14, fontWeight: '800', color: COLORS.success },
  });
