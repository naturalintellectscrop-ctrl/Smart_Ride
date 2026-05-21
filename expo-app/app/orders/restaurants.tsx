// ============================================
// SMART RIDE MOBILE - RESTAURANTS LIST
// ============================================
// Premium dark theme with vector icons
// ============================================

import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
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
import { Merchant } from '@/src/types';
import { Icon, IconColors } from '../../components/Icon';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'RESTAURANT', label: 'Restaurants' },
  { id: 'FAST_FOOD', label: 'Fast Food' },
  { id: 'CAFE', label: 'Cafes' },
];

export default function RestaurantsScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [searchQuery, selectedCategory, merchants]);

  const loadMerchants = async () => {
    setIsLoading(true);
    try {
      const response = await api.getMerchants('RESTAURANT');
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMerchants = () => {
    let filtered = merchants;

    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMerchants(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMerchants();
    setRefreshing(false);
  };

  const renderMerchant = ({ item, index }: { item: Merchant; index: number }) => (
    <Animated.View
      entering={SlideInRight.duration(300).delay(index * 80).springify()}
    >
      <TouchableOpacity 
        style={styles.merchantCard}
        onPress={() => router.push(`/orders/merchant/${item.id}`)}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={styles.merchantImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.merchantImage} />
          ) : (
            <View style={styles.merchantImagePlaceholder}>
              <Icon name="coffee" size="lg" color={IconColors.food} />
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.merchantContent}>
          <Text style={styles.merchantName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.merchantDescription} numberOfLines={1}>{item.description}</Text>
          
          <View style={styles.merchantFooter}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size="xs" color="#FBBF24" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.isOpen ? `${COLORS.success}15` : `${COLORS.textMuted}15` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.isOpen ? COLORS.success : COLORS.textMuted }
              ]}>
                {item.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size="md" color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurants</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search" size="md" color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </Animated.View>

      {/* Categories */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.categoriesContainer}
      >
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
      </Animated.View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredMerchants}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchant}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="coffee" size="2xl" color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>No restaurants found</Text>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
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
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  merchantCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  merchantImageContainer: {
    marginRight: 12,
  },
  merchantImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  merchantImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: `${IconColors.food}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantContent: {
    flex: 1,
    justifyContent: 'center',
  },
  merchantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  merchantDescription: {
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
  },
  ratingText: {
    color: COLORS.text,
    fontSize: 12,
    marginLeft: 4,
  },
  dot: {
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
