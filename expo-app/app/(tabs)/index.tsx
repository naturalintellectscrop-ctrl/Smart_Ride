// ============================================
// SMART RIDE — CLIENT HOME
// ============================================
// Golden Screen #7 · Archetype AR-3 (content-first variant).
//
//   AppHeader (greeting + location + notifications) → wallet preview →
//   "Where to?" → services → map preview → quick ride → support
//
// Every surface is a Design-System primitive. The promo banner that used to sit
// above Support advertised "50% off your first 3 rides" with no promotions API
// behind it; the Design Language forbids fabricated content, so it is gone
// rather than restyled. Quick-ride prices now read from RIDE_TYPES instead of
// being typed into the markup.
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
import {
  SERVICES,
  RIDE_TYPES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  MOTION,
  ICON,
  BORDER,
  OPACITY,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  GradientButton,
  SearchInput,
  SectionHeader,
  ServiceIcon,
  Skeleton,
  SmartRideMap,
} from '@/src/components';
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

// Quick-ride tiles. Fares come from the shared RIDE_TYPES config so home can
// never drift from what the booking screen actually quotes.
const QUICK_RIDES: { type: 'BODA' | 'CAR'; name: string; icon: keyof typeof Ionicons.glyphMap; baseFare: number }[] = [
  { type: 'BODA', name: RIDE_TYPES.BODA.name, icon: 'bicycle', baseFare: RIDE_TYPES.BODA.baseFare },
  { type: 'CAR', name: RIDE_TYPES.CAR.name, icon: 'car-sport', baseFare: RIDE_TYPES.CAR.baseFare },
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
        {/* ── Sticky header: greeting + location + notifications ── */}
        <View style={styles.stickyHeader}>
          <AppHeader
            title={firstName}
            subtitle={`${getGreeting()},`}
            rightActions={[
              { icon: 'notifications-outline', onPress: () => router.push('/notifications'), label: 'Notifications' },
            ]}
          />
          <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.locationRow}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => getCurrentLocation().catch(() => {})}
              activeOpacity={OPACITY.pressed}
              accessibilityRole="button"
              accessibilityLabel="Refresh location"
            >
              <Ionicons name="location-outline" size={ICON.xs} color={COLORS.primary} />
              {isLocating ? (
                <ActivityIndicator color={COLORS.primary} size="small" style={styles.locationSpinner} />
              ) : (
                <Text style={styles.locationText} numberOfLines={1}>
                  {address || 'Tap to set location'}
                </Text>
              )}
              <Ionicons name="chevron-down" size={ICON.xs} color={COLORS.outline} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Wallet preview ── */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(150)} style={styles.section}>
          <Card
            variant="accent"
            padding={SPACING.md}
            radius={RADIUS.xl}
            onPress={() => router.push('/wallet')}
            accessibilityLabel="Open wallet"
          >
            <View style={styles.walletRow}>
              <View style={styles.walletLeft}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                {walletBalance !== null ? (
                  <Text style={styles.walletBalance}>{formatBalance(walletBalance)}</Text>
                ) : (
                  <Skeleton width={140} height={28} borderRadius={RADIUS.sm} style={styles.walletSkeleton} />
                )}
              </View>
              <GradientButton
                title="Top Up"
                onPress={() => router.push('/wallet')}
                variant="primary"
                size="sm"
                fullWidth={false}
                icon={<Ionicons name="add" size={ICON.sm} color={COLORS.onPrimary} />}
              />
            </View>
          </Card>
        </Animated.View>

        {/* ── "Where to?" — opens the booking flow ── */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(200)} style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            activeOpacity={OPACITY.pressed}
            accessibilityRole="button"
            accessibilityLabel="Where do you want to go?"
          >
            {/* Non-editable: this is the entry point to destination search, not a
                field. Same affordance as the real SearchInput it hands off to. */}
            <View pointerEvents="none">
              <SearchInput
                value=""
                onChangeText={() => {}}
                placeholder="Where do you want to go?"
                editable={false}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Map preview ── */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(250)} style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            style={styles.mapPreviewCard}
            accessibilityRole="button"
            accessibilityLabel="Book a ride — tap to set destination"
          >
            <SmartRideMap
              style={styles.mapPreview}
              initialLatitude={latitude}
              initialLongitude={longitude}
              showUserLocation
              driverPoints={nearbyDrivers}
            />
            <View style={styles.mapBadgeRow}>
              <View style={styles.mapBadge}>
                <Ionicons name="location" size={ICON.xs} color={COLORS.onPrimary} />
                <Text style={styles.mapBadgeText} numberOfLines={1}>
                  {address || 'Current location'}
                </Text>
              </View>
              {isLocating && (
                <View style={styles.mapBadge}>
                  <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  <Text style={styles.mapBadgeText}>Locating…</Text>
                </View>
              )}
            </View>
            <View style={styles.mapCtaPill}>
              <Ionicons name="navigate-outline" size={ICON.xs} color={COLORS.onPrimary} />
              <Text style={styles.mapCtaText}>Set destination</Text>
              <Ionicons name="arrow-forward" size={ICON.xs} color={COLORS.onPrimary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Services ── */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(300)} style={styles.section}>
          <SectionHeader title="Services" />
          <View style={styles.servicesGrid}>
            {HOME_SERVICES.map((service, index) => (
              <Animated.View
                key={service.id}
                entering={ZoomIn.duration(MOTION.duration.base).delay(300 + index * 70)}
                style={styles.serviceCardWrapper}
              >
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => handleServicePress(service.id)}
                  activeOpacity={OPACITY.pressed}
                  accessibilityRole="button"
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
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(450)} style={styles.section}>
          <SectionHeader title="Quick Ride" />
          <View style={styles.rideRow}>
            {QUICK_RIDES.map((ride) => (
              <Card
                key={ride.type}
                variant="raised"
                padding={SPACING.md}
                radius={RADIUS.xl}
                style={styles.rideCard}
                onPress={() => router.push(`/rider/ride-request?type=${ride.type}`)}
                accessibilityLabel={`Book ${ride.name}`}
              >
                <View style={styles.rideIconCircle}>
                  <Ionicons name={ride.icon} size={ICON.lg} color={COLORS.primary} />
                </View>
                <Text style={styles.rideCardName}>{ride.name}</Text>
                <Text style={styles.rideCardPrice}>From {formatBalance(ride.baseFare)}</Text>
              </Card>
            ))}
          </View>
        </Animated.View>

        {/* ── Support ── */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(550)} style={styles.section}>
          <Card
            variant="flat"
            padding={SPACING.md}
            radius={RADIUS.xl}
            onPress={() => router.push('/chat')}
            accessibilityLabel="Contact in-app support"
          >
            <View style={styles.supportRow}>
              <Ionicons name="headset-outline" size={ICON.md} color={COLORS.primary} />
              <Text style={styles.supportText}>Need assistance?</Text>
              <Text style={styles.supportCta}>In-app Support</Text>
              <Ionicons name="chevron-forward" size={ICON.sm} color={COLORS.primary} />
            </View>
          </Card>
        </Animated.View>

        <View style={styles.bottomNavSpacer} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES — layout + domain content only.
// ============================================

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

  // Sticky header
  stickyHeader: {
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.sm,
  },
  locationRow: {
    paddingHorizontal: SPACING.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: 36,
    paddingHorizontal: SPACING.gutter,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    maxWidth: '100%',
  },
  locationSpinner: {
    marginLeft: SPACING.xs,
  },
  locationText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },

  section: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },

  // Wallet
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  walletLeft: {
    flex: 1,
    minWidth: 0,
  },
  walletLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  walletBalance: {
    ...TYPOGRAPHY.displayLg,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  walletSkeleton: {
    marginTop: SPACING.xs,
  },

  // Map preview
  mapPreviewCard: {
    height: 180,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.border,
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBadgeRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    flexShrink: 1,
  },
  mapBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  mapCtaPill: {
    position: 'absolute',
    bottom: SPACING.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.button,
  },
  mapCtaText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  // Services
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCardWrapper: {
    width: '19%',
  },
  serviceCard: {
    alignItems: 'center',
    gap: SPACING.xs + 2,
    minHeight: 44,
  },
  serviceName: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Quick ride
  rideRow: {
    flexDirection: 'row',
    gap: SPACING.gutter,
  },
  rideCard: {
    flex: 1,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  rideIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideCardName: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  rideCardPrice: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },

  // Support
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  supportText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  supportCta: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
    fontWeight: '700',
  },

  bottomNavSpacer: {
    height: 110,
  },
});