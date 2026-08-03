// ============================================
// SMART RIDE MOBILE - ROLE SELECTION SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// Shown after registration/login when user has no role
// Allows switching between Client, Rider, Merchant
// ============================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BORDER, OPACITY } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { makeThemedColors, ThemedColors } from '../../src/theme/themedColors';
import { GradientButton } from '../../src/components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';
import { navigateToRoleHome } from '@/src/utils/roleRouting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Role definitions with icons, colors, and descriptions
const ROLES = [
  {
    id: 'CLIENT',
    title: 'Client',
    subtitle: 'Book rides & order',
    description: 'Request rides, order food, shop, and more',
    icon: 'car-outline',
    gradient: ['#005f3a', '#0e7a4d'] as const,
    bgAccent: 'rgba(0, 95, 58, 0.08)',
    borderColor: 'rgba(0, 95, 58, 0.15)',
  },
  {
    id: 'RIDER',
    title: 'Rider / Boda',
    subtitle: 'Earn on the road',
    description: 'Accept ride requests and earn money as a boda or car driver',
    icon: 'bicycle-outline',
    gradient: ['#0e7a4d', '#006e2f'] as const,
    bgAccent: 'rgba(14, 122, 77, 0.08)',
    borderColor: 'rgba(14, 122, 77, 0.15)',
  },
  {
    id: 'DRIVER',
    title: 'Driver',
    subtitle: 'Professional driver',
    description: 'Drive cars, delivery vehicles, or provide specialized transport services',
    icon: 'bus-outline',
    gradient: ['#1a6b3c', '#0e7a4d'] as const,
    bgAccent: 'rgba(26, 107, 60, 0.08)',
    borderColor: 'rgba(26, 107, 60, 0.15)',
  },
  {
    id: 'MERCHANT',
    title: 'Merchant',
    subtitle: 'Sell & deliver',
    description: 'List your restaurant, shop or pharmacy on Smart Ride',
    icon: 'storefront-outline',
    gradient: ['#4b5264', '#636a7c'] as const,
    bgAccent: 'rgba(75, 82, 100, 0.08)',
    borderColor: 'rgba(75, 82, 100, 0.15)',
  },
  {
    id: 'PHARMACIST',
    title: 'Pharmacist',
    subtitle: 'Medicine & healthcare',
    description: 'Manage medicine catalog, prescriptions, and healthcare services',
    icon: 'medkit-outline',
    gradient: ['#2e7d32', '#388e3c'] as const,
    bgAccent: 'rgba(46, 125, 50, 0.08)',
    borderColor: 'rgba(46, 125, 50, 0.15)',
  },
];

export default function RoleSelectionScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string | null>(user?.role || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);

    // Update the user's role in the auth store
    if (user) {
      setUser({ ...user, role: selectedRole });
    }

    // Persist role to the API
    try {
      await api.updateUserRole(selectedRole);
    } catch (error) {
      // Non-blocking: role is already saved locally; API sync can retry later
      console.warn('Failed to persist role to API:', error);
    }

    setIsSubmitting(false);

    // Navigate to the role's home route (single source of truth)
    navigateToRoleHome(selectedRole);
  };

  const handleSkip = () => {
    // Default to client if they skip
    if (user) {
      setUser({ ...user, role: 'CLIENT' });
    }
    navigateToRoleHome('CLIENT');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      {/* Subtle mesh background */}
      <View style={styles.meshBackground}>
        <View style={styles.meshOrb1} />
        <View style={styles.meshOrb2} />
      </View>

      {/* Fixed top bar */}
      <View style={[styles.appBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Choose Your Role</Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="hand-left-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Welcome, {user?.name?.split(' ')[0] || 'there'}!</Text>
          <Text style={styles.heroSubtitle}>
            How would you like to use Smart Ride? You can always change this later in your profile settings.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardSelected,
                  { borderColor: isSelected ? COLORS.primary : role.borderColor },
                ]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.7}
              >
                {/* Selection indicator */}
                <View style={styles.roleCardHeader}>
                  <View style={[styles.roleIconContainer, { backgroundColor: role.bgAccent }]}>
                    <Ionicons name={role.icon as any} size={28} color={COLORS.primary} />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  </View>
                  {/* Radio/Check indicator */}
                  <View style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
                <Text style={styles.roleDescription}>{role.description}</Text>

                {/* Feature tags */}
                <View style={styles.featureTags}>
                  {role.id === 'CLIENT' && (
                    <>
                      <View style={styles.tag}><Text style={styles.tagText}>Rides</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Food</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Shopping</Text></View>
                    </>
                  )}
                  {role.id === 'RIDER' && (
                    <>
                      <View style={styles.tag}><Text style={styles.tagText}>Boda</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Car</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Earnings</Text></View>
                    </>
                  )}
                  {role.id === 'DRIVER' && (
                    <>
                      <View style={styles.tag}><Text style={styles.tagText}>Car</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Delivery</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Earnings</Text></View>
                    </>
                  )}
                  {role.id === 'MERCHANT' && (
                    <>
                      <View style={styles.tag}><Text style={styles.tagText}>Restaurant</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Shop</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Pharmacy</Text></View>
                    </>
                  )}
                  {role.id === 'PHARMACIST' && (
                    <>
                      <View style={styles.tag}><Text style={styles.tagText}>Medicine</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Prescriptions</Text></View>
                      <View style={styles.tag}><Text style={styles.tagText}>Healthcare</Text></View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <GradientButton
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            size="lg"
            disabled={!selectedRole || isSubmitting}
            loading={isSubmitting}
            icon={
              !isSubmitting ? (
                <Ionicons name="arrow-forward" size={20} color={COLORS.onPrimary} />
              ) : undefined
            }
          />
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.outline} />
          <Text style={styles.infoNoteText}>
            You can switch roles anytime from your Profile settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  // Subtle mesh gradient background
  meshBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  meshOrb1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(107, 255, 143, 0.05)',
  },
  meshOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 95, 58, 0.04)',
  },
  // Top bar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 56,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.DEFAULT,
    marginLeft: -SPACING.xs,
  },
  appBarTitle: {
    flex: 1,
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },
  // Scroll content
  scrollContent: {
    flexGrow: 1,
  },
  // Hero section
  heroSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.outlineVariant,
  },
  heroIcon: {
    ...TYPOGRAPHY.displaySm,
  },
  heroTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  // Roles container
  rolesContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  // Role card
  roleCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  roleCardSelected: {
    backgroundColor: 'rgba(0, 95, 58, 0.03)',
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.primary,
    ...SHADOWS.active,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  roleIcon: {
    ...TYPOGRAPHY.displaySm,
    fontSize: 24,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  roleSubtitle: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  // Radio button
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  // Role description
  roleDescription: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  // Feature tags
  featureTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  tagText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  // Button
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  infoNoteText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    textAlign: 'center',
  },
});
