// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================
// Golden Screen #38 · Archetype AR-5 (Detail + grouped rows).
//
//   identity hero (Avatar + name + contact) → stats → grouped sections
//   (Account / Preferences / Support) → Sign Out (danger, confirmed)
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Alert } from '@/src/components/feedback';
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
import { TYPOGRAPHY, SPACING, RADIUS, MOTION, ICON, OPACITY } from '@/src/constants';
import {
  AppHeader,
  Avatar,
  Card,
  GradientButton,
  Rating,
  SectionHeader,
  Toggle,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '@/src/utils/imagePicker';
import { API_CONFIG } from '@/src/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const { isDark, toggleTheme, colors } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const [stats, setStats] = useState({ totalRides: 0, orders: 0, rating: '-' });

  // Dynamic styles based on theme colors
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadStats();
  }, []);

  // Hydrate the notifications toggle from the persisted user prefs
  useEffect(() => {
    const prefs = (user as any)?.notificationPreferences;
    if (prefs && typeof prefs.notificationsEnabled === 'boolean') {
      setNotificationsEnabled(prefs.notificationsEnabled);
    }
  }, [user]);

  const handleNotificationToggle = async (value: boolean) => {
    const previous = notificationsEnabled;
    setNotificationsEnabled(value);
    setUpdatingPrefs(true);
    try {
      const response = await api.updateNotificationPreferences(value);
      if (!response.success) {
        // Revert on failure
        setNotificationsEnabled(previous);
        Alert.alert(
          'Error',
          response.error || 'Failed to update notification preferences'
        );
        return;
      }
      // Persist locally so the toggle stays in sync across re-mounts.
      if (user) {
        setUser({
          ...user,
          notificationPreferences: { notificationsEnabled: value },
        } as any);
      }
    } catch (error) {
      // Revert on failure
      setNotificationsEnabled(previous);
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setUpdatingPrefs(false);
    }
  };

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

      setStats({ totalRides, orders, rating: '-' });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const handleAvatarPress = useCallback(async () => {
    try {
      const image = await pickImage({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!image) return;

      setIsUploadingAvatar(true);

      const formData = new FormData();
      formData.append('avatar', {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as any);

      const token = await (await import('@/src/utils/secureStorage')).secureStorage.getAccessToken();
      const response = await fetch(`${API_CONFIG.baseUrl}/uploads/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data?.avatarUrl) {
        setUser({ ...user!, avatarUrl: result.data.avatarUrl } as any);
        Alert.alert('Success', 'Avatar updated!');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user, setUser]);

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
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => router.push('/profile/edit') },
        { icon: 'refresh-outline', label: `Switch Role (${user?.role || 'Client'})`, onPress: () => router.push('/auth/role-selection' as any) },
        { icon: 'location-outline', label: 'Saved Addresses', onPress: () => router.push('/profile/saved-addresses' as any) },
        { icon: 'card-outline', label: 'Payment Methods', onPress: () => router.push('/wallet') },
        { icon: 'people-outline', label: 'Emergency Contacts', onPress: () => router.push('/sos') },
        { icon: 'key-outline', label: 'Change Password', onPress: () => router.push('/auth/change-password' as any) },
        { icon: 'trash-outline', label: 'Delete Account', onPress: () => router.push('/profile/delete-account' as any), danger: true },
      ],
    },
    {
      section: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          type: 'toggle',
          value: isDark,
          onToggle: () => toggleTheme(),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: handleNotificationToggle,
          disabled: updatingPrefs,
        },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => router.push('/help-center' as any) },
        { icon: 'chatbubble-outline', label: 'Contact Support', onPress: () => Linking.openURL('https://smartrideug.vercel.app/contact') },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Linking.openURL('https://smartrideug.vercel.app/terms') },
        { icon: 'lock-closed-outline', label: 'Privacy Policy', onPress: () => Linking.openURL('https://smartrideug.vercel.app/privacy') },
      ],
    },
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Identity hero. The settings action opens the shared /settings hub —
            it used to raise a "Coming Soon" alert even though that screen has
            existed and been reachable from merchant and pharmacist all along. */}
        <AppHeader
          title="Profile"
          rightActions={[
            { icon: 'settings-outline', onPress: () => router.push('/settings' as never), label: 'Settings' },
          ]}
        />
        <Animated.View entering={FadeInDown.duration(MOTION.duration.slower)} style={styles.identityWrap}>
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={OPACITY.pressed}
              disabled={isUploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <Animated.View entering={ZoomIn.delay(200).duration(MOTION.duration.base)}>
                {isUploadingAvatar ? (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <Avatar uri={(user as any)?.avatarUrl} name={user?.name} size="xl" />
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera-outline" size={ICON.xs} color={colors.white} />
                </View>
              </Animated.View>
            </TouchableOpacity>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
              <Text style={styles.userPhone}>{user?.phone || ''}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats - Overlapping header bottom edge with negative margin */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(200).springify()}
          style={styles.statsWrapper}
        >
          <Card variant="elevated" padding={SPACING.md} radius={RADIUS.xl} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatItem label="Total Rides" value={String(stats.totalRides)} delay={300} colors={colors} />
              <View style={styles.statDivider} />
              <StatItem label="Orders" value={String(stats.orders)} delay={350} colors={colors} />
              <View style={styles.statDivider} />
              <View style={styles.ratingStat}>
              <Rating value={Number(stats.rating) || 0} size="md" />
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            </View>
          </Card>
        </Animated.View>

        {/* Grouped setting rows */}
        {menuItems.map((section, sectionIndex) => (
          <Animated.View 
            key={sectionIndex} 
            entering={FadeInUp.duration(400).delay(300 + sectionIndex * 100).springify()}
            style={styles.section}
          >
            <SectionHeader title={section.section} />
            <Card variant="raised" padding={SPACING.sm} radius={RADIUS.xl} style={styles.menuCard}>
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
            </Card>
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
      alignItems: 'center' as const,
      paddingVertical: 4,
    },
    statValue: {
      fontSize: 22,
      fontWeight: 'bold' as const,
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
      fontWeight: '500' as const,
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
      <Ionicons
        name={item.icon}
        size={20}
        color={item.danger ? colors.error : colors.text}
        style={{ marginRight: 12 }}
      />
      <Text
        style={[
          itemStyles.menuLabel,
          item.danger && { color: colors.error },
        ]}
      >
        {item.label}
      </Text>
      {item.type === 'toggle' ? (
        <Toggle
          value={item.value}
          onValueChange={item.onToggle}
          disabled={item.disabled}
          accessibilityLabel={item.label}
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
    identityWrap: {
      paddingHorizontal: SPACING.md,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginTop: SPACING.sm,
    },
    ratingStat: {
      flex: 1,
      alignItems: 'center',
      gap: SPACING.xs,
    },
    statLabel: {
      ...TYPOGRAPHY.labelMd,
      color: colors.textMuted,
    },
    avatarLoading: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.backgroundSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 4,
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
      // Theme-aware background (see statsCard note) — fixes invisible menu
      // labels in dark mode.
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
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
