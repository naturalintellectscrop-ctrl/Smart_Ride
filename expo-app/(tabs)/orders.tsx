/* eslint-disable react-hooks/immutability */
// ============================================
// SMART RIDE MOBILE - ORDERS SCREEN
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
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
  ZoomIn,
  Layout,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { Order } from '@/src/types';

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getOrders();
      if (response.success && response.data) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return COLORS.secondary;
      case 'CANCELLED':
        return COLORS.warning;
      case 'PREPARING':
        return COLORS.accent;
      default:
        return COLORS.primary;
    }
  };

  const renderOrder = ({ item, index }: { item: Order; index: number }) => (
    <Animated.View
      entering={SlideInRight.duration(400).delay(index * 80).springify()}
      layout={Layout.springify()}
    >
      <OrderCard 
        item={item} 
        onPress={() => router.push(`/orders/order-tracking?orderId=${item.id}`)}
        getStatusColor={getStatusColor}
        formatDate={formatDate}
      />
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-white pt-12 pb-4 px-4 border-b border-gray-100"
      >
        <Text className="text-2xl font-bold text-gray-900">Orders</Text>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100).springify()}
        className="flex-row bg-white px-4 py-3 gap-3"
      >
        <QuickAction 
          icon="🍔" 
          label="Food" 
          onPress={() => router.push('/orders/restaurants')}
          delay={150}
        />
        <QuickAction 
          icon="🛒" 
          label="Shopping" 
          onPress={() => router.push('/orders/shopping')}
          delay={200}
        />
        <QuickAction 
          icon="📦" 
          label="Delivery" 
          onPress={() => router.push('/orders/delivery')}
          delay={250}
        />
        <QuickAction 
          icon="💊" 
          label="Health" 
          onPress={() => router.push('/orders/health')}
          delay={300}
        />
      </Animated.View>

      {/* Orders List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4 pt-4"
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Animated.View 
              entering={FadeIn.duration(400)}
              className="items-center justify-center py-12"
            >
              <Text className="text-4xl mb-4">📦</Text>
              <Text className="text-gray-500 text-center">No orders yet</Text>
              <AnimatedButton onPress={() => router.push('/orders/restaurants')}>
                <View className="mt-4 bg-primary-500 rounded-xl px-6 py-3">
                  <Text className="text-white font-semibold">Order Food</Text>
                </View>
              </AnimatedButton>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

// Quick Action with Animation
function QuickAction({ icon, label, onPress, delay }: { icon: string; label: string; onPress: () => void; delay: number }) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(300).springify()}>
      <AnimatedButton onPress={onPress}>
        <View className="flex-1 items-center bg-gray-50 rounded-xl py-3">
          <Text className="text-xl mb-1">{icon}</Text>
          <Text className="text-xs text-gray-600 font-medium">{label}</Text>
        </View>
      </AnimatedButton>
    </Animated.View>
  );
}

// Order Card with Animation
function OrderCard({ item, onPress, getStatusColor, formatDate }: { item: Order; onPress: () => void; getStatusColor: (s: string) => string; formatDate: (d: string) => string }) {
  return (
    <AnimatedButton onPress={onPress}>
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mr-3">
              <Text className="text-2xl">
                {item.orderType === 'FOOD_DELIVERY' ? '🍔' : '🛒'}
              </Text>
            </View>
            <View>
              <Text className="font-bold text-gray-900">#{item.orderNumber}</Text>
              <Text className="text-gray-500 text-sm">{item.merchant?.name || 'Order'}</Text>
            </View>
          </View>
          <Animated.View 
            entering={ZoomIn.duration(300)}
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
          >
            <Text 
              className="text-xs font-medium"
              style={{ color: getStatusColor(item.status) }}
            >
              {item.status.replace('_', ' ')}
            </Text>
          </Animated.View>
        </View>

        {/* Items Summary */}
        <View className="bg-gray-50 rounded-xl p-3 mb-3">
          {item.items.slice(0, 2).map((orderItem, index) => (
            <Text key={index} className="text-gray-600 text-sm" numberOfLines={1}>
              {orderItem.quantity}x {orderItem.name}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text className="text-gray-400 text-sm">
              +{item.items.length - 2} more items
            </Text>
          )}
        </View>

        {/* Footer */}
        <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-sm">{formatDate(item.createdAt)}</Text>
          <Text className="font-bold text-primary-500">
            UGX {item.totalAmount.toLocaleString()}
          </Text>
        </View>
      </View>
    </AnimatedButton>
  );
}

// Animated Button
function AnimatedButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
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
