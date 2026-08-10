// ============================================
// SMART RIDE — DELIVERY QUEUE
// ============================================
// Golden Screen #42 · Archetype AR-4 (List + filters).
//
//   AppHeader → SegmentedControl (Active / Completed) → assignment Cards
//   (merchant → customer, StatusBadge, payout) → EmptyState / ErrorState /
//   ListSkeleton
//
// This is the one screen unique to DELIVERY_PERSONNEL. A ride driver holds a
// single trip at a time, so the driver dashboard's single "current task" is
// enough for them; a delivery provider can be carrying several orders at once
// and needs to see the set.
//
// The backend already dispatches FOOD_DELIVERY, SHOPPING, ITEM_DELIVERY and
// SMART_HEALTH_DELIVERY to this role — GET /tasks is role-scoped, so this reads
// the same endpoint the driver history does and filters to delivery types.
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  MOTION,
  ICON,
  TASK_STATUS_LABELS,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { statusColor } from '@/src/theme/statusColors';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  SegmentedControl,
  StatusBadge,
} from '@/src/components';
import { Task } from '@/src/types';
import { formatUGX } from '@/src/utils/money';

/** The task types dispatch routes to DELIVERY_PERSONNEL. */
const DELIVERY_TASK_TYPES = new Set([
  'FOOD_DELIVERY',
  'SHOPPING',
  'ITEM_DELIVERY',
  'SMART_HEALTH_DELIVERY',
]);

const TERMINAL = new Set(['COMPLETED', 'DELIVERED', 'CANCELLED', 'FAILED', 'EXPIRED']);

type Scope = 'active' | 'completed';

export default function DeliveryQueueScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('active');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getTaskHistory(1, 50);
      const list: any[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.data ?? []);
      if (!res.success) {
        setError(res.error || 'Failed to load your deliveries.');
        return;
      }
      setTasks(list.filter((t) => DELIVERY_TASK_TYPES.has(t.taskType)));
    } catch {
      setError('Something went wrong. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(
    () => tasks.filter((t) => (scope === 'active' ? !TERMINAL.has(t.status) : TERMINAL.has(t.status))),
    [tasks, scope],
  );

  const renderTask = ({ item, index }: { item: Task; index: number }) => (
    <Animated.View entering={FadeInUp.duration(MOTION.duration.base).delay(Math.min(index * 40, 240))}>
      <Card
        variant="raised"
        padding={SPACING.md}
        radius={RADIUS.xl}
        style={styles.taskCard}
        onPress={() => router.push(`/driver/driver-task?taskId=${item.id}` as never)}
        accessibilityLabel={`Delivery ${item.taskNumber ?? ''}`.trim()}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskNumber} numberOfLines={1}>
            {item.taskNumber || `#${item.id.slice(0, 8)}`}
          </Text>
          <StatusBadge
            label={TASK_STATUS_LABELS[item.status] || item.status}
            color={statusColor(item.status, COLORS)}
            size="sm"
          />
        </View>

        {/* Pickup at the merchant, dropoff at the customer — the two legs a
            delivery provider actually drives. */}
        <View style={styles.leg}>
          <View style={[styles.legDot, { backgroundColor: COLORS.secondaryFixed }]} />
          <Text style={styles.legText} numberOfLines={1}>{item.pickupAddress || 'Pickup'}</Text>
        </View>
        <View style={styles.legConnector} />
        <View style={styles.leg}>
          <View style={[styles.legDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legText} numberOfLines={1}>{item.dropoffAddress || 'Dropoff'}</Text>
        </View>

        <View style={styles.taskFooter}>
          <View style={styles.taskMeta}>
            <Ionicons name="cube-outline" size={ICON.xs} color={COLORS.onSurfaceVariant} />
            <Text style={styles.taskMetaText}>{deliveryLabel(item.taskType)}</Text>
          </View>
          <Text style={styles.payout}>{formatUGX(Number((item as any).riderEarnings ?? item.totalAmount ?? 0))}</Text>
        </View>
      </Card>
    </Animated.View>
  );

  if (error && tasks.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="Deliveries" onBack={() => router.back()} />
        <View style={styles.stateWrap}>
          <ErrorState title="Couldn't load your deliveries" subtitle={error} onRetry={load} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Deliveries" subtitle="Your assignments" onBack={() => router.back()} />

      <View style={styles.scopeWrap}>
        <SegmentedControl
          segments={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={scope}
          onChange={setScope}
        />
      </View>

      {isLoading ? (
        <View style={styles.listContent}><ListSkeleton /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
              <EmptyState
                icon="cube-outline"
                title={scope === 'active' ? 'No active deliveries' : 'No completed deliveries yet'}
                subtitle={
                  scope === 'active'
                    ? 'Go online from your dashboard and new orders will appear here.'
                    : 'Deliveries you finish will be listed here.'
                }
                actionLabel={scope === 'active' ? 'Go to dashboard' : undefined}
                onAction={scope === 'active' ? () => router.replace('/driver') : undefined}
              />
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

/** What kind of delivery this is, in the provider's words. */
function deliveryLabel(taskType?: string): string {
  switch (taskType) {
    case 'FOOD_DELIVERY': return 'Food order';
    case 'SHOPPING': return 'Shopping order';
    case 'SMART_HEALTH_DELIVERY': return 'Pharmacy order';
    case 'ITEM_DELIVERY': return 'Parcel';
    default: return 'Delivery';
  }
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scopeWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  stateWrap: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  taskCard: {
    marginBottom: SPACING.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.gutter,
  },
  taskNumber: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  leg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    flex: 1,
  },
  legConnector: {
    width: 2,
    height: 16,
    backgroundColor: COLORS.outlineVariant,
    marginLeft: 4,
    marginVertical: 2,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.gutter,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  taskMetaText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  payout: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
