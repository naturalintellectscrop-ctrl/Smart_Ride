// ============================================
// SMART RIDE MOBILE - PHONE LOGIN SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// Light mode surface background, MD3 components
// Flow: Phone Input → Send OTP → Verify OTP → Login
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { navigateToRoleHome } from '@/src/utils/roleRouting';

// Uganda phone number validation
const UGANDAN_PHONE_REGEX = /^(\+256|0)(7\d|4\d)\d{7}$/;

function validateUgandanPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/[\s\-]/g, '');

  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' };
  }

  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number is too short' };
  }

  if (cleaned.length > 13) {
    return { valid: false, error: 'Phone number is too long' };
  }

  if (!UGANDAN_PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Ugandan phone number' };
  }

  return { valid: true };
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '+256' + normalized.substring(1);
  }
  if (normalized.startsWith('256') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
}

export default function PhoneLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ purpose?: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Purpose: 'login' | 'register'
  const purpose = (params.purpose as 'login' | 'register') || 'login';

  const isLogin = purpose === 'login';
  const title = isLogin ? 'Sign In' : 'Create Account';
  const subtitle = isLogin
    ? 'Enter your phone number to receive a verification code'
    : 'Enter your phone number to create an account';

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
        // Test mode: Show OTP in alert for testing (no SMS required)
        const otp = response.data?.otp;
        if (otp) {
          Alert.alert(
            'Test OTP',
            `Your verification code is: ${otp}`,
            [{ text: 'OK', onPress: () => {} }]
          );
        } else {
          Alert.alert('OTP Sent', 'Check your phone for the verification code');
        }

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

  const handlePhoneChange = (text: string) => {
    const filtered = text.replace(/[^\d\s\-\+]/g, '');
    setPhone(filtered);
    if (error) {
      setError(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + SPACING.lg, 40) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top App Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 1 of 2</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Phone Input Card */}
        <View style={styles.inputSection}>
          {/* Error Message — always rendered to prevent layout shift (cursor jump) */}
          <View style={[styles.errorContainer, !error && styles.errorHidden]}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error || ''}</Text>
          </View>

          {/* Phone Input Container */}
          <View
            style={[
              styles.phoneInputContainer,
              isFocused && styles.phoneInputContainerFocused,
              error && styles.phoneInputContainerError,
            ]}
          >
            {/* Country Code */}
            <View style={styles.countryCode}>
              <Text style={styles.flagEmoji}>UG</Text>
              <Text style={styles.countryCodeText}>+256</Text>
            </View>

            {/* Divider */}
            <View style={styles.countryDivider} />

            {/* Phone Input */}
            <TextInput
              ref={inputRef}
              style={styles.phoneInput}
              placeholder="700 000 000"
              placeholderTextColor={COLORS.outlineVariant}
              value={phone}
              onChangeText={handlePhoneChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={13}
              maxFontSizeMultiplier={1}
              editable={!isLoading}
            />
          </View>

          {/* Helper Text */}
          <Text style={styles.helperText}>
            We'll send you a 6-digit verification code via SMS
          </Text>

          {/* Send Verification Code Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!phone.trim() || isLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={isLoading || !phone.trim()}
            activeOpacity={0.8}
            accessibilityLabel="Send verification code"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Alternative Buttons */}
        <View style={styles.alternativeSection}>
          {/* Email Login Button */}
          <TouchableOpacity
            style={styles.alternativeButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.7}
            accessibilityLabel="Continue with email"
          >
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <Text style={styles.alternativeButtonText}>Email</Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.alternativeButton}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.7}
            accessibilityLabel="Create an account"
          >
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
            <Text style={styles.alternativeButtonText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://smartrideug.vercel.app/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  scrollContent: {
    flexGrow: 1,
  },

  // ── Top App Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },

  stepIndicator: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },

  stepText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },

  // ── Title Section ──
  titleSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  title: {
    ...TYPOGRAPHY.headlineLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },

  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
  },

  // ── Input Section ──
  inputSection: {
    paddingHorizontal: SPACING.lg,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorContainer,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  // Always-rendered error container — zeroed-out style applied when no error
  // so the container occupies no height, preventing layout shift on keystroke
  // (which would cause Android cursor jitter).
  errorHidden: {
    opacity: 0,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
    borderLeftWidth: 0,
    overflow: 'hidden',
  },

  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onErrorContainer,
    flex: 1,
  },

  // ── Phone Input Container ──
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  phoneInputContainerFocused: {
    borderColor: COLORS.primary,
    // borderWidth stays 1.5 — changing it causes layout shift → cursor jump
  },

  phoneInputContainerError: {
    borderColor: COLORS.error,
  },

  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },

  flagEmoji: {
    fontSize: 20,
  },

  countryCodeText: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '500',
  },

  countryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.outlineVariant,
    marginRight: SPACING.sm,
  },

  phoneInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 18,
    color: COLORS.onSurface,
    fontWeight: '400',
    letterSpacing: 0.5,
  },

  helperText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  // ── Primary Button ──
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },

  primaryButtonDisabled: {
    backgroundColor: COLORS.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },

  primaryButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },

  // ── Divider ──
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },

  dividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    letterSpacing: 1,
  },

  // ── Alternative Buttons ──
  alternativeSection: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },

  alternativeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: SPACING.sm,
  },

  alternativeButtonText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Terms ──
  termsSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },

  termsText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
  },

  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
