// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// Premium wallet on the Smart Ride Design Language: a single scrolling surface
// with a balance hero, primary actions, payment methods and transactions —
// built from the shared Card + GradientButton primitives and MOTION timings.
//
// UI/UX only. getWallet, the wallet data shape, Top Up / Withdraw modals,
// pull-to-refresh and the transaction row are all preserved.
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { useAuthStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS, GRADIENTS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Card } from '@/src/components/Card';
import { GradientButton } from '@/src/components/GradientButton';
import { StatusBadge } from '@/src/components/StatusBadge';
import { TopUpModal } from '@/src/components/TopUpModal';
import { WithdrawModal } from '@/src/components/WithdrawModal';

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

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

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

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // ---------- Error State ----------
  if (error && !walletData) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.outline} />
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <GradientButton title="Try Again" onPress={loadWallet} variant="primary" size="md" style={{ marginTop: 24, width: 180 }} />
      </View>
    );
  }

  // ---------- Loading State ----------
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const PAYMENT_CHIPS = [
    { name: 'VISA', icon: 'card', color: '#1A1F71' },
    { name: 'MTN MoMo', icon: 'phone-portrait', color: COLORS.mtnYellow },
    { name: 'Airtel Money', icon: 'phone-portrait', color: COLORS.airtelRed },
    { name: 'Cash', icon: 'cash', color: COLORS.primary },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Wallet</Text>
            <Text style={styles.headerSubtitle}>Balance & payments</Text>
          </View>
          <Card variant="flat" padding={0} radius={RADIUS.full} onPress={() => router.push('/notifications')} style={styles.bellButton} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color={COLORS.onSurface} />
          </Card>
        </View>

        {/* Balance hero */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow)} style={styles.section}>
          <LinearGradient
            colors={[COLORS.primaryContainer, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(walletData?.balance || 0)}</Text>
            {walletData?.pendingBalance ? (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.pendingText}>Pending {formatCurrency(walletData.pendingBalance)}</Text>
              </View>
            ) : null}

            {(walletData?.totalDeposited !== undefined || walletData?.totalWithdrawn !== undefined) && (
              <View style={styles.balanceStatsRow}>
                {walletData?.totalDeposited !== undefined && (
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Deposited</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(walletData.totalDeposited)}</Text>
                  </View>
                )}
                {walletData?.totalWithdrawn !== undefined && (
                  <View style={styles.balanceStat}>
                    <Text style={styles.balanceStatLabel}>Withdrawn</Text>
                    <Text style={styles.balanceStatValue}>{formatCurrency(walletData.totalWithdrawn)}</Text>
                  </View>
                )}
              </View>
            )}
          </LinearGradient>

          {/* Primary actions */}
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <GradientButton title="Top Up" onPress={() => setShowTopUp(true)} variant="primary" size="lg" icon={<Ionicons name="add" size={20} color={COLORS.onPrimary} />} />
            </View>
            <View style={{ flex: 1 }}>
              <GradientButton title="Withdraw" onPress={() => setShowWithdraw(true)} variant="outline" size="lg" icon={<Ionicons name="arrow-up" size={20} color={COLORS.primary} />} />
            </View>
          </View>
        </Animated.View>

        {/* Payment methods */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(80)} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment methods</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PAYMENT_CHIPS.map((m) => (
              <Card key={m.name} variant="raised" padding={SPACING.md} radius={RADIUS.lg} style={styles.paymentChip}>
                <View style={[styles.paymentIcon, { backgroundColor: `${m.color}18` }]}>
                  <Ionicons name={m.icon as any} size={19} color={m.color} />
                </View>
                <Text style={styles.paymentName}>{m.name}</Text>
              </Card>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Transactions */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(140)} style={styles.section}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
          {walletData?.transactions?.length ? (
            <Card variant="raised" padding={0} radius={RADIUS.xl}>
              {walletData.transactions.map((tx, index) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  isLast={index === walletData.transactions!.length - 1}
                  COLORS={COLORS}
                  styles={styles}
                />
              ))}
            </Card>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={32} color={COLORS.outline} />
              </View>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
            </View>
          )}
        </Animated.View>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={13} color={COLORS.onSurfaceVariant} />
          <Text style={styles.securityText}>Payments secured with 256-bit encryption</Text>
        </View>
      </ScrollView>

      <TopUpModal visible={showTopUp} onClose={() => setShowTopUp(false)} defaultPhoneNumber={user?.phone} onSuccess={() => loadWallet()} />
      <WithdrawModal visible={showWithdraw} onClose={() => setShowWithdraw(false)} balance={walletData?.balance || 0} defaultPhoneNumber={user?.phone} onSuccess={() => loadWallet()} />
    </View>
  );
}

function TransactionItem({
  transaction, formatCurrency, formatDate, isLast, COLORS, styles,
}: {
  transaction: Transaction;
  formatCurrency: (a: number) => string;
  formatDate: (d: string) => string;
  isLast: boolean;
  COLORS: ThemedColors;
  styles: any;
}) {
  const isCredit = transaction.type === 'CREDIT';
  const statusColor = transaction.status === 'COMPLETED' ? COLORS.success
    : transaction.status === 'PENDING' ? COLORS.warning
      : transaction.status === 'FAILED' ? COLORS.error : COLORS.outline;

  return (
    <View style={[styles.txRow, !isLast && styles.txBorder]}>
      <View style={[styles.txIcon, { backgroundColor: isCredit ? `${COLORS.primary}15` : COLORS.surfaceContainerLow }]}>
        <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={18} color={isCredit ? COLORS.primary : COLORS.onSurfaceVariant} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDescription} numberOfLines={1}>{transaction.description}</Text>
        <Text style={styles.txDate}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isCredit ? COLORS.primary : COLORS.onSurface }]}>
          {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <StatusBadge label={transaction.status} color={statusColor} size="sm" />
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 32 },

  errorIconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { ...TYPOGRAPHY.headlineMd, fontWeight: '800', color: COLORS.onSurface },
  errorMessage: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: 6 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.3 },
  headerSubtitle: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2 },
  bellButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.backgroundElevated },

  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.labelLg, fontWeight: '700', color: COLORS.onSurface, marginBottom: SPACING.sm + 2 },

  // Balance hero
  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, overflow: 'hidden' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.5 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  pendingText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  balanceStatsRow: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  balanceStat: {},
  balanceStatLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.7)' },
  balanceStatValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: SPACING.sm + 4, marginTop: SPACING.md },

  // Payment chips
  chipRow: { gap: SPACING.sm + 4, paddingRight: SPACING.md },
  paymentChip: { alignItems: 'center', gap: 8, minWidth: 96 },
  paymentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  paymentName: { fontSize: 12.5, fontWeight: '600', color: COLORS.onSurface },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDescription: { fontSize: 14.5, fontWeight: '600', color: COLORS.onSurface },
  txDate: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14.5, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface },
  emptySubtitle: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 4 },

  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: SPACING.md, marginTop: SPACING.xs },
  securityText: { fontSize: 12, color: COLORS.onSurfaceVariant },
});
