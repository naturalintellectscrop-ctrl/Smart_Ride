// ============================================
// SMART RIDE MOBILE - HOME SCREEN
// ============================================
// Refactored: GlowHeader, GlassCard, ServiceIcon,
// GradientButton, design-system constants, Reanimated
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useAuthStore, useLocationStore } from '@/src/store';
import { COLORS, SERVICES } from '@/src/constants';
import { GlowHeader, GlassCard, GradientButton, ServiceIcon } from '@/src/components';

// Local service data for the home grid (maps to SERVICES keys + custom entries)
const HOME_SERVICES: {
  id: string;
  name: string;
  serviceKey: keyof typeof SERVICES | 'custom';
  customEmoji?: string;
  customColor?: string;
}[] = [
  { id: 'ride', name: 'Rides', serviceKey: 'custom', customEmoji: '🚗', customColor: '#00FF88' },
  { id: 'food', name: 'Food', serviceKey: 'FOOD' },
  { id: 'shopping', name: 'Shop', serviceKey: 'SHOPPING' },
  { id: 'delivery', name: 'Delivery', serviceKey: 'DELIVERY' },
  { id: 'health', name: 'Health', serviceKey: 'HEALTH' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { address, getCurrentLocation, isLocating } = useLocationStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getCurrentLocation().catch(() => {});
    } finally {
      setRefreshing(false);
    }
  }, [getCurrentLocation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleServicePress = (serviceId: string) => {
    switch (serviceId) {
      case 'ride':
        router.push('/rider/ride-request?type=BODA');
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        stickyHeaderIndices={[0]}
      >
        {/* GlowHeader replaces solid green header */}
        <GlowHeader
          title="Smart Ride"
          rightAction={{ icon: 'notifications-outline', onPress: () => {} }}
        >
          {/* Greeting + Location moved into GlowHeader children */}
          <View style={styles.headerChildren}>
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>
                {user?.name?.split(' ')[0] || 'Guest'} 👋
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(500).delay(100)}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => getCurrentLocation().catch(() => {})}
                activeOpacity={0.7}
              >
                <Text style={styles.locationIcon}>📍</Text>
                {isLocating ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={styles.locationText} numberOfLines={1}>
                    {address || 'Tap to set location'}
                  </Text>
                )}
                <Text style={styles.locationArrow}>▼</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </GlowHeader>

        {/* Search Bar */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.searchContainer}>
          <GlassCard variant="elevated" padding={14} borderRadius={14}>
            <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/rider/ride-request?type=BODA')}>
              <Text style={styles.searchIcon}>🔍</Text>
              <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Services */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            {HOME_SERVICES.map((service, index) => (
              <Animated.View
                key={service.id}
                entering={ZoomIn.duration(300).delay(300 + index * 80)}
              >
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => handleServicePress(service.id)}
                  activeOpacity={0.7}
                >
                  <ServiceIcon
                    service={service.serviceKey}
                    size="lg"
                    customEmoji={service.customEmoji}
                    customColor={service.customColor}
                  />
                  <Text style={styles.serviceName}>{service.name}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Ride */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Ride</Text>
          <View style={styles.rideOptions}>
            {/* Smart Boda */}
            <Animated.View entering={SlideInRight.duration(350).delay(550)} style={styles.rideCardWrapper}>
              <GlassCard variant="accent" padding={16} borderRadius={16}>
                <View style={styles.rideCardInner}>
                  <ServiceIcon service="BODA" size="lg" />
                  <Text style={styles.rideIconEmoji}>🏍️</Text>
                  <Text style={styles.rideName}>Smart Boda</Text>
                  <Text style={styles.rideDesc}>Motorcycle ride</Text>
                  <Text style={styles.ridePrice}>From UGX 2,000</Text>
                  <View style={styles.rideButtonContainer}>
                    <GradientButton
                      title="Book"
                      onPress={() => router.push('/rider/ride-request?type=BODA')}
                      size="sm"
                      fullWidth={false}
                    />
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Smart Car */}
            <Animated.View entering={SlideInRight.duration(350).delay(650)} style={styles.rideCardWrapper}>
              <GlassCard variant="cyan" padding={16} borderRadius={16}>
                <View style={styles.rideCardInner}>
                  <ServiceIcon service="CAR" size="lg" />
                  <Text style={styles.rideIconEmoji}>🚗</Text>
                  <Text style={styles.rideName}>Smart Car</Text>
                  <Text style={styles.rideDesc}>Car ride</Text>
                  <Text style={styles.ridePrice}>From UGX 5,000</Text>
                  <View style={styles.rideButtonContainer}>
                    <GradientButton
                      title="Book"
                      onPress={() => router.push('/rider/ride-request?type=CAR')}
                      size="sm"
                      fullWidth={false}
                    />
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Promo Banner */}
        <Animated.View entering={FadeInUp.duration(400).delay(700)} style={styles.section}>
          <GlassCard variant="elevated" padding={20} borderRadius={16}>
            <View style={styles.promoBanner}>
              <Text style={styles.promoTitle}>Welcome to Smart Ride!</Text>
              <Text style={styles.promoDesc}>
                Get rides, order food, shop, and more - all in one app.
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 20,
  },
  // ---- GlowHeader children ----
  headerChildren: {
    marginTop: 12,
    gap: 12,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  userName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  locationText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  locationArrow: {
    color: COLORS.textMuted,
    marginLeft: 8,
    fontSize: 10,
  },
  // ---- Search ----
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 12,
    fontSize: 16,
  },
  searchPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  // ---- Sections ----
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  // ---- Services Grid ----
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '18%',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  // ---- Quick Ride ----
  rideOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  rideCardWrapper: {
    flex: 1,
  },
  rideCardInner: {
    alignItems: 'center',
  },
  rideIconEmoji: {
    fontSize: 28,
    marginTop: 8,
    marginBottom: 4,
  },
  rideName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  rideDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ridePrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 8,
  },
  rideButtonContainer: {
    width: '100%',
    marginTop: 4,
  },
  // ---- Promo ----
  promoBanner: {
    alignItems: 'center',
  },
  promoTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  promoDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
