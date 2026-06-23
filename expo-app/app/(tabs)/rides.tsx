// ============================================
// SMART RIDE MOBILE - RIDES HISTORY SCREEN
// ============================================
// VERSION: STITCH-DS-001
// PURPOSE: Ride history with filter tabs and ride cards
// DESIGN: Stitch Design System — MD3 Green Theme
// - GlowHeader with "My Rides" title
// - Filter tabs (All, Active, Completed, Cancelled) with active indicator
// - Ride cards with route info, status badges, fare, driver info
// - Empty state with illustration
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Task } from '@/src/types';
import { GlowHeader } from '@/src/components/GlowHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { StatusBadge } from '@/src/components/StatusBadge';
import { TaskSkeleton } from '@/src/components/Skeleton';

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

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.getTaskHistory();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setTaskHistory(response.data);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          setTaskHistory(response.data.data);
        } else {
          console.warn('Unexpected task history response shape:', typeof response.data);
          setTaskHistory([]);
        }
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

  // Filter tasks based on active tab
  const filteredTasks = taskHistory.filter((task) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') {
      return !['COMPLETED', 'CANCELLED', 'FAILED', 'DELIVERED'].includes(task.status);
    }
    if (activeFilter === 'completed') {
      return ['COMPLETED', 'DELIVERED'].includes(task.status);
    }
    if (activeFilter === 'cancelled') {
      return ['CANCELLED', 'FAILED'].includes(task.status);
    }
    return true;
  });

  const renderTask = ({ item, index }: { item: Task; index: number }) => {
    const statusColor = TASK_STATUS_COLORS[item.status] || COLORS.primary;
    
    return (
      <Animated.View
        entering={SlideInRight.duration(400).delay(index * 80).springify()}
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
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.outline} />
          </View>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTasks}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="car-outline" size={40} color={COLORS.outline} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'active' ? 'No active rides' : 
               activeFilter === 'completed' ? 'No completed rides' :
               activeFilter === 'cancelled' ? 'No cancelled rides' :
               'No ride history yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all' ? 'Book your first ride to get started' : 'Try a different filter'}
            </Text>
            <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/rider/ride-request')}>
              <Text style={styles.bookButtonText}>Book a Ride</Text>
            </TouchableOpacity>
          </Animated.View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlowHeader title="My Rides" subtitle="Your ride history" />

      {/* Filter Tabs */}
      <Animated.View entering={FadeInUp.duration(400).delay(100).springify()} style={styles.tabsContainer}>
        {FILTER_TABS.map((tab) => (
          <FilterTab
            key={tab.key}
            label={tab.label}
            isActive={activeFilter === tab.key}
            onPress={() => setActiveFilter(tab.key)}
            styles={styles}
          />
        ))}
      </Animated.View>

      {/* Content */}
      {renderContent()}
    </View>
  );
}

// ============================================
// FILTER TAB COMPONENT
// ============================================

function FilterTab({
  isActive,
  onPress,
  label,
  styles,
}: {
  isActive: boolean;
  onPress: () => void;
  label: string;
  styles: any;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, 100);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity 
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={animatedStyle}>
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
      {/* Active indicator dot */}
      {isActive && (
        <View style={styles.tabIndicator} />
      )}
    </TouchableOpacity>
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard variant="default" padding={0} borderRadius={RADIUS.xl} style={{ backgroundColor: COLORS.backgroundElevated, borderColor: COLORS.border }}>
        <View style={styles.rideCardContent}>
          {/* Header: Ride type icon + number + status */}
          <View style={styles.rideHeader}>
            <View style={styles.rideHeaderLeft}>
              <View style={[styles.rideTypeIconCircle, { backgroundColor: iconBgColor }]}>
                <Ionicons name={rideIcon as any} size={18} color={iconColor} />
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
              <Ionicons name="time-outline" size={14} color={COLORS.outline} />
              <Text style={styles.rideDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.rideFare}>UGX {(item.totalAmount || 0).toLocaleString()}</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
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

  // Filter Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.containerMargin,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  tabButtonText: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    color: COLORS.outline,
  },
  tabButtonTextActive: {
    color: COLORS.onPrimary,
  },
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.onPrimary,
    marginTop: SPACING.xs,
  },

  // Loading
  skeletonContainer: {
    flex: 1,
    padding: SPACING.containerMargin,
    paddingTop: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: SPACING.md,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  retryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
  },
  bookButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  bookButtonText: {
    color: COLORS.onPrimary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
  },

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
  rideCardContent: {
    padding: SPACING.md,
  },
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
    borderRadius: 20,
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
