// ============================================
// SMART RIDE MOBILE - CHANGE PASSWORD SCREEN
// ============================================
// Reached from the profile rather than from a sign-in, but it shares the auth
// visual family, so it shares the auth design language too.
//
// The password rules now come from src/utils/password.ts. This screen used to
// carry its own 4-level scale that excluded the match rule, while
// reset-password.tsx used a 5-level scale that included it - the same password
// read "Medium" here and "Good" there.
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';
import { useTheme } from '../../src/context/theme-context';
import { ThemedColors, makeThemedColors, withAlpha } from '../../src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '../../src/constants';
import { PASSWORD_REQUIREMENTS } from '../../src/utils/password';
import { GradientButton } from '../../src/components';
import { AuthScreen, FieldCard, PasswordStrength } from '../../src/components/auth';

export default function ChangePasswordScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, [router]);

  const clearError = useCallback(
    (setter: (v: string) => void) => (text: string) => {
      setter(text);
      setError((current) => (current ? null : current));
    },
    []
  );

  const handleCurrentChange = useMemo(() => clearError(setCurrentPassword), [clearError]);
  const handleNewChange = useMemo(() => clearError(setNewPassword), [clearError]);
  const handleConfirmChange = useMemo(() => clearError(setConfirmPassword), [clearError]);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password');
      return;
    }

    // Validate password requirements (the match rule is checked separately
    // below so it can carry its own message).
    const failedReq = PASSWORD_REQUIREMENTS.find((r) => !r.test(newPassword, confirmPassword));
    if (failedReq) {
      setError(`Password requirement not met: ${failedReq.label}`);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Check new password is different from current
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.changePassword(currentPassword, newPassword);

      if (result.success) {
        setSuccess(true);
        // Redirect back after 3 seconds
        setTimeout(goBack, 3000);
      } else {
        setError(result.error || 'Failed to change password. Please try again.');
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const makeToggle = (visible: boolean, onToggle: () => void) => (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
    >
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={ICON.md} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const currentToggle = useMemo(
    () => makeToggle(showCurrent, () => setShowCurrent((s) => !s)),
    [showCurrent, COLORS.textMuted]
  );
  const newToggle = useMemo(
    () => makeToggle(showNew, () => setShowNew((s) => !s)),
    [showNew, COLORS.textMuted]
  );
  const confirmToggle = useMemo(
    () => makeToggle(showConfirm, () => setShowConfirm((s) => !s)),
    [showConfirm, COLORS.textMuted]
  );

  const strengthFooter = useMemo(
    () => <PasswordStrength password={newPassword} confirm={confirmPassword} />,
    [newPassword, confirmPassword]
  );

  if (success) {
    return (
      <AuthScreen
        lead="Password"
        accent="changed"
        subtitle="Your password has been changed successfully."
        showLockup={false}
      >
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
          </View>
          <Text style={styles.stateTitle}>All set</Text>
          <Text style={styles.stateBody}>Use your new password the next time you sign in.</Text>
        </View>

        <GradientButton
          title="Go Back"
          onPress={goBack}
          size="lg"
          shape="pill"
          style={styles.cta}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={goBack}
      lead="Change your"
      accent="password"
      subtitle="Confirm your current password, then pick a new one."
      showLockup={false}
    >
      {/* Always mounted so revealing an error never re-lays-out a live field. */}
      <View style={[styles.errorBanner, !error && styles.hidden]}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{error || ''}</Text>
      </View>

      <FieldCard
        label="Current Password"
        icon="lock-open-outline"
        placeholder="Enter your current password"
        value={currentPassword}
        onChangeText={handleCurrentChange}
        secureTextEntry={!showCurrent}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        editable={!isLoading}
        maxFontSizeMultiplier={1.3}
        trailing={currentToggle}
      />

      <FieldCard
        label="New Password"
        icon="lock-closed-outline"
        placeholder="Create a new password"
        value={newPassword}
        onChangeText={handleNewChange}
        secureTextEntry={!showNew}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!isLoading}
        maxFontSizeMultiplier={1.3}
        trailing={newToggle}
        footer={strengthFooter}
      />

      <FieldCard
        label="Confirm New Password"
        icon="lock-closed-outline"
        placeholder="Re-enter your new password"
        value={confirmPassword}
        onChangeText={handleConfirmChange}
        secureTextEntry={!showConfirm}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!isLoading}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        maxFontSizeMultiplier={1.3}
        trailing={confirmToggle}
      />

      <GradientButton
        title="Change Password"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading}
        size="lg"
        shape="pill"
        iconPosition="right"
        icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
        style={styles.cta}
      />

      <View style={styles.infoRow}>
        <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Pick something you have not used elsewhere. Your password is encrypted and never shared.
        </Text>
      </View>
    </AuthScreen>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.gutter,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: withAlpha(COLORS.error, 0.35),
      backgroundColor: withAlpha(COLORS.error, 0.08),
    },
    hidden: {
      display: 'none',
    },
    errorText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.error,
      flex: 1,
    },
    cta: {
      marginTop: SPACING.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xs,
      marginTop: SPACING.sm,
    },
    infoText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.textMuted,
      flex: 1,
    },
    stateCard: {
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.authHairline,
      backgroundColor: COLORS.authGutter,
    },
    stateIcon: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authCard,
    },
    stateTitle: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
    },
    stateBody: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      textAlign: 'center',
    },
  });
