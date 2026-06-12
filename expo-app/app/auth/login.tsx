// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Premium futuristic design matching admin page
// Glassmorphism + animated background + neon accents
// Email/Password PRIMARY (gradient CTA), Google SECONDARY
// Uses shared design-system components & constants
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, saveTokens, saveUserData, getAccessToken, getUserData, loginWithGoogle } from '@/src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, DESIGN_SYSTEM_COLORS, TYPOGRAPHY, SPACING_SCALE, RADIUS_SCALE } from '../../src/constants';
import { GlassCard, GradientButton, GlowHeader, IconInput } from '../../src/components';

const { height } = Dimensions.get('window');

const GOOGLE_BLUE = '#4285F4';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Logo floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Check if already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth } = useAuthStore.getState();
    if (authenticated || storeAuth) {
      router.replace('/(tabs)');
    }
  };

  // SECONDARY: Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Ensure Google Sign-In is configured
      configureGoogleSignIn();
      
      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      
      // Perform the sign-in
      const userInfo = await GoogleSignin.signIn();
      
      // Validate we got the ID token
      if (!userInfo.data?.idToken) {
        setError('Failed to get Google ID token. Please try again.');
        console.error('[GoogleSignIn] No idToken in response:', userInfo);
        return;
      }

      // Use the auth service function for consistency
      const response = await loginWithGoogle(userInfo.data.idToken);

      if (response.success) {
        // Sync with auth store for screens that use useAuthStore
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
        setError(response.error || response.message || 'Google login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[GoogleSignIn] Error:', err);
      
      // Handle specific error codes
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - don't show error
        console.log('[GoogleSignIn] User cancelled sign-in');
      } else if (err.message?.includes('DEVELOPER_ERROR') || err.code === 'DEVELOPER_ERROR') {
        setError('Google Sign-In configuration error. Please use email login or contact support.');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress. Please wait.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available. Please update Google Play Services and try again.');
      } else if (err.message?.includes('Network error') || err.message?.includes('timeout')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Google Sign-In failed. Please try email login instead.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // PRIMARY: Email/Password Login
  const handleEmailLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithEmail({
        email: email.trim().toLowerCase(),
        password,
        deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      if (result.success) {
        // Sync with auth store for screens that use useAuthStore
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
      setIsLoading(false);
    }
  };

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Animated Background */}
      <View style={styles.backgroundGradient}>
        {/* Ambient gradient circles */}
        <View style={styles.ambientGreen} />
        <View style={styles.ambientCyan} />
        <View style={styles.ambientPurple} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with GlowHeader */}
        <Animated.View 
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <GlowHeader 
            title="Welcome Back"
            subtitle="Sign in to continue to Smart Ride"
          >
            {/* Floating Logo as children */}
            <Animated.View style={{ alignItems: 'center', marginTop: 16, transform: [{ translateY: logoFloat }] }}>
              <View style={styles.logoContainer}>
                <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
                <Text style={styles.logoText}>SR</Text>
              </View>
            </Animated.View>
          </GlowHeader>
        </Animated.View>

        {/* Form Card */}
        <Animated.View 
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <GlassCard variant="elevated" padding={24} borderRadius={24} style={styles.formCard}>
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
              editable={!isLoading && !googleLoading}
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
              editable={!isLoading && !googleLoading}
            />

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => router.push('/auth/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* PRIMARY: Email Sign In Button */}
            <GradientButton
              title="Sign In"
              onPress={handleEmailLogin}
              variant="primary"
              loading={isLoading}
              disabled={googleLoading}
              size="lg"
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* SECONDARY: Google Sign-In Button */}
            <GradientButton
              title="Continue with Google"
              onPress={handleGoogleSignIn}
              variant="secondary"
              loading={googleLoading}
              disabled={isLoading}
              icon={
                !googleLoading ? (
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                ) : undefined
              }
            />
          </GlassCard>
        </Animated.View>

        {/* Sign Up Link */}
        <Animated.View 
          style={[
            styles.signUpContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/register')}
            disabled={isLoading || googleLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Security Notice */}
        <Animated.View style={[styles.securityNotice, { opacity: fadeAnim }]}>
          <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.textDim} />
          <Text style={styles.securityText}>Secure login  •  All data encrypted</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_SYSTEM_COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: DESIGN_SYSTEM_COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: DESIGN_SYSTEM_COLORS.outlineVariant,
    borderRadius: RADIUS_SCALE.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 95, 58, 0.1)',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: DESIGN_SYSTEM_COLORS.primary,
    letterSpacing: -1,
  },
  formCard: {
    marginHorizontal: SPACING_SCALE.md,
    marginTop: SPACING_SCALE.md,
    borderWidth: 1,
    borderColor: DESIGN_SYSTEM_COLORS.outlineVariant,
    backgroundColor: DESIGN_SYSTEM_COLORS.surface,
  },
  errorContainer: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderColor: DESIGN_SYSTEM_COLORS.error,
    borderWidth: 1,
    borderRadius: RADIUS_SCALE.md,
    padding: SPACING_SCALE.md,
    marginBottom: SPACING_SCALE.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING_SCALE.sm,
  },
  errorText: {
    color: DESIGN_SYSTEM_COLORS.error,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: SPACING_SCALE.lg,
    marginTop: SPACING_SCALE.xs,
  },
  forgotText: {
    color: DESIGN_SYSTEM_COLORS.primary,
    fontWeight: '500',
    fontSize: 13,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING_SCALE.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DESIGN_SYSTEM_COLORS.outlineVariant,
  },
  dividerText: {
    color: DESIGN_SYSTEM_COLORS.outline,
    marginHorizontal: SPACING_SCALE.md,
    fontSize: 13,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: RADIUS_SCALE.md,
    backgroundColor: GOOGLE_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING_SCALE.lg,
  },
  signUpText: {
    color: DESIGN_SYSTEM_COLORS.onSurfaceVariant,
    fontSize: 14,
  },
  signUpLink: {
    color: DESIGN_SYSTEM_COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING_SCALE.xs,
    marginTop: SPACING_SCALE.md,
    marginBottom: SPACING_SCALE.xs,
  },
  securityText: {
    color: DESIGN_SYSTEM_COLORS.outline,
    fontSize: 11,
  },
  ambientGreen: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(14, 122, 77, 0.1)',
    top: -50,
    left: -50,
  },
  ambientCyan: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 150, 136, 0.08)',
    bottom: -30,
    right: -30,
  },
  ambientPurple: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(103, 58, 183, 0.06)',
    top: '50%',
    right: '10%',
  },
});
