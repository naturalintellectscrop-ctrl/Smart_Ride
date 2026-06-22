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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { isAppleSignInAvailable, signInWithApple } from '../../src/config/apple';
import { loginWithEmail, isAuthenticated, getAccessToken, getUserData, loginWithGoogle, loginWithApple } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../src/constants';
import { IconInput } from '../../src/components/IconInput';
import { GradientButton } from '../../src/components/GradientButton';
import SmartRideLogoImage from '../../assets/images/smartride-logo.png';
import { navigateToRoleHome } from '../../src/utils/roleRouting';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Phone input state
  const [phoneNumber, setPhoneNumber] = useState('');
  // NOTE: phoneFocused removed — useState for focus tracking causes cursor
  // jumping on Android because every setPhoneFocused triggers a re-render

  // Email/password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Google Sign-In state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Apple Sign-In state
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    configureGoogleSignIn();
    checkAppleAvailability();
    checkAuth();
  }, []);

  const checkAppleAvailability = async () => {
    const available = await isAppleSignInAvailable();
    setAppleAvailable(available);
  };

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth, user } = useAuthStore.getState();
    if (authenticated || storeAuth) {
      // Route based on user role — guard against null user
      if (!user) {
        return;
      }
      navigateToRoleHome(user.role);
    }
  };

  // Used after a MANUAL login (Google/Apple/email). ALWAYS show the
  // role-selection screen so the user can choose or change what kind of
  // user they are. The screen pre-selects their current role and has a
  // Skip button, so returning users can proceed quickly.
  const goToRoleSelection = () => {
    router.replace('/auth/role-selection' as any);
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

      console.log('[LOGIN] GoogleSignin: Checking Play Services...');
      // Check if Play Services are available
      const hasPlay = await GoogleSignin.hasPlayServices();
      console.log('[LOGIN] GoogleSignin: hasPlayServices =', hasPlay);
      if (!hasPlay) {
        setError('Google Play Services is required. Please update your device.');
        return;
      }

      console.log('[LOGIN] GoogleSignin: Calling signIn()...');
      // Sign in
      const userInfo = await GoogleSignin.signIn();
      console.log('[LOGIN] GoogleSignin: signIn() returned:', JSON.stringify({
        type: userInfo.type,
        hasData: !!userInfo.data,
        hasIdToken: !!userInfo.data?.idToken,
        user: userInfo.data?.user ? {
          email: userInfo.data.user.email,
          name: userInfo.data.user.name,
          id: userInfo.data.user.id,
        } : null,
      }));

      // Check for ID token
      if (userInfo.data?.idToken) {
        console.log('[LOGIN] GoogleSignin: Got idToken, sending to backend...');
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
          // Always show role-selection after manual Google login
          goToRoleSelection();
        } else {
          setError(result.error || 'Google Sign-In failed. Please try again.');
        }
      } else {
        console.warn('[LOGIN] GoogleSignin: No idToken in response. Full response:', JSON.stringify(userInfo));
        setError('Google Sign-In did not return a valid token. Please try again.');
      }
    } catch (err: any) {
      console.error('[LOGIN] Google Sign-In error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
        name: err.name,
        nativeErrorMessage: err.nativeErrorMessage,
        // Dump all enumerable keys for full diagnostics
        allKeys: Object.keys(err),
        stringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });

      // Normalize error code + message for robust matching.
      // statusCodes may be an empty object if the native module require failed,
      // so we ALSO match against the well-known string constants and the
      // human-readable message text as a fallback.
      const errCode = (err?.code ?? '') + '';
      const errMsg = (err?.message ?? '') + '';
      const isCancelled =
        errCode === statusCodes.SIGN_IN_CANCELLED ||
        errCode === 'SIGN_IN_CANCELLED' ||
        errMsg.includes('SIGN_IN_CANCELLED');
      const isDeveloperError =
        errCode === statusCodes.DEVELOPER_ERROR ||
        errCode === 'DEVELOPER_ERROR' ||
        errMsg.includes('DEVELOPER_ERROR');
      const isPlayServicesMissing =
        errCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE ||
        errCode === 'PLAY_SERVICES_NOT_AVAILABLE' ||
        errMsg.includes('PLAY_SERVICES_NOT_AVAILABLE');
      const isInProgress =
        errCode === statusCodes.IN_PROGRESS ||
        errCode === 'IN_PROGRESS';

      if (isCancelled) {
        // User cancelled — silently ignore
        console.log('[LOGIN] GoogleSignin: User cancelled sign-in');
        return;
      }

      if (isDeveloperError) {
        console.error('[LOGIN] DEVELOPER_ERROR: The APK signing certificate does not match any ' +
          'OAuth client in google-services.json, OR the google-services.json bundled in the APK ' +
          'is stale. Fix: git pull → npx expo prebuild --clean → ./gradlew assembleRelease → reinstall.', {
          code: errCode, message: errMsg,
        });
        setError(
          'Google Sign-In needs to be reconfigured for this build. ' +
          'Please rebuild the APK with the latest google-services.json, or use email/phone login for now.'
        );
        return;
      }

      if (isPlayServicesMissing) {
        setError('Google Play Services is not available on this device. Please use phone or email login.');
        return;
      }

      if (isInProgress) {
        // Sign-in already in progress — just wait
        return;
      }

      // Generic error — strip the noisy "Follow troubleshooting instructions..." suffix
      const cleanMsg = errMsg.split(': Follow troubleshooting')[0] || 'Google Sign-In failed. Please try again.';
      setError(cleanMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Apple Sign-In ──────────────────────────────
  const handleAppleSignIn = async () => {
    if (!appleAvailable) {
      setError('Apple Sign-In is only available on iOS devices. Please use Google or email login.');
      return;
    }

    try {
      setAppleLoading(true);
      setError(null);

      const appleCredential = await signInWithApple();

      if (!appleCredential) {
        // User cancelled
        return;
      }

      if (!appleCredential.identityToken) {
        setError('Apple Sign-In did not return a valid token. Please try again.');
        return;
      }

      console.log('[LOGIN] Apple: Got identityToken, sending to backend...');
      const appleFullName = appleCredential.fullName
        ? {
            givenName: appleCredential.fullName.givenName ?? undefined,
            familyName: appleCredential.fullName.familyName ?? undefined,
          }
        : null;
      const result = await loginWithApple(
        appleCredential.identityToken,
        appleFullName
      );

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
        // Always show role-selection after manual Apple login
        goToRoleSelection();
      } else {
        setError(result.error || 'Apple Sign-In failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[LOGIN] Apple Sign-In error:', err);
      setError(err.message || 'Apple Sign-In failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
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
        // Always show role-selection after manual email login
        goToRoleSelection();
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <View style={styles.phoneInputContainer}>
            {/* Uganda Flag + Country Code */}
            <View style={styles.countryCodeSection}>
              <Text style={styles.flagEmoji}>UG</Text>
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

        {/* ─── Social Login — Hovering Circular Icon Cards ─────────── */}
        <View style={styles.socialRow}>
          {/* Google — circular hovering card */}
          <TouchableOpacity
            style={[styles.socialCircle, googleLoading && styles.socialCircleDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
          >
            {googleLoading ? (
              <Ionicons name="refresh" size={26} color={COLORS.googleBlue} />
            ) : (
              <Ionicons name="logo-google" size={28} color={COLORS.googleBlue} />
            )}
          </TouchableOpacity>

          {/* Phone — circular hovering card (always available) */}
          <TouchableOpacity
            style={styles.socialCircle}
            onPress={handlePhoneContinue}
            disabled={googleLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in with phone number"
          >
            <Ionicons name="call" size={26} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Apple — circular hovering card, only shown on iOS */}
          {appleAvailable && (
            <TouchableOpacity
              style={[styles.socialCircle, styles.socialCircleApple, appleLoading && styles.socialCircleDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Apple"
            >
              {appleLoading ? (
                <Ionicons name="refresh" size={26} color={COLORS.onPrimary} />
              ) : (
                <Ionicons name="logo-apple" size={28} color={COLORS.onPrimary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Email / Password Fallback ─────────── */}
        <View style={styles.emailSection}>
          <View style={styles.emailDividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.emailDividerText}>EMAIL LOGIN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Banner — always rendered to prevent layout shift (cursor jump) */}
          <View style={[styles.errorContainer, !error && styles.errorHidden]}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error || ''}</Text>
          </View>

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
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.footerLink}
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

  // ─── Social Login — Hovering Circular Icon Cards ───
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  // Base circular card — white surface with strong elevation shadow to "hover"
  socialCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    // Strong drop shadow -> makes the icon card visibly "hover" above the surface
    ...SHADOWS.active,
    // iOS shadow props (explicit, for older RN versions)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  // Apple variant — dark card, white icon (premium contrast)
  socialCircleApple: {
    backgroundColor: COLORS.onSurface, // near-black
    borderColor: COLORS.onSurface,
  },
  socialCircleDisabled: {
    opacity: 0.5,
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
  // Hidden error state — preserves layout height to prevent cursor jump
  errorHidden: {
    opacity: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderWidth: 0,
    height: 0,
    overflow: 'hidden',
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  forgotText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600' as const,
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
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600' as const,
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
