// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Premium card login (matches the Smart Ride design mockup):
//   Official logo → "Smart Ride" → "Email or Phone Number" + Password →
//   Login → Continue with Google → Continue with Phone (OTP) → Sign Up.
// The mockup's "Continue with Apple" slot is intentionally the existing
// phone/OTP method instead of Apple.
// Theme-aware via makeThemedColors (light/dark).
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, getAccessToken, getUserData, loginWithGoogle } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS, OPACITY, BORDER } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { makeThemedColors, ThemedColors } from '../../src/theme/themedColors';
import SmartRideLogoImage from '../../assets/images/smartride-logo.png';
import { navigateToRoleHome } from '../../src/utils/roleRouting';

// An "Email or Phone Number" entry that is all digits (optionally +/spaces,
// ≥7 long, no @) is treated as a phone → routed to the OTP flow on Login.
function looksLikePhone(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes('@')) return false;
  return /^[+]?[0-9][0-9\s-]{6,}$/.test(v);
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [identifier, setIdentifier] = useState(''); // email OR phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    configureGoogleSignIn();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth, user } = useAuthStore.getState();
    if ((authenticated || storeAuth) && user) {
      navigateToRoleHome(user.role);
    }
  };

  // After any manual login always show role-selection (pre-selected + skippable).
  const goToRoleSelection = () => {
    router.replace('/auth/role-selection' as any);
  };

  // ─── Phone / OTP ───────────────────────────────
  const handlePhoneContinue = () => {
    router.push('/auth/phone-login');
  };

  // ─── Primary Login (email/password, or route phone → OTP) ──
  const handleLogin = () => {
    if (looksLikePhone(identifier)) {
      handlePhoneContinue();
      return;
    }
    handleEmailLogin();
  };

  // ─── Email/Password Login ──────────────────────
  const handleEmailLogin = async () => {
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
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
        email: identifier.trim().toLowerCase(),
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

  // ─── Google Sign-In ────────────────────────────
  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      setError('Google Sign-In is not available on this build. Please use phone or email login.');
      return;
    }
    try {
      setGoogleLoading(true);
      setError(null);
      configureGoogleSignIn();

      const hasPlay = await GoogleSignin.hasPlayServices();
      if (!hasPlay) {
        setError('Google Play Services is required. Please update your device.');
        return;
      }
      try { await GoogleSignin.signOut(); } catch { /* no active session */ }

      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const result = await loginWithGoogle(userInfo.data.idToken);
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
          goToRoleSelection();
        } else {
          setError(result.error || 'Google Sign-In failed. Please try again.');
        }
      } else {
        setError('Google Sign-In did not return a valid token. Please try again.');
      }
    } catch (err: any) {
      const errCode = (err?.code ?? '') + '';
      const errMsg = (err?.message ?? '') + '';
      const isCancelled = errCode === statusCodes.SIGN_IN_CANCELLED || errCode === 'SIGN_IN_CANCELLED' || errMsg.includes('SIGN_IN_CANCELLED');
      const isDeveloperError = errCode === statusCodes.DEVELOPER_ERROR || errCode === 'DEVELOPER_ERROR' || errMsg.includes('DEVELOPER_ERROR');
      const isPlayServicesMissing = errCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE || errCode === 'PLAY_SERVICES_NOT_AVAILABLE' || errMsg.includes('PLAY_SERVICES_NOT_AVAILABLE');
      const isInProgress = errCode === statusCodes.IN_PROGRESS || errCode === 'IN_PROGRESS';
      if (isCancelled || isInProgress) return;
      if (isDeveloperError) {
        setError('Google Sign-In needs to be reconfigured for this build. Please use email/phone login for now.');
        return;
      }
      if (isPlayServicesMissing) {
        setError('Google Play Services is not available on this device. Please use phone or email login.');
        return;
      }
      setError(errMsg.split(': Follow troubleshooting')[0] || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = emailLoading || googleLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.surface} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        {/* ─── Card ─────────────────────────────── */}
        <View style={styles.card}>
          {/* Official logo + brand */}
          <View style={styles.logoBadge}>
            <Image source={SmartRideLogoImage} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>Smart Ride</Text>
          <Text style={styles.brandSubtitle}>Premium mobility for the modern urbanite</Text>

          {/* Error banner — always mounted to avoid layout shift */}
          <View style={[styles.errorBanner, !error && styles.hidden]}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error || ''}</Text>
          </View>

          {/* Email or Phone */}
          <Text style={styles.fieldLabel}>Email or Phone Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor={COLORS.outline}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
              returnKeyType="next"
              maxFontSizeMultiplier={1.3}
            />
          </View>

          {/* Password label + Forgot */}
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.outline}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              maxFontSizeMultiplier={1.3}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Login */}
          <TouchableOpacity style={[styles.loginButton, busy && styles.buttonDisabled]} onPress={handleLogin} disabled={busy} activeOpacity={0.85}>
            {emailLoading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with Google */}
          <TouchableOpacity style={[styles.socialButton, styles.googleButton]} onPress={handleGoogleSignIn} disabled={busy} activeOpacity={0.85}>
            {googleLoading ? (
              <ActivityIndicator color={COLORS.googleBlue} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={COLORS.googleBlue} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Continue with Phone (OTP) — replaces the mockup's Apple slot */}
          <TouchableOpacity style={[styles.socialButton, styles.phoneButton]} onPress={handlePhoneContinue} disabled={busy} activeOpacity={0.85}>
            <Ionicons name="call" size={19} color={COLORS.inverseOnSurface} />
            <Text style={styles.phoneButtonText}>Continue with Phone</Text>
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')} disabled={busy} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} Smart Ride Technologies.{' '}
          <Text style={styles.footerLink} onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}>Secure Transaction.</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.md },

  backButton: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xs,
  },

  // ─── Card ───────────────────────────────
  card: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg + 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },

  logoBadge: {
    alignSelf: 'center',
    width: 76, height: 76, borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  logoImage: { width: 62, height: 62, borderRadius: 14 },

  brandTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  brandSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
  },
  hidden: { height: 0, paddingVertical: 0, marginBottom: 0, opacity: 0, overflow: 'hidden' },

  fieldLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  forgotText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '600',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    paddingVertical: SPACING.sm,
  },

  loginButton: {
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.button,
  },
  loginButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },
  buttonDisabled: {
    opacity: OPACITY.disabled,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: BORDER.hairline,
    backgroundColor: COLORS.borderLight,
  },
  dividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
  },

  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.sm,
  },
  googleButton: {
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.border,
  },
  googleButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  phoneButton: {
    backgroundColor: COLORS.inverseSurface,
  },
  phoneButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.inverseOnSurface,
  },

  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  signUpText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  signUpLink: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '700',
    color: COLORS.primary,
  },

  footerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.lg,
    opacity: OPACITY.disabled,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
