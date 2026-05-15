// ============================================
// SMART RIDE MOBILE - SHOPPING SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Browse and order groceries/shopping items
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { useCartStore } from '@/src/store';

interface Merchant {
  id: string;
  name: string;
  type: string;
  image?: string;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: number;
}

export default function ShoppingScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const response = await api.getMerchants('GROCERY');
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
      // Set empty array on error
      setMerchants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchants();
    setRefreshing(false);
  };

  const totalCartItems = cart.totalItems;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-white pt-12 pb-4 px-4 border-b border-gray-100"
      >
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900">Shopping</Text>
          {totalCartItems > 0 && (
            <TouchableOpacity 
              onPress={() => router.push('/orders/cart')}
              className="bg-primary-500 rounded-full px-4 py-2"
            >
              <Text className="text-white font-medium">Cart ({totalCartItems})</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-gray-500 mt-1">Groceries & essentials delivered</Text>
      </Animated.View>

      {/* Categories */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        className="bg-white px-4 py-3"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', 'Groceries', 'Electronics', 'Pharmacy', 'Household'].map((cat, index) => (
            <Animated.View 
              key={cat}
              entering={ZoomIn.delay(150 + index * 50).duration(200)}
            >
              <TouchableOpacity 
                className={`mr-3 px-4 py-2 rounded-full ${index === 0 ? 'bg-primary-500' : 'bg-gray-100'}`}
              >
                <Text className={index === 0 ? 'text-white font-medium' : 'text-gray-700'}>
                  {cat}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Merchants List */}
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-gray-900 font-semibold mb-3">Nearby Stores</Text>
        
        {merchants.length > 0 ? (
          merchants.map((merchant, index) => (
            <Animated.View
              key={merchant.id}
              entering={SlideInRight.duration(300).delay(index * 80)}
            >
              <MerchantCard 
                merchant={merchant} 
                onPress={() => router.push(`/orders/merchant/${merchant.id}`)}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View 
            entering={FadeIn.duration(400)}
            className="items-center py-12"
          >
            <Text className="text-4xl mb-4">🛒</Text>
            <Text className="text-gray-500 text-center">No stores available yet</Text>
            <Text className="text-gray-400 text-sm mt-2">Check back soon!</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row">
        <View className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center mr-3">
          {merchant.image ? (
            <Image source={{ uri: merchant.image }} className="w-16 h-16 rounded-xl" />
          ) : (
            <Text className="text-2xl">🏪</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-900">{merchant.name}</Text>
          <Text className="text-gray-500 text-sm">{merchant.type}</Text>
          <View className="flex-row items-center mt-2">
            {merchant.rating && (
              <View className="flex-row items-center mr-4">
                <Text className="text-yellow-500 mr-1">⭐</Text>
                <Text className="text-gray-700 text-sm">{merchant.rating.toFixed(1)}</Text>
              </View>
            )}
            {merchant.deliveryTime && (
              <Text className="text-gray-500 text-sm">{merchant.deliveryTime} min</Text>
            )}
          </View>
        </View>
        <View className="justify-center">
          <Text className="text-primary-500 font-medium">View →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
