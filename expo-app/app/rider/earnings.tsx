// ============================================
// SMART RIDE MOBILE - RIDER EARNINGS DASHBOARD
// ============================================
// Enhanced earnings overview with commission split,
// withdrawal support, and real-time data
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  WithdrawModal,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';

// Period type
type EarningsPeriod = 'today' | 'week' | 'month' | 'lifetime';

// Earnings data shape from API
interface PeriodEarnings {
  totalEarnings: number;
  totalCommission: number;
  totalRevenue: number;
  tripCount: number;
  rides: number;
  deliveries: number;
  health: number;
}

interface EarningsData {
  today: PeriodEarnings;
  week: PeriodEarnings;
  month: PeriodEarnings;
  lifetime: PeriodEarnings;
}

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

interface RiderData {
  totalEarnings: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  rating: number;
}

interface CommissionRates {
  [key: string]: { riderPercent: number; platformPercent: number };
}

export default function RiderEarningsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Data state
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [riderData, setRiderData] = useState<RiderData | null>(null);
  const [commissionRates, setCommissionRates] = useState<CommissionRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<EarningsPeriod>('today');

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const earningsRes = await api.getRiderEarnings(selectedPeriod);

      if (!earningsRes.success) {
        setError(earningsRes.error || 'Failed to load earnings.');
      } else if (earningsRes.success && earningsRes.data) {
        const d = earningsRes.data;
        // The API wraps in { success, data: { earnings, wallet, rider, commissionRates, period } }
        const payload = d.data || d;
        if (payload.earnings) {
          setEarningsData(payload.earnings);
        }
        if (payload.wallet) {
          setWalletData(payload.wallet);
        }
        if (payload.rider) {
          setRiderData(payload.rider);
        }
        if (payload.commissionRates) {
          setCommissionRates(payload.commissionRates);
        }
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  // Get active period earnings
  const getActiveEarnings = (): PeriodEarnings => {
    if (!earningsData) return { totalEarnings: 0, totalCommission: 0, totalRevenue: 0, tripCount: 0, rides: 0, deliveries: 0, health: 0 };
    return earningsData[selectedPeriod] || earningsData.today;
  };

  const activeEarnings = getActiveEarnings();

  // Calculate effective commission rate for display
  const getEffectiveCommissionSplit = () => {
    if (activeEarnings.totalRevenue > 0) {
      const riderPct = Math.round((activeEarnings.totalEarnings / activeEarnings.totalRevenue) * 100);
      const platformPct = 100 - riderPct;
      return { riderPct, platformPct };
    }
    // Default to boda rate if no data
    return { riderPct: 85, platformPct: 15 };
  };

  const { riderPct, platformPct } = getEffectiveCommissionSplit();

  // Withdrawal handler


  // Quick withdrawal amount buttons

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={44} color={COLORS.onSurfaceVariant} />
        <Text style={styles.loadingText}>{error}</Text>
        <TouchableOpacity
          onPress={loadData}
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: RADIUS.lg, marginTop: 16 }}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color={COLORS.onPrimary} />
          <Text style={{ color: COLORS.onPrimary, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state — the rider has genuinely earned nothing and has no balance yet.
  const hasAnyEarnings = !!earningsData && (['today', 'week', 'month'] as const)
    .some((p) => (earningsData[p]?.totalEarnings || 0) > 0 || (earningsData[p]?.tripCount || 0) > 0);
  const hasWallet = (walletData?.balance || 0) > 0;
  if (!hasAnyEarnings && !hasWallet) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="wallet-outline" size={44} color={COLORS.onSurfaceVariant} />
        <Text style={[styles.loadingText, { fontWeight: '700', fontSize: 18, marginTop: 12 }]}>You haven&apos;t earned anything yet.</Text>
        <Text style={styles.loadingText}>Go online and complete trips to start earning.</Text>
        <TouchableOpacity
          onPress={() => router.push('/driver')}
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: RADIUS.lg, marginTop: 16 }}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={18} color={COLORS.onPrimary} />
          <Text style={{ color: COLORS.onPrimary, fontWeight: '700' }}>Go Online</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Earnings"
        onBack={() => router.back()}
        rightActions={[{ icon: 'arrow-up-circle-outline', onPress: () => setShowWithdrawModal(true), label: 'Withdraw' }]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Main Earnings Card */}
        <Card variant="accent" style={styles.mainEarningsCard}>
          <Text style={styles.earningsLabel}>Earnings</Text>
          <Text style={styles.earningsAmount}>{formatCurrency(activeEarnings.totalEarnings)}</Text>

          {/* Period selector */}
          <View style={styles.periodRow}>
            {(['today', 'week', 'month', 'lifetime'] as EarningsPeriod[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, selectedPeriod === p && styles.periodChipActive]}
                onPress={() => setSelectedPeriod(p)}
              >
                <Text style={[styles.periodChipText, selectedPeriod === p && styles.periodChipTextActive]}>
                  {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Lifetime'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Balance & Pending */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="cash-outline" size={20} color={COLORS.success} />
            <Text style={styles.statAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(walletData?.balance || 0)}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Available</Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(true)}>
              <Text style={styles.statLink}>Withdraw →</Text>
            </TouchableOpacity>
          </Card>

          <Card variant="accent" style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={COLORS.warning} />
            <Text style={styles.statAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(walletData?.pendingBalance || 0)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
        </View>

        {/* Commission Split */}
        <Text style={styles.sectionTitle}>Commission Split</Text>
        <Card>
          <View style={styles.commissionContainer}>
            {/* Visual bar */}
            <View style={styles.commissionBarBg}>
              <View style={[styles.commissionBarRider, { width: `${riderPct}%` }]} />
              <View style={[styles.commissionBarPlatform, { width: `${platformPct}%` }]} />
            </View>
            <View style={styles.commissionRow}>
              <View style={styles.commissionItem}>
                <View style={[styles.commissionDot, { backgroundColor: COLORS.primary }]} />
                <View>
                  <Text style={styles.commissionLabel}>Your Earnings</Text>
                  <Text style={styles.commissionValue}>{riderPct}% — {formatCurrency(activeEarnings.totalEarnings)}</Text>
                </View>
              </View>
              <View style={styles.commissionItem}>
                <View style={[styles.commissionDot, { backgroundColor: COLORS.warning }]} />
                <View>
                  <Text style={styles.commissionLabel}>Platform Fee</Text>
                  <Text style={styles.commissionValue}>{platformPct}% — {formatCurrency(activeEarnings.totalCommission)}</Text>
                </View>
              </View>
            </View>
            {/* Per-service commission rates */}
            {commissionRates && (
              <View style={styles.ratesGrid}>
                {Object.entries(commissionRates).map(([key, rates]) => (
                  <View key={key} style={styles.rateChip}>
                    <Text style={styles.rateLabel}>
                      {key === 'SMART_BODA_RIDE' ? 'Boda' : key === 'SMART_CAR_RIDE' ? 'Car' : key === 'FOOD_DELIVERY' ? 'Food' : key === 'SHOPPING' ? 'Shopping' : key === 'ITEM_DELIVERY' ? 'Delivery' : 'Health'}
                    </Text>
                    <Text style={styles.rateValue}>{rates.riderPercent}/{rates.platformPercent}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>

        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <Card>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{riderData?.totalTrips || 0}</Text>
              <Text style={styles.metricLabel}>Total Trips</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{riderData?.completedTrips || 0}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.error }]}>{riderData?.cancelledTrips || 0}</Text>
              <Text style={styles.metricLabel}>Cancelled</Text>
            </View>
          </View>
          <View style={styles.metricsRow2}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.primary }]}>{activeEarnings.rides}</Text>
              <Text style={styles.metricLabel}>Rides</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.info }]}>{activeEarnings.deliveries}</Text>
              <Text style={styles.metricLabel}>Deliveries</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.warning }]}>{(riderData?.rating || 0).toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </Card>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {earningsData && ([
            { key: 'today' as EarningsPeriod, icon: 'stats-chart-outline', label: 'Today', data: earningsData.today },
            { key: 'week' as EarningsPeriod, icon: 'trending-up-outline', label: 'This Week', data: earningsData.week },
            { key: 'month' as EarningsPeriod, icon: 'wallet-outline', label: 'This Month', data: earningsData.month },
            { key: 'lifetime' as EarningsPeriod, icon: 'trophy-outline', label: 'All Time', data: earningsData.lifetime },
          ]).map(item => (
            <Card key={item.key} style={styles.breakdownCard}>
              <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
              <Text style={styles.breakdownAmount}>{formatCurrency(item.data.totalEarnings)}</Text>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownTrips}>{item.data.tripCount} trips</Text>
            </Card>
          ))}
        </View>

        {/* Wallet Summary */}
        <Text style={styles.sectionTitle}>Wallet Summary</Text>
        <Card>
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Total Deposited</Text>
            <Text style={styles.walletValue}>{formatCurrency(walletData?.totalDeposited || 0)}</Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Total Withdrawn</Text>
            <Text style={styles.walletValue}>{formatCurrency(walletData?.totalWithdrawn || 0)}</Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Text style={[styles.walletValue, { color: COLORS.primary, fontWeight: '700' }]}>{formatCurrency(walletData?.balance || 0)}</Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Pending Clearance</Text>
            <Text style={[styles.walletValue, { color: COLORS.warning }]}>{formatCurrency(walletData?.pendingBalance || 0)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Withdrawal Modal */}
      {/* Shared sheet, this screen's endpoint. /riders/withdraw and
          /wallet/withdraw are two backend implementations of the same
          operation, so the caller keeps its own rather than being silently
          moved onto the other. */}
      <WithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        balance={walletData?.balance || 0}
                onSubmit={(amount, phone, provider) => api.requestRiderWithdrawal(amount, phone, provider)}
        onSuccess={() => loadData()}
      />
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  loadingText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  mainEarningsCard: {
    marginBottom: SPACING.md,
  },
  earningsLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  earningsAmount: {
    ...TYPOGRAPHY.displayLg,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: 14,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  periodChipActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  periodChipText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  periodChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statAmount: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  statLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  statLink: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  // Commission styles
  commissionContainer: {
    gap: 14,
  },
  commissionBarBg: {
    flexDirection: 'row',
    height: 12,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  commissionBarRider: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: RADIUS.full,
    borderBottomLeftRadius: RADIUS.full,
  },
  commissionBarPlatform: {
    backgroundColor: COLORS.warning,
    borderTopRightRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  commissionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  commissionLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  commissionValue: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
  },
  rateLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  rateValue: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Metrics styles
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  metricsRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  metricLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.outlineVariant,
  },
  // Breakdown styles
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  breakdownCard: {
    // Two tiles plus the row gap overflowed 100%, squeezing the second
    // tile and wrapping its label. flexBasis reflows instead.
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
    alignItems: 'center',
    paddingVertical: 14,
  },
  breakdownAmount: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  breakdownLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  breakdownTrips: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  // Wallet summary styles
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  walletLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  walletValue: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  walletDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  // Modal styles
  // Provider selection
  // Quick amounts
  // Input
});
