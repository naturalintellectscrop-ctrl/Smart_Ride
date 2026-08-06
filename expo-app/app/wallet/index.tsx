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
import { TYPOGRAPHY, SPACING, RADIUS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  GradientButton,
  ListRow,
  SectionHeader,
  StatusBadge,
  TopUpModal,
  WithdrawModal,
} from '@/src/components';

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  transactions?: Transaction[];
  paymentMethods?: PaymentMethodSummary[];
}

/** Shape returned by GET /api/wallet — a method the user has actually linked. */
interface PaymentMethodSummary {
  id: string;
  type: string;
  name: string;
  accountNumber?: string | null;
  isDefault?: boolean;
  cardLastFour?: string | null;
  cardBrand?: string | null;
  phoneNumber?: string | null;
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
      <View style={styles.stateScreen}>
        <ErrorState title="Couldn't load your wallet" subtitle={error} onRetry={loadWallet} />
      </View>
    );
  }

  // ---------- Loading State ----------
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Wallet" subtitle="Balance & payments" variant="large" />
        <DetailSkeleton />
      </View>
    );
  }

  const methods = walletData?.paymentMethods ?? [];
  const transactions = walletData?.transactions ?? [];
  // Only the most recent handful belong on the overview; the rest live on the
  // dedicated history screen.
  const recentTransactions = transactions.slice(0, 5);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        <AppHeader
          title="Wallet"
          subtitle="Balance & payments"
          variant="large"
          rightActions={[
            { icon: 'notifications-outline', onPress: () => router.push('/notifications'), label: 'Notifications' },
          ]}
        />

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
                <Ionicons name="time-outline" size={13} color={`${COLORS.onPrimary}D9`} />
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

        {/* Payment methods — the ones this user has actually linked.
            This section used to render a fixed four-chip list (VISA / MTN /
            Airtel / Cash) that was identical for every account, while the real
            `paymentMethods` the API returns was fetched into state and never
            read. */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(80)} style={styles.section}>
          <SectionHeader title="Payment methods" />
          {methods.length > 0 ? (
            <Card variant="raised" padding={SPACING.sm} radius={RADIUS.xl}>
              {methods.map((m, i) => (
                <ListRow
                  key={m.id}
                  title={m.name}
                  subtitle={paymentMethodDetail(m)}
                  icon={paymentMethodIcon(m.type)}
                  divider={i < methods.length - 1}
                  trailing={m.isDefault ? <StatusBadge label="Default" size="sm" /> : undefined}
                />
              ))}
            </Card>
          ) : (
            <Card variant="flat" padding={SPACING.md} radius={RADIUS.xl}>
              <Text style={styles.emptyInline}>
                No payment methods linked yet. Top up with mobile money to add one.
              </Text>
            </Card>
          )}
        </Animated.View>

        {/* Transactions */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(140)} style={styles.section}>
          <SectionHeader
            title="Recent transactions"
            actionLabel={transactions.length > recentTransactions.length ? 'See all' : undefined}
            onAction={transactions.length > recentTransactions.length ? () => router.push('/wallet/transactions') : undefined}
          />
          {recentTransactions.length > 0 ? (
            <Card variant="raised" padding={SPACING.sm} radius={RADIUS.xl}>
              {recentTransactions.map((tx, index) => (
                <ListRow
                  key={tx.id}
                  title={tx.description || (tx.type === 'CREDIT' ? 'Money in' : 'Money out')}
                  subtitle={formatDate(tx.createdAt)}
                  icon={tx.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                  iconColor={tx.type === 'CREDIT' ? COLORS.success : COLORS.error}
                  value={`${tx.type === 'CREDIT' ? '+' : '−'}${formatCurrency(tx.amount)}`}
                  divider={index < recentTransactions.length - 1}
                  trailing={
                    tx.status !== 'COMPLETED'
                      ? <StatusBadge label={tx.status} color={tx.status === 'FAILED' ? COLORS.error : COLORS.warning} size="sm" />
                      : undefined
                  }
                />
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Your transaction history will appear here."
            />
          )}
        </Animated.View>
      </ScrollView>

      <TopUpModal visible={showTopUp} onClose={() => setShowTopUp(false)} defaultPhoneNumber={user?.phone} onSuccess={() => loadWallet()} />
      <WithdrawModal visible={showWithdraw} onClose={() => setShowWithdraw(false)} balance={walletData?.balance || 0} defaultPhoneNumber={user?.phone} onSuccess={() => loadWallet()} />
    </View>
  );
}

/** Which glyph represents a linked method — card, mobile money, or cash. */
function paymentMethodIcon(type: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toUpperCase();
  if (t.includes('CARD') || t.includes('VISA') || t.includes('MASTER')) return 'card-outline';
  if (t.includes('MOMO') || t.includes('MOBILE') || t.includes('AIRTEL') || t.includes('MTN')) return 'phone-portrait-outline';
  if (t.includes('CASH')) return 'cash-outline';
  return 'wallet-outline';
}

/**
 * The identifying detail for a method, masked. Cards show their last four,
 * mobile money shows the number it is linked to — never the full PAN.
 */
function paymentMethodDetail(m: PaymentMethodSummary): string | undefined {
  if (m.cardLastFour) return `${m.cardBrand ?? 'Card'} ···· ${m.cardLastFour}`;
  if (m.phoneNumber) return m.phoneNumber;
  if (m.accountNumber) return m.accountNumber;
  return undefined;
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  stateScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  emptyInline: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  screen: { flex: 1, backgroundColor: COLORS.surface },



  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },

  // Balance hero
  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, overflow: 'hidden' },
  balanceLabel: { ...TYPOGRAPHY.bodySm, color: `${COLORS.onPrimary}D9`, fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: COLORS.onPrimary, marginTop: SPACING.xs, letterSpacing: -0.5 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  pendingText: { ...TYPOGRAPHY.labelMd, color: `${COLORS.onPrimary}D9`, fontWeight: '500' },
  balanceStatsRow: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: `${COLORS.onPrimary}26` },
  balanceStat: {},
  balanceStatLabel: { ...TYPOGRAPHY.labelMd, color: `${COLORS.onPrimary}B3` },
  balanceStatValue: { ...TYPOGRAPHY.bodySm, fontWeight: '700', color: COLORS.onPrimary, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: SPACING.sm + 4, marginTop: SPACING.md },

  // Payment chips

  // Transactions

  // Empty

});
