// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================
// Premium profile UI matching admin dashboard
// Vector icons instead of emojis
// Motion & feedback animations
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
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
import { Icon, IconName, IconColors } from '../components/Icon';
import { getUserDisplayName } from '../utils/greeting';

// Design system colors
const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6A',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundCard: '#15151F',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  warning: '#FBBF24',
  error: '#F43F5E',
};

// Menu item type
interface MenuItemType {
  icon: IconName;
  label: string;
  onPress?: () => void;
  type?: 'toggle' | 'link';
  value?: string | boolean;
  onToggle?: (value: boolean) => void;
  iconColor?: string;
}

interface MenuSection {
  section: string;
  items: MenuItemType[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const displayName = getUserDisplayName(user);

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

  const menuItems: MenuSection[] = [
    {
      section: 'Account',
      items: [
        { icon: 'user', label: 'Edit Profile', onPress: () => router.push('/profile/edit'), iconColor: COLORS.primary },
        { icon: 'map-pin', label: 'Saved Addresses', onPress: () => {}, iconColor: '#3B82F6' },
        { icon: 'credit-card', label: 'Payment Methods', onPress: () => router.push('/wallet'), iconColor: '#8B5CF6' },
        { icon: 'users', label: 'Emergency Contacts', onPress: () => {}, iconColor: '#F59E0B' },
      ],
    },
    {
      section: 'Preferences',
      items: [
        {
          icon: 'bell',
          label: 'Notifications',
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
          iconColor: '#F59E0B',
        },
        {
          icon: 'moon',
          label: 'Dark Mode',
          type: 'toggle',
          value: darkMode,
          onToggle: setDarkMode,
          iconColor: '#8B5CF6',
        },
        { icon: 'globe', label: 'Language', value: 'English', onPress: () => {}, iconColor: '#14B8A6' },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help Center', onPress: () => {}, iconColor: COLORS.primary },
        { icon: 'message-circle', label: 'Contact Support', onPress: () => {}, iconColor: '#3B82F6' },
        { icon: 'file-text', label: 'Terms of Service', onPress: () => {}, iconColor: COLORS.textSecondary },
        { icon: 'shield', label: 'Privacy Policy', onPress: () => {}, iconColor: COLORS.textSecondary },
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
        <View style={styles.userInfoContainer}>
          <Animated.View
            entering={ZoomIn.delay(200).duration(300)}
            style={styles.avatarContainer}
          >
            <Icon name="user" size="xl" color={COLORS.primary} />
          </Animated.View>
          <Animated.View entering={FadeInRight.delay(300).duration(400)} style={styles.userTextContainer}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          </Animated.View>
          <AnimatedPressable onPress={() => router.push('/profile/edit')}>
            <View style={styles.editButton}>
              <Icon name="edit" size="sm" color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(200).springify()}
        style={styles.statsContainer}
      >
        <StatItem label="Total Rides" value="24" delay={300} />
        <View style={styles.statDivider} />
        <StatItem label="Orders" value="12" delay={350} />
        <View style={styles.statDivider} />
        <StatItem label="Rating" value="4.8" delay={400} showStar />
      </Animated.View>

      {/* Menu Items */}
      {menuItems.map((section, sectionIndex) => (
        <Animated.View
          key={sectionIndex}
          entering={FadeInUp.duration(400).delay(300 + sectionIndex * 100).springify()}
          style={styles.menuSection}
        >
          <Text style={styles.sectionTitle}>{section.section}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, itemIndex) => (
              <Animated.View
                key={itemIndex}
                entering={SlideInRight.duration(300).delay(350 + sectionIndex * 100 + itemIndex * 50).springify()}
              >
                <MenuItem item={item} isLast={itemIndex === section.items.length - 1} />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* App Version */}
      <Animated.Text
        entering={FadeIn.duration(400).delay(800)}
        style={styles.versionText}
      >
        Smart Ride v1.0.0
      </Animated.Text>

      {/* Logout Button */}
      <Animated.View entering={FadeInUp.duration(400).delay(900).springify()} style={styles.logoutContainer}>
        <AnimatedPressable
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <>
              <Icon name="log-out" size="md" color={COLORS.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Animated Stat Item
function StatItem({ label, value, delay, showStar }: { label: string; value: string; delay: number; showStar?: boolean }) {
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(delay).springify()}
      style={styles.statItem}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.statValue}>{value}</Text>
        {showStar && <Icon name="star" size="sm" color="#FBBF24" style={{ marginLeft: 4 }} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Menu Item Component
function MenuItem({ item, isLast }: { item: MenuItemType; isLast: boolean }) {
  return (
    <>
      <AnimatedPressable
        style={styles.menuItem}
        onPress={item.type === 'toggle' ? undefined : item.onPress}
      >
        <View style={[styles.menuIconContainer, { backgroundColor: `${item.iconColor || COLORS.primary}15` }]}>
          <Icon name={item.icon} size="md" color={item.iconColor || COLORS.primary} />
        </View>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value as boolean}
            onValueChange={item.onToggle}
            trackColor={{ false: '#374151', true: `${COLORS.primary}40` }}
            thumbColor={item.value ? COLORS.primary : '#6B7280'}
          />
        ) : item.value ? (
          <Text style={styles.menuValue}>{item.value as string}</Text>
        ) : (
          <Icon name="chevron-right" size="sm" color={COLORS.textMuted} />
        )}
      </AnimatedPressable>
      {!isLast && <View style={styles.menuDivider} />}
    </>
  );
}

// Animated Pressable Component
function AnimatedPressable({ children, onPress, disabled, style }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; style?: any }) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.95}
    >
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// FadeInRight animation helper
const FadeInRight = SlideInRight.duration(300);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 24,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundElevated,
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 18,
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
    fontWeight: '700',
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
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuValue: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 64,
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 24,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.error}15`,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: `${COLORS.error}20`,
    gap: 8,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
