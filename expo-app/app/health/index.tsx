// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// Stitch Design System — Pharmacy/Health layout
// GlowHeader, Category cards, Pharmacy list, SOS
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import {
  GlowHeader,
  GlassCard,
  GradientButton,
  ServiceIcon,
  IconInput,
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
  { key: 'prescriptions', label: 'Prescriptions', emoji: 'document-text-outline', icon: 'document-text' as const, color: COLORS.primary },
  { key: 'pharmacy', label: 'Pharmacy', emoji: 'medkit-outline', icon: 'medkit' as const, color: COLORS.secondary },
  { key: 'delivery', label: 'Health Delivery', emoji: 'car-outline', icon: 'car' as const, color: COLORS.tertiary },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function HealthScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('pharmacy');
  const [error, setError] = useState<string | null>(null);

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

  // Filter pharmacies by search query
  const filteredPharmacies = searchQuery.trim().length > 0
    ? pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : pharmacies;

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
      {/* Header */}
      <GlowHeader
        title="Smart Health"
        subtitle="Medicine delivery & prescriptions"
      >
        {/* Search */}
        <Animated.View
          entering={ZoomIn.delay(200).duration(300)}
          style={styles.searchWrapper}
        >
          <IconInput
            placeholder="Search medicines or pharmacies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon="search"
            rightIcon="filter"
            onRightIconPress={() => Alert.alert('Filter', 'Filter options will be available soon')}
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
                <GlassCard
                  variant={activeCategory === cat.key ? 'accent' : 'default'}
                  padding={SPACING.md}
                  borderRadius={RADIUS.xl}
                  style={styles.categoryCard}
                >
                  {/* Icon Circle */}
                  <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}15` }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      activeCategory === cat.key && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </GlassCard>
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

        {/* Section Title */}
        <Animated.Text
          entering={FadeIn.duration(300)}
          style={styles.sectionTitle}
        >
          Featured Pharmacies
        </Animated.Text>

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
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search" size={32} color={COLORS.outlineVariant} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim().length > 0
                ? `No pharmacies matching "${searchQuery}"`
                : 'No pharmacies available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim().length > 0
                ? 'Try a different search term'
                : 'Check back soon for updates'}
            </Text>
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <GlassCard variant="default" style={styles.pharmacyCard}>
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
                      ? 'rgba(0, 110, 47, 0.1)'
                      : 'rgba(186, 26, 26, 0.1)',
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
                  <Ionicons name="star" size={14} color="#F59E0B" />
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    paddingHorizontal: SPACING.containerMargin,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },

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
  emptyState: {
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
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
  },
});
