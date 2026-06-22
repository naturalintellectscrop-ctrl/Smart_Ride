// ============================================
// SMART RIDE MOBILE - HOME SCREEN
// ============================================
// Refactored: GlowHeader, GlassCard, ServiceIcon,
// GradientButton, design-system constants, Reanimated
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
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useAuthStore, useLocationStore } from '@/src/store';
import { COLORS, SERVICES, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GlowHeader, GlassCard, GradientButton, ServiceIcon } from '@/src/components';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { Ionicons } from '@expo/vector-icons';

// Local service data for the home grid (maps to SERVICES keys + custom entries)
const HOME_SERVICES: {
  id: string;
  name: string;
  serviceKey: keyof typeof SERVICES | 'custom';
  customEmoji?: string;
  customColor?: string;
}[] = [
  { id: 'ride', name: 'Rides', serviceKey: 'custom', customEmoji: undefined, customColor: COLORS.primary },
  { id: 'food', name: 'Food', serviceKey: 'FOOD' },
  { id: 'shopping', name: 'Shop', serviceKey: 'SHOPPING' },
  { id: 'delivery', name: 'Delivery', serviceKey: 'DELIVERY' },
  { id: 'health', name: 'Health', serviceKey: 'HEALTH' },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const address = useLocationStore(s => s.address);
  const latitude = useLocationStore(s => s.latitude);
  const longitude = useLocationStore(s => s.longitude);
  const getCurrentLocation = useLocationStore(s => s.getCurrentLocation);
  const isLocating = useLocationStore(s => s.isLocating);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-fetch the user's location on mount so the home screen shows their
  // real address (and so the map screens have coords ready). Previously this
  // only happened on tap/refresh, so geolocation appeared "broken".
  useEffect(() => {
    getCurrentLocation().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          rightAction={{ icon: 'notifications-outline', onPress: () => router.push('/notifications') }}
        >
          {/* Greeting + Location moved into GlowHeader children */}
          <View style={styles.headerChildren}>
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>
                {user?.name?.split(' ')[0] || 'Guest'}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(500).delay(100)}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => getCurrentLocation().catch(() => {})}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={TYPOGRAPHY.bodySm.fontSize} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
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
          <GlassCard variant="elevated" padding={SPACING.md} borderRadius={RADIUS.lg}>
            <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/rider/ride-request?type=BODA')}>
              <Ionicons name="search-outline" size={TYPOGRAPHY.bodyMd.fontSize} color={COLORS.outline} style={{ marginRight: SPACING.gutter }} />
              <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Mini Map Preview — shows the user's current location and makes the
            home screen feel like a real ride app. Also serves as a visual
            confirmation that the map (Mapbox) is rendering correctly. */}
        <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/location-picker?type=pickup')}
            style={styles.mapPreviewCard}
          >
            <SmartRideMap
              style={styles.mapPreview}
              initialLatitude={latitude}
              initialLongitude={longitude}
              showUserLocation
            />
            {/* Gradient overlay so the "Set destination" pill is readable */}
            <View style={styles.mapOverlay} />
            <View style={styles.mapBadgeRow}>
              <View style={styles.mapBadge}>
                <Ionicons name="location" size={12} color={COLORS.onPrimary} />
                <Text style={styles.mapBadgeText} numberOfLines={1}>
                  {address || 'Tap to set location'}
                </Text>
              </View>
              {isLocating ? (
                <View style={styles.mapLocatingBadge}>
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  <Text style={styles.mapBadgeText}>Locating…</Text>
                </View>
              ) : (
                <View style={styles.mapLocateButton}>
                  <Ionicons name="locate" size={14} color={COLORS.onPrimary} />
                </View>
              )}
            </View>
            <View style={styles.mapCtaPill}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.onPrimary} />
              <Text style={styles.mapCtaText}>Set destination</Text>
            </View>
          </TouchableOpacity>
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
              <GlassCard variant="accent" padding={SPACING.md} borderRadius={RADIUS.lg}>
                <View style={styles.rideCardInner}>
                  <ServiceIcon service="BODA" size="lg" />
                  <Ionicons name="bicycle-outline" size={28} color={COLORS.primary} />
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
              <GlassCard variant="cyan" padding={SPACING.md} borderRadius={RADIUS.lg}>
                <View style={styles.rideCardInner}>
                  <ServiceIcon service="CAR" size="lg" />
                  <Ionicons name="car-sport-outline" size={28} color={COLORS.serviceCar} />
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
          <GlassCard variant="elevated" padding={SPACING.lg} borderRadius={RADIUS.lg}>
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
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    paddingBottom: SPACING.lg + SPACING.xs,
  },
  // ---- GlowHeader children ----
  headerChildren: {
    marginTop: SPACING.gutter,
    gap: SPACING.gutter,
  },
  greeting: {
    color: COLORS.onSurfaceVariant,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  userName: {
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.headlineLgMobile.fontSize,
    fontWeight: TYPOGRAPHY.headlineLgMobile.fontWeight as any,
    marginTop: SPACING.xs / 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  locationIcon: {
    marginRight: SPACING.sm,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  locationText: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  locationArrow: {
    color: COLORS.outline,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
  },
  // ---- Search ----
  searchContainer: {
    paddingHorizontal: SPACING.lg + SPACING.xs,
    marginTop: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: SPACING.gutter,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
  searchPlaceholder: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
  // ---- Sections ----
  section: {
    paddingHorizontal: SPACING.lg + SPACING.xs,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
    fontWeight: '700' as const,
    marginBottom: SPACING.md,
  },
  // ---- Mini Map Preview ----
  mapPreviewCard: {
    height: 200,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceContainerLow,
    ...SHADOWS.card,
  },
  mapPreview: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'transparent',
  },
  mapBadgeRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  mapBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 95, 58, 0.92)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + SPACING.xs,
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.xs,
    ...SHADOWS.card,
  },
  mapBadgeText: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  mapLocatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 95, 58, 0.92)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + SPACING.xs,
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.xs,
    ...SHADOWS.card,
  },
  mapLocateButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 95, 58, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  mapCtaPill: {
    position: 'absolute',
    bottom: SPACING.sm + SPACING.xs,
    left: '50%',
    transform: [{ translateX: -80 }],
    width: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm + 2,
    ...SHADOWS.active,
  },
  mapCtaText: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    fontWeight: '700' as const,
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
    marginBottom: SPACING.md,
  },
  serviceName: {
    color: COLORS.onSurfaceVariant,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: TYPOGRAPHY.labelMd.fontWeight as any,
    marginTop: SPACING.sm,
  },
  // ---- Quick Ride ----
  rideOptions: {
    flexDirection: 'row',
    gap: SPACING.gutter,
  },
  rideCardWrapper: {
    flex: 1,
  },
  rideCardInner: {
    alignItems: 'center',
  },
  rideIconEmoji: {
    fontSize: 28,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  rideName: {
    color: COLORS.onSurface,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: '700' as const,
    marginTop: SPACING.xs,
  },
  rideDesc: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    marginTop: SPACING.xs / 2,
  },
  ridePrice: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.labelLg.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight as any,
    marginTop: SPACING.sm - SPACING.xs / 2,
    marginBottom: SPACING.sm,
  },
  rideButtonContainer: {
    width: '100%',
    marginTop: SPACING.xs,
  },
  // ---- Promo ----
  promoBanner: {
    alignItems: 'center',
  },
  promoTitle: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.bodyLg.fontSize,
    fontWeight: '700' as const,
    marginBottom: SPACING.sm,
  },
  promoDesc: {
    color: COLORS.onSurfaceVariant,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    textAlign: 'center',
  },
});
