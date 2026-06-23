// ============================================
// SMART RIDE MOBILE - RIDER WALLET
// ============================================
// Wallet with balance, withdrawal, and transactions
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { TopUpModal } from '@/src/components/TopUpModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const WITHDRAWAL_PROVIDERS = [
  { id: 'MTN_MOMO', name: 'MTN MoMo', color: '#FFCC00', icon: 'phone-portrait-outline' },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', color: '#ED1C24', icon: 'phone-portrait-outline' },
];

export default function RiderWalletScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [walletData, setWalletData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Withdrawal modal
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN_MOMO');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Top-up modal
  const [showTopUp, setShowTopUp] = useState(false);

  // Transaction page
  const [txPage, setTxPage] = useState(1);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        const { wallet, transactions: txs } = response.data;
        setWalletData({
          balance: wallet?.balance || 0,
          pendingBalance: wallet?.pendingBalance || 0,
          totalDeposited: wallet?.totalDeposited || 0,
          totalWithdrawn: wallet?.totalWithdrawn || 0,
        });
        setTransactions(txs || []);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTxPage(1);
    await loadWallet();
    setRefreshing(false);
  };

  const loadMoreTransactions = async () => {
    if (isLoadingMore || !hasMoreTx) return;
    setIsLoadingMore(true);
    try {
      const nextPage = txPage + 1;
      const response = await api.getWalletTransactions(nextPage);
      if (response.success && response.data) {
        const newTxs = response.data.data || response.data.transactions || [];
        if (newTxs.length === 0) {
          setHasMoreTx(false);
        } else {
          setTransactions(prev => [...prev, ...newTxs]);
          setTxPage(nextPage);
        }
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amount > (walletData?.balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    if (!withdrawPhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await api.requestWithdrawal(amount, withdrawPhone, withdrawProvider);
      if (response.success) {
        Alert.alert('Success', 'Withdrawal request submitted. You\'ll receive the money shortly.');
        setWithdrawModalVisible(false);
        setWithdrawAmount('');
        setWithdrawPhone('');
        await loadWallet();
      } else {
        Alert.alert('Error', response.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
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
          <Text style={styles.headerTitle}>Wallet</Text>
          <TouchableOpacity onPress={() => router.push('/rider/earnings')} style={styles.earningsLink}>
            <Text style={styles.earningsLinkText}>Earnings</Text>
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
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) {
            loadMoreTransactions();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Balance Card */}
        <GlassCard variant="accent" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(walletData?.balance || 0)}</Text>
          {walletData?.pendingBalance > 0 && (
            <Text style={styles.pendingText}>
              Pending: {formatCurrency(walletData.pendingBalance)}
            </Text>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setWithdrawModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.primary}15` }]}>
              <Ionicons name="share-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7} onPress={() => setShowTopUp(true)}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.info}15` }]}>
              <Ionicons name="card-outline" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.quickActionLabel}>Top Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/rider/earnings')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.warning}15` }]}>
              <Ionicons name="stats-chart-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.quickActionLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7} onPress={() => {
            // Scroll to transaction history section by loading all transactions
            if (transactions.length > 0) {
              Alert.alert('Transaction History', 'Showing all transactions below');
            } else {
              Alert.alert('No History', 'You have no transactions yet');
            }
          }}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <Ionicons name="clipboard-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Summary */}
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            <Text style={styles.summaryAmount}>{formatCurrency(walletData?.totalDeposited || 0)}</Text>
            <Text style={styles.summaryLabel}>Total Deposited</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <Ionicons name="share-outline" size={18} color={COLORS.primary} />
            <Text style={styles.summaryAmount}>{formatCurrency(walletData?.totalWithdrawn || 0)}</Text>
            <Text style={styles.summaryLabel}>Total Withdrawn</Text>
          </GlassCard>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length > 0 ? (
          transactions.map((tx, index) => {
            const isCredit = tx.type === 'CREDIT' || tx.transactionType === 'CREDIT' || tx.type === 'ORDER_PAYMENT';
            return (
              <GlassCard key={tx.id || index} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={[
                    styles.txIcon,
                    { backgroundColor: isCredit ? `${COLORS.success}15` : `${COLORS.error}15` },
                  ]}>
                    <Text style={styles.txEemoji}>{isCredit ? '↓' : '↑'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description || tx.type || 'Transaction'}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: isCredit ? COLORS.success : COLORS.error }]}>
                      {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                    {tx.status && (
                      <StatusBadge
                        label={tx.status}
                        color={tx.status === 'COMPLETED' ? COLORS.success : tx.status === 'PENDING' ? COLORS.warning : COLORS.error}
                        size="sm"
                      />
                    )}
                  </View>
                </View>
              </GlassCard>
            );
          })
        ) : (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="card-outline" size={40} color={COLORS.outlineVariant} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
          </GlassCard>
        )}

        {isLoadingMore && (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
        )}

        {!hasMoreTx && transactions.length > 0 && (
          <Text style={styles.noMoreText}>No more transactions</Text>
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <Text style={styles.modalSubtitle}>
              Available: {formatCurrency(walletData?.balance || 0)}
            </Text>

            <Text style={styles.fieldLabel}>Provider</Text>
            <View style={styles.providerRow}>
              {WITHDRAWAL_PROVIDERS.map(provider => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    withdrawProvider === provider.id && styles.providerCardActive,
                  ]}
                  onPress={() => setWithdrawProvider(provider.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={provider.icon as any} size={18} color={withdrawProvider === provider.id ? COLORS.primary : COLORS.onSurfaceVariant} />
                  <Text style={[
                    styles.providerName,
                    withdrawProvider === provider.id && styles.providerNameActive,
                  ]}>
                    {provider.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Amount (UGX)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="0"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              autoFocus
            />

            {/* Quick amounts */}
            <View style={styles.quickAmounts}>
              {[5000, 10000, 20000, 50000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmountBtn}
                  onPress={() => setWithdrawAmount(String(amt))}
                >
                  <Text style={styles.quickAmountText}>{formatCurrency(amt)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., +256 700 000 000"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={withdrawPhone}
              onChangeText={setWithdrawPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <GradientButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setWithdrawModalVisible(false);
                  setWithdrawAmount('');
                  setWithdrawPhone('');
                }}
                size="sm"
                style={styles.modalBtn}
              />
              <GradientButton
                title="Withdraw"
                onPress={handleWithdraw}
                loading={isWithdrawing}
                size="sm"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Top Up Modal (shared component) */}
      <TopUpModal
        visible={showTopUp}
        onClose={() => setShowTopUp(false)}
        defaultPhoneNumber={user?.phone || withdrawPhone}
        onSuccess={() => loadWallet()}
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
  earningsLink: {
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  earningsLinkText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.warning,
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
  balanceCard: {
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  balanceAmount: {
    ...TYPOGRAPHY.displayLg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  pendingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionEmoji: {
    fontSize: 20,
  },
  quickActionLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  summaryIcon: {
    fontSize: 18,
    marginBottom: SPACING.xs,
  },
  summaryAmount: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  summaryLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  txCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  txEemoji: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  txDate: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
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
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  noMoreText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  modalTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
    marginTop: 14,
  },
  fieldInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: SPACING.md,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodySm,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  providerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  providerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  providerCardActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: `${COLORS.primary}30`,
  },
  providerIcon: {
    fontSize: 18,
  },
  providerName: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  providerNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  quickAmountText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
  },
});
