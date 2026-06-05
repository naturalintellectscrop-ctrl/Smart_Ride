// ============================================
// SMART RIDE MOBILE - PHARMACIST EARNINGS
// ============================================
// Pharmacy earnings dashboard with period filter
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
import { COLORS } from '@/src/constants';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

type PeriodFilter = 'daily' | 'weekly' | 'monthly';

export default function PharmacistEarningsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<PeriodFilter>('daily');
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEarnings = useCallback(async () => {
    try {
      const response = await api.getPharmacyEarnings(period);
      if (response.success && response.data) {
        setEarningsData(response.data.earnings || response.data);
      } else {
        setEarningsData(null);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
      setEarningsData(null);
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

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const totalEarnings = earningsData?.totalEarnings || 0;
  const pendingPayout = earningsData?.pendingPayout || 0;
  const availableBalance = earningsData?.availableBalance || 0;
  const todayEarnings = earningsData?.todayEarnings || earningsData?.dailyEarnings || 0;
  const weekEarnings = earningsData?.weekEarnings || earningsData?.weeklyEarnings || 0;
  const monthEarnings = earningsData?.monthEarnings || earningsData?.monthlyEarnings || 0;
  const transactions = earningsData?.transactions || [];

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
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={{ width: 40 }} />
        </View>
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Total Earnings Card */}
          <GlassCard variant="accent" style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Earnings</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalEarnings)}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Available</Text>
                <Text style={[styles.balanceValue, { color: COLORS.primary }]}>
                  {formatCurrency(availableBalance)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Pending</Text>
                <Text style={[styles.balanceValue, { color: COLORS.warning }]}>
                  {formatCurrency(pendingPayout)}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Period Filter */}
          <View style={styles.periodRow}>
            {(['daily', 'weekly', 'monthly'] as PeriodFilter[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p === 'daily' ? 'Today' : p === 'weekly' ? 'This Week' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Period Earnings */}
          <View style={styles.earningsGrid}>
            <GlassCard style={styles.earningsCard}>
              <Text style={styles.earningsIcon}>📊</Text>
              <Text style={styles.earningsAmount}>{formatCurrency(todayEarnings)}</Text>
              <Text style={styles.earningsPeriod}>Today</Text>
            </GlassCard>
            <GlassCard variant="cyan" style={styles.earningsCard}>
              <Text style={styles.earningsIcon}>📈</Text>
              <Text style={styles.earningsAmount}>{formatCurrency(weekEarnings)}</Text>
              <Text style={styles.earningsPeriod}>This Week</Text>
            </GlassCard>
            <GlassCard style={styles.earningsCard}>
              <Text style={styles.earningsIcon}>💰</Text>
              <Text style={styles.earningsAmount}>{formatCurrency(monthEarnings)}</Text>
              <Text style={styles.earningsPeriod}>This Month</Text>
            </GlassCard>
          </View>

          {/* Transactions */}
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 ? (
            transactions.map((tx: any) => (
              <GlassCard key={tx.id} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={[
                    styles.transactionIcon,
                    tx.type === 'PAYOUT' ? { backgroundColor: `${COLORS.error}15` } : { backgroundColor: `${COLORS.success}15` },
                  ]}>
                    <Text style={styles.transactionEmoji}>
                      {tx.type === 'PAYOUT' ? '📤' : tx.type === 'REFUND' ? '↩️' : '💰'}
                    </Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{tx.description || tx.type}</Text>
                    <Text style={styles.transactionDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.transactionValue,
                      tx.type === 'PAYOUT' || tx.type === 'REFUND'
                        ? { color: COLORS.error }
                        : { color: COLORS.success },
                    ]}>
                      {tx.type === 'PAYOUT' || tx.type === 'REFUND' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </Text>
                    <StatusBadge
                      label={tx.status || 'COMPLETED'}
                      color={tx.status === 'COMPLETED' ? COLORS.success : tx.status === 'PENDING' ? COLORS.warning : COLORS.error}
                      size="sm"
                    />
                  </View>
                </View>
              </GlassCard>
            ))
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Transaction history will appear here</Text>
            </GlassCard>
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
    marginTop: 12,
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
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
  totalCard: {
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodBtnActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}30`,
  },
  periodText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  periodTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  earningsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  earningsIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  earningsAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  earningsPeriod: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  transactionCard: {
    marginBottom: 8,
    padding: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionEmoji: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
