// ============================================
// SMART RIDE MOBILE - PHONE LOGIN SCREEN
// ============================================
// Step 1 of the phone flow: Phone Input -> Send OTP -> Verify OTP -> Login.
// Built on the shared auth design language (src/components/auth).
//
// The phone normalisation and validation helpers used to live in this file.
// They now live in src/utils/phone.ts so register, the rider wizard and
// merchant registration validate a number the same way this screen does.
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { navigateToRoleHome } from '@/src/utils/roleRouting';
import { validateUgandanPhone, normalizePhone } from '@/src/utils/phone';
import { GradientButton } from '@/src/components/GradientButton';
import { AuthScreen, PhoneFieldCard, AuthDivider } from '@/src/components/auth';

const STEP_LABELS = ['Number', 'Verify'];

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ purpose?: string }>();
  const { isAuthenticated } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Purpose: 'login' | 'register'
  const purpose = (params.purpose as 'login' | 'register') || 'login';

  const isLogin = purpose === 'login';
  const subtitle = isLogin
    ? 'Enter your phone number and we will text you a verification code.'
    : 'Enter your phone number to create an account.';

  // Redirect if already authenticated (auto-login)
  useEffect(() => {
    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      navigateToRoleHome(user?.role);
    }
  }, [isAuthenticated, router]);

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSendOTP = async () => {
    setError(null);

    const validation = validateUgandanPhone(phone);
    if (!validation.valid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    setIsLoading(true);

    try {
      const response = await api.sendOTP(normalizedPhone, purpose);

      if (response.success) {
        Alert.alert('OTP Sent', 'Check your phone for the verification code');

        // Navigate to OTP verification screen
        router.push({
          pathname: '/auth/verify-otp',
          params: {
            phone: normalizedPhone,
            purpose: purpose,
            expiresIn: response.data?.expiresIn?.toString() || '300',
          },
        });
      } else {
        setError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = useCallback((text: string) => {
    setPhone(text);
    // Never validate mid-typing - just clear any stale error so the user can
    // finish entering their number in peace. Validation happens on blur/submit.
    setError((current) => (current ? null : current));
  }, []);

  // Validate when the field loses focus (only if the user actually typed
  // something) so they get friendly feedback without being interrupted while
  // typing. Matches the "validate on blur OR submit" rule.
  const handlePhoneBlur = useCallback(() => {
    if (phone.trim().length === 0) return;
    const validation = validateUgandanPhone(phone);
    setError(validation.valid ? null : validation.error || 'Invalid phone number');
  }, [phone]);

  return (
    <AuthScreen
      onBack={() => router.back()}
      step={{ current: 1, labels: STEP_LABELS }}
      lead={isLogin ? 'Sign in with' : 'Sign up with'}
      accent="your phone"
      subtitle={subtitle}
      showHero
    >
      <PhoneFieldCard
        value={phone}
        onChangeText={handlePhoneChange}
        onBlur={handlePhoneBlur}
        error={error}
        editable={!isLoading}
        inputRef={inputRef}
        returnKeyType="send"
        onSubmitEditing={handleSendOTP}
      />

      <View style={styles.helperRow}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.textMuted} />
        <Text style={styles.helperText}>
          We will send you a 6-digit verification code via SMS.
        </Text>
      </View>

      <GradientButton
        title="Send Verification Code"
        onPress={handleSendOTP}
        loading={isLoading}
        disabled={isLoading || !phone.trim()}
        size="lg"
        shape="pill"
        iconPosition="right"
        icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
        style={styles.cta}
      />

      <AuthDivider style={styles.divider} />

      <View style={styles.alternativeRow}>
        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
        >
          <Ionicons name="mail-outline" size={ICON.md} color={COLORS.primary} />
          <Text style={styles.alternativeText}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={() => router.push('/auth/register')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create an account"
        >
          <Ionicons name="person-add-outline" size={ICON.md} color={COLORS.primary} />
          <Text style={styles.alternativeText}>Register</Text>
        </TouchableOpacity>
      </View>
    </AuthScreen>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    helperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.xs,
    },
    helperText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.textMuted,
      flex: 1,
    },
    cta: {
      marginTop: SPACING.sm,
    },
    divider: {
      marginVertical: SPACING.sm,
    },
    alternativeRow: {
      flexDirection: 'row',
      gap: SPACING.gutter,
    },
    alternativeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      minHeight: 52,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
    },
    alternativeText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
  });
