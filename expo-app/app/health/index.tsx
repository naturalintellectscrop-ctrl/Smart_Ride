// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// Stitch Design System — Pharmacy/Health layout
// AppHeader, Category cards, Pharmacy list, SOS
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
import { useStorefrontLive } from '@/src/hooks/useStorefrontLive';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, MOTION, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  ListRow,
  SearchInput,
  SectionHeader,
  SmartBottomSheet,
} from '@/src/components';

// ============================================
// TYPES
// ============================================

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  image?: string;
  rating?: number;
  isOpen: boolean;
  deliveryTime?: string;
}

// ============================================
// CATEGORY CONFIG
// ============================================

const HEALTH_CATEGORIES = [
  { key: 'prescriptions', label: 'Prescriptions', emoji: 'document-text-outline', icon: 'document-text' as const, colorKey: 'primary' as const },
  { key: 'pharmacy', label: 'Pharmacy', emoji: 'medkit-outline', icon: 'medkit' as const, colorKey: 'success' as const },
  { key: 'delivery', label: 'Health Delivery', emoji: 'car-outline', icon: 'car' as const, colorKey: 'secondary' as const },
];

// ============================================
// FILTER OPTIONS
// ============================================

type HealthFilter = 'all' | 'open' | 'top_rated';

const HEALTH_FILTERS: { key: HealthFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All Pharmacies', icon: 'list' },
  { key: 'open', label: 'Open Now', icon: 'time' },
  { key: 'top_rated', label: 'Top Rated (4.0+)', icon: 'star' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HealthScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('pharmacy');
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<HealthFilter>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getPharmacies();
      if (response.success && response.data) {
        setPharmacies(response.data);
      }
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
      setError('Failed to load data. Please try again.');
      setPharmacies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Keep this list true while the customer is reading it.
   *
   * A pharmacy that closes stops taking orders the moment it does, but the
   * card in front of the customer went on saying OPEN until they pulled to
   * refresh — so they would tap through, build an order and be refused by a
   * server that knew better than the screen. The open state is patched in
   * place rather than refetched: nothing else about the shop has changed, and
   * a list that reshuffles under someone's thumb is its own problem.
   */
  useStorefrontLive({
    onMerchantAvailability: ({ merchantId, isOpen }) => {
      setPharmacies((prev) =>
        prev.map((p) => (p.id === merchantId ? { ...p, isOpen } : p))
      );
    },
    onProviderAvailability: ({ providerId, isOpen }) => {
      setPharmacies((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, isOpen } : p))
      );
    },
  });

  // Filter pharmacies by search query
  const searchFiltered = searchQuery.trim().length > 0
    ? pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : pharmacies;

  // Apply selected filter (open now / top rated) on top of search filter
  const filteredPharmacies = searchFiltered.filter(p => {
    if (selectedFilter === 'open') return p.isOpen;
    if (selectedFilter === 'top_rated') return (p.rating ?? 0) >= 4.0;
    return true;
  });

  const handleFilterPress = () => {
    setFilterModalVisible(true);
  };

  const applyFilter = (filter: HealthFilter) => {
    setSelectedFilter(filter);
    setFilterModalVisible(false);
  };

  const activeFilterLabel = HEALTH_FILTERS.find(f => f.key === selectedFilter)?.label ?? 'All Pharmacies';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error && pharmacies.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.outline} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Smart Health"
        subtitle="Medicine delivery & prescriptions"
        variant="large"
        rightActions={[{ icon: 'filter', onPress: handleFilterPress, label: 'Filter pharmacies' }]}
      />

      <Animated.View entering={ZoomIn.delay(200).duration(MOTION.duration.base)} style={styles.searchWrapper}>
        <SearchInput
          placeholder="Search medicines or pharmacies"
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
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Category Cards */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.categoryRow}
        >
          {HEALTH_CATEGORIES.map((cat, index) => (
            <Animated.View
              key={cat.key}
              entering={ZoomIn.delay(150 + index * 80).duration(300)}
              style={styles.categoryCardWrapper}
            >
              <TouchableOpacity
                onPress={() => {
                  setActiveCategory(cat.key);
                  if (cat.key === 'prescriptions') {
                    router.push('/health/prescriptions');
                  }
                }}
                activeOpacity={0.7}
              >
                <Card
                  variant={activeCategory === cat.key ? 'accent' : 'raised'}
                  padding={SPACING.md}
                  radius={RADIUS.xl}
                  style={styles.categoryCard}
                >
                  {/* Icon Circle */}
                  <View style={[styles.categoryIconCircle, { backgroundColor: `${COLORS[cat.colorKey]}26` }]}>
                    <Ionicons name={cat.icon} size={22} color={COLORS[cat.colorKey]} />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      activeCategory === cat.key && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Card>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* SOS Emergency Button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(350)}
          style={styles.sosWrapper}
        >
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => router.push('/sos')}
            activeOpacity={0.8}
          >
            <View style={styles.sosIconCircle}>
              <Ionicons name="alert-circle" size={22} color={COLORS.onError} />
            </View>
            <View style={styles.sosTextContainer}>
              <Text style={styles.sosTitle}>Emergency SOS</Text>
              <Text style={styles.sosSubtitle}>Tap for urgent medical help</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.onError} />
          </TouchableOpacity>
        </Animated.View>

        <SectionHeader title="Featured pharmacies" />

        {/* Active filter indicator chip */}
        {selectedFilter !== 'all' && (
          <View style={styles.filterChipRow}>
            {/* Tapping the active filter clears it. */}
            <Chip
              label={activeFilterLabel}
              icon="close-circle"
              active
              onPress={() => setSelectedFilter('all')}
            />
          </View>
        )}

        {/* Pharmacies List */}
        {filteredPharmacies.length > 0 ? (
          filteredPharmacies.map((pharmacy, index) => (
            <Animated.View
              key={pharmacy.id}
              entering={SlideInRight.duration(300).delay(index * 80)}
            >
              <PharmacyCard
                pharmacy={pharmacy}
                onPress={() => router.push(`/health/pharmacy/${pharmacy.id}`)}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
            <EmptyState
              icon="search-outline"
              title={
                searchQuery.trim().length > 0 ? 'No pharmacies match your search'
                : selectedFilter !== 'all' ? 'No pharmacies match this filter'
                : 'No pharmacies available'
              }
              subtitle={
                searchQuery.trim().length > 0 ? 'Try a different search term.'
                : selectedFilter !== 'all' ? 'Try a different filter, or clear it.'
                : 'Check back soon for updates.'
              }
              actionLabel={searchQuery.trim() || selectedFilter !== 'all' ? 'Clear filters' : undefined}
              onAction={
                searchQuery.trim() || selectedFilter !== 'all'
                  ? () => { setSearchQuery(''); setSelectedFilter('all'); }
                  : undefined
              }
            />
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Filters. This was a bespoke <Modal transparent> with its own scrim,
          flex-end container and top radii — i.e. a hand-built bottom sheet
          beside the one the design system already provides. */}
      <SmartBottomSheet
        visible={filterModalVisible}
        title="Filter pharmacies"
        onDismiss={() => setFilterModalVisible(false)}
      >
        <View>
          {HEALTH_FILTERS.map((item, i) => {
            const isActive = selectedFilter === item.key;
            return (
              <ListRow
                key={item.key}
                title={item.label}
                icon={item.icon}
                iconColor={isActive ? COLORS.primary : COLORS.onSurfaceVariant}
                divider={i < HEALTH_FILTERS.length - 1}
                onPress={() => applyFilter(item.key)}
                trailing={
                  isActive ? (
                    <Ionicons name="checkmark-circle" size={ICON.lg} color={COLORS.primary} />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      </SmartBottomSheet>
    </View>
  );
}

// ============================================
// PHARMACY CARD COMPONENT
// ============================================
function PharmacyCard({
  pharmacy,
  onPress,
}: {
  pharmacy: Pharmacy;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Card variant="raised" style={styles.pharmacyCard}>
        <View style={styles.pharmacyRow}>
          {/* Pharmacy Image / Icon Circle */}
          <View style={styles.pharmacyImageContainer}>
            {pharmacy.image ? (
              <Image source={{ uri: pharmacy.image }} style={styles.pharmacyImage} />
            ) : (
              <View style={styles.pharmacyIconCircle}>
                <Ionicons name="medkit" size={24} color={COLORS.primary} />
              </View>
            )}
          </View>

          {/* Pharmacy Info */}
          <View style={styles.pharmacyInfo}>
            <View style={styles.pharmacyNameRow}>
              <Text style={styles.pharmacyName} numberOfLines={1}>
                {pharmacy.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: pharmacy.isOpen
                      ? `${COLORS.success}1A`
                      : `${COLORS.error}1A`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: pharmacy.isOpen ? COLORS.success : COLORS.error,
                    },
                  ]}
                >
                  {pharmacy.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>

            <Text style={styles.pharmacyAddress} numberOfLines={1}>
              {pharmacy.address}
            </Text>

            <View style={styles.pharmacyMetaRow}>
              {pharmacy.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={ICON.xs} color={COLORS.warning} />
                  <Text style={styles.ratingText}>
                    {pharmacy.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              {pharmacy.deliveryTime && (
                <View style={styles.deliveryRow}>
                  <Ionicons name="time" size={13} color={COLORS.onSurfaceVariant} />
                  <Text style={styles.deliveryText}>
                    {pharmacy.deliveryTime} min
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color={COLORS.outlineVariant} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================
const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  stateWrap: { paddingTop: SPACING.lg, paddingHorizontal: SPACING.md },
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

  // Category Cards
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.containerMargin,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  categoryCardWrapper: {
    flex: 1,
  },
  categoryCard: {
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  categoryLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // SOS Button
  sosWrapper: {
    paddingHorizontal: SPACING.containerMargin,
    paddingTop: SPACING.md,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.active,
  },
  sosIconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onError,
  },
  sosSubtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onError,
    marginTop: 1,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },

  // Section Title

  // Pharmacy Card
  pharmacyCard: {
    marginHorizontal: SPACING.containerMargin,
    marginBottom: SPACING.sm,
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyImageContainer: {
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyImage: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
  },
  pharmacyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pharmacyName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.md,
  },
  statusText: {
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  pharmacyAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  pharmacyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs + 2,
    gap: SPACING.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  deliveryText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },

  // Empty State

  // Filter chip
  filterChipRow: {
    paddingHorizontal: SPACING.containerMargin,
    marginBottom: SPACING.sm,
  },

  // Filter modal
});
