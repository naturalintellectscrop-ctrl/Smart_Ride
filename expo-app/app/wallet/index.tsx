// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// VERSION: DARK-THEME-002
// PURPOSE: Manage user wallet and payments
// DESIGN: Dark theme with StyleSheet, custom components
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
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { GlowHeader } from '@/src/components/GlowHeader';
import { StatusBadge } from '@/src/components/StatusBadge';

// ============================================
// TYPES
// ============================================

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

// ============================================
// MAIN COMPONENT
// ============================================

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
      minute: '2-digit',
    });
  };

  // ---------- Loading State ----------
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ---------- Main Render ----------
  return (
    <View style={styles.screen}>
      {/* Header */}
      <GlowHeader
        title="Wallet"
        subtitle="Manage your balance & payments"
        rightAction={{
          icon: 'notifications-outline',
          onPress: () => {},
        }}
      >
        {/* Balance Card inside header */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(400)}
          style={styles.balanceCardWrapper}
        >
          <GlassCard variant="accent" padding={20} borderRadius={20}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(walletData?.balance || 0)}
            </Text>
            {walletData?.pendingBalance ? (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                <Text style={styles.pendingText}>
                  Pending: {formatCurrency(walletData.pendingBalance)}
                </Text>
              </View>
            ) : null}

            {/* Stats row */}
            <View style={styles.statsRow}>
              {walletData?.totalDeposited !== undefined && (
                <View style={styles.statItem}>
                  <Ionicons name="arrow-down-circle" size={16} color={COLORS.success} />
                  <Text style={styles.statLabel}>Deposited</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(walletData.totalDeposited)}
                  </Text>
                </View>
              )}
              {walletData?.totalWithdrawn !== undefined && (
                <View style={styles.statItem}>
                  <Ionicons name="arrow-up-circle" size={16} color={COLORS.error} />
                  <Text style={styles.statLabel}>Withdrawn</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(walletData.totalWithdrawn)}
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      </GlowHeader>

      {/* Quick Actions */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.quickActionsContainer}
      >
        <GlassCard variant="elevated" padding={16} borderRadius={16}>
          <View style={styles.quickActionsRow}>
            <QuickAction
              icon="add-circle"
              label="Top Up"
              onPress={() => {}}
            />
            <QuickAction
              icon="arrow-up-circle"
              label="Withdraw"
              onPress={() => {}}
            />
            <QuickAction
              icon="send"
              label="Transfer"
              onPress={() => router.push('/wallet/transfer')}
            />
            <QuickAction
              icon="time"
              label="History"
              onPress={() => {}}
            />
          </View>
        </GlassCard>
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(200)}
        style={styles.ctaRow}
      >
        <View style={styles.ctaButtonWrapper}>
          <GradientButton
            title="Top Up"
            onPress={() => {}}
            variant="primary"
            size="md"
            icon={<Ionicons name="add" size={18} color={COLORS.background} />}
          />
        </View>
        <View style={styles.ctaButtonWrapper}>
          <GradientButton
            title="Withdraw"
            onPress={() => {}}
            variant="outline"
            size="md"
            icon={<Ionicons name="arrow-up" size={18} color={COLORS.primary} />}
          />
        </View>
      </Animated.View>

      {/* Payment Methods */}
      {walletData?.paymentMethods && walletData.paymentMethods.length > 0 && (
        <Animated.View
          entering={FadeInUp.duration(400).delay(250)}
          style={styles.paymentMethodsContainer}
        >
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentMethodsScroll}>
            {walletData.paymentMethods.map((pm: any, index: number) => (
              <Animated.View
                key={pm.id || index}
                entering={SlideInRight.duration(300).delay(index * 60)}
                style={styles.paymentMethodItem}
              >
                <GlassCard variant="default" padding={12} borderRadius={12}>
                  <View style={styles.paymentMethodRow}>
                    <Ionicons
                      name={pm.icon === 'phone' ? 'phone-portrait' : 'card'}
                      size={20}
                      color={COLORS.primary}
                    />
                    <Text style={styles.paymentMethodName}>{pm.name}</Text>
                    <StatusBadge
                      label={pm.id || 'Active'}
                      color={COLORS.success}
                      size="sm"
                    />
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Transactions */}
      <ScrollView
        style={styles.transactionsScroll}
        contentContainerStyle={styles.transactionsContent}
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
              style={styles.transactionItemWrapper}
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
            style={styles.emptyState}
          >
            <Ionicons name="wallet-outline" size={48} color={COLORS.textDim} />
            <Text style={styles.emptyStateTitle}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Your transaction history will appear here
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// QUICK ACTION COMPONENT
// ============================================

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIcon}>
        <Ionicons
          name={icon as any}
          size={22}
          color={COLORS.primary}
        />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// TRANSACTION ITEM COMPONENT
// ============================================

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

  const statusColor = (() => {
    switch (transaction.status) {
      case 'COMPLETED':
        return COLORS.success;
      case 'PENDING':
        return COLORS.warning;
      case 'FAILED':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  })();

  return (
    <GlassCard variant="default" padding={14} borderRadius={14}>
      <View style={styles.transactionRow}>
        {/* Icon */}
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: isCredit
                ? 'rgba(0, 255, 136, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            },
          ]}
        >
          <Ionicons
            name={isCredit ? 'arrow-down' : 'arrow-up'}
            size={18}
            color={isCredit ? COLORS.success : COLORS.error}
          />
        </View>

        {/* Description & Date */}
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.createdAt)}
          </Text>
        </View>

        {/* Amount & Status */}
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isCredit ? COLORS.success : COLORS.error },
            ]}
          >
            {isCredit ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
          <StatusBadge
            label={transaction.status}
            color={statusColor}
            size="sm"
          />
        </View>
      </View>
    </GlassCard>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Screen
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Balance Card
  balanceCardWrapper: {
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
    letterSpacing: -1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  pendingText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: -12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // CTA Buttons
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  ctaButtonWrapper: {
    flex: 1,
  },

  // Payment Methods
  paymentMethodsContainer: {
    marginTop: 20,
    paddingLeft: 16,
  },
  paymentMethodsScroll: {
    paddingRight: 16,
    gap: 8,
    paddingVertical: 4,
  },
  paymentMethodItem: {
    marginRight: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  // Transactions
  transactionsScroll: {
    flex: 1,
    marginTop: 4,
  },
  transactionsContent: {
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  transactionItemWrapper: {
    marginBottom: 4,
  },

  // Transaction Row
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
  transactionInfo: {
    flex: 1,
    marginRight: 8,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
