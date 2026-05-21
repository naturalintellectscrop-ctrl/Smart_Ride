// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// Premium wallet UI with vector icons
// Matches admin dashboard design
// ============================================

import React, { useState, useEffect } from 'react';
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
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  wallet: '#3B82F6',
  credit: '#22C55E',
  debit: '#F43F5E',
  warning: '#FBBF24',
};

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

// Quick actions config
const QUICK_ACTIONS: Array<{
  icon: IconName;
  label: string;
  onPress: string;
  color: string;
}> = [
  { icon: 'plus-circle', label: 'Top Up', onPress: 'topup', color: COLORS.primary },
  { icon: 'upload', label: 'Withdraw', onPress: 'withdraw', color: COLORS.wallet },
  { icon: 'send', label: 'Transfer', onPress: '/wallet/transfer', color: COLORS.accent },
  { icon: 'clock', label: 'History', onPress: 'history', color: COLORS.warning },
];

export default function WalletScreen() {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setIsLoading(true);
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.onPress.startsWith('/')) {
      router.push(action.onPress as any);
    }
    // Other actions would be handled here
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>

        {/* Balance Card */}
        <Animated.View entering={ZoomIn.delay(200).duration(400)} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(walletData?.balance || 0)}
          </Text>
          {walletData?.pendingBalance ? (
            <View style={styles.pendingContainer}>
              <Icon name="clock" size="xs" color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
              <Text style={styles.pendingText}>
                Pending: {formatCurrency(walletData.pendingBalance)}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.quickActionsContainer}>
        {QUICK_ACTIONS.map((action, index) => (
          <Animated.View key={action.label} entering={ZoomIn.delay(150 + index * 50).duration(300)}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Icon name={action.icon} size="lg" color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Transactions */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {walletData?.transactions?.length ? (
          walletData.transactions.map((tx, index) => (
            <Animated.View
              key={tx.id}
              entering={SlideInRight.duration(300).delay(index * 50)}
            >
              <TransactionItem
                transaction={tx}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.wallet}15` }]}>
              <Icon name="credit-card" size="2xl" color={COLORS.wallet} />
            </View>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Transaction Item Component
function TransactionItem({
  transaction,
  formatCurrency,
  formatDate,
}: {
  transaction: Transaction;
  formatCurrency: (a: number) => string;
  formatDate: (d: string) => string;
}) {
  const isCredit = transaction.type === 'CREDIT';

  return (
    <View style={styles.transactionCard}>
      <View
        style={[
          styles.transactionIconContainer,
          { backgroundColor: isCredit ? `${COLORS.credit}15` : `${COLORS.debit}15` },
        ]}
      >
        <Icon
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size="md"
          color={isCredit ? COLORS.credit : COLORS.debit}
        />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: isCredit ? COLORS.credit : COLORS.debit },
        ]}
      >
        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

// Styles
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
  header: {
    backgroundColor: COLORS.wallet,
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  pendingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
