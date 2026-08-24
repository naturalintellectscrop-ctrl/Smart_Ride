// ============================================
// SMART RIDE MOBILE - MERCHANT DETAIL SCREEN
// ============================================
// PURPOSE: View merchant details and menu/products
// Uses StyleSheet.create() + Ionicons (no NativeWind)
// ============================================

import React, { useState, useEffect , useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/src/constants';
import {
  Chip,
  EmptyState,
} from '@/src/components';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
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
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => create_styles(COLORS), [COLORS]);
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
        api.getMerchantMenu(id),
      ]);

      if (merchantRes.success && merchantRes.data) {
        setMerchant(merchantRes.data);
      }

      if (productsRes.success && productsRes.data) {
        const productsData = productsRes.data ?? [];
        setProducts(productsData);
        const cats = [
          'All',
          ...new Set(
            productsData
              .map((p: Product) => p.category)
              .filter(Boolean)
          ),
        ];
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

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="storefront-outline"
          size={48}
          color={COLORS.outline}
        />
        <Text style={styles.emptyText}>Merchant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
              <Ionicons
                name="storefront"
                size={56}
                color={COLORS.onPrimary}
              />
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.onSurface}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Merchant Info */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.merchantInfoCard}
        >
          <View style={styles.merchantInfoRow}>
            <View style={styles.merchantLogoContainer}>
              {merchant.image ? (
                <Image
                  source={{ uri: merchant.image }}
                  style={styles.merchantLogoImage}
                />
              ) : (
                <Ionicons
                  name="storefront"
                  size={28}
                  color={COLORS.primary}
                />
              )}
            </View>
            <View style={styles.merchantInfoText}>
              <Text style={styles.merchantName}>{merchant.name}</Text>
              <Text style={styles.merchantAddress}>{merchant.address}</Text>
              <View style={styles.ratingRow}>
                {merchant.rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons
                      name="star"
                      size={14}
                      color={COLORS.warning}
                      style={styles.starIcon}
                    />
                    <Text style={styles.ratingValue}>
                      {merchant.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.reviewCount}>
                      ({merchant.reviewCount || 0})
                    </Text>
                  </View>
                )}
                {merchant.deliveryTime && (
                  <Text style={styles.deliveryTime}>
                    {merchant.deliveryTime} min
                  </Text>
                )}
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: merchant.isOpen
                    ? COLORS.primaryFixed
                    : COLORS.errorContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: merchant.isOpen
                      ? COLORS.onPrimaryFixedVariant
                      : COLORS.onErrorContainer,
                  },
                ]}
              >
                {merchant.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Info Pills */}
          <View style={styles.infoPillsRow}>
            {merchant.deliveryFee !== undefined && (
              <View style={styles.infoPill}>
                <Ionicons
                  name="car-outline"
                  size={14}
                  color={COLORS.onSurfaceVariant}
                  style={styles.pillIcon}
                />
                <Text style={styles.pillText}>
                  UGX {merchant.deliveryFee.toLocaleString()} delivery
                </Text>
              </View>
            )}
            {merchant.minOrder && (
              <View style={styles.infoPill}>
                <Ionicons
                  name="wallet-outline"
                  size={14}
                  color={COLORS.onSurfaceVariant}
                  style={styles.pillIcon}
                />
                <Text style={styles.pillText}>
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
            style={styles.categoriesSection}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  active={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={styles.categoryChip}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Products */}
        <View style={styles.productsSection}>
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
            <EmptyState
              icon="restaurant-outline"
              title="No products available"
              subtitle="This merchant hasn't listed anything yet."
            />
          )}
        </View>
      </ScrollView>

      {/* Cart Button */}
      {cart.totalItems > 0 && (
        <Animated.View entering={ZoomIn.duration(300)} style={styles.cartButtonContainer}>
          <TouchableOpacity
            onPress={() => router.push('/orders/cart')}
            style={styles.cartButton}
            activeOpacity={0.8}
          >
            <View style={styles.cartButtonLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
              </View>
              <Text style={styles.cartButtonText}>View Cart</Text>
            </View>
            <Text style={styles.cartButtonPrice}>
              UGX {cart.totalPrice.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// PRODUCT CARD COMPONENT
// ============================================

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: () => void;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => create_styles(COLORS), [COLORS]);
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
          <Ionicons
            name="restaurant-outline"
            size={28}
            color={COLORS.outline}
          />
        )}
      </View>
      <TouchableOpacity
        onPress={onAddToCart}
        disabled={!product.inStock}
        activeOpacity={0.7}
        style={[
          styles.addToCartButton,
          {
            backgroundColor: product.inStock
              ? COLORS.primary
              : COLORS.outlineVariant,
          },
        ]}
      >
        <Ionicons
          name="add"
          size={20}
          color={COLORS.onPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const create_styles = (COLORS: ThemedColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.outline,
    marginTop: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },

  // Cover
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
    top: Platform.OS === 'ios' ? 48 : 16,
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },

  // Merchant Info
  merchantInfoCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.md,
    marginTop: -SPACING.lg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  merchantInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  merchantLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.gutter,
  },
  merchantLogoImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
  },
  merchantInfoText: {
    flex: 1,
  },
  merchantName: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
  },
  merchantAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  starIcon: {
    marginRight: 4,
  },
  ratingValue: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  reviewCount: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginLeft: 4,
  },
  deliveryTime: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
  },
  statusBadge: {
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },

  // Info Pills
  infoPillsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.gutter,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 4,
  },
  pillIcon: {
    marginRight: 4,
  },
  pillText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },

  // Description
  description: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.outline,
    marginTop: SPACING.md,
    lineHeight: 22,
  },

  // Categories
  categoriesSection: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.gutter,
    marginTop: SPACING.xs,
  },
  categoryChip: {
    marginRight: SPACING.gutter,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },

  // Products
  productsSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 128,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: SPACING.gutter,
  },

  // Product Card
  productCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.gutter,
    flexDirection: 'row',
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  productInfo: {
    flex: 1,
    marginRight: SPACING.gutter,
  },
  productName: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  productDescription: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: 4,
  },
  productPrice: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.lg,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cart Button
  cartButtonContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.md,
    right: SPACING.md,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.active,
  },
  cartButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.gutter,
  },
  cartBadgeText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },
  cartButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },
  cartButtonPrice: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
});
