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
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { api } from '@/src/services';
import { SPACING, RADIUS, MOTION } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { StatusBadge } from '@/src/components/StatusBadge';
import { EmptyState, ErrorState } from '@/src/components/StateViews';
import { Merchant } from '@/src/types';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'RESTAURANT', label: 'Restaurants' },
  { id: 'FAST_FOOD', label: 'Fast Food' },
  { id: 'CAFE', label: 'Cafes' },
];

export default function RestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurants</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants"
            placeholderTextColor={COLORS.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity key={cat.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setSelectedCategory(cat.id)} activeOpacity={0.8}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {error && filteredMerchants.length === 0 ? (
        <ErrorState subtitle={error} onRetry={loadMerchants} retryLabel="Try Again" />
      ) : isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
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
  container: { flex: 1, backgroundColor: COLORS.surface },

  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceContainerLow },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.3 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.onSurface, paddingVertical: 0 },

  chipsRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm + 2 },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceContainerLow },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.onSurfaceVariant },
  chipTextActive: { color: COLORS.onPrimary },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
