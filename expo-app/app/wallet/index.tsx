// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// VERSION: STITCH-DS-001
// PURPOSE: Manage user wallet and payments
// DESIGN: Stitch Design System — MD3 Green Theme
// - Balance card with gradient (primaryContainer→primary), decorative circle
// - Payment methods with MTN (yellow), Airtel (red), Cash icons
// - Transaction history with icon circles, primary color credits / outline debits
// - Security footer note with lock icon
// ============================================

import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, GRADIENTS, PAYMENT_METHODS } from '@/src/constants';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        const data = response.data ?? {};
        const wallet = data.wallet ?? { balance: 0, pendingBalance: 0 };
        const transactions = data.transactions ?? [];
        const paymentMethods = data.paymentMethods;
        setWalletData({
          balance: wallet.balance ?? 0,
          pendingBalance: wallet.pendingBalance ?? 0,
          totalDeposited: wallet.totalDeposited,
          totalWithdrawn: wallet.totalWithdrawn,
          transactions: transactions.map((t: any) => ({
            id: t.id,
            type: t.type || t.transactionType,
            amount: t.amount ?? 0,
            description: t.description ?? '',
            createdAt: t.createdAt,
            status: t.status,
          })),
          paymentMethods,
        });
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
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

  // ---------- Error State ----------
  if (error && !walletData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.outline} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWallet} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          onPress: () => router.push('/notifications'),
        }}
      >
        {/* Balance Card with gradient inside header */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(400)}
          style={styles.balanceCardWrapper}
        >
          <View style={styles.balanceCardOuter}>
            <LinearGradient
              colors={[COLORS.primaryContainer, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceGradient}
            >
              {/* Decorative circle */}
              <View style={styles.decorativeCircle} />
              <View style={styles.decorativeCircle2} />

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
                    <View style={styles.statIconCircle}>
                      <Ionicons name="arrow-down" size={14} color={COLORS.onPrimary} />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>Deposited</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(walletData.totalDeposited)}
                      </Text>
                    </View>
                  </View>
                )}
                {walletData?.totalWithdrawn !== undefined && (
                  <View style={styles.statItem}>
                    <View style={styles.statIconCircle}>
                      <Ionicons name="arrow-up" size={14} color={COLORS.onPrimary} />
                    </View>
                    <View>
                      <Text style={styles.statLabel}>Withdrawn</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(walletData.totalWithdrawn)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Top Up + Withdraw buttons */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.ctaRow}
          >
            <View style={styles.ctaButtonWrapper}>
              <GradientButton
                title="Top Up"
                onPress={() => Alert.alert('Coming Soon', 'Top up feature will be available soon')}
                variant="primary"
                size="lg"
                icon={<Ionicons name="add" size={20} color={COLORS.onPrimary} />}
              />
            </View>
            <View style={styles.ctaButtonWrapper}>
              <GradientButton
                title="Withdraw"
                onPress={() => Alert.alert('Coming Soon', 'Withdrawal feature will be available soon')}
                variant="outline"
                size="lg"
                icon={<Ionicons name="arrow-up" size={20} color={COLORS.primary} />}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </GlowHeader>

      {/* Payment Methods Section */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(250)}
        style={styles.paymentMethodsSection}
      >
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethodsRow}>
          {/* MTN MoMo */}
          <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl}>
            <View style={styles.paymentMethodContent}>
              <View style={[styles.paymentIconCircle, { backgroundColor: `${COLORS.mtnYellow}20` }]}>
                <Ionicons name="phone-portrait" size={20} color={COLORS.mtnYellow} />
              </View>
              <Text style={styles.paymentMethodName}>MTN MoMo</Text>
            </View>
          </GlassCard>

          {/* Airtel Money */}
          <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl}>
            <View style={styles.paymentMethodContent}>
              <View style={[styles.paymentIconCircle, { backgroundColor: `${COLORS.airtelRed}20` }]}>
                <Ionicons name="phone-portrait" size={20} color={COLORS.airtelRed} />
              </View>
              <Text style={styles.paymentMethodName}>Airtel Money</Text>
            </View>
          </GlassCard>

          {/* Cash */}
          <GlassCard variant="default" padding={SPACING.md} borderRadius={RADIUS.xl}>
            <View style={styles.paymentMethodContent}>
              <View style={[styles.paymentIconCircle, { backgroundColor: `${COLORS.primary}15` }]}>
                <Ionicons name="cash" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.paymentMethodName}>Cash</Text>
            </View>
          </GlassCard>
        </View>
      </Animated.View>

      {/* Transaction History */}
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
          <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} noBorder>
            {walletData.transactions.map((tx, index) => (
              <React.Fragment key={tx.id}>
                <Animated.View entering={SlideInRight.duration(300).delay(index * 50)}>
                  <TransactionItem
                    transaction={tx}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    isLast={index === walletData.transactions!.length - 1}
                  />
                </Animated.View>
                {!tx && index < walletData.transactions!.length - 1 && (
                  <View style={styles.transactionDivider} />
                )}
              </React.Fragment>
            ))}
          </GlassCard>
        ) : (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconCircle}>
              <Ionicons name="wallet-outline" size={36} color={COLORS.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Your transaction history will appear here
            </Text>
          </Animated.View>
        )}

        {/* Security Footer Note */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.securityNote}
        >
          <View style={styles.securityIconCircle}>
            <Ionicons name="lock-closed" size={14} color={COLORS.onSecondaryContainer} />
          </View>
          <Text style={styles.securityText}>
            Your payments are secured with 256-bit encryption
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ============================================
// TRANSACTION ITEM COMPONENT
// ============================================

function TransactionItem({
  transaction,
  formatCurrency,
  formatDate,
  isLast,
}: {
  transaction: Transaction;
  formatCurrency: (a: number) => string;
  formatDate: (d: string) => string;
  isLast: boolean;
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
        return COLORS.outline;
    }
  })();

  return (
    <View style={[styles.transactionRow, !isLast && styles.transactionBorderBottom]}>
      {/* Icon Circle */}
      <View
        style={[
          styles.transactionIconCircle,
          {
            backgroundColor: isCredit
              ? COLORS.primaryFixed
              : COLORS.tertiaryFixed,
          },
        ]}
      >
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={18}
          color={isCredit ? COLORS.onPrimaryFixedVariant : COLORS.onTertiaryFixedVariant}
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
            { color: isCredit ? COLORS.primary : COLORS.outline },
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
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Screen
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },

  // Error State
  errorTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: SPACING.md,
  },
  errorMessage: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  retryButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // Balance Card — gradient with decorative circles
  balanceCardWrapper: {
    marginTop: SPACING.sm,
  },
  balanceCardOuter: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.active,
  },
  balanceGradient: {
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryFixed,
    opacity: 0.2,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryFixed,
    opacity: 0.15,
  },
  balanceLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimaryContainer,
    opacity: 0.85,
  },
  balanceAmount: {
    fontSize: TYPOGRAPHY.displayLg.fontSize,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
    marginTop: SPACING.xs,
    letterSpacing: -1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  pendingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.warning,
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md + SPACING.xs,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  statValue: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    color: COLORS.onPrimary,
    marginTop: 1,
  },

  // CTA Buttons — Top Up + Withdraw
  ctaRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  ctaButtonWrapper: {
    flex: 1,
  },

  // Payment Methods Section
  paymentMethodsSection: {
    paddingHorizontal: SPACING.containerMargin,
    marginTop: SPACING.lg,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: SPACING.gutter,
  },
  paymentMethodContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  paymentIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodName: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },

  // Section Titles
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.containerMargin,
  },

  // Transactions
  transactionsScroll: {
    flex: 1,
    marginTop: SPACING.md,
  },
  transactionsContent: {
    paddingTop: SPACING.xs,
    paddingBottom: 128,
    paddingHorizontal: SPACING.containerMargin,
    gap: SPACING.sm,
  },

  // Transaction Row inside GlassCard
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  transactionBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  transactionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.gutter,
  },
  transactionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionDescription: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  transactionDate: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  transactionDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  emptyStateSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },

  // Security Footer Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  securityIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSecondaryFixedVariant,
    flex: 1,
  },
});
