// ============================================
// SMART RIDE MOBILE - HOME SCREEN
// ============================================
// Stitch Design System — MD3 Green Theme
// Layout:
//   GlowHeader (greeting + location)
//   Wallet Balance card (UGX balance + Top Up)
//   Search bar
//   Mini map preview
//   Service grid (5 services)
//   Quick Ride cards
//   Promo banner
// ============================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useAuthStore, useLocationStore } from '@/src/store';
import { SERVICES, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlowHeader, GlassCard, GradientButton, ServiceIcon } from '@/src/components';
import { SmartRideMap } from '@/src/components/SmartRideMap';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';

// Service grid items
const HOME_SERVICES: {
  id: string;
  name: string;
  serviceKey: keyof typeof SERVICES | 'custom';
  iconName?: string;
  customColor?: string;
}[] = [
  { id: 'ride', name: 'Ride', serviceKey: 'custom', iconName: 'bicycle', customColor: '#005f3a' },
  { id: 'food', name: 'Food', serviceKey: 'FOOD' },
  { id: 'shopping', name: 'Shop', serviceKey: 'SHOPPING' },
  { id: 'delivery', name: 'Parcel', serviceKey: 'DELIVERY' },
  { id: 'health', name: 'Health', serviceKey: 'HEALTH' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const user = useAuthStore(s => s.user);
  const address = useLocationStore(s => s.address);
  const latitude = useLocationStore(s => s.latitude);
  const longitude = useLocationStore(s => s.longitude);
  const getCurrentLocation = useLocationStore(s => s.getCurrentLocation);
  const isLocating = useLocationStore(s => s.isLocating);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{
    latitude: number;
    longitude: number;
    vehicleType?: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER' | null;
    riderRole?: string | null;
    heading?: number | null;
  }>>([]);

  useEffect(() => {
    getCurrentLocation().catch(() => {});
    loadWalletBalance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live online drivers around the user, refreshed every 15s so the home map
  // reflects real availability (no hardcoded markers). Boda is the default ride
  // entry point from home. Non-fatal — an empty result just shows no dots.
  const loadNearbyDrivers = useCallback(async () => {
    if (latitude == null || longitude == null) return;
    try {
      // No taskType filter here: the home map shows every nearby vehicle type
      // (boda + car), each drawn with its own branded marker.
      const res = await api.getNearbyDrivers(latitude, longitude);
      if (res.success && res.data) {
        setNearbyDrivers(res.data.drivers.map((d) => ({
          latitude: d.latitude,
          longitude: d.longitude,
          vehicleType: d.vehicleType,
          riderRole: d.riderRole,
          heading: d.heading,
        })));
      }
    } catch {
      // non-fatal
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    loadNearbyDrivers();
    const id = setInterval(loadNearbyDrivers, 15000);
    return () => clearInterval(id);
  }, [latitude, longitude, loadNearbyDrivers]);

  const loadWalletBalance = async () => {
    try {
      const res = await api.getWallet();
      if (res.success && res.data) {
        setWalletBalance(res.data.wallet?.balance ?? 0);
      }
    } catch {
      // silently fail — wallet widget shows dash
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        getCurrentLocation().catch(() => {}),
        loadWalletBalance(),
        loadNearbyDrivers(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [getCurrentLocation, loadNearbyDrivers]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

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

  const formatBalance = (bal: number) => {
    return `UGX ${bal.toLocaleString()}`;
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sticky Header ── */}
        <GlowHeader
          title="Smart Ride"
          rightAction={{ icon: 'notifications-outline', onPress: () => router.push('/notifications') }}
        >
          <View style={styles.headerChildren}>
            {/* Greeting */}
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </Animated.View>

            {/* Location pill */}
            <Animated.View entering={FadeIn.duration(500).delay(100)}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => getCurrentLocation().catch(() => {})}
                activeOpacity={0.7}
                accessibilityLabel="Refresh location"
              >
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                {isLocating ? (
                  <ActivityIndicator color={COLORS.primary} size="small" style={{ marginLeft: SPACING.xs }} />
                ) : (
                  <Text style={styles.locationText} numberOfLines={1}>
                    {address || 'Tap to set location'}
                  </Text>
                )}
                <Ionicons name="chevron-down" size={12} color={COLORS.outline} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </GlowHeader>

        {/* ── Wallet Balance Card ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(150)} style={styles.walletSection}>
          <TouchableOpacity
            style={styles.walletCard}
            onPress={() => router.push('/wallet')}
            activeOpacity={0.85}
            accessibilityLabel="Open wallet"
          >
            <View style={styles.walletLeft}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletBalance}>
                {walletBalance !== null ? formatBalance(walletBalance) : '—'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.topUpButton}
              onPress={() => router.push('/wallet')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={14} color={COLORS.onPrimary} />
              <Text style={styles.topUpText}>Top Up</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Search Bar ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(200)} style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.outline} />
            <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Mini Map Preview ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(250)} style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            style={styles.mapPreviewCard}
            accessibilityLabel="Book a ride — tap to set destination"
          >
            <SmartRideMap
              style={styles.mapPreview}
              initialLatitude={latitude}
              initialLongitude={longitude}
              showUserLocation
              driverPoints={nearbyDrivers}
            />
            {/* Top badge row */}
            <View style={styles.mapBadgeRow}>
              <View style={styles.mapBadge}>
                <Ionicons name="location" size={11} color={COLORS.onPrimary} />
                <Text style={styles.mapBadgeText} numberOfLines={1}>
                  {address || 'Current location'}
                </Text>
              </View>
              {isLocating && (
                <View style={styles.mapLocatingPill}>
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  <Text style={styles.mapBadgeText}>Locating…</Text>
                </View>
              )}
            </View>
            {/* Bottom CTA pill */}
            <View style={styles.mapCtaPill}>
              <Ionicons name="navigate-outline" size={14} color={COLORS.onPrimary} />
              <Text style={styles.mapCtaText}>Set destination</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.onPrimary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Service Grid ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            {HOME_SERVICES.map((service, index) => (
              <Animated.View
                key={service.id}
                entering={ZoomIn.duration(280).delay(300 + index * 70)}
                style={styles.serviceCardWrapper}
              >
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => handleServicePress(service.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${service.name} service`}
                >
                  <ServiceIcon
                    service={service.serviceKey}
                    size="lg"
                    customIcon={service.iconName as any}
                    customColor={service.customColor}
                  />
                  <Text style={styles.serviceName}>{service.name}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ── Quick Ride ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(450)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Ride</Text>
          <View style={styles.rideRow}>
            {/* Smart Boda */}
            <TouchableOpacity
              style={[styles.rideCard, styles.rideCardBoda]}
              onPress={() => router.push('/rider/ride-request?type=BODA')}
              activeOpacity={0.8}
            >
              <View style={styles.rideIconCircle}>
                <Ionicons name="bicycle" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.rideCardName}>Smart Boda</Text>
              <Text style={styles.rideCardPrice}>From UGX 2,000</Text>
              <View style={styles.rideCardCta}>
                <Text style={styles.rideCardCtaText}>Book</Text>
                <Ionicons name="arrow-forward" size={12} color={COLORS.onPrimary} />
              </View>
            </TouchableOpacity>

            {/* Smart Car */}
            <TouchableOpacity
              style={[styles.rideCard, styles.rideCardCar]}
              onPress={() => router.push('/rider/ride-request?type=CAR')}
              activeOpacity={0.8}
            >
              <View style={[styles.rideIconCircle, styles.rideIconCircleCar]}>
                <Ionicons name="car-sport" size={22} color={COLORS.serviceCar} />
              </View>
              <Text style={styles.rideCardName}>Smart Car</Text>
              <Text style={styles.rideCardPrice}>From UGX 5,000</Text>
              <View style={[styles.rideCardCta, styles.rideCardCtaCar]}>
                <Text style={styles.rideCardCtaText}>Book</Text>
                <Ionicons name="arrow-forward" size={12} color={COLORS.onPrimary} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Promo Banner ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(550)} style={styles.section}>
          <TouchableOpacity
            style={styles.promoBanner}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            activeOpacity={0.85}
          >
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>LIMITED OFFER</Text>
            </View>
            <Text style={styles.promoTitle}>50% off your first 3 SmartRide rides!</Text>
            <Text style={styles.promoDesc}>Book now and save on your first three rides across Kampala.</Text>
            <View style={styles.promoCta}>
              <Text style={styles.promoCtaText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Support Banner ── */}
        <Animated.View entering={FadeInUp.duration(350).delay(620)} style={[styles.section, styles.supportSection]}>
          <TouchableOpacity
            style={styles.supportBanner}
            onPress={() => router.push('/chat')}
            activeOpacity={0.8}
          >
            <Ionicons name="headset-outline" size={20} color={COLORS.primary} />
            <Text style={styles.supportText}>Need assistance?</Text>
            <Text style={styles.supportCta}>In-app Support</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  content: {
    paddingBottom: SPACING.lg,
  },

  // ── Header children ──
  headerChildren: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  greeting: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  userName: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING.xs,
    ...SHADOWS.card,
  },
  locationText: {
    flex: 1,
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    maxWidth: 200,
  },

  // ── Wallet Balance ──
  walletSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    ...SHADOWS.active,
  },
  walletLeft: {
    flex: 1,
  },
  walletLabel: {
    ...TYPOGRAPHY.labelMd,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  walletBalance: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  topUpText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // ── Search ──
  searchContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...SHADOWS.card,
  },
  searchPlaceholder: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.outline,
    flex: 1,
  },

  // ── Sections ──
  section: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  // ── Mini Map Preview ──
  mapPreviewCard: {
    height: 195,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceContainerLow,
    ...SHADOWS.card,
  },
  mapPreview: {
    flex: 1,
  },
  mapBadgeRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mapBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(0,95,58,0.9)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 1,
    ...SHADOWS.card,
  },
  mapLocatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(0,95,58,0.9)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  mapBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  mapCtaPill: {
    position: 'absolute',
    bottom: SPACING.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm + 1,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.active,
  },
  mapCtaText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  // ── Service Grid ──
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceCardWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  serviceCard: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  serviceName: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // ── Quick Ride ──
  rideRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rideCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  rideCardBoda: {
    borderColor: `${COLORS.primary}30`,
    backgroundColor: `${COLORS.primary}06`,
  },
  rideCardCar: {
    borderColor: `${COLORS.serviceCar}30`,
    backgroundColor: `${COLORS.serviceCar}06`,
  },
  rideIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  rideIconCircleCar: {
    backgroundColor: `${COLORS.serviceCar}15`,
  },
  rideCardName: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  rideCardPrice: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  rideCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
  },
  rideCardCtaCar: {
    backgroundColor: COLORS.serviceCar,
  },
  rideCardCtaText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // ── Promo Banner ──
  promoBanner: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
    ...SHADOWS.card,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    marginBottom: SPACING.sm,
  },
  promoBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  promoTitle: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  promoDesc: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.md,
  },
  promoCtaText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Support ──
  supportSection: {
    marginTop: SPACING.md,
  },
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  supportText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  supportCta: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
