// ============================================
// SMART RIDE MOBILE - PHARMACY DETAIL SCREEN
// ============================================
// VERSION: DARK-THEME-002
// PURPOSE: View pharmacy details and medicine/products
// DESIGN: Design System primitives — Card, Chip, EmptyState, StatusBadge
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { useStorefrontLive } from '@/src/hooks/useStorefrontLive';
import { GRADIENTS, SPACING, RADIUS, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { useCartStore, CartItem } from '@/src/store';
import {
  Card,
  Chip,
  EmptyState,
  GradientButton,
  ServiceIcon,
  StatusBadge,
} from '@/src/components';

interface Pharmacy {
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
  type?: string;
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

export default function PharmacyDetailScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCartStore();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacy();
  }, [id]);

  const loadPharmacy = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    try {
      const [merchantRes, productsRes] = await Promise.all([
        api.getMerchant(id),
        api.getMerchantMenu(id),
      ]);

      if (merchantRes.success && merchantRes.data) {
        setPharmacy(merchantRes.data);
      }

      if (productsRes.success && productsRes.data) {
        const productsData = productsRes.data ?? [];
        setProducts(productsData);
        const cats = ['All', ...new Set(productsData.map((p: Product) => p.category).filter(Boolean))];
        setCategories(cats as string[]);
      }
    } catch (error) {
      console.error('Failed to load pharmacy:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadPharmacy();
    setRefreshing(false);
  };

  /**
   * The shop the customer is standing in, kept true underneath them.
   *
   * This is the screen where it matters most: a customer here is choosing what
   * to buy. If the pharmacy shuts, or an item goes out of stock or changes
   * price while they are deciding, the basket they build is already invalid —
   * and they would only discover it at checkout. Availability is patched in
   * place; a catalogue change reloads the products, because a price or a new
   * item cannot be inferred from the event alone.
   */
  useStorefrontLive({
    onMerchantAvailability: ({ merchantId, isOpen }) => {
      if (merchantId !== id) return;
      setPharmacy((prev: any) => (prev ? { ...prev, isOpen } : prev));
    },
    onProviderAvailability: ({ providerId, isOpen }) => {
      if (providerId !== id) return;
      setPharmacy((prev: any) => (prev ? { ...prev, isOpen } : prev));
    },
    onProviderCatalog: (e) => {
      if (e.providerId !== id) return;
      // A price or availability change is enough to patch; anything else needs
      // the real record.
      if (e.change === 'UPDATED' && e.medicineId) {
        setProducts((prev: any[]) =>
          prev.map((p) =>
            p.id === e.medicineId
              ? {
                  ...p,
                  ...(e.price != null ? { price: e.price } : {}),
                  ...(e.isAvailable != null ? { isAvailable: e.isAvailable } : {}),
                }
              : p
          )
        );
        return;
      }
      loadPharmacy();
    },
    onMerchantMenu: (e) => {
      if (e.merchantId !== id) return;
      loadPharmacy();
    },
  });

  const addToCart = (product: Product) => {
    const cartItem: CartItem = {
      id: `cart-${product.id}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      merchantId: pharmacy?.id,
      merchantName: pharmacy?.name,
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

  if (error && !pharmacy) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.outline} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPharmacy} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!pharmacy) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Pharmacy not found</Text>
        <GradientButton
          title="Go Back"
          onPress={() => router.back()}
          variant="outline"
          size="sm"
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Cover / Hero Section */}
        <Animated.View entering={FadeIn.duration(400)}>
          {pharmacy.coverImage ? (
            <Image
              source={{ uri: pharmacy.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="medkit-outline" size={56} color={COLORS.primary} />
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        </Animated.View>

        {/* Pharmacy Info Card */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.infoCard}
        >
          <View style={styles.infoRow}>
            <View style={styles.pharmacyIconContainer}>
              {pharmacy.image ? (
                <Image source={{ uri: pharmacy.image }} style={styles.pharmacyIcon} />
              ) : (
                <ServiceIcon service="HEALTH" size="lg" customEmoji="medkit-outline" />
              )}
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.pharmacyName} numberOfLines={1}>
                {pharmacy.name}
              </Text>
              {pharmacy.address ? (
                <Text style={styles.pharmacyAddress} numberOfLines={1}>
                  {pharmacy.address}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                {pharmacy.rating !== undefined && pharmacy.rating !== null && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={ICON.xs} color={COLORS.warning} />
                    <Text style={styles.ratingText}>
                      {pharmacy.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.reviewCount}>
                      ({pharmacy.reviewCount || 0})
                    </Text>
                  </View>
                )}
                {pharmacy.deliveryTime && (
                  <Text style={styles.deliveryTimeText}>
                    {pharmacy.deliveryTime} min
                  </Text>
                )}
              </View>
            </View>
            <StatusBadge
              label={pharmacy.isOpen ? 'Open' : 'Closed'}
              color={pharmacy.isOpen ? COLORS.success : COLORS.error}
              size="md"
            />
          </View>

          {/* Info Pills */}
          <View style={styles.infoPillsRow}>
            {pharmacy.deliveryFee !== undefined && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>
                  UGX {pharmacy.deliveryFee.toLocaleString()} delivery
                </Text>
              </View>
            )}
            {pharmacy.minOrder && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillText}>
                  Min. UGX {pharmacy.minOrder.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {pharmacy.description && (
            <Text style={styles.description} numberOfLines={3}>
              {pharmacy.description}
            </Text>
          )}
        </Animated.View>

        {/* Categories */}
        {categories.length > 1 && (
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.categoriesContainer}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  active={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={styles.categoryPill}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Products / Medicine List */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Medicine & Products</Text>
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
              icon="medkit-outline"
              title="No products available"
              subtitle="This pharmacy hasn't listed anything yet."
            />
          )}
        </View>

        {/* Bottom spacing for cart bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Cart Floating Button */}
      {cart.totalItems > 0 && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          style={[styles.cartBar, { paddingBottom: insets.bottom + 12 || 20 }]}
        >
          <TouchableOpacity
            onPress={() => router.push('/orders/cart')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENTS.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cartButton}
            >
              <View style={styles.cartLeft}>
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
                </View>
                <Text style={styles.cartButtonText}>View Cart</Text>
              </View>
              <Text style={styles.cartTotalText}>
                UGX {cart.totalPrice.toLocaleString()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// PRODUCT CARD SUB-COMPONENT
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
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <Card variant="raised" style={styles.productCard}>
      <View style={styles.productRow}>
        {/* Product Image / Placeholder */}
        <View style={styles.productImageContainer}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <ServiceIcon service="HEALTH" size="md" customEmoji="medkit-outline" />
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          {product.description && (
            <Text style={styles.productDescription} numberOfLines={2}>
              {product.description}
            </Text>
          )}
          <Text style={styles.productPrice}>
            UGX {product.price.toLocaleString()}
          </Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={onAddToCart}
          disabled={!product.inStock}
          activeOpacity={0.7}
          style={[
            styles.addButton,
            !product.inStock && styles.addButtonDisabled,
          ]}
        >
          <Ionicons
            name="add"
            size={20}
            color={product.inStock ? COLORS.onPrimary : COLORS.outline}
          />
        </TouchableOpacity>
      </View>

      {!product.inStock && (
        <Text style={styles.outOfStockText}>Out of stock</Text>
      )}
    </Card>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  notFoundText: {
    fontSize: 16,
    color: COLORS.outline,
    marginBottom: 16,
  },
  notFoundButton: {
    marginTop: 8,
  },

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: SPACING.md,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Cover
  coverImage: {
    width: '100%',
    height: 192,
  },
  coverPlaceholder: {
    width: '100%',
    height: 192,
    backgroundColor: `${COLORS.error}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pharmacyIconContainer: {
    marginRight: 12,
  },
  pharmacyIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  pharmacyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    letterSpacing: -0.3,
  },
  pharmacyAddress: {
    fontSize: 13,
    color: COLORS.outline,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.onSurfaceSecondary,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.onSurfaceDim,
    marginLeft: 2,
  },
  deliveryTimeText: {
    fontSize: 13,
    color: COLORS.outline,
  },

  // Info Pills
  infoPillsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  infoPill: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  infoPillText: {
    fontSize: 12,
    color: COLORS.onSurfaceSecondary,
  },

  // Description
  description: {
    fontSize: 14,
    color: COLORS.outline,
    lineHeight: 20,
    marginTop: 12,
  },

  // Categories
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryPill: {
    marginRight: 8,
  },

  // Products Section
  productsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 12,
  },

  // Product Card
  productCard: {
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  productDescription: {
    fontSize: 12,
    color: COLORS.outline,
    lineHeight: 16,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  outOfStockText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: '500',
  },

  // Empty State

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },

  // Cart Bar
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  cartButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartTotalText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
