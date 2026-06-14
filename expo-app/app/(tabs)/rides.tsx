// ============================================
// SMART RIDE MOBILE - RIDES HISTORY SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
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
import { useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { Task } from '@/src/types';

export default function RidesScreen() {
  const router = useRouter();
  const { taskHistory, setTaskHistory } = useTaskStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('history');

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

  const renderTask = ({ item, index }: { item: Task; index: number }) => {
    const statusColor = TASK_STATUS_COLORS[item.status] || COLORS.primary;
    
    return (
      <Animated.View
        entering={SlideInRight.duration(400).delay(index * 80).springify()}
        layout={Layout.springify()}
      >
        <TaskCard 
          item={item} 
          statusColor={statusColor} 
          onPress={() => router.push(`/rider/ride-tracking?taskId=${item.id}`)}
        />
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (isLoading && taskHistory.length === 0 && !error) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rides...</Text>
        </View>
      );
    }

    if (error && taskHistory.length === 0) {
      return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>{error}</Text>
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
        data={taskHistory}
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
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active rides' : 'No ride history yet'}
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
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={styles.headerTitle}>My Rides</Text>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInUp.duration(400).delay(100).springify()} style={styles.tabsContainer}>
        <AnimatedTabButton
          isActive={activeTab === 'active'}
          onPress={() => setActiveTab('active')}
          label="Active Ride"
        />
        <AnimatedTabButton
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
          label="History"
        />
      </Animated.View>

      {/* Content */}
      {renderContent()}
    </View>
  );
}

// Animated Tab Button
function AnimatedTabButton({ 
  isActive, 
  onPress, 
  label, 
}: { 
  isActive: boolean; 
  onPress: () => void; 
  label: string;
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
    >
      <Animated.View style={animatedStyle}>
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Animated Task Card
function TaskCard({ item, statusColor, onPress }: { item: Task; statusColor: string; onPress: () => void }) {
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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View>
            <Text style={styles.taskNumber}>#{item.taskNumber || item.id.slice(0, 8)}</Text>
            <Text style={styles.taskType}>
              {item.taskType?.includes('BODA') ? '🏍️ Smart Boda' : 
               item.taskType?.includes('CAR') ? '🚗 Smart Car' : '📦 Delivery'}
            </Text>
          </View>
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {TASK_STATUS_LABELS[item.status] || item.status}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickupAddress || 'Pickup location'}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.dropoffAddress || 'Dropoff location'}
          </Text>
        </View>

        <View style={styles.taskFooter}>
          <Text style={styles.taskDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.taskAmount}>UGX {(item.totalAmount || 0).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg + SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.headlineLg.fontSize,
    fontWeight: TYPOGRAPHY.headlineLg.fontWeight as any,
    color: COLORS.onSurface,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.lg + SPACING.xs,
    paddingVertical: SPACING.sm + SPACING.xs,
    gap: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm + SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  tabButtonText: {
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
    color: COLORS.outline,
  },
  tabButtonTextActive: {
    color: COLORS.onPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl + SPACING.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.outline,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + SPACING.xs,
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
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + SPACING.xs,
    ...SHADOWS.button,
  },
  bookButtonText: {
    color: COLORS.onPrimary,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg + SPACING.xs,
  },
  taskCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.gutter,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.gutter,
  },
  taskNumber: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
  },
  taskType: {
    fontWeight: '700' as const,
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    marginTop: SPACING.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.gutter,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: TYPOGRAPHY.labelMd.fontWeight as any,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  locationDot: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    marginRight: SPACING.sm,
    marginTop: SPACING.xs / 2,
  },
  locationText: {
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.gutter,
    marginTop: SPACING.gutter,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  taskDate: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
  },
  taskAmount: {
    fontWeight: '700' as const,
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
});
