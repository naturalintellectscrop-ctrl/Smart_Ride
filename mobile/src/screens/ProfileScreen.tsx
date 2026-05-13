/**
 * Smart Ride - Profile Screen
 * 
 * User profile management with settings and account options.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, showChevron = true, danger = false }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with gradient effect */}
      <View style={styles.header}>
        <View style={styles.headerGradient} />
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Text style={styles.editAvatarText}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'guest@example.com'}</Text>
          <View style={styles.userRoleBadge}>
            <Text style={styles.userRoleText}>{user?.role || 'CLIENT'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>47</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingItem
            icon="👤"
            title="Personal Information"
            subtitle="Update your profile details"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="💳"
            title="Payment Methods"
            subtitle="Manage your payment options"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="📍"
            title="Saved Places"
            subtitle="Home, work, and favorites"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="🎁"
            title="Promo Codes"
            subtitle="Apply or view your promos"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <SettingItem
            icon="🔔"
            title="Notifications"
            subtitle="Manage push notifications"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="🌙"
            title="Dark Mode"
            subtitle="Always enabled"
            onPress={() => Alert.alert('Info', 'Dark mode is always enabled for Smart Ride')}
            showChevron={false}
          />
          <SettingItem
            icon="🌐"
            title="Language"
            subtitle="English"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.section}>
          <SettingItem
            icon="❓"
            title="Help Center"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="💬"
            title="Contact Support"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="📋"
            title="Terms of Service"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <SettingItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <SettingItem
            icon="🚪"
            title="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>Smart Ride v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  header: {
    position: 'relative',
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#1A1A24',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  profileSection: {
    alignItems: 'center',
    zIndex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0D0D12',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#0D0D12',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0D0D12',
  },
  editAvatarText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userRoleBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00FF88',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00FF88',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2D2D3A',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D3A',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2D2D3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  settingIconText: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingTitleDanger: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#4B5563',
  },
  versionText: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 12,
    marginVertical: 24,
  },
});

export default ProfileScreen;
