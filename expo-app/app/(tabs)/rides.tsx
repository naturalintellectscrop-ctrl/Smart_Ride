// ============================================
// SMART RIDE — MY RIDES
// ============================================
// Archetype AR-4 (List + Search).
//
//   AppHeader (title) → SearchInput → Chip filter rail → FlatList of ride
//   Cards → EmptyState / ErrorState / skeletons, pull-to-refresh
//
// Search filters the already-loaded history client-side (route text and ride
// number) — no new endpoint, and it works offline against cached history.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  MOTION,
  ICON,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Task } from '@/src/types';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  SearchInput,
  StatusBadge,
  TaskSkeleton,
} from '@/src/components';

// ============================================
// FILTER TABS CONFIG
// ============================================
type RideFilter = 'all' | 'active' | 'completed' | 'cancelled';

const FILTER_TABS: { key: RideFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function RidesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { taskHistory, setTaskHistory } = useTaskStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RideFilter>('all');
  const [query, setQuery] = useState('');

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.getTaskHistory();
      if (response.success && response.data) {
        // getTaskHistory returns Task[]; stay defensive in case a paginated
        // envelope ({ data: Task[] }) is ever returned.
        const list = Array.isArray(response.data)
          ? response.data
          : ((response.data as any)?.data ?? []);
        setTaskHistory(list);
      } else {
        setError(response.error || 'Failed to load rides');
      }
    } catch (err) {
      console.error('Failed to load rides:', err);
      setError('Unable to load ride history. Pull to retry.');
    } finally {
      setIsLoading(false);
    }
  }, [setTaskHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status filter (tab) then free-text search over route and ride number.
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return taskHistory.filter((task) => {
      const matchesFilter =
        activeFilter === 'all' ? true
        : activeFilter === 'active' ? !['COMPLETED', 'CANCELLED', 'FAILED', 'DELIVERED'].includes(task.status)
        : activeFilter === 'completed' ? ['COMPLETED', 'DELIVERED'].includes(task.status)
        : ['CANCELLED', 'FAILED'].includes(task.status);
      if (!matchesFilter) return false;
      if (!q) return true;
      return [task.pickupAddress, task.dropoffAddress, task.taskNumber]
        .some((f) => f?.toLowerCase().includes(q));
    });
  }, [taskHistory, activeFilter, query]);

  const renderTask = ({ item, index }: { item: Task; index: number }) => {
    const statusColor = TASK_STATUS_COLORS[item.status] || COLORS.primary;
    
    return (
      <Animated.View
        entering={SlideInRight.duration(MOTION.duration.slower).delay(Math.min(index * 40, 240)).springify()}
        layout={Layout.springify()}
      >
        <RideCard
          item={item}
          statusColor={statusColor}
          onPress={() => router.push(`/rider/ride-tracking?taskId=${item.id}`)}
          COLORS={COLORS}
          styles={styles}
        />
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (isLoading && taskHistory.length === 0 && !error) {
      return (
        <View style={styles.skeletonContainer}>
          <TaskSkeleton />
          <TaskSkeleton />
          <TaskSkeleton />
        </View>
      );
    }

    if (error && taskHistory.length === 0) {
      return (
        <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
          <ErrorState title="Couldn't load your rides" subtitle={error} onRetry={loadTasks} />
        </Animated.View>
      );
    }

    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
            {query.trim() ? (
              <EmptyState
                icon="search-outline"
                title="No rides match your search"
                subtitle="Try a different address or ride number."
                actionLabel="Clear search"
                onAction={() => setQuery('')}
              />
            ) : (
              <EmptyState
                icon="car-outline"
                title={
                  activeFilter === 'active' ? 'No active rides'
                  : activeFilter === 'completed' ? 'No completed rides'
                  : activeFilter === 'cancelled' ? 'No cancelled rides'
                  : 'No ride history yet'
                }
                subtitle={activeFilter === 'all' ? 'Book your first ride to get started' : 'Try a different filter'}
                actionLabel={activeFilter === 'all' ? 'Book a Ride' : undefined}
                onAction={activeFilter === 'all' ? () => router.push('/rider/ride-request') : undefined}
              />
            )}
          </Animated.View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="My Rides" subtitle="Your ride history" variant="large" />

      <Animated.View entering={FadeInUp.duration(MOTION.duration.slower).delay(100)} style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by address or ride number"
        />
      </Animated.View>

      {/* Filter rail */}
      <Animated.View entering={FadeInUp.duration(MOTION.duration.slower).delay(140)} style={styles.filterRail}>
        {FILTER_TABS.map((tab) => (
          <Chip
            key={tab.key}
            label={tab.label}
            active={activeFilter === tab.key}
            onPress={() => setActiveFilter(tab.key)}
          />
        ))}
      </Animated.View>

      {renderContent()}
    </View>
  );
}

// ============================================
// RIDE CARD COMPONENT
// ============================================

function RideCard({ item, statusColor, onPress, COLORS, styles }: { item: Task; statusColor: string; onPress: () => void; COLORS: ThemedColors; styles: any }) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const rideIcon = item.taskType?.includes('BODA') ? 'bicycle' : 
                   item.taskType?.includes('CAR') ? 'car' : 'cube-outline';
  const rideLabel = item.taskType?.includes('BODA') ? 'Smart Boda' : 
                    item.taskType?.includes('CAR') ? 'Smart Car' : 'Delivery';
  const iconBgColor = item.taskType?.includes('BODA') ? COLORS.primaryFixed :
                      item.taskType?.includes('CAR') ? COLORS.secondaryFixed :
                      COLORS.tertiaryFixed;
  const iconColor = item.taskType?.includes('BODA') ? COLORS.onPrimaryFixedVariant :
                    item.taskType?.includes('CAR') ? COLORS.onSecondaryFixedVariant :
                    COLORS.onTertiaryFixedVariant;

  return (
    <Card
      variant="raised"
      padding={SPACING.md}
      radius={RADIUS.lg}
      onPress={onPress}
      accessibilityLabel={`${rideLabel} ${item.taskNumber || ''}`.trim()}
    >
      <View>
          {/* Header: Ride type icon + number + status */}
          <View style={styles.rideHeader}>
            <View style={styles.rideHeaderLeft}>
              <View style={[styles.rideTypeIconCircle, { backgroundColor: iconBgColor }]}>
                <Ionicons name={rideIcon as any} size={ICON.md} color={iconColor} />
              </View>
              <View style={styles.rideHeaderText}>
                <Text style={styles.rideTypeLabel}>{rideLabel}</Text>
                <Text style={styles.rideNumber}>#{item.taskNumber || item.id.slice(0, 8)}</Text>
              </View>
            </View>
            <StatusBadge
              label={TASK_STATUS_LABELS[item.status] || item.status}
              color={statusColor}
              size="sm"
            />
          </View>

          {/* Route info */}
          <View style={styles.routeSection}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.secondaryFixed }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.pickupAddress || 'Pickup location'}
              </Text>
            </View>
            {/* Route connector line */}
            <View style={styles.routeConnector}>
              <View style={styles.routeConnectorLine} />
            </View>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.dropoffAddress || 'Dropoff location'}
              </Text>
            </View>
          </View>

          {/* Footer: date + fare + driver */}
          <View style={styles.rideFooter}>
            <View style={styles.rideFooterLeft}>
              <Ionicons name="time-outline" size={ICON.xs} color={COLORS.outline} />
              <Text style={styles.rideDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.rideFare}>UGX {(item.totalAmount || 0).toLocaleString()}</Text>
          </View>
      </View>
    </Card>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  filterRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  stateWrap: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },

  // Filter Tabs

  // Loading
  skeletonContainer: {
    flex: 1,
    padding: SPACING.containerMargin,
    paddingTop: SPACING.md,
  },

  // Empty State

  // List
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.containerMargin,
    paddingBottom: 128,
    gap: SPACING.gutter,
  },

  // Ride Card
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  rideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
    flex: 1,
  },
  rideTypeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideHeaderText: {
    flex: 1,
  },
  rideTypeLabel: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  rideNumber: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 1,
  },

  // Route Section
  routeSection: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.gutter,
    marginBottom: SPACING.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  routeConnector: {
    paddingLeft: 4,
    height: 16,
    justifyContent: 'center',
  },
  routeConnectorLine: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.outlineVariant,
    borderRadius: 1,
  },

  // Ride Footer
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  rideFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rideDate: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  rideFare: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
