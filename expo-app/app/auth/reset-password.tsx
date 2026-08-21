// ============================================
// SMART RIDE MOBILE - RESET PASSWORD SCREEN
// ============================================
// Validates the token from the deep link / URL query param, then sets a new
// password. Three render states: success, invalid token, and the form.
//
// The password rules used to be a local 5-entry array here and a different
// 4-entry array in change-password.tsx, so the same password could read
// "Strong" on one screen and "Medium" on the other. Both now read from
// src/utils/password.ts, which mirrors the server's validatePasswordStrength.
//
// The duplicated `animationDone ? <View> : <Animated.View>` card branches are
// gone: AuthScreen animates the header only and never wraps the inputs.
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '@/src/services/auth';
import { useTheme } from '../../src/context/theme-context';
import { ThemedColors, makeThemedColors, withAlpha } from '../../src/theme/themedColors';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '../../src/constants';
import { requirementsFor } from '../../src/utils/password';
import { GradientButton } from '../../src/components';
import { AuthScreen, FieldCard, PasswordStrength } from '../../src/components/auth';

export default function ResetPasswordScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Validate token on mount
    if (!token) {
      setTokenValid(false);
      setError('No reset token found. Please request a new password reset link.');
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handlePasswordChange = useCallback((text: string) => {
    setNewPassword(text);
    setError((current) => (current ? null : current));
  }, []);

  const handleConfirmChange = useCallback((text: string) => {
    setConfirmPassword(text);
    setError((current) => (current ? null : current));
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (!confirmPassword) {
      setError('Please confirm your new password');
      return;
    }

    // Validate password requirements
    const failedReq = requirementsFor(true).find((r) => !r.test(newPassword, confirmPassword));
    if (failedReq) {
      if (failedReq.key === 'match') {
        setError('Passwords do not match');
      } else {
        setError(`Password requirement not met: ${failedReq.label}`);
      }
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(token!, newPassword);

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.replace('/auth/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordToggle = useMemo(
    () => (
      <TouchableOpacity
        onPress={() => setShowPassword((s) => !s)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={ICON.md} color={COLORS.textMuted} />
      </TouchableOpacity>
    ),
    [showPassword, COLORS.textMuted]
  );

  const confirmToggle = useMemo(
    () => (
      <TouchableOpacity
        onPress={() => setShowConfirm((s) => !s)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={ICON.md} color={COLORS.textMuted} />
      </TouchableOpacity>
    ),
    [showConfirm, COLORS.textMuted]
  );

  const strengthFooter = useMemo(
    () => <PasswordStrength password={newPassword} confirm={confirmPassword} />,
    [newPassword, confirmPassword]
  );

  // Success state
  if (success) {
    return (
      <AuthScreen lead="Password" accent="reset" subtitle="Your password has been reset successfully. Redirecting to login.">
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
          </View>
          <Text style={styles.stateTitle}>All set</Text>
          <Text style={styles.stateBody}>You can now sign in with your new password.</Text>
        </View>

        <GradientButton
          title="Go to Login"
          onPress={() => router.replace('/auth/login')}
          size="lg"
          shape="pill"
          style={styles.cta}
        />
      </AuthScreen>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <AuthScreen
        onBack={() => router.back()}
        lead="Invalid"
        accent="link"
        subtitle={error || 'This reset link is no longer valid.'}
      >
        <View style={styles.stateCard}>
          <View style={[styles.stateIcon, styles.stateIconError]}>
            <Ionicons name="close-circle" size={36} color={COLORS.error} />
          </View>
          <Text style={styles.stateTitle}>Link expired or already used</Text>
          <Text style={styles.stateBody}>Request a fresh reset link and try again.</Text>
        </View>

        <GradientButton
          title="Request New Link"
          onPress={() => router.replace('/auth/forgot-password')}
          size="lg"
          shape="pill"
          iconPosition="right"
          icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
          style={styles.cta}
        />
      </AuthScreen>
    );
  }

  // Form state
  return (
    <AuthScreen
      onBack={() => router.back()}
      lead="Set a new"
      accent="password"
      subtitle="Create a strong password for your Smart Ride account."
    >
      {/* Always mounted so revealing an error never re-lays-out a live field. */}
      <View style={[styles.errorBanner, !error && styles.hidden]}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{error || ''}</Text>
      </View>

      <FieldCard
        label="New Password"
        icon="lock-closed-outline"
        placeholder="Create a password"
        value={newPassword}
        onChangeText={handlePasswordChange}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!isLoading}
        maxFontSizeMultiplier={1.3}
        trailing={passwordToggle}
        footer={strengthFooter}
      />

      <FieldCard
        label="Confirm Password"
        icon="lock-closed-outline"
        placeholder="Re-enter your password"
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
        title="Reset Password"
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
          Your password is encrypted and never shared.
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
    stateIconError: {
      backgroundColor: withAlpha(COLORS.error, 0.1),
    },
    stateTitle: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
      textAlign: 'center',
    },
    stateBody: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      textAlign: 'center',
    },
  });
