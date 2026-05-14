/**
 * Smart Ride - Shopping Screen
 * 
 * Browse shops and order groceries or retail items for delivery.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
} from 'react-native';

// Mock shop data
const SHOPS = [
  {
    id: '1',
    name: 'Carrefour Kampala',
    category: 'Supermarket',
    rating: 4.7,
    deliveryTime: '30-45 min',
    deliveryFee: 'UGX 8,000',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
    isOpen: true,
  },
  {
    id: '2',
    name: 'Shoprite Uganda',
    category: 'Supermarket',
    rating: 4.5,
    deliveryTime: '35-50 min',
    deliveryFee: 'UGX 7,000',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    isOpen: true,
  },
  {
    id: '3',
    name: 'Uchumi Supermarket',
    category: 'Supermarket',
    rating: 4.3,
    deliveryTime: '40-55 min',
    deliveryFee: 'UGX 6,000',
    image: 'https://images.unsplash.com/photo-1568978861683-673bb622b4e6?w=400',
    isOpen: false,
  },
  {
    id: '4',
    name: 'Game Stores',
    category: 'Electronics & Home',
    rating: 4.6,
    deliveryTime: '45-60 min',
    deliveryFee: 'UGX 10,000',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    isOpen: true,
  },
  {
    id: '5',
    name: 'Pharmacy Direct',
    category: 'Pharmacy',
    rating: 4.8,
    deliveryTime: '20-35 min',
    deliveryFee: 'UGX 4,000',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
    isOpen: true,
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🛒' },
  { id: 'supermarket', name: 'Supermarket', icon: '🏪' },
  { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'liquor', name: 'Liquor', icon: '🍷' },
];

export function ShoppingScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredShops = SHOPS.filter(shop =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderShopCard = ({ item }: { item: typeof SHOPS[0] }) => (
    <TouchableOpacity style={styles.shopCard}>
      <View style={styles.shopImageContainer}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.shopImage}
          resizeMode="cover"
        />
        {!item.isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        )}
      </View>
      <View style={styles.shopInfo}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopName}>{item.name}</Text>
          {item.isOpen && (
            <View style={styles.openBadge}>
              <Text style={styles.openText}>Open</Text>
            </View>
          )}
        </View>
        <Text style={styles.shopCategory}>{item.category}</Text>
        <View style={styles.shopMeta}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
        </View>
        <Text style={styles.deliveryFee}>{item.deliveryFee} delivery</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping</Text>
        <Text style={styles.headerSubtitle}>Groceries & retail delivered</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search shops or products..."
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
      <Text style={styles.sectionTitle}>Available Shops</Text>

      {/* Shop List */}
      <FlatList
        data={filteredShops}
        renderItem={renderShopCard}
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
  shopCard: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  shopImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  shopInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  openBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  openText: {
    fontSize: 11,
    color: '#00FF88',
    fontWeight: '600',
  },
  shopCategory: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 12,
  },
  ratingText: {
    fontSize: 13,
    color: '#FBBF24',
    marginLeft: 4,
    fontWeight: '600',
  },
  metaDot: {
    color: '#4B5563',
    marginHorizontal: 6,
    fontSize: 10,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deliveryFee: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: '500',
  },
});

export default ShoppingScreen;
