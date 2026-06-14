// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// Light mode surface (#f8f9fa) background
// PRIMARY: Phone OTP (most popular in Uganda)
// SECONDARY: Google Sign-In, Apple Sign-In
// FALLBACK: Email/Password
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, getAccessToken, getUserData, loginWithGoogle } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../src/constants';
import { IconInput } from '../../src/components/IconInput';
import { GradientButton } from '../../src/components/GradientButton';
import SmartRideLogoImage from '../../assets/images/smartride-logo.png';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Phone input state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Email/password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Google Sign-In state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth } = useAuthStore.getState();
    if (authenticated || storeAuth) {
      router.replace('/(tabs)');
    }
  };

  // ─── Phone Continue ────────────────────────────
  const handlePhoneContinue = () => {
    router.push('/auth/phone-login');
  };

  // ─── Google Sign-In ────────────────────────────
  const handleGoogleSignIn = async () => {
    // Guard: if native module not available, show error
    if (!GoogleSignin) {
      setError('Google Sign-In is not available on this build. Please use phone or email login.');
      return;
    }

    try {
      setGoogleLoading(true);
      setError(null);

      // Configure Google Sign-In (safe to call multiple times)
      configureGoogleSignIn();

      // Check if Play Services are available
      const hasPlay = await GoogleSignin.hasPlayServices();
      if (!hasPlay) {
        setError('Google Play Services is required. Please update your device.');
        return;
      }

      // Sign in
      const userInfo = await GoogleSignin.signIn();

      // Check for ID token
      if (userInfo.data?.idToken) {
        const result = await loginWithGoogle(userInfo.data.idToken);

        if (result.success) {
          // Sync with auth store
          const token = await getAccessToken();
          const userData = await getUserData();
          if (token && userData) {
            useAuthStore.getState().login({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              phone: userData.phone,
              role: userData.role,
            }, token);
          }
          router.replace('/(tabs)');
        } else {
          setError(result.error || 'Google Sign-In failed. Please try again.');
        }
      } else {
        setError('Google Sign-In did not return a valid token. Please try again.');
      }
    } catch (err: any) {
      console.error('[LOGIN] Google Sign-In error:', err);

      // Handle specific error codes
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — silently ignore
        return;
      }

      if (err.code === statusCodes.DEVELOPER_ERROR) {
        setError(
          'Google Sign-In is not configured for this device. ' +
          'Please ensure Google Play Services is up to date, or try another login method.'
        );
        return;
      }

      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services is not available on this device. Please use phone or email login.');
        return;
      }

      if (err.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress — just wait
        return;
      }

      // Generic error
      setError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Apple Sign-In (placeholder) ───────────────
  const handleAppleSignIn = () => {
    Alert.alert('Coming Soon', 'Apple Sign-In will be available in a future update.');
  };

  // ─── Email/Password Login ──────────────────────
  const handleEmailLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setEmailLoading(true);
    setError(null);

    try {
      const result = await loginWithEmail({
        email: email.trim().toLowerCase(),
        password,
        deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      if (result.success) {
        const token = await getAccessToken();
        const userData = await getUserData();
        if (token && userData) {
          useAuthStore.getState().login({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            role: userData.role,
          }, token);
        }
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Top App Bar ───────────────────────── */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            <View style={styles.stepDotActive} />
            <View style={styles.stepLine} />
            <View style={styles.stepDotInactive} />
          </View>
          <Text style={styles.stepText}>Step 1 of 2</Text>
        </View>

        {/* ─── Logo Section ──────────────────────── */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={SmartRideLogoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Smart Ride</Text>
          <Text style={styles.welcomeSubtitle}>
            Your reliable ride, delivery & more — across Uganda
          </Text>
        </View>

        {/* ─── Phone Input Section ───────────────── */}
        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Mobile Number</Text>
          <View style={[
            styles.phoneInputContainer,
            phoneFocused && styles.phoneInputFocused,
          ]}>
            {/* Uganda Flag + Country Code */}
            <View style={styles.countryCodeSection}>
              <Text style={styles.flagEmoji}>🇺🇬</Text>
              <Text style={styles.countryCodeText}>+256</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.outline} />
            </View>
            {/* Divider */}
            <View style={styles.countryDivider} />
            {/* Phone Input */}
            <TextInput
              style={styles.phoneInput}
              placeholder="7XX XXX XXX"
              placeholderTextColor={COLORS.outlineVariant}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              maxFontSizeMultiplier={1}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              returnKeyType="go"
              onSubmitEditing={handlePhoneContinue}
            />
          </View>
          <Text style={styles.phoneHelper}>
            We'll send you a verification code via SMS
          </Text>
        </View>

        {/* ─── Primary Continue Button ───────────── */}
        <View style={styles.continueButtonContainer}>
          <GradientButton
            title="Continue"
            onPress={handlePhoneContinue}
            variant="primary"
            size="lg"
            icon={
              <Ionicons name="arrow-forward" size={20} color={COLORS.onPrimary} />
            }
          />
        </View>

        {/* ─── Divider ───────────────────────────── */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ─── Social Login Buttons ──────────────── */}
        <View style={styles.socialGrid}>
          {/* Google */}
          <TouchableOpacity
            style={[styles.socialButton, googleLoading && styles.socialButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.7}
          >
            {googleLoading ? (
              <Text style={styles.socialButtonLoadingText}>…</Text>
            ) : (
              <>
                <Text style={styles.googleIconText}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleSignIn}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.onSurface} />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Email / Password Fallback ─────────── */}
        <View style={styles.emailSection}>
          <View style={styles.emailDividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.emailDividerText}>EMAIL LOGIN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <IconInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!emailLoading}
            returnKeyType="next"
          />

          {/* Password Input */}
          <IconInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            icon="lock-closed-outline"
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            autoCapitalize="none"
            editable={!emailLoading}
            returnKeyType="go"
            onSubmitEditing={handleEmailLogin}
          />

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/auth/forgot-password')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Email Sign In Button */}
          <GradientButton
            title="Sign In with Email"
            onPress={handleEmailLogin}
            variant="secondary"
            loading={emailLoading}
            size="lg"
            icon={
              !emailLoading ? (
                <Ionicons name="mail" size={20} color={COLORS.onSurface} />
              ) : undefined
            }
          />
        </View>

        {/* ─── Sign Up Link ──────────────────────── */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            disabled={emailLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Footer Policy ─────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface, // #f8f9fa — Stitch light mode
  },

  scrollContent: {
    flexGrow: 1,
  },

  // ─── Top App Bar ────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
    gap: 0,
  },
  stepDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  stepDotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.outlineVariant,
  },
  stepText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginLeft: SPACING.sm,
  },

  // ─── Logo Section ───────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.lg, // rounded-xl = 16
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.headlineLgMobile, // 22px bold
    color: COLORS.onSurface,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Phone Input Section ────────────────────────
  phoneSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  phoneLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow, // #f3f4f5
    borderRadius: RADIUS.lg, // rounded-xl
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    height: 56,
  },
  phoneInputFocused: {
    borderColor: COLORS.primary,
    // ring-1 ring-primary in RN = borderWidth approach
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  countryCodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 20,
  },
  countryCodeText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  countryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.outlineVariant,
    marginRight: SPACING.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.bodyLg.fontSize, // bodyLg font
    color: COLORS.onSurface,
    paddingRight: SPACING.md,
    paddingVertical: 0,
    height: 56,
  },
  phoneHelper: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outlineVariant,
    marginTop: SPACING.xs,
  },

  // ─── Continue Button ────────────────────────────
  continueButtonContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },

  // ─── Divider ────────────────────────────────────
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  dividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginHorizontal: SPACING.md,
    letterSpacing: 0.5,
  },

  // ─── Social Login Buttons ───────────────────────
  socialGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 56, // h-14
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, // rounded-xl
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  googleIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  socialButtonText: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  socialButtonLoadingText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Email Section ──────────────────────────────
  emailSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  emailDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emailDividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginHorizontal: SPACING.md,
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: COLORS.errorContainer,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorText: {
    color: COLORS.onErrorContainer,
    ...TYPOGRAPHY.bodySm,
    flex: 1,
    lineHeight: 20,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: '600',
    ...TYPOGRAPHY.bodySm,
  },

  // ─── Sign Up ────────────────────────────────────
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  signUpText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  signUpLink: {
    color: COLORS.primary,
    fontWeight: '600',
    ...TYPOGRAPHY.bodySm,
  },

  // ─── Footer Policy ──────────────────────────────
  footer: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
