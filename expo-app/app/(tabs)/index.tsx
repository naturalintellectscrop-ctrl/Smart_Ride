// ============================================
// SMART RIDE — CLIENT HOME
// ============================================
// Built on the client design surface (src/components/client):
//
//   greeting + notifications → location pill → wallet card → destination
//   search → map preview → services rail → quick ride → support
//
// The promo banner that used to sit above Support advertised "50% off your
// first 3 rides" with no promotions API behind it; the Design Language forbids
// fabricated content, so it stays gone. Quick-ride prices read from RIDE_TYPES
// rather than being typed into the markup.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuthStore, useLocationStore } from '@/src/store';
import {
  RIDE_TYPES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  MOTION,
  ICON,
  BORDER,
  OPACITY,
} from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { SmartRideMap } from '@/src/components';
import {
  GreetingHeader,
  LocationPill,
  WalletCard,
  HomeSearchRow,
  SectionHeading,
  ServiceTile,
  QuickRideCard,
} from '@/src/components/client';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';

// Services rail. `description` is the one-line "what this does" under each name.
const HOME_SERVICES: {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'ride', name: 'Ride', description: 'Get a ride', icon: 'bicycle' },
  { id: 'food', name: 'Food', description: 'Order food', icon: 'restaurant' },
  { id: 'shopping', name: 'Shop', description: 'Groceries', icon: 'bag-handle' },
  { id: 'delivery', name: 'Parcel', description: 'Send parcels', icon: 'cube' },
  { id: 'health', name: 'Health', description: 'Book care', icon: 'heart' },
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
  const insets = useSafeAreaInsets();
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
      // silently fail — wallet widget shows a skeleton
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

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + notifications */}
        <GreetingHeader
          greeting={`${getGreeting()},`}
          name={firstName}
          actions={[
            {
              icon: 'notifications-outline',
              onPress: () => router.push('/notifications'),
              label: 'Notifications',
              badge: true,
            },
          ]}
          style={styles.block}
        />

        {/* Location */}
        <LocationPill
          address={address}
          loading={isLocating}
          onPress={() => getCurrentLocation().catch(() => {})}
          style={styles.block}
        />

        {/* Wallet */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(120)} style={styles.block}>
          <WalletCard
            balance={walletBalance}
            onPress={() => router.push('/wallet')}
            onTopUp={() => router.push('/wallet')}
          />
        </Animated.View>

        {/* Destination search */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(180)} style={styles.block}>
          <HomeSearchRow
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            onRecents={() => router.push('/rides')}
          />
        </Animated.View>

        {/* Map preview */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(240)} style={styles.block}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
            style={styles.mapCard}
            accessibilityRole="button"
            accessibilityLabel="Book a ride — tap to set destination"
          >
            <SmartRideMap
              style={styles.map}
              initialLatitude={latitude}
              initialLongitude={longitude}
              showUserLocation
              driverPoints={nearbyDrivers}
            />
            <View style={styles.mapBadgeRow}>
              <View style={styles.mapBadge}>
                <Ionicons name="location" size={ICON.sm} color={COLORS.primary} />
                <Text style={styles.mapBadgeText} numberOfLines={1}>
                  {address || 'Current location'}
                </Text>
              </View>
              {isLocating ? (
                <View style={styles.mapBadge}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : null}
            </View>
            <View style={styles.mapCtaRow}>
              <View style={styles.mapCta}>
                <Ionicons name="navigate" size={ICON.md} color={COLORS.onPrimary} />
                <Text style={styles.mapCtaText}>Set destination</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Services */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(300)} style={styles.block}>
          {/* No "View all" action: there is no services index route, and the
              rail already shows every service the app offers, so the link
              would either 404 or reveal nothing. */}
          <SectionHeading title="Services" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesRail}
          >
            {HOME_SERVICES.map((service) => (
              <ServiceTile
                key={service.id}
                name={service.name}
                description={service.description}
                icon={service.icon}
                onPress={() => handleServicePress(service.id)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Quick Ride */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(380)} style={styles.block}>
          <SectionHeading title="Quick Ride" subtitle="Book a ride in just a few taps" />
          <View style={styles.quickRideRow}>
            {QUICK_RIDES.map((ride) => (
              <QuickRideCard
                key={ride.type}
                name={ride.name}
                fromFare={formatCurrency(ride.baseFare)}
                icon={ride.icon}
                onPress={() => router.push(`/rider/ride-request?type=${ride.type}`)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Support */}
        <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(440)} style={styles.block}>
          <TouchableOpacity
            style={styles.supportCard}
            onPress={() => router.push('/chat')}
            activeOpacity={OPACITY.pressed}
            accessibilityRole="button"
            accessibilityLabel="Contact in-app support"
          >
            <View style={styles.supportPlate}>
              <Ionicons name="headset-outline" size={ICON.md} color={COLORS.primary} />
            </View>
            <Text style={styles.supportText}>Need assistance?</Text>
            <Text style={styles.supportCta}>In-app Support</Text>
            <Ionicons name="chevron-forward" size={ICON.sm} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  block: {
    marginBottom: SPACING.md,
  },

  // Map preview
  mapCard: {
    height: 260,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: BORDER.hairline,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.gutter,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    maxWidth: '100%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.gutter,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardSurface,
  },
  mapBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  mapCtaRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.md,
    alignItems: 'center',
  },
  mapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  mapCtaText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },

  // Services rail
  servicesRail: {
    gap: SPACING.gutter,
    paddingRight: SPACING.xs,
  },

  // Quick ride
  quickRideRow: {
    flexDirection: 'row',
    gap: SPACING.gutter,
  },

  // Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
    padding: SPACING.gutter,
    borderRadius: RADIUS.lg,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSurface,
  },
  supportPlate: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tintSurface,
  },
  supportText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    flex: 1,
  },
  supportCta: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },

  bottomSpacer: {
    height: SPACING.xxl,
  },
});
