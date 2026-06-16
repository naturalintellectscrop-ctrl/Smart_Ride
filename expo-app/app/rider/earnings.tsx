// ============================================
// SMART RIDE MOBILE - RIDER EARNINGS DASHBOARD
// ============================================
// Enhanced earnings overview with commission split,
// withdrawal support, and real-time data
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
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Data state
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [riderData, setRiderData] = useState<RiderData | null>(null);
  const [commissionRates, setCommissionRates] = useState<CommissionRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<EarningsPeriod>('today');

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState<'MTN' | 'AIRTEL'>('MTN');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const earningsRes = await api.getRiderEarnings(selectedPeriod);

      if (earningsRes.success && earningsRes.data) {
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
    } catch (error) {
      console.error('Failed to load earnings:', error);
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
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1000) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is UGX 1,000');
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    if (walletData && amount > walletData.balance) {
      Alert.alert('Insufficient Balance', `Your available balance is ${formatCurrency(walletData.balance)}`);
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await api.requestRiderWithdrawal(amount, withdrawPhone, withdrawProvider);
      if (result.success) {
        Alert.alert(
          'Withdrawal Initiated',
          `${formatCurrency(amount)} is being sent to ${withdrawProvider} (${withdrawPhone}). You will receive a notification when it's processed.`,
          [{ text: 'OK', onPress: () => { setShowWithdrawModal(false); setWithdrawAmount(''); setWithdrawPhone(''); loadData(); } }]
        );
      } else {
        Alert.alert('Withdrawal Failed', result.error || 'Could not process withdrawal. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Quick withdrawal amount buttons
  const quickAmounts = [5000, 10000, 20000, 50000];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

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
          <TouchableOpacity onPress={() => setShowWithdrawModal(true)} style={styles.walletBtn}>
            <Text style={styles.walletBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={['#4ae176', '#98f6be', 'transparent']}
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
        {/* Main Earnings Card */}
        <GlassCard variant="accent" style={styles.mainEarningsCard}>
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
        </GlassCard>

        {/* Balance & Pending */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Ionicons name="cash-outline" size={20} color={COLORS.success} />
            <Text style={styles.statAmount}>{formatCurrency(walletData?.balance || 0)}</Text>
            <Text style={styles.statLabel}>Available Balance</Text>
            <TouchableOpacity onPress={() => setShowWithdrawModal(true)}>
              <Text style={styles.statLink}>Withdraw →</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard variant="cyan" style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statAmount}>{formatCurrency(walletData?.pendingBalance || 0)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </GlassCard>
        </View>

        {/* Commission Split */}
        <Text style={styles.sectionTitle}>Commission Split</Text>
        <GlassCard>
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
        </GlassCard>

        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <GlassCard>
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
              <Text style={[styles.metricValue, { color: '#06B6D4' }]}>{activeEarnings.deliveries}</Text>
              <Text style={styles.metricLabel}>Deliveries</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.warning }]}>{(riderData?.rating || 0).toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </GlassCard>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {earningsData && ([
            { key: 'today' as EarningsPeriod, icon: 'stats-chart-outline', label: 'Today', data: earningsData.today },
            { key: 'week' as EarningsPeriod, icon: 'trending-up-outline', label: 'This Week', data: earningsData.week },
            { key: 'month' as EarningsPeriod, icon: 'wallet-outline', label: 'This Month', data: earningsData.month },
            { key: 'lifetime' as EarningsPeriod, icon: 'trophy-outline', label: 'All Time', data: earningsData.lifetime },
          ]).map(item => (
            <GlassCard key={item.key} style={styles.breakdownCard}>
              <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
              <Text style={styles.breakdownAmount}>{formatCurrency(item.data.totalEarnings)}</Text>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownTrips}>{item.data.tripCount} trips</Text>
            </GlassCard>
          ))}
        </View>

        {/* Wallet Summary */}
        <Text style={styles.sectionTitle}>Wallet Summary</Text>
        <GlassCard>
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
        </GlassCard>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Available balance display */}
            <View style={styles.modalBalanceRow}>
              <Text style={styles.modalBalanceLabel}>Available:</Text>
              <Text style={styles.modalBalanceValue}>{formatCurrency(walletData?.balance || 0)}</Text>
            </View>

            {/* Provider Selection */}
            <Text style={styles.modalFieldLabel}>Mobile Money Provider</Text>
            <View style={styles.providerRow}>
              <TouchableOpacity
                style={[styles.providerBtn, withdrawProvider === 'MTN' && styles.providerBtnActive]}
                onPress={() => setWithdrawProvider('MTN')}
              >
                <View style={[styles.providerDot, { backgroundColor: '#FFCC00' }]} />
                <Text style={[styles.providerText, withdrawProvider === 'MTN' && styles.providerTextActive]}>MTN MoMo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.providerBtn, withdrawProvider === 'AIRTEL' && styles.providerBtnActive]}
                onPress={() => setWithdrawProvider('AIRTEL')}
              >
                <View style={[styles.providerDot, { backgroundColor: '#ED1C24' }]} />
                <Text style={[styles.providerText, withdrawProvider === 'AIRTEL' && styles.providerTextActive]}>Airtel Money</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Amount Buttons */}
            <Text style={styles.modalFieldLabel}>Quick Amount</Text>
            <View style={styles.quickAmountRow}>
              {quickAmounts.map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    withdrawAmount === String(amt) && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => setWithdrawAmount(String(amt))}
                >
                  <Text style={[styles.quickAmountText, withdrawAmount === String(amt) && styles.quickAmountTextActive]}>
                    {formatCurrency(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <Text style={styles.modalFieldLabel}>Custom Amount (UGX)</Text>
            <TextInput
              style={styles.modalInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Enter amount (min 1,000)"
              placeholderTextColor={COLORS.onSurfaceVariant}
              keyboardType="number-pad"
            />

            {/* Phone Number */}
            <Text style={styles.modalFieldLabel}>{withdrawProvider === 'MTN' ? 'MTN' : 'Airtel'} Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={withdrawPhone}
              onChangeText={setWithdrawPhone}
              placeholder={`e.g. 077${withdrawProvider === 'MTN' ? '7' : '0'}123456`}
              placeholderTextColor={COLORS.onSurfaceVariant}
              keyboardType="phone-pad"
            />

            {/* Withdraw Button */}
            <GradientButton
              title={isWithdrawing ? 'Processing...' : `Withdraw ${withdrawAmount ? formatCurrency(parseFloat(withdrawAmount) || 0) : ''}`}
              onPress={handleWithdraw}
              disabled={isWithdrawing}
            />

            <Text style={styles.modalNote}>
              Withdrawals are processed within 24 hours. Minimum UGX 1,000.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: {
    paddingHorizontal: SPACING.lg,
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
    ...TYPOGRAPHY.headlineLg,
    color: COLORS.onSurface,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  walletBtn: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
  },
  walletBtnText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
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
  statIcon: {
    fontSize: 20,
    marginBottom: SPACING.sm,
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
    width: '48%',
    alignItems: 'center',
    paddingVertical: 14,
  },
  breakdownEmoji: {
    fontSize: 20,
    marginBottom: SPACING.xs,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  modalCloseText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodyMd,
  },
  modalBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: 20,
  },
  modalBalanceLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  modalBalanceValue: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalFieldLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  // Provider selection
  providerRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  providerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  providerBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  providerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  providerText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  providerTextActive: {
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  // Quick amounts
  quickAmountRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  quickAmountBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  quickAmountText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Input
  modalInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  modalNote: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
