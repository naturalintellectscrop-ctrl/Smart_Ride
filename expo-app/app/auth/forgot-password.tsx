// ============================================
// SMART RIDE MOBILE - FORGOT PASSWORD SCREEN
// ============================================
// Sends a reset link to the registered email address.
//
// This screen used to render its whole card twice, once inside a plain View
// and once inside an Animated.View, swapping between them via an
// `animationDone` flag. That existed only to stop the entrance transform from
// jittering the TextInput caret on Android. AuthScreen now animates the header
// chrome alone and leaves the form untouched, so both the duplicate JSX and
// the three off-brand ambient orbs are gone.
// ============================================

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { forgotPassword } from '@/src/services/auth';
import { useTheme } from '../../src/context/theme-context';
import { ThemedColors, makeThemedColors, withAlpha } from '../../src/theme/themedColors';
import { GradientButton } from '../../src/components';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '../../src/constants';
import { AuthScreen, FieldCard } from '../../src/components/auth';

export default function ForgotPasswordScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setError((current) => (current ? null : current));
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await forgotPassword(email.trim().toLowerCase());

      // API always returns success to prevent email enumeration,
      // but we still check for actual errors
      if (result.success) {
        setSuccess(true);
      } else {
        // Only show real errors, not enumeration-related ones
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthScreen
        onBack={() => router.back()}
        lead="Check your"
        accent="email"
        subtitle="If an account with that email exists, a reset link has been sent."
      >
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Reset link sent</Text>
          <Text style={styles.successHint}>
            Didn&apos;t receive the email? Check your spam folder.
          </Text>
        </View>

        <GradientButton
          title="Back to Login"
          onPress={() => router.replace('/auth/login')}
          variant="primary"
          size="lg"
          shape="pill"
          style={styles.cta}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={() => router.back()}
      lead="Reset your"
      accent="password"
      subtitle="We will send a password reset link to your registered email address."
    >
      {/* Always mounted so revealing an error never re-lays-out the field. */}
      <View style={[styles.errorBanner, !error && styles.hidden]}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{error || ''}</Text>
      </View>

      <FieldCard
        label="Email Address"
        icon="mail-outline"
        placeholder="Enter your email"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isLoading}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />

      <GradientButton
        title="Send Reset Link"
        onPress={handleSubmit}
        variant="primary"
        loading={isLoading}
        disabled={isLoading}
        size="lg"
        shape="pill"
        iconPosition="right"
        icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
        style={styles.cta}
      />

      <View style={styles.infoRow}>
        <Ionicons name="key-outline" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          The link is valid for a limited time. Request a new one if it expires.
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
    successCard: {
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.authHairline,
      backgroundColor: COLORS.authGutter,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authCard,
    },
    successTitle: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
    },
    successHint: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      textAlign: 'center',
    },
  });
