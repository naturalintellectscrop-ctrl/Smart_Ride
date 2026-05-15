// ============================================
// SMART RIDE MOBILE - MERCHANT DETAIL SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: View merchant details and menu/products
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { useCartStore, CartItem } from '@/src/store';

interface Merchant {
  id: string;
  name: string;
  description?: string;
  image?: string;
  coverImage?: string;
  rating?: number;
  reviewCount?: number;
  deliveryTime?: string;
  deliveryFee?: number;
  minOrder?: number;
  address?: string;
  isOpen: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  inStock: boolean;
}

export default function MerchantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cart = useCartStore();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMerchant();
  }, [id]);

  const loadMerchant = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const [merchantRes, productsRes] = await Promise.all([
        api.getMerchant(id),
        api.getMerchantProducts(id),
      ]);
      
      if (merchantRes.success && merchantRes.data) {
        setMerchant(merchantRes.data);
      }
      
      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data);
        const cats = ['All', ...new Set(productsRes.data.map((p: Product) => p.category).filter(Boolean))];
        setCategories(cats as string[]);
      }
    } catch (error) {
      console.error('Failed to load merchant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchant();
    setRefreshing(false);
  };

  const addToCart = (product: Product) => {
    const cartItem: CartItem = {
      id: `cart-${product.id}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      merchantId: merchant?.id,
      merchantName: merchant?.name,
    };
    cart.addItem(cartItem);
  };

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Merchant not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cover Image */}
        <Animated.View entering={FadeIn.duration(400)}>
          {merchant.coverImage ? (
            <Image 
              source={{ uri: merchant.coverImage }} 
              className="w-full h-48"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-48 bg-primary-500 items-center justify-center">
              <Text className="text-5xl text-white">🏪</Text>
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-12 left-4 bg-white/90 rounded-full p-2"
          >
            <Text className="text-xl">←</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Merchant Info */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(100)}
          className="bg-white p-4 -mt-6 rounded-t-3xl"
        >
          <View className="flex-row items-start">
            <View className="w-16 h-16 bg-gray-100 rounded-xl items-center justify-center mr-3">
              {merchant.image ? (
                <Image source={{ uri: merchant.image }} className="w-16 h-16 rounded-xl" />
              ) : (
                <Text className="text-2xl">🏪</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{merchant.name}</Text>
              <Text className="text-gray-500 text-sm">{merchant.address}</Text>
              <View className="flex-row items-center mt-2">
                {merchant.rating && (
                  <View className="flex-row items-center mr-4">
                    <Text className="text-yellow-500 mr-1">⭐</Text>
                    <Text className="font-medium">{merchant.rating.toFixed(1)}</Text>
                    <Text className="text-gray-400 text-sm ml-1">
                      ({merchant.reviewCount || 0})
                    </Text>
                  </View>
                )}
                {merchant.deliveryTime && (
                  <Text className="text-gray-500 text-sm">{merchant.deliveryTime} min</Text>
                )}
              </View>
            </View>
            <View className={`px-3 py-1 rounded-full ${merchant.isOpen ? 'bg-green-100' : 'bg-red-100'}`}>
              <Text className={`text-xs font-medium ${merchant.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {merchant.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Info Pills */}
          <View className="flex-row mt-4 gap-3">
            {merchant.deliveryFee !== undefined && (
              <View className="bg-gray-100 rounded-full px-3 py-1">
                <Text className="text-gray-600 text-sm">
                  🚗 UGX {merchant.deliveryFee.toLocaleString()} delivery
                </Text>
              </View>
            )}
            {merchant.minOrder && (
              <View className="bg-gray-100 rounded-full px-3 py-1">
                <Text className="text-gray-600 text-sm">
                  Min. UGX {merchant.minOrder.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {merchant.description && (
            <Text className="text-gray-500 mt-4">{merchant.description}</Text>
          )}
        </Animated.View>

        {/* Categories */}
        {categories.length > 1 && (
          <Animated.View 
            entering={FadeInUp.duration(400).delay(200)}
            className="bg-white px-4 py-3 mt-2"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`mr-3 px-4 py-2 rounded-full ${
                    selectedCategory === cat ? 'bg-primary-500' : 'bg-gray-100'
                  }`}
                >
                  <Text className={selectedCategory === cat ? 'text-white font-medium' : 'text-gray-700'}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Products */}
        <View className="px-4 pt-4 pb-32">
          <Text className="text-gray-900 font-semibold mb-3">Menu</Text>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <Animated.View
                key={product.id}
                entering={SlideInRight.duration(300).delay(index * 50)}
              >
                <ProductCard 
                  product={product} 
                  onAddToCart={() => addToCart(product)}
                />
              </Animated.View>
            ))
          ) : (
            <View className="items-center py-12">
              <Text className="text-gray-500">No products available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart Button */}
      {cart.totalItems > 0 && (
        <Animated.View 
          entering={ZoomIn.duration(300)}
          className="absolute bottom-6 left-4 right-4"
        >
          <TouchableOpacity
            onPress={() => router.push('/orders/cart')}
            className="bg-primary-500 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="bg-white/20 rounded-full w-8 h-8 items-center justify-center mr-3">
                <Text className="text-white font-bold">{cart.totalItems}</Text>
              </View>
              <Text className="text-white font-bold">View Cart</Text>
            </View>
            <Text className="text-white font-bold">
              UGX {cart.totalPrice.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row">
      <View className="flex-1 mr-3">
        <Text className="font-bold text-gray-900">{product.name}</Text>
        {product.description && (
          <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
            {product.description}
          </Text>
        )}
        <Text className="text-primary-500 font-bold mt-2">
          UGX {product.price.toLocaleString()}
        </Text>
      </View>
      <View className="w-20 h-20 bg-gray-100 rounded-xl items-center justify-center">
        {product.image ? (
          <Image source={{ uri: product.image }} className="w-20 h-20 rounded-xl" />
        ) : (
          <Text className="text-2xl">🍽️</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onAddToCart}
        disabled={!product.inStock}
        className={`absolute bottom-2 right-2 rounded-full w-8 h-8 items-center justify-center ${
          product.inStock ? 'bg-primary-500' : 'bg-gray-300'
        }`}
      >
        <Text className="text-white text-xl">+</Text>
      </TouchableOpacity>
    </View>
  );
}
