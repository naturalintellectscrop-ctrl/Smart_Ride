// ============================================
// SMART RIDE — TRANSACTION HISTORY
// ============================================
// Golden Screen #29 · Archetype AR-4 (List + Search).
//
//   AppHeader → SearchInput → Chip filter rail (All / In / Out) →
//   paginated ListRow history → EmptyState / ErrorState
//
// The client wallet showed only whatever handful of transactions the wallet
// payload happened to include, with no "see all" and no pagination — the
// paginated endpoint existed but only the driver wallet ever called it. This
// screen is that endpoint's client-side home.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { api } from '@/src/services';
import { SPACING, RADIUS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  ListSkeleton,
  SearchInput,
  StatusBadge,
} from '@/src/components';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description?: string;
  createdAt: string;
  status?: 'COMPLETED' | 'PENDING' | 'FAILED';
}

type Direction = 'all' | 'in' | 'out';

const FILTERS: { key: Direction; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Money in' },
  { key: 'out', label: 'Money out' },
];

const PAGE_SIZE = 20;

const money = (amount: number) => `UGX ${Math.round(amount).toLocaleString()}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Direction>('all');
  const [query, setQuery] = useState('');

  /** The endpoint returns either `{ data }` or `{ transactions }` depending on
   *  the handler; the driver wallet already accommodates both. */
  const readList = (payload: any): WalletTransaction[] =>
    payload?.data ?? payload?.transactions ?? [];

  const loadFirstPage = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getWalletTransactions(1, PAGE_SIZE);
      if (res.success && res.data) {
        const list = readList(res.data);
        setTransactions(list);
        setPage(1);
        setHasMore(list.length >= PAGE_SIZE);
      } else {
        setError(res.error || 'Failed to load transactions');
      }
    } catch {
      setError('Unable to load your transactions. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await loadFirstPage();
    setRefreshing(false);
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    // Don't paginate while a search or filter is narrowing the list — the user
    // is looking at a subset, and appending pages behind it is disorienting.
    if (isLoadingMore || !hasMore || isLoading || query.trim() || filter !== 'all') return;
    setIsLoadingMore(true);
    try {
      const next = page + 1;
      const res = await api.getWalletTransactions(next, PAGE_SIZE);
      if (res.success && res.data) {
        const list = readList(res.data);
        if (list.length === 0) {
          setHasMore(false);
        } else {
          setTransactions((prev) => [...prev, ...list]);
          setPage(next);
          setHasMore(list.length >= PAGE_SIZE);
        }
      }
    } catch {
      // Non-fatal — the already-loaded page stays usable.
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, isLoading, page, query, filter]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter === 'in' && t.type !== 'CREDIT') return false;
      if (filter === 'out' && t.type !== 'DEBIT') return false;
      if (!q) return true;
      return (t.description ?? '').toLowerCase().includes(q);
    });
  }, [transactions, filter, query]);

  const renderItem = ({ item, index }: { item: WalletTransaction; index: number }) => {
    const credit = item.type === 'CREDIT';
    return (
      <Animated.View entering={FadeInUp.duration(MOTION.duration.base).delay(Math.min(index * 40, 240))}>
        <Card variant="raised" padding={SPACING.sm} radius={RADIUS.lg} style={styles.rowCard}>
          <ListRow
            title={item.description || (credit ? 'Money in' : 'Money out')}
            subtitle={formatDate(item.createdAt)}
            icon={credit ? 'arrow-down' : 'arrow-up'}
            iconColor={credit ? COLORS.success : COLORS.error}
            value={`${credit ? '+' : '−'}${money(item.amount)}`}
            trailing={
              item.status && item.status !== 'COMPLETED'
                ? <StatusBadge label={item.status} color={item.status === 'FAILED' ? COLORS.error : COLORS.warning} size="sm" />
                : undefined
            }
          />
        </Card>
      </Animated.View>
    );
  };

  if (error && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="Transactions" onBack={() => router.back()} />
        <View style={styles.stateWrap}>
          <ErrorState title="Couldn't load transactions" subtitle={error} onRetry={loadFirstPage} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Transactions" onBack={() => router.back()} />

      <View style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search transactions"
        />
      </View>

      <View style={styles.filterRail}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.listContent}><ListSkeleton /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
              {query.trim() || filter !== 'all' ? (
                <EmptyState
                  icon="search-outline"
                  title="No matching transactions"
                  subtitle="Try a different search, or clear the filter."
                  actionLabel="Clear filters"
                  onAction={() => { setQuery(''); setFilter('all'); }}
                />
              ) : (
                <EmptyState
                  icon="receipt-outline"
                  title="No transactions yet"
                  subtitle="Top up your wallet or take a trip and it will show up here."
                />
              )}
            </Animated.View>
          }
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator style={styles.footer} color={COLORS.primary} /> : null
          }
        />
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterRail: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  rowCard: {
    marginBottom: SPACING.sm,
  },
  stateWrap: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  footer: {
    paddingVertical: SPACING.md,
  },
});
