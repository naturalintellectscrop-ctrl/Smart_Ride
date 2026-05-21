// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// Premium health services UI
// Vector icons instead of emojis
// Matches admin dashboard design
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
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
import { Icon, IconName } from '../components/Icon';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  health: '#F43F5E',
  prescription: '#8B5CF6',
  pharmacy: '#14B8A6',
  emergency: '#EF4444',
};

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  image?: string;
  rating?: number;
  isOpen: boolean;
  deliveryTime?: string;
}

// Quick actions config
const QUICK_ACTIONS: Array<{
  icon: IconName;
  label: string;
  onPress: string;
  color: string;
}> = [
  { icon: 'package', label: 'Order Medicine', onPress: 'medicines', color: COLORS.health },
  { icon: 'file-text', label: 'Prescriptions', onPress: '/health/prescriptions', color: COLORS.prescription },
  { icon: 'home', label: 'Pharmacies', onPress: 'pharmacies', color: COLORS.pharmacy },
  { icon: 'alert-circle', label: 'Emergency', onPress: '/sos', color: COLORS.emergency },
];

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

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    if (action.onPress === 'medicines') {
      setActiveTab('medicines');
    } else if (action.onPress === 'pharmacies') {
      setActiveTab('pharmacies');
    } else {
      router.push(action.onPress as any);
    }
  };

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
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Smart Health</Text>
        <Text style={styles.headerSubtitle}>Medicine delivery & prescriptions</Text>

        {/* Search */}
        <Animated.View entering={ZoomIn.delay(200).duration(300)} style={styles.searchContainer}>
          <Icon name="search" size="md" color={COLORS.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search medicines or pharmacies..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
        </Animated.View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.quickActionsContainer}>
        {QUICK_ACTIONS.map((action, index) => (
          <Animated.View key={action.label} entering={ZoomIn.delay(150 + index * 50).duration(300)}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Icon name={action.icon} size="lg" color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Content */}
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
              <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.health}15` }]}>
                  <Icon name="heart" size="2xl" color={COLORS.health} />
                </View>
                <Text style={styles.emptyText}>No pharmacies available</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Popular Medicines</Text>
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: `${COLORS.health}15` }]}>
                <Icon name="package" size="2xl" color={COLORS.health} />
              </View>
              <Text style={styles.emptyText}>Search for medicines above</Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Quick Action Component
function QuickAction({
  icon,
  label,
  onPress,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size="lg" color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// Pharmacy Card Component
function PharmacyCard({ pharmacy, onPress }: { pharmacy: Pharmacy; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={styles.pharmacyCard}>
        <View style={[styles.pharmacyImageContainer, { backgroundColor: `${COLORS.pharmacy}15` }]}>
          {pharmacy.image ? (
            <Image source={{ uri: pharmacy.image }} style={styles.pharmacyImage} />
          ) : (
            <Icon name="home" size="xl" color={COLORS.pharmacy} />
          )}
        </View>
        <View style={styles.pharmacyContent}>
          <View style={styles.pharmacyHeader}>
            <Text style={styles.pharmacyName} numberOfLines={1}>
              {pharmacy.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: pharmacy.isOpen ? `${COLORS.primary}15` : `${COLORS.emergency}15` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: pharmacy.isOpen ? COLORS.primary : COLORS.emergency },
                ]}
              >
                {pharmacy.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          <Text style={styles.pharmacyAddress} numberOfLines={1}>
            {pharmacy.address}
          </Text>
          <View style={styles.pharmacyMeta}>
            {pharmacy.rating && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size="sm" color="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={styles.ratingText}>{pharmacy.rating.toFixed(1)}</Text>
              </View>
            )}
            {pharmacy.deliveryTime && (
              <View style={styles.deliveryContainer}>
                <Icon name="clock" size="xs" color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.deliveryText}>{pharmacy.deliveryTime} min</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Styles
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
    backgroundColor: COLORS.health,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  pharmacyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pharmacyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pharmacyImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  pharmacyContent: {
    flex: 1,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pharmacyName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  pharmacyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
