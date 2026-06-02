// ============================================
// SMART RIDE MOBILE - SHOPPING SCREEN
// ============================================
// VERSION: DARK-THEME-002
// PURPOSE: Browse and order groceries/shopping items
// DESIGN: Dark theme with StyleSheet, GlassCard, GlowHeader
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
  StyleSheet,
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
import { useCartStore } from '@/src/store';
import { GlowHeader } from '@/src/components/GlowHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';
import { ServiceIcon } from '@/src/components/ServiceIcon';

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
}

const CATEGORIES: CategoryItem[] = [
  { label: 'All', emoji: '🏷️', serviceKey: 'custom', customColor: COLORS.primary },
  { label: 'Groceries', emoji: '🥬', serviceKey: 'SHOPPING', customColor: '#8B5CF6' },
  { label: 'Electronics', emoji: '📱', serviceKey: 'custom', customColor: '#3B82F6' },
  { label: 'Pharmacy', emoji: '💊', serviceKey: 'HEALTH', customColor: '#F43F5E' },
  { label: 'Household', emoji: '🏠', serviceKey: 'custom', customColor: '#F59E0B' },
];

export default function ShoppingScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const cart = useCartStore();

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const response = await api.getMerchants('GROCERY');
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
      // Set empty array on error
      setMerchants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchants();
    setRefreshing(false);
  };

  const totalCartItems = cart.totalItems;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <GlowHeader
        title="Shopping"
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
        {/* Categories row inside header */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.categoriesRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES.map((cat, index) => (
              <Animated.View
                key={cat.label}
                entering={ZoomIn.delay(150 + index * 50).duration(200)}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCategory(index)}
                  activeOpacity={0.7}
                >
                  <GlassCard
                    variant={selectedCategory === index ? 'accent' : 'default'}
                    padding={selectedCategory === index ? 10 : 10}
                    borderRadius={20}
                    style={styles.categoryPill}
                  >
                    <View style={styles.categoryPillInner}>
                      <ServiceIcon
                        service={cat.serviceKey as any}
                        size="sm"
                        customEmoji={cat.emoji}
                        customColor={cat.customColor}
                        style={styles.categoryIcon}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === index && styles.categoryTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </GlowHeader>

      {/* Merchants List */}
      <ScrollView
        style={styles.merchantList}
        contentContainerStyle={styles.merchantListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={styles.sectionTitle}
        >
          Nearby Stores
        </Animated.Text>

        {merchants.length > 0 ? (
          merchants.map((merchant, index) => (
            <Animated.View
              key={merchant.id}
              entering={SlideInRight.duration(300).delay(index * 80)}
            >
              <MerchantCard
                merchant={merchant}
                onPress={() => router.push(`/orders/merchant/${merchant.id}`)}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyContainer}
          >
            <ServiceIcon
              service="custom"
              size="lg"
              customEmoji="🛒"
              customColor={COLORS.textDim}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No stores available yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon!</Text>
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
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────
// MERCHANT CARD SUB-COMPONENT
// ──────────────────────────────────────────────

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
              <ServiceIcon
                service="SHOPPING"
                size="lg"
                customEmoji="🏪"
              />
            )}
          </View>

          {/* Store info */}
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName}>{merchant.name}</Text>
            <Text style={styles.merchantType}>{merchant.type}</Text>
            <View style={styles.merchantMeta}>
              {merchant.rating !== undefined && merchant.rating !== null && (
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}</Text>
                </View>
              )}
              {merchant.deliveryTime && (
                <View style={styles.deliveryContainer}>
                  <Text style={styles.deliveryText}>🕐 {merchant.deliveryTime} min</Text>
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

// ──────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Categories
  categoriesRow: {
    marginTop: 16,
  },
  categoriesScrollContent: {
    paddingRight: 20,
    gap: 8,
  },
  categoryPill: {
    marginRight: 4,
  },
  categoryPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    marginRight: 0,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Merchant list
  merchantList: {
    flex: 1,
  },
  merchantListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Merchant card
  merchantCard: {
    marginBottom: 12,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantImageContainer: {
    marginRight: 12,
  },
  merchantImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  merchantType: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  merchantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingStar: {
    fontSize: 12,
    marginRight: 3,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  merchantAction: {
    marginLeft: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 16,
  },
});
