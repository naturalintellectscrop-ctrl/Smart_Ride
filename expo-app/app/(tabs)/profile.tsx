// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================
// Dark Theme with Smart Ride Branding
// ============================================

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState({ totalRides: 0, orders: 0, rating: '-' });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [taskRes, orderRes] = await Promise.all([
        api.getTaskHistory(1, 1),
        api.getOrders(1, 1),
      ]);

      const totalRides = taskRes.success && taskRes.data ?
        (Array.isArray(taskRes.data) ? taskRes.data.length : (taskRes.data as any).pagination?.total || 0) : 0;
      const orders = orderRes.success && orderRes.data ?
        (Array.isArray(orderRes.data) ? orderRes.data.length : (orderRes.data as any).pagination?.total || 0) : 0;

      setStats({ totalRides, orders, rating: user ? '4.8' : '-' });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await api.logout();
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              await logout();
              router.replace('/');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      section: 'Account',
      items: [
        { icon: '👤', label: 'Edit Profile', onPress: () => router.push('/profile/edit') },
        { icon: '📍', label: 'Saved Addresses', onPress: () => {} },
        { icon: '💳', label: 'Payment Methods', onPress: () => router.push('/wallet') },
        { icon: '👥', label: 'Emergency Contacts', onPress: () => {} },
      ],
    },
    {
      section: 'Preferences',
      items: [
        { 
          icon: '🔔', 
          label: 'Notifications', 
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        { icon: '🌍', label: 'Language', value: 'English', onPress: () => {} },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: '❓', label: 'Help Center', onPress: () => {} },
        { icon: '💬', label: 'Contact Support', onPress: () => {} },
        { icon: '📜', label: 'Terms of Service', onPress: () => {} },
        { icon: '🔒', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        
        {/* User Info */}
        <View style={styles.userInfo}>
          <Animated.View 
            entering={ZoomIn.delay(200).duration(300)}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>👤</Text>
          </Animated.View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(200).springify()}
        style={styles.statsContainer}
      >
        <StatItem label="Total Rides" value={String(stats.totalRides)} delay={300} />
        <View style={styles.statDivider} />
        <StatItem label="Orders" value={String(stats.orders)} delay={350} />
        <View style={styles.statDivider} />
        <StatItem label="Rating" value={stats.rating} delay={400} />
      </Animated.View>

      {/* Menu Items */}
      {menuItems.map((section, sectionIndex) => (
        <Animated.View 
          key={sectionIndex} 
          entering={FadeInUp.duration(400).delay(300 + sectionIndex * 100).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{section.section}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, itemIndex) => (
              <Animated.View
                key={itemIndex}
                entering={SlideInRight.duration(300).delay(350 + sectionIndex * 100 + itemIndex * 50).springify()}
              >
                <MenuItem 
                  item={item} 
                  isLast={itemIndex === section.items.length - 1} 
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* App Version */}
      <Animated.Text 
        entering={FadeIn.duration(400).delay(800)}
        style={styles.version}
      >
        Smart Ride v1.0.0
      </Animated.Text>

      {/* Logout Button */}
      <Animated.View entering={FadeInUp.duration(400).delay(900).springify()} style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FF4757" />
          ) : (
            <Text style={styles.logoutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Animated Stat Item
function StatItem({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View 
      entering={FadeIn.duration(400).delay(delay).springify()}
      style={styles.statItem}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Menu Item Component
function MenuItem({ item, isLast }: { item: any; isLast: boolean }) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={item.type === 'toggle' ? undefined : item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{item.icon}</Text>
      <Text style={styles.menuLabel}>{item.label}</Text>
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#374151', true: COLORS.primary }}
          thumbColor={item.value ? COLORS.primary : '#6B7280'}
        />
      ) : item.value ? (
        <Text style={styles.menuValue}>{item.value}</Text>
      ) : (
        <Text style={styles.menuArrow}>›</Text>
      )}
      {!isLast && <View style={styles.menuDivider} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(13, 13, 18, 0.7)',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(13, 13, 18, 0.7)',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuValue: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  menuArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  menuDivider: {
    position: 'absolute',
    left: 48,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 24,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  logoutText: {
    color: '#FF4757',
    fontSize: 16,
    fontWeight: '600',
  },
});
