// ============================================
// SMART RIDE MOBILE - RIDES HISTORY SCREEN
// ============================================
// Premium rides history with vector icons
// Matches admin dashboard design language
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
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
import { Task } from '@/src/types';
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  ride: '#00FF88',
  car: '#3B82F6',
  delivery: '#14B8A6',
  warning: '#FBBF24',
  error: '#F43F5E',
};

// Task status colors
const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: '#FBBF24',
  ACCEPTED: '#3B82F6',
  IN_PROGRESS: '#00FF88',
  COMPLETED: '#22C55E',
  CANCELLED: '#F43F5E',
};

// Task status labels
const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function RidesScreen() {
  const router = useRouter();
  const { taskHistory, setTaskHistory } = useTaskStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('history');

  useEffect(() => {
    loadTasks();
  }, []);

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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
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
          <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.warning}15` }]}>
            <Icon name="clock" size="2xl" color={COLORS.warning} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedButton onPress={loadTasks}>
            <View style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </View>
          </AnimatedButton>
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
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.ride}15` }]}>
              <Icon name="car" size="2xl" color={COLORS.ride} />
            </View>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active rides' : 'No ride history yet'}
            </Text>
            <AnimatedButton onPress={() => router.push('/rider/ride-request')}>
              <View style={styles.bookRideButton}>
                <Icon name="plus" size="sm" color={COLORS.background} style={{ marginRight: 8 }} />
                <Text style={styles.bookRideButtonText}>Book a Ride</Text>
              </View>
            </AnimatedButton>
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
          style={{ marginLeft: 8 }}
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
  style,
}: {
  isActive: boolean;
  onPress: () => void;
  label: string;
  style?: any;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    'worklet';
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
      style={[
        styles.tabButton,
        { backgroundColor: isActive ? COLORS.primary : COLORS.backgroundElevated },
        style,
      ]}
      onPress={handlePress}
    >
      <Animated.View style={animatedStyle}>
        <Text
          style={[
            styles.tabButtonText,
            { color: isActive ? COLORS.background : COLORS.textSecondary },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Animated Task Card
function TaskCard({
  item,
  statusColor,
  onPress,
}: {
  item: Task;
  statusColor: string;
  onPress: () => void;
}) {
  const getTaskIcon = (): { icon: IconName; color: string } => {
    if (item.taskType?.includes('BODA')) {
      return { icon: 'bike', color: COLORS.ride };
    }
    if (item.taskType?.includes('CAR')) {
      return { icon: 'car', color: COLORS.car };
    }
    return { icon: 'package', color: COLORS.delivery };
  };

  const taskIcon = getTaskIcon();

  return (
    <AnimatedButton onPress={onPress}>
      <View style={[styles.taskCard, { borderColor: `${statusColor}20` }]}>
        <View style={styles.taskCardHeader}>
          <View style={styles.taskTypeContainer}>
            <View style={[styles.taskIconContainer, { backgroundColor: `${taskIcon.color}15` }]}>
              <Icon name={taskIcon.icon} size="lg" color={taskIcon.color} />
            </View>
            <View>
              <Text style={styles.taskNumber}>#{item.taskNumber || item.id.slice(0, 8)}</Text>
              <Text style={styles.taskType}>
                {item.taskType?.includes('BODA')
                  ? 'Smart Boda'
                  : item.taskType?.includes('CAR')
                  ? 'Smart Car'
                  : 'Delivery'}
              </Text>
            </View>
          </View>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {TASK_STATUS_LABELS[item.status] || item.status}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.taskLocations}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: COLORS.accent }]} />
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
        </View>

        <View style={styles.taskFooter}>
          <Text style={styles.taskDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.taskAmount}>UGX {(item.totalAmount || 0).toLocaleString()}</Text>
        </View>
      </View>
    </AnimatedButton>
  );
}

// Animated Button Component
function AnimatedButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.95}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  bookRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  bookRideButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  taskType: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskLocations: {
    marginBottom: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  taskAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
