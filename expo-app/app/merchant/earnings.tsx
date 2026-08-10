// ============================================
// SMART RIDE MOBILE - MERCHANT EARNINGS SCREEN
// ============================================
// Earnings dashboard with balance and transactions
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  SegmentedControl,
} from '@/src/components';
import { api } from '@/src/services';
import { MerchantTransaction } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

const PERIOD_TABS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export default function MerchantEarningsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const merchantId = params.merchantId as string;

  const {
    earnings,
    isLoadingEarnings,
    earningsError,
    fetchEarnings,
  } = useMerchantStore();

  const [activePeriod, setActivePeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (merchantId) {
      fetchEarnings(merchantId, activePeriod);
    }
  }, [merchantId, activePeriod]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (merchantId) {
      await fetchEarnings(merchantId, activePeriod);
    }
    setRefreshing(false);
  }, [merchantId, activePeriod]);

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
      ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PAYMENT': return 'wallet-outline';
      case 'PAYOUT': return 'business-outline';
      case 'REFUND': return 'arrow-back-outline';
      case 'ADJUSTMENT': return 'sync-outline';
      default: return 'clipboard-outline';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ORDER_PAYMENT': return COLORS.primary;
      case 'PAYOUT': return '#F59E0B';
      case 'REFUND': return COLORS.error;
      case 'ADJUSTMENT': return COLORS.info;
      default: return COLORS.outline;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return COLORS.primary;
      case 'PENDING': return '#F59E0B';
      case 'FAILED': return COLORS.error;
      default: return COLORS.outline;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Earnings" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {PERIOD_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, activePeriod === tab.key && styles.activePeriodTab]}
              onPress={() => setActivePeriod(tab.key)}
            >
              <Text style={[styles.periodTabText, activePeriod === tab.key && styles.activePeriodTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoadingEarnings && !refreshing ? (
          <ListSkeleton rows={3} />
        ) : earningsError ? (
          <ErrorState
            title="Couldn't load earnings"
            subtitle={earningsError}
            onRetry={() => merchantId && fetchEarnings(merchantId, activePeriod)}
          />
        ) : (
          <>
            {/* Balance Cards */}
            <View style={styles.balanceSection}>
              {/* Total Earnings */}
              <View style={styles.totalEarningsCard}>
                <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
                <Text style={styles.totalEarningsAmount}>
                  {formatCurrency(earnings?.totalEarnings || 0)}
                </Text>
              </View>

              <View style={styles.balanceRow}>
                {/* Available Balance */}
                <View style={[styles.balanceCard, { borderColor: `${COLORS.primary}20` }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                  <Text style={styles.balanceLabel}>Available</Text>
                  <Text style={[styles.balanceAmount, { color: COLORS.primary }]}>
                    {formatCurrency(earnings?.availableBalance || 0)}
                  </Text>
                </View>

                {/* Pending Payout */}
                <View style={[styles.balanceCard, { borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Text style={styles.balanceIcon}>⏳</Text>
                  <Text style={styles.balanceLabel}>Pending</Text>
                  <Text style={[styles.balanceAmount, { color: '#F59E0B' }]}>
                    {formatCurrency(earnings?.pendingPayout || 0)}
                  </Text>
                </View>
              </View>

              {/* Last Payout */}
              {earnings?.lastPayoutAmount && earnings.lastPayoutAmount > 0 && (
                <View style={styles.lastPayoutCard}>
                  <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                  <View style={styles.lastPayoutInfo}>
                    <Text style={styles.lastPayoutLabel}>Last Payout</Text>
                    <Text style={styles.lastPayoutDate}>
                      {earnings.lastPayoutDate ? formatDate(earnings.lastPayoutDate) : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.lastPayoutAmount}>
                    {formatCurrency(earnings.lastPayoutAmount)}
                  </Text>
                </View>
              )}
            </View>

            {/* Payout Request Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.payoutButton}
                onPress={() => {
                  if (!merchantId) {
                    Alert.alert('Error', 'Merchant ID not found');
                    return;
                  }
                  Alert.alert(
                    'Request Payout',
                    `Payout available: UGX ${(earnings?.availableBalance || 0).toLocaleString()}`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Request',
                        onPress: async () => {
                          try {
                            const response = await api.requestMerchantPayout(merchantId, earnings?.availableBalance);
                            if (response.success) {
                              Alert.alert('Success', 'Payout request submitted successfully');
                              fetchEarnings(merchantId, activePeriod);
                            } else {
                              Alert.alert('Error', response.error || 'Failed to request payout');
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Failed to request payout');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.payoutButtonText}>Request Payout</Text>
              </TouchableOpacity>
            </View>

            {/* Earnings Chart Placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings Trend</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartPlaceholder}>
                  <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.chartText}>Earnings chart will be available with more data</Text>
                </View>
              </View>
            </View>

            {/* Transaction History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              {earnings?.transactions && earnings.transactions.length > 0 ? (
                <View style={styles.transactionsList}>
                  {earnings.transactions.map((tx, index) => (
                    <View key={tx.id || index} style={styles.transactionCard}>
                      <View style={styles.transactionLeft}>
                        <Ionicons name={getTransactionIcon(tx.type) as any} size={18} color={COLORS.onSurfaceVariant} />
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionDesc}>{tx.description}</Text>
                          <Text style={styles.transactionDate}>{formatDate(tx.createdAt)}</Text>
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={[styles.transactionAmount, { color: getTransactionColor(tx.type) }]}>
                          {tx.type === 'PAYOUT' || tx.type === 'REFUND' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </Text>
                        <View style={[styles.txStatusBadge, { backgroundColor: `${getStatusColor(tx.status ?? '')}20` }]}>
                          <Text style={[styles.txStatusText, { color: getStatusColor(tx.status ?? '') }]}>
                            {tx.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="clipboard-outline" size={32} color={COLORS.outlineVariant} />
                  <Text style={styles.emptyTitle}>No Transactions</Text>
                  <Text style={styles.emptySubtitle}>Transaction history will appear here</Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  periodTabs: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  periodTab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  activePeriodTab: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  periodTabText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  activePeriodTabText: {
    color: COLORS.onPrimary,
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
  balanceSection: {
    paddingHorizontal: SPACING.md,
  },
  totalEarningsCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
    alignItems: 'center',
    marginBottom: SPACING.md - 4,
    ...SHADOWS.card,
  },
  totalEarningsLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginBottom: SPACING.sm,
  },
  totalEarningsAmount: {
    color: COLORS.primary,
    ...TYPOGRAPHY.displayLg,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
    marginBottom: SPACING.md - 4,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  balanceIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  balanceLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: 'bold',
  },
  lastPayoutCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  lastPayoutIcon: {
    fontSize: 22,
    marginRight: SPACING.md - 4,
  },
  lastPayoutInfo: {
    flex: 1,
  },
  lastPayoutLabel: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  lastPayoutDate: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    marginTop: 2,
  },
  lastPayoutAmount: {
    color: COLORS.warning,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md + 4,
  },
  sectionTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    marginBottom: SPACING.sm + 2,
  },
  payoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  payoutButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  chartPlaceholder: {
    alignItems: 'center',
  },
  chartIcon: {
    fontSize: 36,
    marginBottom: SPACING.md - 4,
  },
  chartText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
  },
  transactionsList: {
    gap: SPACING.sm,
  },
  transactionCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 20,
    marginRight: SPACING.sm + 2,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  transactionDate: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.labelMd,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  txStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyTransactions: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: SPACING.md - 4,
  },
  emptyTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
});
