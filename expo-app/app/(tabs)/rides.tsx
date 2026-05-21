// ============================================
// SMART RIDE MOBILE - RIDES HISTORY SCREEN
// ============================================
// Premium dark theme with Smart Ride branding
// Uses vector icons instead of emojis
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
  ZoomIn,
} from 'react-native-reanimated';
import { useTaskStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { Task } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

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
          <View style={styles.emptyIconContainer}>
            <Icon name="file-text" size="2xl" color={COLORS.textMuted} />
          </View>
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
            <View style={styles.emptyIconContainer}>
              <Icon name="car" size="2xl" color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active rides' : 'No ride history yet'}
            </Text>
            <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/rider/ride-request')}>
              <Icon name="plus" size="sm" color={COLORS.background} style={{ marginRight: 8 }} />
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
          icon="activity"
        />
        <AnimatedTabButton
          isActive={activeTab === 'history'}
          onPress={() => setActiveTab('history')}
          label="History"
          icon="clock"
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
  icon,
}: { 
  isActive: boolean; 
  onPress: () => void; 
  label: string;
  icon: 'activity' | 'clock';
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
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Icon 
          name={icon} 
          size="sm" 
          color={isActive ? COLORS.background : COLORS.textMuted} 
        />
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Animated Task Card
function TaskCard({ item, statusColor, onPress }: { item: Task; statusColor: string; onPress: () => void }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  // Determine ride type icon and color
  const getRideTypeInfo = () => {
    if (item.taskType?.includes('BODA')) {
      return { icon: 'navigation' as const, label: 'Smart Boda', color: IconColors.primary };
    } else if (item.taskType?.includes('CAR')) {
      return { icon: 'car' as const, label: 'Smart Car', color: IconColors.accent };
    }
    return { icon: 'package' as const, label: 'Delivery', color: '#14B8A6' };
  };

  const rideType = getRideTypeInfo();

  return (
    <TouchableOpacity 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.taskCard, animatedStyle]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskHeaderLeft}>
            <View style={[styles.rideTypeIcon, { backgroundColor: `${rideType.color}15` }]}>
              <Icon name={rideType.icon} size="md" color={rideType.color} />
            </View>
            <View>
              <Text style={styles.taskNumber}>#{item.taskNumber || item.id.slice(0, 8)}</Text>
              <Text style={styles.taskType}>{rideType.label}</Text>
            </View>
          </View>
          <Animated.View 
            entering={ZoomIn.duration(300)}
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
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: COLORS.background,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  bookButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookButtonText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  taskCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskNumber: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  taskType: {
    fontWeight: 'bold',
    color: COLORS.text,
    fontSize: 16,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskDate: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  taskAmount: {
    fontWeight: 'bold',
    color: COLORS.primary,
    fontSize: 14,
  },
});
