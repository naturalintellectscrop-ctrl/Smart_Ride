/**
 * Smart Ride - Food Delivery Screen
 * 
 * Browse restaurants and order food for delivery.
 * Connected to backend API with fallback to mock data.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

// Fallback mock restaurant data (used when API is unavailable)
const MOCK_RESTAURANTS = [
  {
    id: '1',
    name: 'Café Javas',
    cuisine: 'International',
    rating: 4.8,
    deliveryTime: '25-35 min',
    deliveryFee: 'UGX 5,000',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    featured: true,
  },
  {
    id: '2',
    name: 'Java House',
    cuisine: 'Coffee & Breakfast',
    rating: 4.6,
    deliveryTime: '20-30 min',
    deliveryFee: 'UGX 4,000',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    featured: true,
  },
  {
    id: '3',
    name: 'KFC Uganda',
    cuisine: 'Fast Food',
    rating: 4.4,
    deliveryTime: '15-25 min',
    deliveryFee: 'UGX 3,000',
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400',
    featured: false,
  },
  {
    id: '4',
    name: 'Pizza Hut',
    cuisine: 'Pizza',
    rating: 4.5,
    deliveryTime: '30-45 min',
    deliveryFee: 'UGX 6,000',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    featured: false,
  },
  {
    id: '5',
    name: 'Nandos',
    cuisine: 'Portuguese Chicken',
    rating: 4.7,
    deliveryTime: '25-40 min',
    deliveryFee: 'UGX 5,000',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
    featured: true,
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🍽️' },
  { id: 'fastfood', name: 'Fast Food', icon: '🍔' },
  { id: 'pizza', name: 'Pizza', icon: '🍕' },
  { id: 'coffee', name: 'Coffee', icon: '☕' },
  { id: 'asian', name: 'Asian', icon: '🥡' },
  { id: 'local', name: 'Local', icon: '🥘' },
];

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: string;
  image: string;
  featured?: boolean;
}

export function FoodScreen() {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch restaurants from API on mount
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const response = await api.getRestaurants();
      if (response.success && response.data && response.data.length > 0) {
        // Transform API data to match our format
        const apiRestaurants = response.data.map((r: any) => ({
          id: r.id,
          name: r.name || r.businessName,
          cuisine: r.cuisineType || 'Various',
          rating: r.rating || 4.5,
          deliveryTime: r.deliveryTime || '20-30 min',
          deliveryFee: r.deliveryFee ? `UGX ${r.deliveryFee.toLocaleString()}` : 'UGX 5,000',
          image: r.imageUrl || r.logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          featured: r.featured || r.isVerified,
        }));
        setRestaurants(apiRestaurants);
      } else {
        // Fall back to mock data if API returns no data
        setRestaurants(MOCK_RESTAURANTS);
      }
    } catch (error) {
      // Fall back to mock data on error
      console.log('Using mock restaurant data');
      setRestaurants(MOCK_RESTAURANTS);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRestaurantCard = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity style={styles.restaurantCard}>
      <View style={styles.restaurantImageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.restaurantImage}
          resizeMode="cover"
        />
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantCuisine}>{item.cuisine}</Text>
        <View style={styles.restaurantMeta}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.deliveryFee}>{item.deliveryFee}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Delivery</Text>
        <Text style={styles.headerSubtitle}>Delicious meals delivered to your door</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants or dishes..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipSelected,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryName,
              selectedCategory === category.id && styles.categoryNameSelected,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Section */}
      <Text style={styles.sectionTitle}>Featured Restaurants</Text>

      {/* Restaurant List */}
      <FlatList
        data={filteredRestaurants}
        renderItem={renderRestaurantCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  categoriesScroll: {
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A24',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: '#00FF88',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: '#00FF88',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  restaurantCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  restaurantImageContainer: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 140,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D0D12',
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 14,
  },
  ratingText: {
    fontSize: 14,
    color: '#FBBF24',
    marginLeft: 4,
    fontWeight: '600',
  },
  metaDot: {
    color: '#4B5563',
    marginHorizontal: 8,
  },
  deliveryTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  deliveryFee: {
    fontSize: 13,
    color: '#00FF88',
  },
});

export default FoodScreen;
