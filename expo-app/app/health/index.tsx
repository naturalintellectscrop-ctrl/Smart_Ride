// ============================================
// SMART RIDE MOBILE - HEALTH SCREEN
// ============================================
// Premium dark theme with vector icons
// Health services - pharmacy, prescriptions
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
import { COLORS } from '@/src/constants';
import { Icon, IconColors } from '../../components/Icon';

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

// Quick actions configuration
const QUICK_ACTIONS = [
  { id: 'medicine', iconName: 'activity' as const, label: 'Medicine', color: '#F43F5E' },
  { id: 'prescriptions', iconName: 'file-text' as const, label: 'Prescriptions', color: '#00FFF3' },
  { id: 'pharmacies', iconName: 'home' as const, label: 'Pharmacies', color: '#00FF88' },
  { id: 'emergency', iconName: 'alert-circle' as const, label: 'Emergency', color: '#F59E0B' },
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

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'medicine':
        setActiveTab('medicines');
        break;
      case 'prescriptions':
        router.push('/health/prescriptions');
        break;
      case 'pharmacies':
        setActiveTab('pharmacies');
        break;
      case 'emergency':
        router.push('/sos');
        break;
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
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Smart Health</Text>
        <Text style={styles.headerSubtitle}>Medicine delivery & prescriptions</Text>
        
        {/* Search */}
        <Animated.View 
          entering={ZoomIn.delay(200).duration(300)}
          style={styles.searchContainer}
        >
          <Icon name="search" size="md" color={COLORS.textMuted} />
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
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.quickActionsContainer}
      >
        {QUICK_ACTIONS.map((action, index) => (
          <Animated.View
            key={action.id}
            entering={ZoomIn.delay(150 + index * 50).duration(300)}
            style={styles.quickActionItem}
          >
            <TouchableOpacity 
              onPress={() => handleQuickAction(action.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                <Icon name={action.iconName} size="md" color={action.color} />
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
                style={styles.emptyContainer}
              >
                <View style={styles.emptyIconContainer}>
                  <Icon name="activity" size="2xl" color={COLORS.textMuted} />
                </View>
                <Text style={styles.emptyText}>No pharmacies available</Text>
              </Animated.View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Popular Medicines</Text>
            <Animated.View 
              entering={FadeIn.duration(400)}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIconContainer}>
                <Icon name="activity" size="2xl" color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>Search for medicines above</Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Pharmacy Card Component
function PharmacyCard({ pharmacy, onPress }: { pharmacy: Pharmacy; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.pharmacyCard}>
        <View style={styles.pharmacyImageContainer}>
          {pharmacy.image ? (
            <Image source={{ uri: pharmacy.image }} style={styles.pharmacyImage} />
          ) : (
            <View style={styles.pharmacyImagePlaceholder}>
              <Icon name="activity" size="lg" color={COLORS.primary} />
            </View>
          )}
        </View>
        <View style={styles.pharmacyContent}>
          <View style={styles.pharmacyHeader}>
            <Text style={styles.pharmacyName} numberOfLines={1}>{pharmacy.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: pharmacy.isOpen ? `${COLORS.success}20` : `${COLORS.error}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: pharmacy.isOpen ? COLORS.success : COLORS.error }
              ]}>
                {pharmacy.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          <Text style={styles.pharmacyAddress} numberOfLines={1}>{pharmacy.address}</Text>
          <View style={styles.pharmacyFooter}>
            {pharmacy.rating && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size="xs" color="#FBBF24" />
                <Text style={styles.ratingText}>{pharmacy.rating.toFixed(1)}</Text>
              </View>
            )}
            {pharmacy.deliveryTime && (
              <Text style={styles.deliveryTime}>{pharmacy.deliveryTime} min delivery</Text>
            )}
          </View>
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
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: COLORS.background,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(13, 13, 18, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  quickActionItem: {
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
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
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
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  pharmacyCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pharmacyImageContainer: {
    marginRight: 12,
  },
  pharmacyImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  pharmacyImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyContent: {
    flex: 1,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pharmacyName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
  pharmacyAddress: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  pharmacyFooter: {
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
});
