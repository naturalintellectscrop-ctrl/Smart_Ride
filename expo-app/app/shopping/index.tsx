// ============================================
// SMART RIDE — SHOP
// ============================================
// Archetype AR-4 (List + Search).
//
//   AppHeader (cart count) → SearchInput → category rail → featured stores →
//   all stores → EmptyState / ErrorState
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, MOTION, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { useCartStore } from '@/src/store';
import {
  AppHeader,
  Card,
  CountBadge,
  EmptyState,
  GradientButton,
  SearchInput,
  SectionHeader,
} from '@/src/components';

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
  /** Optional override; omit to use the shared service palette. */
  customColor?: string;
  /** Required — a category with no merchant type can never return results. */
  apiType: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ============================================
// CATEGORIES
// ============================================

// Every category must map to a real merchant type. 'Fashion' and 'More'
// previously had `apiType: undefined`, so tapping them filtered to nothing and
// silently returned an empty list — 'More' had no destination at all and is
// gone. Colours come from the service palette rather than five loose hexes.
const CATEGORIES: CategoryItem[] = [
  { label: 'Groceries', emoji: 'nutrition', serviceKey: 'SHOPPING', apiType: 'GROCERY', icon: 'nutrition' },
  { label: 'Electronics', emoji: 'phone-portrait', serviceKey: 'custom', apiType: 'RETAIL_STORE', icon: 'phone-portrait' },
  { label: 'Fashion', emoji: 'shirt', serviceKey: 'custom', apiType: 'RETAIL_STORE', icon: 'shirt' },
  { label: 'Home', emoji: 'home', serviceKey: 'custom', apiType: 'GROCERY', icon: 'home' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ShoppingScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const totalItems = useCartStore(s => s.totalItems);

  const loadMerchants = useCallback(async (isRetry = false) => {
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
        // If the first attempt failed (but didn't throw), retry once before
        // giving up — handles transient network/backend hiccups gracefully.
        if (!isRetry) {
          await new Promise((r) => setTimeout(r, 800));
          return loadMerchants(true);
        }
        setMerchants([]);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
      if (!isRetry) {
        await new Promise((r) => setTimeout(r, 800));
        return loadMerchants(true);
      }
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
        <Ionicons name="storefront-outline" size={48} color={COLORS.outline} />
        <Text style={styles.errorTitle}>Couldn't load stores</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadMerchants()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Shop"
        subtitle="Groceries & essentials delivered"
        variant="large"
        rightActions={
          totalCartItems > 0
            ? [{
                icon: 'cart-outline' as const,
                onPress: () => router.push('/orders/cart'),
                label: 'Cart',
                badge: <CountBadge count={totalCartItems} />,
              }]
            : undefined
        }
      />

      <Animated.View entering={ZoomIn.delay(200).duration(MOTION.duration.base)} style={styles.searchWrapper}>
        <SearchInput
          placeholder="Search stores & products"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

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
        <SectionHeader title="Featured stores" />

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
                      router.push(detailRoute as any);
                    }}
                  />
                </Animated.View>
              ))
            ) : (
              <EmptyState
                icon="storefront-outline"
                title={searchQuery.trim().length > 0 ? 'No matching stores' : 'No stores yet'}
                subtitle={searchQuery.trim().length > 0 ? 'Try a different search term.' : undefined}
              />
            )}
          </ScrollView>
        </Animated.View>

        {/* The old title branched on a 'More' category that had no merchant
            type behind it; that category is gone, so the heading is simply the
            selected one. */}
        <SectionHeader title={`${CATEGORIES[selectedCategory].label} stores`} />

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
                  onPress={() => router.push(detailRoute as any)}
                />
              </Animated.View>
            );
          })
        ) : (
          <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
            <EmptyState
              icon="storefront-outline"
              title={searchQuery.trim().length > 0 ? 'No stores match your search' : 'No stores available yet'}
              subtitle={searchQuery.trim().length > 0 ? 'Try a different search term.' : 'Check back soon.'}
              actionLabel={searchQuery.trim().length > 0 ? 'Clear search' : 'Refresh'}
              onAction={searchQuery.trim().length > 0 ? () => setSearchQuery('') : onRefresh}
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
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="elevated" padding={SPACING.md} radius={RADIUS.lg} style={styles.storeCard}>
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
              <Ionicons name="star" size={10} color={COLORS.onPrimary} />
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
      </Card>
    </TouchableOpacity>
  );
}

// ============================================
// MERCHANT CARD (vertical list)
// ============================================

function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.merchantCard}>
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
                  <Ionicons name="star" size={ICON.xs} color={COLORS.warning} />
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
      </Card>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  stateWrap: {
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
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
});
