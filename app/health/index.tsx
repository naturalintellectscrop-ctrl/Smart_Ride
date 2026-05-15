// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Health services - pharmacy, prescriptions
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
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

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  image?: string;
  rating?: number;
  isOpen: boolean;
  deliveryTime?: string;
}

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  inStock: boolean;
}

export default function HealthScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'medicines'>('pharmacies');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPharmacies();
      if (response.success && response.data) {
        setPharmacies(response.data);
      }
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
      setPharmacies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
        className="bg-primary-500 pt-12 pb-6 px-4"
      >
        <Text className="text-white text-2xl font-bold">Smart Health</Text>
        <Text className="text-white/80 mt-1">Medicine delivery & prescriptions</Text>
        
        {/* Search */}
        <Animated.View 
          entering={ZoomIn.delay(200).duration(300)}
          className="mt-4 bg-white rounded-xl flex-row items-center px-4 py-3"
        >
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search medicines or pharmacies..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-gray-900"
          />
        </Animated.View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        className="flex-row bg-white px-4 py-4 gap-3 shadow-sm"
      >
        <QuickAction 
          icon="💊" 
          label="Order Medicine" 
          onPress={() => setActiveTab('medicines')}
          delay={150}
        />
        <QuickAction 
          icon="📋" 
          label="Prescriptions" 
          onPress={() => router.push('/health/prescriptions')}
          delay={200}
        />
        <QuickAction 
          icon="🏥" 
          label="Pharmacies" 
          onPress={() => setActiveTab('pharmacies')}
          delay={250}
        />
        <QuickAction 
          icon="🆘" 
          label="Emergency" 
          onPress={() => router.push('/sos')}
          delay={300}
        />
      </Animated.View>

      {/* Content */}
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'pharmacies' ? (
          <>
            <Text className="text-gray-900 font-semibold mb-3">Nearby Pharmacies</Text>
            {pharmacies.length > 0 ? (
              pharmacies.map((pharmacy, index) => (
                <Animated.View
                  key={pharmacy.id}
                  entering={SlideInRight.duration(300).delay(index * 80)}
                >
                  <PharmacyCard 
                    pharmacy={pharmacy} 
                    onPress={() => router.push(`/health/pharmacy/${pharmacy.id}`)}
                  />
                </Animated.View>
              ))
            ) : (
              <Animated.View 
                entering={FadeIn.duration(400)}
                className="items-center py-12"
              >
                <Text className="text-4xl mb-4">💊</Text>
                <Text className="text-gray-500">No pharmacies available</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <Text className="text-gray-900 font-semibold mb-3">Popular Medicines</Text>
            <Animated.View 
              entering={FadeIn.duration(400)}
              className="items-center py-12"
            >
              <Text className="text-4xl mb-4">💊</Text>
              <Text className="text-gray-500">Search for medicines above</Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress, delay }: { icon: string; label: string; onPress: () => void; delay: number }) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(300)}>
      <TouchableOpacity onPress={onPress} className="flex-1 items-center">
        <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mb-1">
          <Text className="text-xl">{icon}</Text>
        </View>
        <Text className="text-xs text-gray-600 text-center">{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PharmacyCard({ pharmacy, onPress }: { pharmacy: Pharmacy; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row">
        <View className="w-16 h-16 bg-green-50 rounded-xl items-center justify-center mr-3">
          {pharmacy.image ? (
            <Image source={{ uri: pharmacy.image }} className="w-16 h-16 rounded-xl" />
          ) : (
            <Text className="text-2xl">💊</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold text-gray-900 flex-1">{pharmacy.name}</Text>
            <View className={`px-2 py-1 rounded-full ${pharmacy.isOpen ? 'bg-green-100' : 'bg-red-100'}`}>
              <Text className={`text-xs ${pharmacy.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {pharmacy.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm">{pharmacy.address}</Text>
          <View className="flex-row items-center mt-2">
            {pharmacy.rating && (
              <View className="flex-row items-center mr-4">
                <Text className="text-yellow-500 mr-1">⭐</Text>
                <Text className="text-gray-700 text-sm">{pharmacy.rating.toFixed(1)}</Text>
              </View>
            )}
            {pharmacy.deliveryTime && (
              <Text className="text-gray-500 text-sm">{pharmacy.deliveryTime} min delivery</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
