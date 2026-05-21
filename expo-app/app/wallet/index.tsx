// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// Premium dark theme with vector icons
// Manage user wallet and payments
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
import { COLORS } from '@/src/constants';
import { Icon, IconColors } from '../../components/Icon';

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  transactions?: Transaction[];
  paymentMethods?: any[];
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

// Quick actions configuration
const QUICK_ACTIONS = [
  { id: 'topup', iconName: 'plus-circle' as const, label: 'Top Up', color: '#00FF88' },
  { id: 'withdraw', iconName: 'upload' as const, label: 'Withdraw', color: '#00FFF3' },
  { id: 'transfer', iconName: 'send' as const, label: 'Transfer', color: '#8B5CF6' },
  { id: 'history', iconName: 'clock' as const, label: 'History', color: '#F59E0B' },
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
        // Extract wallet data from the response structure
        const { wallet, transactions, paymentMethods } = response.data;
        setWalletData({
          balance: wallet.balance,
          pendingBalance: wallet.pendingBalance,
          totalDeposited: wallet.totalDeposited,
          totalWithdrawn: wallet.totalWithdrawn,
          transactions: transactions?.map((t: any) => ({
            id: t.id,
            type: t.type || t.transactionType,
            amount: t.amount,
            description: t.description,
            createdAt: t.createdAt,
            status: t.status,
          })),
          paymentMethods,
        });
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
      minute: '2-digit'
    });
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'transfer':
        router.push('/wallet/transfer');
        break;
      default:
        // Handle other actions
        break;
    }
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
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Wallet</Text>
        
        {/* Balance Card */}
        <Animated.View 
          entering={ZoomIn.delay(200).duration(400)}
          style={styles.balanceCard}
        >
          <View style={styles.balanceIconContainer}>
            <Icon name="credit-card" size="xl" color="rgba(13, 13, 18, 0.5)" />
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(walletData?.balance || 0)}
          </Text>
          {walletData?.pendingBalance ? (
            <View style={styles.pendingContainer}>
              <Icon name="clock" size="xs" color="rgba(13, 13, 18, 0.5)" />
              <Text style={styles.pendingText}>
                Pending: {formatCurrency(walletData.pendingBalance)}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.quickActionsContainer}
      >
        {QUICK_ACTIONS.map((action, index) => (
          <Animated.View
            key={action.id}
            entering={ZoomIn.delay(150 + index * 50).duration(300)}
            style={styles.quickActionItem}
          >
            <TouchableOpacity 
              onPress={() => handleQuickAction(action.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Icon name={action.iconName} size="md" color={action.color} />
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
          <Animated.View 
            entering={FadeIn.duration(400)}
            style={styles.emptyContainer}
          >
            <View style={styles.emptyIconContainer}>
              <Icon name="credit-card" size="2xl" color={COLORS.textMuted} />
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
  formatDate 
}: { 
  transaction: Transaction; 
  formatCurrency: (a: number) => string;
  formatDate: (d: string) => string;
}) {
  const isCredit = transaction.type === 'CREDIT';
  const iconColor = isCredit ? '#22C55E' : '#F43F5E';
  const iconName = isCredit ? 'arrow-down' : 'arrow-up';
  
  return (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon name={iconName} size="md" color={iconColor} />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>{transaction.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: iconColor }]}>
        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
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
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: COLORS.background,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
  },
  balanceIconContainer: {
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(13, 13, 18, 0.6)',
    fontSize: 14,
  },
  balanceAmount: {
    color: COLORS.background,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pendingText: {
    color: 'rgba(13, 13, 18, 0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  quickActionItem: {
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
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionIcon: {
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
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
