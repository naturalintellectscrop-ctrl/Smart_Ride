// ============================================
// SMART RIDE MOBILE - SHOPPING SCREEN
// ============================================
// Stitch Design System — Food/Shop Marketplace layout
// GlowHeader, Category scroll, Store cards, Deals grid
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useCartStore } from '@/src/store';
import { GlowHeader, GlassCard, GradientButton, IconInput } from '@/src/components';

// ============================================
// TYPES
// ============================================

interface Merchant {
  id: string;
  name: string;
  type: string;
  image?: string;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: number;
}

interface CategoryItem {
  label: string;
  emoji: string;
  serviceKey: string;
  customColor: string;
  apiType: string | undefined;
  icon: keyof typeof Ionicons.glyphMap;
}

// ============================================
// CATEGORIES
// ============================================

const CATEGORIES: CategoryItem[] = [
  { label: 'Groceries', emoji: 'nutrition', serviceKey: 'SHOPPING', customColor: COLORS.primary, apiType: 'GROCERY', icon: 'nutrition' },
  { label: 'Electronics', emoji: 'phone-portrait', serviceKey: 'custom', customColor: '#3B82F6', apiType: 'RETAIL_STORE', icon: 'phone-portrait' },
  { label: 'Fashion', emoji: 'shirt', serviceKey: 'custom', customColor: '#EC4899', apiType: undefined, icon: 'shirt' },
  { label: 'Home', emoji: 'home', serviceKey: 'custom', customColor: '#F59E0B', apiType: 'GROCERY', icon: 'home' },
  { label: 'More', emoji: '⋯', serviceKey: 'custom', customColor: COLORS.tertiary, apiType: undefined, icon: 'ellipsis-horizontal' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ShoppingScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const totalItems = useCartStore(s => s.totalItems);

  const loadMerchants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const category = CATEGORIES[selectedCategory];
      let response;

      if (category.apiType) {
        response = await api.getMerchants(category.apiType);
      } else {
        response = await api.getMerchants();
      }

      if (response.success && response.data) {
        setMerchants(response.data);
      } else {
        setMerchants([]);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
      setError('Failed to load data. Please try again.');
      setMerchants([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadMerchants();
  }, [loadMerchants]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadMerchants();
    setRefreshing(false);
  };

  const totalCartItems = totalItems;

  const handleCategoryPress = (index: number) => {
    if (index !== selectedCategory) {
      setSelectedCategory(index);
    }
  };

  // Client-side search filter applied to the loaded merchants list.
  // Searches across merchant name and type.
  const filteredMerchants = searchQuery.trim().length > 0
    ? merchants.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.type && m.type.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : merchants;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error && merchants.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.outline} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMerchants} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <GlowHeader
        title="Shop"
        subtitle="Groceries & essentials delivered"
        rightAction={
          totalCartItems > 0
            ? {
                icon: 'cart-outline' as const,
                onPress: () => router.push('/orders/cart'),
                badge: totalCartItems,
              }
            : undefined
        }
      >
        {/* Search bar */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(300)}
          style={styles.searchWrapper}
        >
          <IconInput
            placeholder="Search stores & products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="search"
          />
        </Animated.View>
      </GlowHeader>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Category Scroll (horizontal icon squares) */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.categorySection}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORIES.map((cat, index) => {
              const isActive = selectedCategory === index;
              return (
                <Animated.View
                  key={cat.label}
                  entering={ZoomIn.delay(150 + index * 50).duration(200)}
                >
                  <TouchableOpacity
                    onPress={() => handleCategoryPress(index)}
                    activeOpacity={0.7}
                    style={styles.categorySquareWrapper}
                  >
                    {/* Icon Square */}
                    <View
                      style={[
                        styles.categorySquare,
                        isActive && styles.categorySquareActive,
                        { borderColor: isActive ? cat.customColor : COLORS.outlineVariant },
                      ]}
                    >
                      <View
                        style={[
                          styles.categorySquareIconBg,
                          { backgroundColor: isActive ? `${cat.customColor}20` : `${cat.customColor}10` },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={22}
                          color={isActive ? cat.customColor : COLORS.onSurfaceVariant}
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.categorySquareLabel,
                        isActive && styles.categorySquareLabelActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Featured Stores — Horizontal Scroll */}
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={styles.sectionTitle}
        >
          Featured Stores
        </Animated.Text>

        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScrollContent}
          >
            {filteredMerchants.length > 0 ? (
              filteredMerchants.slice(0, 6).map((merchant, index) => (
                <Animated.View
                  key={merchant.id}
                  entering={SlideInRight.delay(index * 80).duration(300)}
                >
                  <StoreCard
                    merchant={merchant}
                    onPress={() => {
                      const isPharmacy = merchant.type === 'PHARMACY';
                      const detailRoute = isPharmacy
                        ? `/health/pharmacy/${merchant.id}`
                        : `/orders/merchant/${merchant.id}`;
                      router.push(detailRoute);
                    }}
                  />
                </Animated.View>
              ))
            ) : (
              <GlassCard variant="default" style={styles.emptyFeaturedCard}>
                <Ionicons name="storefront" size={28} color={COLORS.outlineVariant} />
                <Text style={styles.emptyFeaturedText}>
                  {searchQuery.trim().length > 0 ? 'No matching stores' : 'No stores yet'}
                </Text>
              </GlassCard>
            )}
          </ScrollView>
        </Animated.View>

        {/* All Stores List */}
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={styles.sectionTitle}
        >
          {CATEGORIES[selectedCategory].label === 'More' ? 'All Stores' : `${CATEGORIES[selectedCategory].label} Stores`}
        </Animated.Text>

        {filteredMerchants.length > 0 ? (
          filteredMerchants.map((merchant, index) => {
            const isPharmacy = merchant.type === 'PHARMACY';
            const detailRoute = isPharmacy
              ? `/health/pharmacy/${merchant.id}`
              : `/orders/merchant/${merchant.id}`;

            return (
              <Animated.View
                key={merchant.id}
                entering={SlideInRight.duration(300).delay(index * 60)}
              >
                <MerchantCard
                  merchant={merchant}
                  onPress={() => router.push(detailRoute)}
                />
              </Animated.View>
            );
          })
        ) : (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyContainer}
          >
            <View style={styles.emptyIconCircle}>
              <Ionicons name="storefront" size={32} color={COLORS.outlineVariant} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim().length > 0
                ? 'No stores match your search'
                : 'No stores available yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? 'Try a different search term'
                : 'Check back soon!'}
            </Text>
            <GradientButton
              title="Refresh"
              onPress={onRefresh}
              variant="outline"
              size="sm"
              fullWidth={false}
              style={styles.refreshButton}
            />
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STORE CARD (horizontal featured)
// ============================================

function StoreCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard variant="elevated" padding={SPACING.md} borderRadius={RADIUS.xl} style={styles.storeCard}>
        {/* Image area */}
        <View style={styles.storeImageArea}>
          {merchant.image ? (
            <Image source={{ uri: merchant.image }} style={styles.storeImage} />
          ) : (
            <View style={styles.storeImagePlaceholder}>
              <Ionicons name="storefront" size={28} color={COLORS.outlineVariant} />
            </View>
          )}
          {/* Rating badge */}
          {merchant.rating !== undefined && merchant.rating !== null && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={10} color="#FFFFFF" />
              <Text style={styles.ratingBadgeText}>{merchant.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Store info */}
        <Text style={styles.storeName} numberOfLines={1}>{merchant.name}</Text>
        <View style={styles.storeMeta}>
          {merchant.deliveryTime && (
            <View style={styles.storeDeliveryRow}>
              <Ionicons name="time" size={12} color={COLORS.onSurfaceVariant} />
              <Text style={styles.storeDeliveryText}>{merchant.deliveryTime} min</Text>
            </View>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ============================================
// MERCHANT CARD (vertical list)
// ============================================

function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard variant="elevated" style={styles.merchantCard}>
        <View style={styles.merchantRow}>
          {/* Store icon/image */}
          <View style={styles.merchantImageContainer}>
            {merchant.image ? (
              <Image source={{ uri: merchant.image }} style={styles.merchantImage} />
            ) : (
              <View style={styles.merchantIconCircle}>
                <Ionicons name="storefront" size={22} color={COLORS.primary} />
              </View>
            )}
          </View>

          {/* Store info */}
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName} numberOfLines={1}>{merchant.name}</Text>
            <Text style={styles.merchantType}>{merchant.type}</Text>
            <View style={styles.merchantMeta}>
              {merchant.rating !== undefined && merchant.rating !== null && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}</Text>
                </View>
              )}
              {merchant.deliveryTime && (
                <View style={styles.deliveryContainer}>
                  <Ionicons name="time" size={13} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.deliveryText}>{merchant.deliveryTime} min</Text>
                </View>
              )}
            </View>
          </View>

          {/* View action */}
          <View style={styles.merchantAction}>
            <GradientButton
              title="View"
              onPress={onPress}
              variant="outline"
              size="sm"
              fullWidth={false}
            />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
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

  // Error State
  errorTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: SPACING.md,
  },
  errorMessage: {
    ...TYPOGRAPHY.bodySm,
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
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // Search
  searchWrapper: {
    marginTop: SPACING.md,
  },

  // Category scroll
  categorySection: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING.containerMargin,
    gap: SPACING.md,
  },
  categorySquareWrapper: {
    alignItems: 'center',
    width: 64,
  },
  categorySquare: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  categorySquareActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  categorySquareIconBg: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySquareLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  categorySquareLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },

  // Section title
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.containerMargin,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },

  // Featured store cards (horizontal)
  featuredScrollContent: {
    paddingHorizontal: SPACING.containerMargin,
    gap: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  storeCard: {
    width: 160,
  },
  storeImageArea: {
    position: 'relative',
    width: '100%',
    height: 90,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  storeImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
  },
  storeImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 2,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  storeName: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  storeDeliveryText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  emptyFeaturedCard: {
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyFeaturedText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },

  // Merchant list
  merchantCard: {
    marginHorizontal: SPACING.containerMargin,
    marginBottom: SPACING.sm,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantImageContainer: {
    marginRight: SPACING.md,
  },
  merchantImage: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
  },
  merchantIconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  merchantType: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: 1,
  },
  merchantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deliveryText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  merchantAction: {
    marginLeft: SPACING.sm,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '500',
    color: COLORS.outline,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outlineVariant,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: SPACING.md,
  },
});
