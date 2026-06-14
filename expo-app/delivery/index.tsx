// ============================================
// SMART RIDE MOBILE - DELIVERY SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Package/item delivery service
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { COLORS } from '@/src/constants';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  basePrice: number;
  estimatedTime: string;
}

const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'boda',
    name: 'Boda Boda',
    description: 'Quick delivery for small packages',
    icon: '🏍️',
    basePrice: 5000,
    estimatedTime: '15-30 min',
  },
  {
    id: 'car',
    name: 'Car Delivery',
    description: 'Larger packages, multiple items',
    icon: '🚗',
    basePrice: 15000,
    estimatedTime: '30-45 min',
  },
  {
    id: 'truck',
    name: 'Truck Delivery',
    description: 'Bulk items, furniture, appliances',
    icon: '🚚',
    basePrice: 30000,
    estimatedTime: '1-2 hours',
  },
];

export default function DeliveryScreen() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string>('boda');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestDelivery = async () => {
    if (!pickupLocation || !dropoffLocation) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Create delivery request
      router.push('/orders/order-tracking?type=delivery');
    } catch (error) {
      console.error('Failed to create delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDelivery = DELIVERY_OPTIONS.find(o => o.id === selectedOption);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-primary-500 pt-12 pb-6 px-4"
      >
        <Text className="text-white text-2xl font-bold">Delivery</Text>
        <Text className="text-white/80 mt-1">Send packages anywhere</Text>
      </Animated.View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Delivery Options */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text className="text-gray-900 font-semibold mb-3">Select Delivery Type</Text>
          {DELIVERY_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={ZoomIn.delay(150 + index * 80).duration(300)}
            >
              <TouchableOpacity
                onPress={() => setSelectedOption(option.id)}
                className={`p-4 rounded-2xl mb-3 flex-row items-center ${
                  selectedOption === option.id 
                    ? 'bg-primary-500' 
                    : 'bg-white shadow-sm'
                }`}
              >
                <Text className="text-3xl mr-3">{option.icon}</Text>
                <View className="flex-1">
                  <Text className={`font-bold ${selectedOption === option.id ? 'text-white' : 'text-gray-900'}`}>
                    {option.name}
                  </Text>
                  <Text className={`text-sm ${selectedOption === option.id ? 'text-white/80' : 'text-gray-500'}`}>
                    {option.description}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`font-bold ${selectedOption === option.id ? 'text-white' : 'text-primary-500'}`}>
                    UGX {option.basePrice.toLocaleString()}
                  </Text>
                  <Text className={`text-xs ${selectedOption === option.id ? 'text-white/70' : 'text-gray-400'}`}>
                    {option.estimatedTime}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Location Inputs */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} className="mt-4">
          <Text className="text-gray-900 font-semibold mb-3">Delivery Details</Text>
          
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            {/* Pickup */}
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-2">Pickup Location</Text>
              <TouchableOpacity 
                onPress={() => router.push('/location-picker?type=pickup')}
                className="flex-row items-center bg-gray-50 rounded-xl p-3"
              >
                <Text className="text-gray-400 mr-2">📍</Text>
                <Text className={pickupLocation ? 'text-gray-900' : 'text-gray-400'}>
                  {pickupLocation || 'Enter pickup location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropoff */}
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-2">Drop-off Location</Text>
              <TouchableOpacity 
                onPress={() => router.push('/location-picker?type=dropoff')}
                className="flex-row items-center bg-gray-50 rounded-xl p-3"
              >
                <Text className="text-gray-400 mr-2">🏁</Text>
                <Text className={dropoffLocation ? 'text-gray-900' : 'text-gray-400'}>
                  {dropoffLocation || 'Enter drop-off location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Package Description */}
            <View>
              <Text className="text-gray-500 text-sm mb-2">Package Description</Text>
              <TextInput
                value={packageDescription}
                onChangeText={setPackageDescription}
                placeholder="What are you sending?"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 rounded-xl p-3 text-gray-900"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </Animated.View>

        {/* Summary */}
        {selectedDelivery && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            className="bg-white rounded-2xl p-4 mt-4 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-500">Delivery Type</Text>
              <Text className="text-gray-900 font-medium">{selectedDelivery.name}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-500">Estimated Time</Text>
              <Text className="text-gray-900 font-medium">{selectedDelivery.estimatedTime}</Text>
            </View>
            <View className="border-t border-gray-100 pt-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-bold">Estimated Cost</Text>
                <Text className="text-primary-500 font-bold text-lg">
                  UGX {selectedDelivery.basePrice.toLocaleString()}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Request Button */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)} className="mt-6 mb-8">
          <TouchableOpacity
            onPress={handleRequestDelivery}
            disabled={!pickupLocation || !dropoffLocation || isLoading}
            className={`rounded-2xl p-4 items-center ${
              pickupLocation && dropoffLocation 
                ? 'bg-primary-500' 
                : 'bg-gray-300'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Request Delivery
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
