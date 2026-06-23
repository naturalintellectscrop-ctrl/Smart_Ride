// ============================================
// SMART RIDE MOBILE - PHARMACIST EARNINGS
// ============================================
// Pharmacy earnings dashboard with period filter
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type PeriodFilter = 'daily' | 'weekly' | 'monthly';

export default function PharmacistEarningsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<PeriodFilter>('daily');
  const [earningsData, setEarningsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

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
  const pendingPayout = earningsData?.pendingPayout || earningsData?.pendingPayouts || 0;
  const availableBalance = earningsData?.availableBalance || pendingPayout;
  const todayEarnings = earningsData?.todayEarnings || earningsData?.dailyEarnings || 0;
  const weekEarnings = earningsData?.weekEarnings || earningsData?.weeklyEarnings || 0;
  const monthEarnings = earningsData?.monthEarnings || earningsData?.monthlyEarnings || 0;
  const transactions = earningsData?.transactions || [];

  const handleRequestPayout = () => {
    if (availableBalance <= 0) {
      Alert.alert(
        'No Available Balance',
        'You do not have any earnings available for payout yet.'
      );
      return;
    }
    Alert.alert(
      'Request Payout',
      `Payout available: UGX ${availableBalance.toLocaleString()}\n\nThe funds will be sent to your registered mobile money / bank account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            setIsRequestingPayout(true);
            try {
              const response = await api.requestPharmacyPayout(availableBalance);
              if (response.success) {
                Alert.alert(
                  'Payout Requested',
                  response.data?.message ||
                    'Your payout request has been submitted successfully.'
                );
                // Refresh earnings to reflect reduced pending balance
                loadEarnings();
              } else {
                Alert.alert(
                  'Error',
                  response.error || 'Failed to request payout. Please try again.'
                );
              }
            } catch (err: any) {
              console.error('Pharmacy payout error:', err);
              Alert.alert(
                'Error',
                err?.message || 'Failed to request payout. Please try again.'
              );
            } finally {
              setIsRequestingPayout(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceContainerLowest]}
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
          colors={[COLORS.primaryFixedDim, COLORS.primaryFixed, 'transparent']}
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
              <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
              <Text style={styles.earningsAmount}>{formatCurrency(todayEarnings)}</Text>
              <Text style={styles.earningsPeriod}>Today</Text>
            </GlassCard>
            <GlassCard variant="cyan" style={styles.earningsCard}>
              <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
              <Text style={styles.earningsAmount}>{formatCurrency(weekEarnings)}</Text>
              <Text style={styles.earningsPeriod}>This Week</Text>
            </GlassCard>
            <GlassCard style={styles.earningsCard}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.earningsAmount}>{formatCurrency(monthEarnings)}</Text>
              <Text style={styles.earningsPeriod}>This Month</Text>
            </GlassCard>
          </View>

          {/* Request Payout */}
          <View style={styles.payoutSection}>
            <GradientButton
              title={isRequestingPayout ? 'Processing...' : 'Request Payout'}
              onPress={handleRequestPayout}
              loading={isRequestingPayout}
              disabled={isRequestingPayout || availableBalance <= 0}
              icon={
                !isRequestingPayout ? (
                  <Ionicons name="share-outline" size={20} color={COLORS.onPrimary} />
                ) : undefined
              }
            />
            <Text style={styles.payoutHint}>
              Available: {formatCurrency(availableBalance)} ·
              Pending: {formatCurrency(pendingPayout)}
            </Text>
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
                    <Ionicons name={tx.type === 'PAYOUT' ? 'share-outline' : tx.type === 'REFUND' ? 'arrow-back-outline' : 'wallet-outline'} size={16} color={COLORS.onSurface} />
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
              <Ionicons name="card-outline" size={40} color={COLORS.outlineVariant} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Transaction history will appear here</Text>
            </GlassCard>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.outline,
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
    color: COLORS.onSurface,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  glowBorder: {
    height: 1,
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
  totalCard: {
    marginBottom: SPACING.md,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.outline,
  },
  totalAmount: {
    fontSize: TYPOGRAPHY.displayLg.fontSize,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
  },
  balanceValue: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    marginTop: SPACING.xs,
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.outlineVariant,
  },
  periodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodBtnActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}30`,
  },
  periodText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    fontWeight: '500',
  },
  periodTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
    color: COLORS.onSurface,
  },
  earningsPeriod: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  payoutSection: {
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  payoutHint: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    marginBottom: SPACING.gutter,
  },
  transactionCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.gutter,
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
    marginRight: SPACING.gutter,
  },
  transactionEmoji: {
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.outline,
  },
});
