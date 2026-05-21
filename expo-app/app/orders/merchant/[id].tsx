// ============================================
// SMART RIDE MOBILE - MERCHANT DETAIL SCREEN
// ============================================
// Premium dark theme with vector icons
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
  StyleSheet
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
import { Icon, IconColors } from '../../../components/Icon';

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="home" size="2xl" color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Merchant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Cover Image */}
        <Animated.View entering={FadeIn.duration(400)}>
          {merchant.coverImage ? (
            <Image 
              source={{ uri: merchant.coverImage }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Icon name="home" size="2xl" color={COLORS.background} />
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size="md" color={COLORS.text} />
          </TouchableOpacity>
        </Animated.View>

        {/* Merchant Info */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.merchantInfoCard}
        >
          <View style={styles.merchantHeader}>
            <View style={styles.merchantImageContainer}>
              {merchant.image ? (
                <Image source={{ uri: merchant.image }} style={styles.merchantImage} />
              ) : (
                <View style={styles.merchantImagePlaceholder}>
                  <Icon name="home" size="lg" color={COLORS.primary} />
                </View>
              )}
            </View>
            <View style={styles.merchantDetails}>
              <Text style={styles.merchantName}>{merchant.name}</Text>
              <Text style={styles.merchantAddress}>{merchant.address}</Text>
              <View style={styles.merchantStats}>
                {merchant.rating && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size="xs" color="#FBBF24" />
                    <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>({merchant.reviewCount || 0})</Text>
                  </View>
                )}
                {merchant.deliveryTime && (
                  <Text style={styles.deliveryTime}>{merchant.deliveryTime} min</Text>
                )}
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: merchant.isOpen ? `${COLORS.success}15` : `${COLORS.error}15` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: merchant.isOpen ? COLORS.success : COLORS.error }
              ]}>
                {merchant.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Info Pills */}
          <View style={styles.infoPills}>
            {merchant.deliveryFee !== undefined && (
              <View style={styles.infoPill}>
                <Icon name="truck" size="xs" color={COLORS.textSecondary} />
                <Text style={styles.infoPillText}>
                  UGX {merchant.deliveryFee.toLocaleString()} delivery
                </Text>
              </View>
            )}
            {merchant.minOrder && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>
                  Min. UGX {merchant.minOrder.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {merchant.description && (
            <Text style={styles.description}>{merchant.description}</Text>
          )}
        </Animated.View>

        {/* Categories */}
        {categories.length > 1 && (
          <Animated.View 
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.categoriesContainer}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat && styles.categoryButtonActive
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Products */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Menu</Text>
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
            <View style={styles.noProducts}>
              <Text style={styles.noProductsText}>No products available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart Button */}
      {cart.totalItems > 0 && (
        <Animated.View 
          entering={ZoomIn.duration(300)}
          style={styles.cartButtonContainer}
        >
          <TouchableOpacity
            onPress={() => router.push('/orders/cart')}
            style={styles.cartButton}
            activeOpacity={0.9}
          >
            <View style={styles.cartButtonLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
              </View>
              <Text style={styles.cartButtonText}>View Cart</Text>
            </View>
            <Text style={styles.cartTotal}>
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
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
        )}
        <Text style={styles.productPrice}>
          UGX {product.price.toLocaleString()}
        </Text>
      </View>
      <View style={styles.productImageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Icon name="coffee" size="lg" color={IconColors.food} />
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={onAddToCart}
        disabled={!product.inStock}
        style={[
          styles.addButton,
          { backgroundColor: product.inStock ? COLORS.primary : COLORS.backgroundSurface }
        ]}
        activeOpacity={0.8}
      >
        <Icon name="plus" size="sm" color={COLORS.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 192,
  },
  coverPlaceholder: {
    width: '100%',
    height: 192,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 8,
  },
  merchantInfoCard: {
    backgroundColor: COLORS.backgroundElevated,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  merchantImageContainer: {
    marginRight: 12,
  },
  merchantImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  merchantImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  merchantAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  merchantStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 4,
  },
  deliveryTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoPills: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  infoPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },
  categoriesContainer: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.background,
  },
  productsContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noProducts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noProductsText: {
    color: COLORS.textMuted,
  },
  productCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  productDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  productImageContainer: {
    marginRight: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: `${IconColors.food}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartBadgeText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  cartButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartTotal: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
