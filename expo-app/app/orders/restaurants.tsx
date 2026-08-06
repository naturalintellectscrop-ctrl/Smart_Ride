// ============================================
// SMART RIDE MOBILE - RESTAURANTS LIST
// ============================================
// Food service on the Smart Ride Design Language. Restaurant cards are the
// shared Card primitive (one card system), with a modern search field,
// interactive category chips and shared empty/error states.
//
// UI/UX only: getMerchants('RESTAURANT'), search + category filtering,
// pull-to-refresh and navigation to the merchant detail are unchanged.
// ============================================

import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { api } from '@/src/services';
import { SPACING, RADIUS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListSkeleton,
  SearchInput,
  StatusBadge,
} from '@/src/components';
import { Merchant } from '@/src/types';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'RESTAURANT', label: 'Restaurants' },
  { id: 'FAST_FOOD', label: 'Fast Food' },
  { id: 'CAFE', label: 'Cafes' },
];

export default function RestaurantsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadMerchants(); }, []);
  useEffect(() => { filterMerchants(); }, [searchQuery, selectedCategory, merchants]);

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
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m) => m.type === selectedCategory);
    }
    setFilteredMerchants(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadMerchants();
    setRefreshing(false);
  };

  const renderMerchant = ({ item, index }: { item: Merchant; index: number }) => (
    <Animated.View entering={FadeInUp.duration(MOTION.duration.base).delay(Math.min(index * 40, 240))}>
      <Card variant="raised" radius={RADIUS.lg} padding={SPACING.sm + 4} onPress={() => router.push(`/orders/merchant/${item.id}`)} style={styles.merchantCard} accessibilityLabel={item.name}>
        <View style={styles.merchantImage}>
          <Ionicons name="restaurant" size={26} color={COLORS.primary} />
        </View>
        <View style={styles.merchantDetails}>
          <Text style={styles.merchantName} numberOfLines={1}>{item.name}</Text>
          {item.description ? <Text style={styles.merchantDescription} numberOfLines={1}>{item.description}</Text> : null}
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={COLORS.warning} />
            <Text style={styles.ratingText}>{(item.rating ?? 0).toFixed(1)}</Text>
            {item.address ? (<>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.merchantAddress} numberOfLines={1}>{item.address}</Text>
            </>) : null}
          </View>
        </View>
        <StatusBadge label={item.isOpen ? 'Open' : 'Closed'} color={item.isOpen ? COLORS.success : COLORS.onSurfaceVariant} size="sm" />
      </Card>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Restaurants" onBack={() => router.back()} />

      <View style={styles.searchWrap}>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search restaurants"
        />
      </View>

      {/* Category rail */}
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            active={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </View>

      {/* List */}
      {error && filteredMerchants.length === 0 ? (
        <ErrorState subtitle={error} onRetry={loadMerchants} retryLabel="Try Again" />
      ) : isLoading ? (
        <View style={styles.listContent}><ListSkeleton /></View>
      ) : (
        <FlatList
          data={filteredMerchants}
          keyExtractor={(item) => item.id}
          renderItem={renderMerchant}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={<EmptyState icon="restaurant-outline" title="No restaurants found" subtitle={searchQuery ? 'Try a different search' : 'Check back soon for new places'} />}
        />
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  searchWrap: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  container: { flex: 1, backgroundColor: COLORS.surface },



  chipsRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm + 2 },

  listContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs, paddingBottom: SPACING.xl },

  merchantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.sm + 4 },
  merchantImage: { width: 60, height: 60, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  merchantDetails: { flex: 1 },
  merchantName: { fontSize: 15.5, fontWeight: '700', color: COLORS.onSurface },
  merchantDescription: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  ratingText: { fontSize: 12.5, fontWeight: '700', color: COLORS.onSurface },
  metaDot: { fontSize: 12, color: COLORS.outline, marginHorizontal: 2 },
  merchantAddress: { flex: 1, fontSize: 12, color: COLORS.onSurfaceVariant },
});
