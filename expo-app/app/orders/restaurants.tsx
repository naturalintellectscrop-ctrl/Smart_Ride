// ============================================
// SMART RIDE MOBILE - RESTAURANTS LIST
// Stitch Design System Applied
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
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { Ionicons } from '@expo/vector-icons';
import { Merchant } from '@/src/types';

export default function RestaurantsScreen() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'RESTAURANT', label: 'Restaurants' },
    { id: 'FAST_FOOD', label: 'Fast Food' },
    { id: 'CAFE', label: 'Cafes' },
  ];

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [searchQuery, selectedCategory, merchants]);

  const loadMerchants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getMerchants('RESTAURANT');
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (error) {
      console.error('Failed to load merchants:', error);
      setError('Failed to load data. Please try again.');
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
    setError(null);
    await loadMerchants();
    setRefreshing(false);
  };

  const renderMerchant = ({ item }: { item: Merchant }) => (
    <TouchableOpacity 
      style={styles.merchantCard}
      onPress={() => router.push(`/orders/merchant/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.merchantImageContainer}>
        <Ionicons name="restaurant-outline" size={24} color={COLORS.primary} />
      </View>

      {/* Details */}
      <View style={styles.merchantDetails}>
        <Text style={styles.merchantName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.merchantDescription} numberOfLines={1}>{item.description}</Text>
        
        <View style={styles.merchantMetaRow}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.merchantAddress}>{item.address}</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, item.isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
            <Text style={[styles.statusText, item.isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurants</Text>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          placeholderTextColor={COLORS.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {error && filteredMerchants.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.outline} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMerchants} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredMerchants}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchant}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={32} color={COLORS.outlineVariant} />
              <Text style={styles.emptyText}>No restaurants found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingTop: 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md - 4,
  },
  backIcon: {
    color: COLORS.onSurfaceVariant,
    fontSize: 18,
  },
  headerTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineLg,
    fontSize: 24,
  },
  searchInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
  },
  categoriesRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 4,
    gap: SPACING.sm,
  },
  categoryTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryTabText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: COLORS.onPrimary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 4,
    marginBottom: SPACING.md - 4,
    ...SHADOWS.card,
  },
  merchantImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md - 4,
  },
  merchantEmoji: {
    fontSize: 28,
  },
  merchantDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  merchantName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
  },
  merchantDescription: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  merchantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ratingStar: {
    fontSize: 13,
    marginRight: SPACING.xs,
    color: COLORS.warning,
  },
  ratingText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  metaSeparator: {
    color: COLORS.outlineVariant,
    marginHorizontal: SPACING.sm,
  },
  merchantAddress: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusBadgeOpen: {
    backgroundColor: `${COLORS.secondary}15`,
  },
  statusBadgeClosed: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  statusText: {
    ...TYPOGRAPHY.labelMd,
    fontSize: 11,
    fontWeight: '500',
  },
  statusTextOpen: {
    color: COLORS.secondary,
  },
  statusTextClosed: {
    color: COLORS.outlineVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodyMd,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
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
});
