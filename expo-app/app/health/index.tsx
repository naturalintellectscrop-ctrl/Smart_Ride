// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// VERSION: DARK-THEME-002
// PURPOSE: Health services - pharmacy, prescriptions
// DESIGN: Dark theme with StyleSheet, custom components
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
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import {
  GlowHeader,
  GlassCard,
  GradientButton,
  ServiceIcon,
  IconInput,
} from '@/src/components';

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  image?: string;
  rating?: number;
  isOpen: boolean;
  deliveryTime?: string;
}

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  inStock: boolean;
}

export default function HealthScreen() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'medicines'>('pharmacies');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getPharmacies();
      if (response.success && response.data) {
        setPharmacies(response.data);
      }
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
      setPharmacies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
          />
        </Animated.View>
      </GlowHeader>

      {/* Quick Actions */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.quickActionsRow}
      >
        <QuickAction
          emoji="💊"
          label="Order Medicine"
          onPress={() => setActiveTab('medicines')}
          delay={150}
        />
        <QuickAction
          emoji="📋"
          label="Prescriptions"
          onPress={() => router.push('/health/prescriptions')}
          delay={200}
        />
        <QuickAction
          emoji="🏥"
          label="Pharmacies"
          onPress={() => setActiveTab('pharmacies')}
          delay={250}
        />
        <QuickAction
          emoji="🆘"
          label="Emergency"
          onPress={() => router.push('/sos')}
          delay={300}
        />
      </Animated.View>

      {/* Emergency CTA */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(350)}
        style={styles.emergencyWrapper}
      >
        <GradientButton
          title="🆘  Emergency SOS"
          onPress={() => router.push('/sos')}
          variant="danger"
          size="md"
          fullWidth
        />
      </Animated.View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pharmacies' && styles.tabActive]}
          onPress={() => setActiveTab('pharmacies')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pharmacies' && styles.tabTextActive,
            ]}
          >
            Pharmacies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medicines' && styles.tabActive]}
          onPress={() => setActiveTab('medicines')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'medicines' && styles.tabTextActive,
            ]}
          >
            Medicines
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
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
        {activeTab === 'pharmacies' ? (
          <>
            <Text style={styles.sectionTitle}>Nearby Pharmacies</Text>
            {pharmacies.length > 0 ? (
              pharmacies.map((pharmacy, index) => (
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
                <Text style={styles.emptyEmoji}>💊</Text>
                <Text style={styles.emptyText}>No pharmacies available</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Popular Medicines</Text>
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.emptyState}
            >
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={styles.emptyText}>Search for medicines above</Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// QUICK ACTION COMPONENT
// ============================================
function QuickAction({
  emoji,
  label,
  onPress,
  delay,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  delay: number;
}) {
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(300)}>
      <TouchableOpacity onPress={onPress} style={styles.quickActionButton}>
        <ServiceIcon service="custom" customEmoji={emoji} size="md" />
        <Text style={styles.quickActionLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
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
          {/* Pharmacy Image / Placeholder */}
          <View style={styles.pharmacyImageContainer}>
            {pharmacy.image ? (
              <Image source={{ uri: pharmacy.image }} style={styles.pharmacyImage} />
            ) : (
              <ServiceIcon service="HEALTH" size="lg" customEmoji="💊" />
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
                      ? 'rgba(0, 255, 136, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
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
                  <Text style={styles.ratingStar}>⭐</Text>
                  <Text style={styles.ratingText}>
                    {pharmacy.rating.toFixed(1)}
                  </Text>
                </View>
              )}
              {pharmacy.deliveryTime && (
                <Text style={styles.deliveryText}>
                  {pharmacy.deliveryTime} min delivery
                </Text>
              )}
            </View>
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
    backgroundColor: COLORS.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Search
  searchWrapper: {
    marginTop: 16,
  },

  // Emergency CTA
  emergencyWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: COLORS.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Pharmacy Card
  pharmacyCard: {
    marginBottom: 12,
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pharmacyImageContainer: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pharmacyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  ratingStar: {
    fontSize: 13,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  deliveryText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
