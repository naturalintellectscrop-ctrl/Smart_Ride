// ============================================
// SMART RIDE MOBILE - SHOPPING SCREEN
// ============================================
// Premium dark theme with vector icons
// Browse and order groceries/shopping items
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
import { Icon, IconColors } from '../../components/Icon';

interface Merchant {
  id: string;
  name: string;
  type: string;
  image?: string;
  rating?: number;
  deliveryTime?: string;
  deliveryFee?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'household', label: 'Household' },
];

export default function ShoppingScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Shopping</Text>
          {totalCartItems > 0 && (
            <TouchableOpacity 
              onPress={() => router.push('/orders/cart')}
              style={styles.cartButton}
              activeOpacity={0.8}
            >
              <Icon name="shopping-cart" size="sm" color={COLORS.background} />
              <Text style={styles.cartButtonText}>{totalCartItems}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Groceries & essentials delivered</Text>
      </Animated.View>

      {/* Categories */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.categoriesContainer}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat, index) => (
            <Animated.View 
              key={cat.id}
              entering={ZoomIn.delay(150 + index * 50).duration(200)}
            >
              <TouchableOpacity 
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat.id && styles.categoryTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Merchants List */}
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
        <Text style={styles.sectionTitle}>Nearby Stores</Text>
        
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
            <View style={styles.emptyIconContainer}>
              <Icon name="shopping-bag" size="2xl" color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyText}>No stores available yet</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.merchantCard}>
        <View style={styles.merchantImageContainer}>
          {merchant.image ? (
            <Image source={{ uri: merchant.image }} style={styles.merchantImage} />
          ) : (
            <View style={styles.merchantImagePlaceholder}>
              <Icon name="home" size="lg" color={COLORS.primary} />
            </View>
          )}
        </View>
        <View style={styles.merchantContent}>
          <Text style={styles.merchantName} numberOfLines={1}>{merchant.name}</Text>
          <Text style={styles.merchantType}>{merchant.type}</Text>
          <View style={styles.merchantFooter}>
            {merchant.rating && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size="xs" color="#FBBF24" />
                <Text style={styles.ratingText}>{merchant.rating.toFixed(1)}</Text>
              </View>
            )}
            {merchant.deliveryTime && (
              <Text style={styles.deliveryTime}>{merchant.deliveryTime} min</Text>
            )}
          </View>
        </View>
        <View style={styles.viewContainer}>
          <Icon name="chevron-right" size="sm" color={COLORS.primary} />
        </View>
      </View>
    </TouchableOpacity>
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
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cartButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: 6,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  merchantCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
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
  merchantContent: {
    flex: 1,
  },
  merchantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  merchantType: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  merchantFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    color: COLORS.text,
    fontSize: 12,
    marginLeft: 4,
  },
  deliveryTime: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  viewContainer: {
    padding: 8,
  },
});
