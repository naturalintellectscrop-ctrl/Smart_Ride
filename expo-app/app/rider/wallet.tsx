// ============================================
// SMART RIDE MOBILE - RIDER WALLET
// ============================================
// Wallet with balance, withdrawal, and transactions
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { GlassCard, StatusBadge, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

const WITHDRAWAL_PROVIDERS = [
  { id: 'MTN_MOMO', name: 'MTN MoMo', color: '#FFCC00', icon: '📱' },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', color: '#ED1C24', icon: '📱' },
];

export default function RiderWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        colors={[COLORS.background, COLORS.backgroundElevated]}
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
              <Text style={styles.quickActionEmoji}>📤</Text>
            </View>
            <Text style={styles.quickActionLabel}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.info}15` }]}>
              <Text style={styles.quickActionEmoji}>💳</Text>
            </View>
            <Text style={styles.quickActionLabel}>Top Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/rider/earnings')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.warning}15` }]}>
              <Text style={styles.quickActionEmoji}>📊</Text>
            </View>
            <Text style={styles.quickActionLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.success}15` }]}>
              <Text style={styles.quickActionEmoji}>📋</Text>
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Summary */}
        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>💰</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(walletData?.totalDeposited || 0)}</Text>
            <Text style={styles.summaryLabel}>Total Deposited</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>📤</Text>
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
            <Text style={styles.emptyIcon}>💳</Text>
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
                  <Text style={styles.providerIcon}>{provider.icon}</Text>
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
              placeholderTextColor={COLORS.textMuted}
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
              placeholderTextColor={COLORS.textMuted}
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
  earningsLink: {
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  earningsLinkText: {
    color: COLORS.warning,
    fontSize: 13,
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
  balanceCard: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 13,
    color: COLORS.warning,
    marginTop: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionEmoji: {
    fontSize: 20,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  summaryIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryLabel: {
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
  txCard: {
    marginBottom: 8,
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txEemoji: {
    fontSize: 16,
    color: COLORS.text,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  txDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
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
  noMoreText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
  },
  fieldInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  providerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSurface,
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
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  providerNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
  },
});
