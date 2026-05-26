// ============================================
// SMART RIDE MOBILE - HOME SCREEN
// ============================================
// Simplified version - Plain StyleSheet (no NativeWind)
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
import { useAuthStore, useLocationStore } from '@/src/store';

const COLORS = {
  primary: '#00FF88',
  primaryDark: '#059669',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
};

const SERVICES = [
  { id: 'ride', name: 'Rides', icon: '🚗', color: '#00FF88' },
  { id: 'food', name: 'Food', icon: '🍔', color: '#F59E0B' },
  { id: 'shopping', name: 'Shop', icon: '🛒', color: '#8B5CF6' },
  { id: 'delivery', name: 'Delivery', icon: '📦', color: '#14B8A6' },
  { id: 'health', name: 'Health', icon: '💊', color: '#F43F5E' },
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
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>
              {user?.name?.split(' ')[0] || 'Guest'} 👋
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => getCurrentLocation().catch(() => {})}
        >
          <Text style={styles.locationIcon}>📍</Text>
          {isLocating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.locationText} numberOfLines={1}>
              {address || 'Tap to set location'}
            </Text>
          )}
          <Text style={styles.locationArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
        </TouchableOpacity>
      </View>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => handleServicePress(service.id)}
            >
              <View style={[styles.serviceIconContainer, { backgroundColor: `${service.color}20` }]}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
              </View>
              <Text style={styles.serviceName}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Ride</Text>
        <View style={styles.rideOptions}>
          <TouchableOpacity 
            style={styles.rideCard}
            onPress={() => router.push('/rider/ride-request?type=BODA')}
          >
            <Text style={styles.rideIcon}>🏍️</Text>
            <Text style={styles.rideName}>Smart Boda</Text>
            <Text style={styles.rideDesc}>Motorcycle ride</Text>
            <Text style={styles.ridePrice}>From UGX 2,000</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.rideCard}
            onPress={() => router.push('/rider/ride-request?type=CAR')}
          >
            <Text style={styles.rideIcon}>🚗</Text>
            <Text style={styles.rideName}>Smart Car</Text>
            <Text style={styles.rideDesc}>Car ride</Text>
            <Text style={styles.ridePrice}>From UGX 5,000</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Promo Banner */}
      <View style={styles.section}>
        <View style={styles.promoBanner}>
          <Text style={styles.promoTitle}>Welcome to Smart Ride!</Text>
          <Text style={styles.promoDesc}>
            Get rides, order food, shop, and more - all in one app.
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 18,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
  },
  locationArrow: {
    color: 'white',
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 12,
    fontSize: 16,
  },
  searchPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
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
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  rideOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  rideCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rideIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rideName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rideDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  ridePrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  promoBanner: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  },
});
