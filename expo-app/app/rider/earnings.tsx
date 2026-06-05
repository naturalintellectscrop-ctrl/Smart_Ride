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
import { COLORS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

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
        colors={[COLORS.background, COLORS.backgroundElevated]}
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
            <Text style={styles.statIcon}>💵</Text>
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
            { key: 'today' as EarningsPeriod, emoji: '📊', label: 'Today', data: earningsData.today },
            { key: 'week' as EarningsPeriod, emoji: '📈', label: 'This Week', data: earningsData.week },
            { key: 'month' as EarningsPeriod, emoji: '💰', label: 'This Month', data: earningsData.month },
            { key: 'lifetime' as EarningsPeriod, emoji: '🏆', label: 'All Time', data: earningsData.lifetime },
          ]).map(item => (
            <GlassCard key={item.key} style={styles.breakdownCard}>
              <Text style={styles.breakdownEmoji}>{item.emoji}</Text>
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
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />

            {/* Phone Number */}
            <Text style={styles.modalFieldLabel}>{withdrawProvider === 'MTN' ? 'MTN' : 'Airtel'} Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={withdrawPhone}
              onChangeText={setWithdrawPhone}
              placeholder={`e.g. 077${withdrawProvider === 'MTN' ? '7' : '0'}123456`}
              placeholderTextColor={COLORS.textMuted}
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
  walletBtn: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletBtnText: {
    color: COLORS.primary,
    fontSize: 14,
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
  mainEarningsCard: {
    marginBottom: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSurface,
  },
  periodChipActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  periodChipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  periodChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  // Commission styles
  commissionContainer: {
    gap: 14,
  },
  commissionBarBg: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundSurface,
  },
  commissionBarRider: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  commissionBarPlatform: {
    backgroundColor: COLORS.warning,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commissionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  commissionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  commissionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundSurface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rateLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Metrics styles
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  metricsRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  // Breakdown styles
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  breakdownCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 14,
  },
  breakdownEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  breakdownAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  breakdownTrips: {
    fontSize: 10,
    color: COLORS.textMuted,
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
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  walletValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  walletDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSurface,
  },
  modalCloseText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  modalBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalBalanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalFieldLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  // Provider selection
  providerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  providerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSurface,
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
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  providerTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  // Quick amounts
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  quickAmountText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Input
  modalInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});
