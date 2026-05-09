/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - RIDES HISTORY SCREEN
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
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
import { COLORS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/src/constants';
import { Task } from '@/src/types';

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
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-gray-500">Loading rides...</Text>
        </View>
      );
    }

    if (error && taskHistory.length === 0) {
      return (
        <Animated.View 
          entering={FadeIn.duration(400)}
          className="flex-1 items-center justify-center py-12"
        >
          <Text className="text-4xl mb-4">📋</Text>
          <Text className="text-gray-600 text-center mb-4">{error}</Text>
          <AnimatedButton onPress={loadTasks}>
            <View className="bg-primary-500 rounded-xl px-6 py-3">
              <Text className="text-white font-semibold">Retry</Text>
            </View>
          </AnimatedButton>
        </Animated.View>
      );
    }

    return (
      <FlatList
        className="flex-1 px-4 pt-4"
        data={taskHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Animated.View 
            entering={FadeIn.duration(400)}
            className="items-center justify-center py-12"
          >
            <Text className="text-4xl mb-4">🚗</Text>
            <Text className="text-gray-500 text-center">
              {activeTab === 'active' 
                ? 'No active rides' 
                : 'No ride history yet'}
            </Text>
            <AnimatedButton onPress={() => router.push('/rider/ride-request')}>
              <View className="mt-4 bg-primary-500 rounded-xl px-6 py-3">
                <Text className="text-white font-semibold">Book a Ride</Text>
              </View>
            </AnimatedButton>
          </Animated.View>
        }
      />
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-white pt-12 pb-4 px-4 border-b border-gray-100"
      >
        <Text className="text-2xl font-bold text-gray-900">My Rides</Text>
      </Animated.View>

      {/* Tabs */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100).springify()}
        className="flex-row bg-white px-4 py-2"
      >
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
  style 
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
      className={`flex-1 py-3 rounded-xl ${isActive ? 'bg-primary-500' : 'bg-gray-100'}`}
      onPress={handlePress}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        <Text className={`text-center font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Animated Task Card
function TaskCard({ item, statusColor, onPress }: { item: Task; statusColor: string; onPress: () => void }) {
  return (
    <AnimatedButton onPress={onPress}>
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-gray-500 text-sm">#{item.taskNumber || item.id.slice(0, 8)}</Text>
            <Text className="font-bold text-gray-900">
              {item.taskType?.includes('BODA') ? '🏍️ Smart Boda' : 
               item.taskType?.includes('CAR') ? '🚗 Smart Car' : '📦 Delivery'}
            </Text>
          </View>
          <Animated.View 
            entering={FadeIn.duration(300)}
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <Text 
              className="text-xs font-medium"
              style={{ color: statusColor }}
            >
              {TASK_STATUS_LABELS[item.status] || item.status}
            </Text>
          </Animated.View>
        </View>

        <View className="flex-row items-start mb-2">
          <View className="w-2 h-2 rounded-full bg-secondary-500 mt-1.5 mr-2" />
          <Text className="text-gray-600 flex-1" numberOfLines={1}>
            {item.pickupAddress || 'Pickup location'}
          </Text>
        </View>
        <View className="flex-row items-start mb-3">
          <View className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 mr-2" />
          <Text className="text-gray-600 flex-1" numberOfLines={1}>
            {item.dropoffAddress || 'Dropoff location'}
          </Text>
        </View>

        <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-sm">{formatDate(item.createdAt)}</Text>
          <Text className="font-bold text-primary-500">
            UGX {(item.totalAmount || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    </AnimatedButton>
  );
}

// Animated Button Component
function AnimatedButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
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
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
