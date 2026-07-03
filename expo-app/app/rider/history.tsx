// ============================================
// SMART RIDE MOBILE - RIDER / DRIVER / DELIVERY HISTORY
// ============================================
// Completed / cancelled / rejected trips + deliveries for the signed-in
// provider. Real data only — reuses GET /api/tasks (rider-scoped, paginated,
// first-name redacted server-side; no customer phone numbers). Tapping an
// entry opens the trip details screen.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

const TERMINAL = new Set(['COMPLETED', 'DELIVERED', 'CANCELLED', 'REJECTED', 'FAILED', 'EXPIRED']);

const SERVICE_LABEL: Record<string, string> = {
  SMART_BODA_RIDE: 'Boda Ride',
  SMART_CAR_RIDE: 'Car Ride',
  FOOD_DELIVERY: 'Food Delivery',
  SHOPPING: 'Shopping',
  ITEM_DELIVERY: 'Item Delivery',
  SMART_HEALTH_DELIVERY: 'Pharmacy Delivery',
};

const STATUS_COLOR = (COLORS: ThemedColors): Record<string, string> => ({
  COMPLETED: COLORS.primary,
  DELIVERED: COLORS.primary,
  CANCELLED: COLORS.error,
  REJECTED: COLORS.error,
  FAILED: COLORS.error,
  EXPIRED: COLORS.onSurfaceVariant,
});

const money = (n: unknown) => `UGX ${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function RiderHistoryScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const statusColor = useMemo(() => STATUS_COLOR(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pageToLoad: number, replace: boolean) => {
    if (pageToLoad === 1) { replace ? setRefreshing(true) : setLoading(true); } else { setLoadingMore(true); }
    setError(null);
    try {
      const res = await api.getTaskHistory(pageToLoad, 20);
      const list: any[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.data ?? []);
      if (!res.success) { setError(res.error || 'Failed to load history.'); return; }
      const terminal = list.filter((t) => TERMINAL.has(t.status));
      setHasMore(list.length === 20);
      setTasks((prev) => (pageToLoad === 1 ? terminal : [...prev, ...terminal]));
      setPage(pageToLoad);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1, false); }, [load]);

  const renderItem = ({ item }: { item: any }) => {
    const color = statusColor[item.status] || COLORS.onSurfaceVariant;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/rider/trip-details?taskId=${item.id}` as any)}
      >
        <View style={styles.cardTop}>
          <Text style={styles.service}>{SERVICE_LABEL[item.taskType] || item.taskType}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.statusText, { color }]}>{String(item.status).replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
            <View style={styles.dotLine} />
            <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addr} numberOfLines={1}>{item.pickupAddress || '—'}</Text>
            <Text style={[styles.addr, { marginTop: 8 }]} numberOfLines={1}>{item.dropoffAddress || '—'}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaDate}>{fmtDate(item.completedAt || item.createdAt)}</Text>
          <View style={styles.metaRight}>
            {item.distanceKm ? <Text style={styles.metaSmall}>{Number(item.distanceKm).toFixed(1)} km</Text> : null}
            <Text style={styles.earnings}>{money(item.riderEarnings ?? item.totalAmount)}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.onSurfaceVariant} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.appbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.hint}>Loading history…</Text></View>
      ) : error && tasks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={COLORS.onSurfaceVariant} />
          <Text style={styles.hint}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(1, false)}>
            <Ionicons name="refresh" size={16} color={COLORS.onPrimary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={44} color={COLORS.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.hint}>Your completed trips and deliveries will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} tintColor={COLORS.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (hasMore && !loadingMore) load(page + 1, false); }}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={COLORS.primary} /> : null}
        />
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  appbarTitle: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  hint: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  emptyTitle: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface, marginTop: SPACING.xs },
  retryBtn: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  retryText: { ...TYPOGRAPHY.bodyMd, color: COLORS.onPrimary, fontWeight: '600' },
  card: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.outlineVariant },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  service: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, fontWeight: '700' },
  statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { ...TYPOGRAPHY.labelMd, fontWeight: '700' },
  routeRow: { flexDirection: 'row', gap: SPACING.sm },
  dots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: COLORS.outlineVariant, marginVertical: 2 },
  addr: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurface },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant },
  metaDate: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  metaSmall: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  earnings: { ...TYPOGRAPHY.bodyMd, color: COLORS.primary, fontWeight: '700' },
});
