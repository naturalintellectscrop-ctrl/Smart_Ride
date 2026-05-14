// ============================================
// SMART RIDE MOBILE - RESTAURANTS LIST
// ============================================

import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { Merchant } from '@/src/types';

export default function RestaurantsScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'RESTAURANT', label: 'Restaurants' },
    { id: 'FAST_FOOD', label: 'Fast Food' },
    { id: 'CAFE', label: 'Cafes' },
  ];

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [searchQuery, selectedCategory, merchants]);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const response = await api.getMerchants('RESTAURANT');
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMerchants = () => {
    let filtered = merchants;

    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMerchants(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchants();
    setRefreshing(false);
  };

  const renderMerchant = ({ item }: { item: Merchant }) => (
    <TouchableOpacity 
      className="flex-row bg-white rounded-2xl p-3 mb-3 shadow-sm"
      onPress={() => router.push(`/orders/merchant/${item.id}`)}
    >
      {/* Image */}
      <View className="w-20 h-20 bg-gray-100 rounded-xl items-center justify-center mr-3">
        <Text className="text-3xl">🍽️</Text>
      </View>

      {/* Details */}
      <View className="flex-1 justify-center">
        <Text className="font-bold text-gray-900" numberOfLines={1}>{item.name}</Text>
        <Text className="text-gray-500 text-sm" numberOfLines={1}>{item.description}</Text>
        
        <View className="flex-row items-center mt-2">
          <Text className="text-yellow-500 mr-1">⭐</Text>
          <Text className="text-gray-600 text-sm">{item.rating.toFixed(1)}</Text>
          <Text className="text-gray-300 mx-2">•</Text>
          <Text className="text-gray-500 text-sm">{item.address}</Text>
        </View>

        <View className="flex-row items-center mt-1">
          <View className={`px-2 py-0.5 rounded-full ${item.isOpen ? 'bg-secondary-50' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-medium ${item.isOpen ? 'text-secondary-500' : 'text-gray-400'}`}>
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Text className="text-gray-600">←</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Restaurants</Text>
        </View>

        {/* Search */}
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-3"
          placeholder="Search restaurants..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View className="flex-row bg-white px-4 py-3 gap-2">
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === cat.id ? 'bg-primary-500' : 'bg-gray-100'
            }`}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text className={`font-medium ${
              selectedCategory === cat.id ? 'text-white' : 'text-gray-600'
            }`}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4 pt-4"
          data={filteredMerchants}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchant}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-4xl mb-4">🍽️</Text>
              <Text className="text-gray-500 text-center">No restaurants found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
