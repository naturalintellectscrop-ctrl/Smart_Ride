// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================
// Theme-aware with GlowHeader & Custom Components
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Switch,
  Linking,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { useTheme, ThemeColors } from '@/src/context/theme-context';
import { GlowHeader, GlassCard, GradientButton } from '@/src/components';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme, colors } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState({ totalRides: 0, orders: 0, rating: '-' });

  // Dynamic styles based on theme colors
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          icon: '🌙',
          label: 'Dark Mode',
          type: 'toggle',
          value: isDark,
          onToggle: () => toggleTheme(),
        },
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
        { icon: '❓', label: 'Help Center', onPress: () => Linking.openURL('https://smartrideug.vercel.app/help') },
        { icon: '💬', label: 'Contact Support', onPress: () => Linking.openURL('https://smartrideug.vercel.app/contact') },
        { icon: '📜', label: 'Terms of Service', onPress: () => Linking.openURL('https://smartrideug.vercel.app/terms') },
        { icon: '🔒', label: 'Privacy Policy', onPress: () => Linking.openURL('https://smartrideug.vercel.app/privacy') },
      ],
    },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header - GlowHeader replaces solid green header */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <GlowHeader
            title="Profile"
            rightAction={{ icon: 'settings-outline', onPress: () => {} }}
          >
            {/* User Info as children of GlowHeader */}
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
          </GlowHeader>
        </Animated.View>

        {/* Stats - Overlapping header bottom edge with negative margin */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(200).springify()}
          style={styles.statsWrapper}
        >
          <GlassCard variant="elevated" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatItem label="Total Rides" value={String(stats.totalRides)} delay={300} colors={colors} />
              <View style={styles.statDivider} />
              <StatItem label="Orders" value={String(stats.orders)} delay={350} colors={colors} />
              <View style={styles.statDivider} />
              <StatItem label="Rating" value={stats.rating} delay={400} colors={colors} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Menu Items - Using GlassCard instead of raw View */}
        {menuItems.map((section, sectionIndex) => (
          <Animated.View 
            key={sectionIndex} 
            entering={FadeInUp.duration(400).delay(300 + sectionIndex * 100).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <GlassCard variant="default" style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <Animated.View
                  key={itemIndex}
                  entering={SlideInRight.duration(300).delay(350 + sectionIndex * 100 + itemIndex * 50).springify()}
                >
                  <MenuItem 
                    item={item} 
                    isLast={itemIndex === section.items.length - 1}
                    colors={colors}
                  />
                </Animated.View>
              ))}
            </GlassCard>
          </Animated.View>
        ))}

        {/* App Version */}
        <Animated.Text 
          entering={FadeIn.duration(400).delay(800)}
          style={styles.version}
        >
          Smart Ride v1.0.0
        </Animated.Text>

        {/* Logout Button - Using GradientButton variant="danger" */}
        <Animated.View entering={FadeInUp.duration(400).delay(900).springify()} style={styles.logoutContainer}>
          <GradientButton
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            loading={isLoading}
            disabled={isLoading}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Animated Stat Item
function StatItem({ label, value, delay, colors }: { label: string; value: string; delay: number; colors: ThemeColors }) {
  const statStyles = useMemo(() => ({
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
    },
    statValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
  }), [colors]);

  return (
    <Animated.View 
      entering={FadeIn.duration(400).delay(delay).springify()}
      style={statStyles.statItem}
    >
      <Text style={statStyles.statValue}>{value}</Text>
      <Text style={statStyles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Menu Item Component
function MenuItem({ item, isLast, colors }: { item: any; isLast: boolean; colors: ThemeColors }) {
  const itemStyles = useMemo(() => ({
    menuItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 4,
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
      color: colors.text,
    },
    menuValue: {
      fontSize: 14,
      color: colors.textMuted,
    },
    menuArrow: {
      fontSize: 18,
      color: colors.textMuted,
    },
    menuDivider: {
      position: 'absolute' as const,
      left: 36,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor: colors.border,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={itemStyles.menuItem}
      onPress={item.type === 'toggle' ? undefined : item.onPress}
      activeOpacity={0.7}
    >
      <Text style={itemStyles.menuIcon}>{item.icon}</Text>
      <Text style={itemStyles.menuLabel}>{item.label}</Text>
      {item.type === 'toggle' ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#374151', true: colors.primary }}
          thumbColor={item.value ? colors.primary : '#6B7280'}
        />
      ) : item.value ? (
        <Text style={itemStyles.menuValue}>{item.value}</Text>
      ) : (
        <Text style={itemStyles.menuArrow}>›</Text>
      )}
      {!isLast && <View style={itemStyles.menuDivider} />}
    </TouchableOpacity>
  );
}

// Dynamic style factory — recreates when colors change
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.backgroundSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      borderWidth: 2,
      borderColor: colors.primary,
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
      color: colors.text,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    userPhone: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statsWrapper: {
      marginHorizontal: 20,
      marginTop: -20,
      zIndex: 10,
    },
    statsCard: {
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
      marginBottom: 8,
    },
    menuCard: {
      overflow: 'hidden',
    },
    version: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 24,
    },
    logoutContainer: {
      paddingHorizontal: 20,
      marginTop: 24,
    },
  });
}
