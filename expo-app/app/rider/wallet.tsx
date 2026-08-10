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
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  StatusBadge,
  TopUpModal,
  WithdrawModal,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';


export default function RiderWalletScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user } = useAuthStore();
  const [walletData, setWalletData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Withdrawal modal
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

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
      <AppHeader
        title="Wallet"
        onBack={() => router.back()}
        rightActions={[{ icon: 'stats-chart-outline', onPress: () => router.push('/rider/earnings'), label: 'Earnings' }]}
      />

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
        <Card variant="accent" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(walletData?.balance || 0)}</Text>
          {walletData?.pendingBalance > 0 && (
            <Text style={styles.pendingText}>
              Pending: {formatCurrency(walletData.pendingBalance)}
            </Text>
          )}
        </Card>

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
          <Card style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            <Text style={styles.summaryAmount}>{formatCurrency(walletData?.totalDeposited || 0)}</Text>
            <Text style={styles.summaryLabel}>Total Deposited</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Ionicons name="share-outline" size={18} color={COLORS.primary} />
            <Text style={styles.summaryAmount}>{formatCurrency(walletData?.totalWithdrawn || 0)}</Text>
            <Text style={styles.summaryLabel}>Total Withdrawn</Text>
          </Card>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length > 0 ? (
          transactions.map((tx, index) => {
            const isCredit = tx.type === 'CREDIT' || tx.transactionType === 'CREDIT' || tx.type === 'ORDER_PAYMENT';
            return (
              <Card key={tx.id || index} style={styles.txCard}>
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
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="card-outline" size={40} color={COLORS.outlineVariant} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
          </Card>
        )}

        {isLoadingMore && (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
        )}

        {!hasMoreTx && transactions.length > 0 && (
          <Text style={styles.noMoreText}>No more transactions</Text>
        )}
      </ScrollView>

      {/* Withdraw Modal */}
      {/* The shared WithdrawModal (now a SmartBottomSheet) had zero usages
          app-wide while this screen and rider/earnings each hand-rolled their
          own withdraw <Modal> with their own validation — which is how the
          UGX 1,000 minimum ended up enforced in one place and not the other. */}
      <WithdrawModal
        visible={withdrawModalVisible}
        onClose={() => setWithdrawModalVisible(false)}
        balance={walletData?.balance || 0}
        defaultPhoneNumber={user?.phone}
        onSuccess={() => loadWallet()}
      />

      {/* Top Up Modal (shared component) */}
      <TopUpModal
        visible={showTopUp}
        onClose={() => setShowTopUp(false)}
        defaultPhoneNumber={user?.phone}
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
});
