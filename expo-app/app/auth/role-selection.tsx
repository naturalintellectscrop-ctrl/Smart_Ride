// ============================================
// SMART RIDE MOBILE - ROLE SELECTION SCREEN
// ============================================
// Shown after registration/login so the user picks (or confirms) what kind of
// account they are. The hub every auth route lands on: email login, Google
// login on both screens, and OTP verification all replace into here.
//
// On the shared auth design language. The eight hardcoded gradient hexes each
// role card used to carry are gone: the cards read from the palette, so the
// screen follows the theme instead of pinning a light-mode wash. The two
// decorative mesh orbs are gone with them.
// ============================================

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { ThemedColors, makeThemedColors } from '../../src/theme/themedColors';
import { GradientButton } from '../../src/components/GradientButton';
import { navigateToRoleHome } from '@/src/utils/roleRouting';
import { AuthScreen } from '../../src/components/auth';

// Role definitions. `tags` were inlined as five near-identical JSX blocks.
const ROLES: {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tags: string[];
}[] = [
  {
    id: 'CLIENT',
    title: 'Client',
    subtitle: 'Book rides & order',
    description: 'Request rides, order food, shop, and more',
    icon: 'car-outline',
    tags: ['Rides', 'Food', 'Shopping'],
  },
  {
    id: 'RIDER',
    title: 'Rider / Boda',
    subtitle: 'Earn on the road',
    description: 'Accept ride requests and earn money as a boda or car driver',
    icon: 'bicycle-outline',
    tags: ['Boda', 'Car', 'Earnings'],
  },
  {
    id: 'DRIVER',
    title: 'Driver',
    subtitle: 'Professional driver',
    description: 'Drive cars, delivery vehicles, or provide specialized transport services',
    icon: 'bus-outline',
    tags: ['Car', 'Delivery', 'Earnings'],
  },
  {
    id: 'MERCHANT',
    title: 'Merchant',
    subtitle: 'Sell & deliver',
    description: 'List your restaurant, shop or pharmacy on Smart Ride',
    icon: 'storefront-outline',
    tags: ['Restaurant', 'Shop', 'Pharmacy'],
  },
  {
    id: 'PHARMACIST',
    title: 'Pharmacist',
    subtitle: 'Medicine & healthcare',
    description: 'Manage medicine catalog, prescriptions, and healthcare services',
    icon: 'medkit-outline',
    tags: ['Medicine', 'Prescriptions', 'Healthcare'],
  },
];

export default function RoleSelectionScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
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

  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <AuthScreen
        onBack={() => router.back()}
        lead="How will you"
        accent="use Smart Ride?"
        subtitle={
          firstName
            ? `Welcome, ${firstName}. Pick one to get started. You can change this later in your profile.`
            : 'Pick one to get started. You can change this later in your profile.'
        }
        showLockup={false}
        headerRight={
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip role selection and continue as a client"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        }
      >
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              onPress={() => setSelectedRole(role.id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.roleHeader}>
                <View style={[styles.roleIcon, isSelected && styles.roleIconSelected]}>
                  <Ionicons
                    name={role.icon}
                    size={26}
                    color={isSelected ? COLORS.onPrimary : COLORS.primary}
                  />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </View>

              <Text style={styles.roleDescription}>{role.description}</Text>

              <View style={styles.tagRow}>
                {role.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <GradientButton
          title="Continue"
          onPress={handleContinue}
          loading={isSubmitting}
          disabled={!selectedRole || isSubmitting}
          size="lg"
          shape="pill"
          iconPosition="right"
          icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
          style={styles.cta}
        />
      </AuthScreen>
    </>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    skipButton: {
      minHeight: 40,
      paddingHorizontal: SPACING.gutter,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.full,
    },
    skipText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.primary,
    },
    roleCard: {
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
      gap: SPACING.sm,
    },
    roleCardSelected: {
      borderColor: COLORS.primary,
      borderWidth: BORDER.emphasis,
      backgroundColor: COLORS.authGutter,
    },
    roleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
    },
    roleIcon: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authGutter,
    },
    roleIconSelected: {
      backgroundColor: COLORS.primary,
    },
    roleInfo: {
      flex: 1,
    },
    roleTitle: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
    },
    roleSubtitle: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.primary,
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.emphasis,
      borderColor: COLORS.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterSelected: {
      borderColor: COLORS.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },
    roleDescription: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    tag: {
      paddingHorizontal: SPACING.gutter,
      paddingVertical: SPACING.xs + 2,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceContainer,
    },
    tagText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    cta: {
      marginTop: SPACING.md,
    },
  });
