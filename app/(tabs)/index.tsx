// ============================================
// SMART RIDE MOBILE - PREMIUM HOME SCREEN
// ============================================
// Production-grade dashboard matching admin design
// - Dynamic greeting based on time
// - Real user name from auth state
// - Premium icons (no emojis)
// - Glassmorphism design
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useLocationStore } from '@/src/store';
import { Icon, IconName } from '../components/Icon';
import { getGreeting, getUserDisplayName } from '../utils/greeting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// DESIGN SYSTEM - Matches Admin Dashboard
// ============================================
const COLORS = {
  // Primary brand colors
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  accentDark: '#00D4FF',

  // Background colors
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',

  // Text colors
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',

  // Border and effects
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',

  // Service colors (matching admin dashboard)
  ride: '#00FF88',
  car: '#3B82F6',
  food: '#F59E0B',
  shopping: '#8B5CF6',
  delivery: '#14B8A6',
  health: '#F43F5E',
  wallet: '#3B82F6',
  warning: '#FBBF24',
};

// ============================================
// SERVICE CONFIGURATION
// ============================================
const SERVICES: Array<{
  id: string;
  name: string;
  icon: IconName;
  color: string;
  route?: string;
}> = [
  { id: 'ride', name: 'Rides', icon: 'car', color: COLORS.ride, route: '/rider/ride-request' },
  { id: 'food', name: 'Food', icon: 'coffee', color: COLORS.food, route: '/orders/restaurants' },
  { id: 'shopping', name: 'Shop', icon: 'shopping-bag', color: COLORS.shopping, route: '/shopping' },
  { id: 'delivery', name: 'Delivery', icon: 'package', color: COLORS.delivery, route: '/delivery' },
  { id: 'health', name: 'Health', icon: 'heart', color: COLORS.health, route: '/health' },
];

// ============================================
// MAIN HOME SCREEN COMPONENT
// ============================================
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { address, getCurrentLocation, isLocating } = useLocationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Good day');

  // Update greeting every minute
  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting('Africa/Kampala'));
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get user display name with fallback
  const displayName = getUserDisplayName(user);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getCurrentLocation().catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }, [getCurrentLocation]);

  const handleServicePress = (serviceId: string, route?: string) => {
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ============================================ */}
        {/* HEADER SECTION */}
        {/* ============================================ */}
        <View style={styles.header}>
          {/* Top Row: Greeting & Notification */}
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userNameText}>{displayName}</Text>
            </View>

            <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
              <View style={styles.notificationButtonInner}>
                <Icon name="bell" size="md" color={COLORS.text} />
                <View style={styles.notificationBadge} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Location Selector */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => getCurrentLocation().catch(() => {})}
            activeOpacity={0.8}
          >
            <View style={styles.locationButtonInner}>
              <View style={styles.locationIconContainer}>
                <Icon name="map-pin" size="sm" color={COLORS.primary} />
              </View>
              {isLocating ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Text style={styles.locationText} numberOfLines={1}>
                  {address || 'Tap to set location'}
                </Text>
              )}
              <Icon name="chevron-down" size="sm" color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* SEARCH BAR */}
        {/* ============================================ */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/rider/ride-request')}
            activeOpacity={0.8}
          >
            <Icon name="search" size="md" color={COLORS.textMuted} />
            <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* SERVICES GRID */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, { borderColor: `${service.color}20` }]}
                onPress={() => handleServicePress(service.id, service.route)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.serviceIconContainer,
                    { backgroundColor: `${service.color}15` },
                  ]}
                >
                  <Icon name={service.icon} size="xl" color={service.color} />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================ */}
        {/* QUICK RIDE OPTIONS */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Ride</Text>
          <View style={styles.rideOptionsContainer}>
            {/* Smart Boda */}
            <TouchableOpacity
              style={[styles.rideCard, { borderColor: `${COLORS.ride}20` }]}
              onPress={() => router.push('/rider/ride-request?type=BODA')}
              activeOpacity={0.85}
            >
              <View style={[styles.rideIconContainer, { backgroundColor: `${COLORS.ride}15` }]}>
                <Icon name="bike" size="2xl" color={COLORS.ride} />
              </View>
              <View style={styles.rideContent}>
                <Text style={styles.rideName}>Smart Boda</Text>
                <Text style={styles.rideDesc}>Motorcycle ride</Text>
                <Text style={[styles.ridePrice, { color: COLORS.ride }]}>From UGX 2,000</Text>
              </View>
              <Icon name="chevron-right" size="md" color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Smart Car */}
            <TouchableOpacity
              style={[styles.rideCard, { borderColor: `${COLORS.car}20` }]}
              onPress={() => router.push('/rider/ride-request?type=CAR')}
              activeOpacity={0.85}
            >
              <View style={[styles.rideIconContainer, { backgroundColor: `${COLORS.car}15` }]}>
                <Icon name="car" size="2xl" color={COLORS.car} />
              </View>
              <View style={styles.rideContent}>
                <Text style={styles.rideName}>Smart Car</Text>
                <Text style={styles.rideDesc}>Comfortable car ride</Text>
                <Text style={[styles.ridePrice, { color: COLORS.car }]}>From UGX 5,000</Text>
              </View>
              <Icon name="chevron-right" size="md" color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================ */}
        {/* WALLET SUMMARY */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>
          <TouchableOpacity
            style={[styles.walletCard, { borderColor: `${COLORS.wallet}20` }]}
            onPress={() => router.push('/wallet')}
            activeOpacity={0.85}
          >
            <View style={styles.walletHeader}>
              <View style={[styles.walletIconContainer, { backgroundColor: `${COLORS.wallet}15` }]}>
                <Icon name="credit-card" size="lg" color={COLORS.wallet} />
              </View>
              <View style={styles.walletBalanceContainer}>
                <Text style={styles.walletLabel}>Available Balance</Text>
                <Text style={styles.walletBalance}>UGX 0</Text>
              </View>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity style={[styles.walletAction, { backgroundColor: `${COLORS.wallet}15` }]} activeOpacity={0.8}>
                <Icon name="plus" size="sm" color={COLORS.wallet} />
                <Text style={[styles.walletActionText, { color: COLORS.wallet }]}>Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.walletAction, { backgroundColor: `${COLORS.wallet}15` }]} activeOpacity={0.8}>
                <Icon name="send" size="sm" color={COLORS.wallet} />
                <Text style={[styles.walletActionText, { color: COLORS.wallet }]}>Send</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* PROMO BANNER */}
        {/* ============================================ */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.promoBanner, { borderColor: `${COLORS.primary}15` }]}
            activeOpacity={0.85}
          >
            <View style={[styles.promoIconContainer, { backgroundColor: `${COLORS.primary}15` }]}>
              <Icon name="zap" size="xl" color={COLORS.primary} />
            </View>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Welcome to Smart Ride!</Text>
              <Text style={styles.promoDesc}>
                Get rides, order food, shop, and more - all in one app.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES - Premium Design System
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  userNameText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  notificationButton: {
    marginLeft: 16,
  },
  notificationButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F43F5E',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  locationButton: {
    marginTop: 4,
  },
  locationButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationIconContainer: {
    marginRight: 10,
  },
  locationText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },

  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  serviceCard: {
    width: (SCREEN_WIDTH - 40 - 24) / 5,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Ride Options
  rideOptionsContainer: {
    gap: 12,
  },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  rideIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rideContent: {
    flex: 1,
  },
  rideName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  rideDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  ridePrice: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Wallet Card
  walletCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletBalanceContainer: {
    flex: 1,
  },
  walletLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  walletBalance: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  walletActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Promo Banner
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  promoDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
