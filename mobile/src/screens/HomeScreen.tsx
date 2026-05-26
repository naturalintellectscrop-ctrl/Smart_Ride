/**
 * Smart Ride - Home Screen
 * 
 * Main landing screen showing all service categories.
 * Dark theme with Smart Ride branding.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
  route: string;
  gradient: string[];
}

export function HomeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);

  const services = [
    {
      title: 'Smart Boda',
      description: 'Quick motorcycle rides',
      icon: '🏍️',
      route: 'Ride',
      gradient: ['#00FF88', '#00CC6A'],
    },
    {
      title: 'Smart Car',
      description: 'Comfortable car rides',
      icon: '🚗',
      route: 'Ride',
      gradient: ['#00FFF3', '#00CCCC'],
    },
    {
      title: 'Food Delivery',
      description: 'Restaurant meals delivered',
      icon: '🍔',
      route: 'Food',
      gradient: ['#FBBF24', '#F59E0B'],
    },
    {
      title: 'Shopping',
      description: 'Groceries & retail',
      icon: '🛒',
      route: 'Shopping',
      gradient: ['#7C3AED', '#6D28D9'],
    },
    {
      title: 'Item Delivery',
      description: 'Send packages anywhere',
      icon: '📦',
      route: 'Shopping',
      gradient: ['#EC4899', '#DB2777'],
    },
    {
      title: 'Smart Health',
      description: 'Medicine delivery',
      icon: '💊',
      route: 'Food',
      gradient: ['#10B981', '#059669'],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Guest'}</Text>
          <Text style={styles.subtitle}>Where would you like to go?</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || 'G'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => navigation.navigate('Ride' as never)}
      >
        <Text style={styles.searchPlaceholder}>Where to?</Text>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Ride' as never)}
        >
          <Text style={styles.quickActionIcon}>📍</Text>
          <Text style={styles.quickActionText}>Set Pickup</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Ride' as never)}
        >
          <Text style={styles.quickActionIcon}>⭐</Text>
          <Text style={styles.quickActionText}>Saved Places</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Food' as never)}
        >
          <Text style={styles.quickActionIcon}>🍔</Text>
          <Text style={styles.quickActionText}>Order Food</Text>
        </TouchableOpacity>
      </View>

      {/* Services Grid */}
      <Text style={styles.sectionTitle}>Our Services</Text>
      <ScrollView 
        style={styles.servicesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.servicesGrid}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(service.route as never)}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0D0D12',
    fontSize: 20,
    fontWeight: '700',
  },
  searchBar: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  searchPlaceholder: {
    color: '#6B7280',
    fontSize: 16,
  },
  searchIcon: {
    backgroundColor: '#00FF88',
    borderRadius: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconText: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#1A1A24',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickActionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  servicesContainer: {
    flex: 1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    paddingBottom: 100,
  },
  serviceCard: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: '#1A1A24',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  serviceIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
