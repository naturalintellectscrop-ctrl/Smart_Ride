// ============================================
// SMART RIDE MOBILE - PROFILE SCREEN
// ============================================
// Premium dark theme with Smart Ride branding
// Uses vector icons instead of emojis
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
import { Icon, IconColors } from '../../components/Icon';

const MENU_ICONS = {
  editProfile: 'user' as const,
  addresses: 'map-pin' as const,
  payment: 'credit-card' as const,
  contacts: 'users' as const,
  notifications: 'bell' as const,
  language: 'grid' as const,
  help: 'help-circle' as const,
  support: 'message-circle' as const,
  terms: 'file-text' as const,
  privacy: 'shield' as const,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
        { iconName: MENU_ICONS.editProfile, iconColor: IconColors.primary, label: 'Edit Profile', onPress: () => router.push('/profile/edit') },
        { iconName: MENU_ICONS.addresses, iconColor: IconColors.accent, label: 'Saved Addresses', onPress: () => {} },
        { iconName: MENU_ICONS.payment, iconColor: '#F59E0B', label: 'Payment Methods', onPress: () => router.push('/wallet') },
        { iconName: MENU_ICONS.contacts, iconColor: '#8B5CF6', label: 'Emergency Contacts', onPress: () => {} },
      ],
    },
    {
      section: 'Preferences',
      items: [
        { 
          iconName: MENU_ICONS.notifications,
          iconColor: IconColors.warning, 
          label: 'Notifications', 
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
        { iconName: MENU_ICONS.language, iconColor: '#14B8A6', label: 'Language', value: 'English', onPress: () => {} },
      ],
    },
    {
      section: 'Support',
      items: [
        { iconName: MENU_ICONS.help, iconColor: IconColors.textSecondary, label: 'Help Center', onPress: () => {} },
        { iconName: MENU_ICONS.support, iconColor: IconColors.primary, label: 'Contact Support', onPress: () => {} },
        { iconName: MENU_ICONS.terms, iconColor: IconColors.textSecondary, label: 'Terms of Service', onPress: () => {} },
        { iconName: MENU_ICONS.privacy, iconColor: IconColors.accent, label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

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
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
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
            <>
              <Icon name="log-out" size="md" color="#FF4757" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
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
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {showStar && <Icon name="star" size="sm" color="#FBBF24" style={{ marginLeft: 4 }} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// Menu Item Component
function MenuItem({ item, isLast }: { item: any; isLast: boolean }) {
  const scale = useSharedValue(1);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={item.type === 'toggle' ? undefined : item.onPress}
      onPressIn={item.type === 'toggle' ? undefined : handlePressIn}
      onPressOut={item.type === 'toggle' ? undefined : handlePressOut}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.menuIconContainer, { backgroundColor: `${item.iconColor}15` }]}>
        <Icon name={item.iconName} size="sm" color={item.iconColor} />
      </Animated.View>
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
        <Icon name="chevron-right" size="sm" color={COLORS.textMuted} />
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
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
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuValue: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  menuDivider: {
    position: 'absolute',
    left: 64,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  logoutText: {
    color: '#FF4757',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
