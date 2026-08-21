// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Built on the shared auth design language (src/components/auth): brand
// lockup and two-tone headline, then the icon-gutter field cards, pill CTA,
// and the OR row.
//
// No hero plate here, deliberately. The reference design is the SIGN-UP
// screen, where the reader is already committed to scrolling a five-field
// form. Login has two fields, and adding a 168pt illustration on top of the
// lockup and headline pushes the Login button below the fold on a 360x800
// handset. Returning users should not have to scroll to sign in.
//
// The mockup's "Continue with Apple" slot is intentionally the existing
// phone/OTP method instead of Apple.
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, getAccessToken, getUserData, loginWithGoogle } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { SPACING, TYPOGRAPHY, RADIUS, BORDER, ICON } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { makeThemedColors, ThemedColors, withAlpha } from '../../src/theme/themedColors';
import { navigateToRoleHome } from '../../src/utils/roleRouting';
import { GradientButton } from '../../src/components/GradientButton';
import {
  AuthScreen,
  FieldCard,
  AuthDivider,
  SocialButtons,
} from '../../src/components/auth';

// An "Email or Phone Number" entry that is all digits (optionally +/spaces,
// at least 7 long, no @) is treated as a phone and routed to the OTP flow.
function looksLikePhone(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes('@')) return false;
  return /^[+]?[0-9][0-9\s-]{6,}$/.test(v);
}

export default function LoginScreen() {
  const router = useRouter();
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

  // Phone / OTP
  const handlePhoneContinue = useCallback(() => {
    router.push('/auth/phone-login');
  }, [router]);

  // Email/Password Login
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

  // Primary Login (email/password, or route phone to OTP)
  const handleLogin = () => {
    if (looksLikePhone(identifier)) {
      handlePhoneContinue();
      return;
    }
    handleEmailLogin();
  };

  // Google Sign-In
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
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <AuthScreen
        onBack={() => router.back()}
        lead="Welcome"
        accent="back"
        subtitle="Sign in to keep moving with Smart Ride."
      >
        {/* Error banner is always mounted so revealing it never re-lays-out a
            field the user is typing in. */}
        <View style={[styles.errorBanner, !error && styles.hidden]}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error || ''}</Text>
        </View>

        <FieldCard
          label="Email or Phone Number"
          icon="person-outline"
          placeholder="Enter your email or phone"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          editable={!busy}
          returnKeyType="next"
          maxFontSizeMultiplier={1.3}
        />

        <FieldCard
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          maxFontSizeMultiplier={1.3}
          trailing={
            <TouchableOpacity
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={ICON.md}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          }
        />

        <TouchableOpacity
          onPress={() => router.push('/auth/forgot-password')}
          activeOpacity={0.7}
          style={styles.forgotRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <GradientButton
          title="Login"
          onPress={handleLogin}
          loading={emailLoading}
          disabled={busy}
          size="lg"
          shape="pill"
          iconPosition="right"
          icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
          style={styles.cta}
        />

        <AuthDivider style={styles.divider} />

        <SocialButtons
          onGoogle={handleGoogleSignIn}
          googleLoading={googleLoading}
          onPhone={handlePhoneContinue}
          disabled={busy}
        />

        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            disabled={busy}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          {new Date().getFullYear()} Smart Ride Technologies.{' '}
          <Text
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}
          >
            Secure Transaction.
          </Text>
        </Text>
      </AuthScreen>
    </>
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
    forgotRow: {
      alignSelf: 'flex-end',
      paddingVertical: SPACING.xs,
    },
    forgotText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.primary,
    },
    cta: {
      marginTop: SPACING.sm,
    },
    divider: {
      marginVertical: SPACING.sm,
    },
    signUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
    },
    signUpText: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurfaceVariant,
    },
    signUpLink: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.primary,
      fontWeight: '700',
    },
    footerText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: SPACING.lg,
    },
    footerLink: {
      color: COLORS.primary,
      fontWeight: '600',
    },
  });
