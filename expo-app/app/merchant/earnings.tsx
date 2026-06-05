// ============================================
// SMART RIDE MOBILE - MERCHANT EARNINGS SCREEN
// ============================================
// Earnings dashboard with balance and transactions
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { COLORS } from '@/src/constants';
import { MerchantTransaction } from '@/src/types';

const PERIOD_TABS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export default function MerchantEarningsScreen() {
  const router = useRouter();
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
      case 'ORDER_PAYMENT': return '💰';
      case 'PAYOUT': return '🏦';
      case 'REFUND': return '↩️';
      case 'ADJUSTMENT': return '🔄';
      default: return '📋';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ORDER_PAYMENT': return COLORS.primary;
      case 'PAYOUT': return '#F59E0B';
      case 'REFUND': return COLORS.error;
      case 'ADJUSTMENT': return COLORS.info;
      default: return COLORS.textMuted;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return COLORS.primary;
      case 'PENDING': return '#F59E0B';
      case 'FAILED': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading earnings...</Text>
          </View>
        ) : earningsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{earningsError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => merchantId && fetchEarnings(merchantId, activePeriod)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
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
                  <Text style={styles.balanceIcon}>✅</Text>
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
                  <Text style={styles.lastPayoutIcon}>🏦</Text>
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
              <TouchableOpacity style={styles.payoutButton}>
                <Text style={styles.payoutButtonText}>Request Payout</Text>
              </TouchableOpacity>
            </View>

            {/* Earnings Chart Placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings Trend</Text>
              <View style={styles.chartCard}>
                <View style={styles.chartPlaceholder}>
                  <Text style={styles.chartIcon}>📈</Text>
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
                        <Text style={styles.transactionIcon}>
                          {getTransactionIcon(tx.type)}
                        </Text>
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
                        <View style={[styles.txStatusBadge, { backgroundColor: `${getStatusColor(tx.status)}20` }]}>
                          <Text style={[styles.txStatusText, { color: getStatusColor(tx.status) }]}>
                            {tx.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTransactions}>
                  <Text style={styles.emptyIcon}>📋</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  periodTabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activePeriodTab: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  periodTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  activePeriodTabText: {
    color: COLORS.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  balanceSection: {
    paddingHorizontal: 16,
  },
  totalEarningsCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
    alignItems: 'center',
    marginBottom: 12,
  },
  totalEarningsLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  totalEarningsAmount: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  balanceIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  balanceLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastPayoutCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastPayoutIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  lastPayoutInfo: {
    flex: 1,
  },
  lastPayoutLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  lastPayoutDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  lastPayoutAmount: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  payoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  payoutButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartPlaceholder: {
    alignItems: 'center',
  },
  chartIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  chartText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  transactionsList: {
    gap: 8,
  },
  transactionCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyTransactions: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
