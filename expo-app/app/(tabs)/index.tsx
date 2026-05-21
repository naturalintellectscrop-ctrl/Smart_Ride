// ============================================
// SMART RIDE MOBILE - HOME SCREEN
// ============================================
// Premium home screen with dynamic greeting,
// vector icons, and production-grade UI
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
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useLocationStore } from '@/src/store';
import { Icon, IconColors } from '../../components/Icon';
import { ServiceCard } from '../../components/ServiceCard';
import { RideCard } from '../../components/RideCard';
import { getGreeting, getUserDisplayName } from '../../utils/greeting';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6D',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundSurface: '#252530',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
};

// Services configuration with vector icons
const SERVICES = [
  { id: 'ride', name: 'Rides', icon: 'car' as const, color: '#00FF88' },
  { id: 'food', name: 'Food', icon: 'coffee' as const, color: '#F59E0B' },
  { id: 'shopping', name: 'Shop', icon: 'shopping-bag' as const, color: '#8B5CF6' },
  { id: 'delivery', name: 'Delivery', icon: 'package' as const, color: '#14B8A6' },
  { id: 'health', name: 'Health', icon: 'activity' as const, color: '#F43F5E' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
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

  const userName = getUserDisplayName(user);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getCurrentLocation().catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }, [getCurrentLocation]);

  const handleServicePress = (serviceId: string) => {
    switch (serviceId) {
      case 'ride':
        // Navigate to ride booking
        break;
      case 'food':
        router.push('/orders/restaurants');
        break;
      case 'shopping':
        router.push('/shopping');
        break;
      case 'delivery':
        router.push('/delivery');
        break;
      case 'health':
        router.push('/health');
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
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
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          
          <View style={styles.headerContent}>
            {/* Top Row: Greeting & Notifications */}
            <View style={styles.headerTop}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>{greeting},</Text>
                <Text style={styles.userNameText}>{userName}</Text>
              </View>
              
              <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
                <Icon name="bell" size="md" color={COLORS.text} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>

            {/* Location Selector */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => getCurrentLocation().catch(() => {})}
              activeOpacity={0.8}
            >
              <View style={styles.locationIconContainer}>
                <Icon name="map-pin" size="sm" color={COLORS.primary} />
              </View>
              {isLocating ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.locationText} numberOfLines={1}>
                  {address || 'Tap to set location'}
                </Text>
              )}
              <Icon name="chevron-down" size="sm" color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
            <Icon name="search" size="md" color={COLORS.textMuted} />
            <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
          </TouchableOpacity>
        </View>

        {/* Services Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
          </View>
          <View style={styles.servicesGrid}>
            {SERVICES.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                icon={service.icon}
                color={service.color}
                onPress={() => handleServicePress(service.id)}
                size="md"
              />
            ))}
          </View>
        </View>

        {/* Quick Ride Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Ride</Text>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rideOptions}>
            <RideCard
              name="Smart Boda"
              description="Motorcycle ride"
              price="From UGX 2,000"
              icon="bike"
              color="#00FF88"
              onPress={() => router.push('/rider/ride-request?type=BODA')}
            />
            <RideCard
              name="Smart Car"
              description="Car ride"
              price="From UGX 5,000"
              icon="car"
              color="#00FFF3"
              onPress={() => router.push('/rider/ride-request?type=CAR')}
            />
          </View>
        </View>

        {/* Wallet Summary Card */}
        {isAuthenticated && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.walletCard} activeOpacity={0.9}>
              <View style={styles.walletHeader}>
                <View style={styles.walletIconContainer}>
                  <Icon name="credit-card" size="lg" color={COLORS.primary} />
                </View>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletLabel}>Smart Wallet</Text>
                  <Text style={styles.walletBalance}>UGX 0</Text>
                </View>
              </View>
              <View style={styles.walletActions}>
                <TouchableOpacity style={styles.walletAction} activeOpacity={0.8}>
                  <Icon name="plus" size="sm" color={COLORS.primary} />
                  <Text style={styles.walletActionText}>Top Up</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Promo Banner */}
        <View style={styles.section}>
          <View style={styles.promoCard}>
            <View style={styles.promoContent}>
              <View style={styles.promoIconContainer}>
                <Icon name="zap" size="xl" color={COLORS.primary} />
              </View>
              <View style={styles.promoTextContainer}>
                <Text style={styles.promoTitle}>First Ride Free!</Text>
                <Text style={styles.promoDesc}>
                  Use code WELCOME for 50% off your first ride
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.promoButton} activeOpacity={0.8}>
              <Text style={styles.promoButtonText}>Claim Now</Text>
              <Icon name="arrow-right" size="sm" color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityEmpty}>
            <Icon name="activity" size="lg" color={COLORS.textMuted} />
            <Text style={styles.activityEmptyText}>No recent activity</Text>
            <Text style={styles.activityEmptySubtext}>
              Your rides and orders will appear here
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'relative',
    paddingTop: 50,
    paddingBottom: 28,
    marginBottom: 16,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationIconContainer: {
    marginRight: 10,
  },
  locationText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rideOptions: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  walletCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  walletBalance: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  walletActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  walletAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  walletActionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  promoCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  promoDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  promoButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  activityEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  activityEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  activityEmptySubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
});
