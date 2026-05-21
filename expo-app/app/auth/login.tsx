// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Premium authentication with animated particles
// and glassmorphism UI matching admin dashboard
// Google Sign-In is the PRIMARY authentication method
// Email/password is secondary fallback
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
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { loginWithEmail, isAuthenticated, saveTokens, saveUserData } from '../../services/auth';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { GlassCard } from '../../components/GlassCard';
import { Icon } from '../../components/Icon';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',          // Neon Green - Smart Ride brand
  primaryDark: '#00CC6D',
  accent: '#00FFF3',           // Cyan - Secondary accent
  background: '#0D0D12',       // Dark background
  backgroundElevated: '#1A1A24',
  backgroundSurface: 'rgba(37, 37, 48, 0.8)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#FF4757',
  googleBlue: '#4285F4',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export default function LoginScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      // Logo breathing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(logoAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      router.replace('/(tabs)');
    }
  };

  // Check if already authenticated
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PRIMARY: Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      // Check if device has Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Sign in
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        // Send to backend for verification
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: userInfo.data.idToken }),
        });

        const result = await response.json();

        if (result.success) {
          // Save tokens and user data
          if (result.data?.accessToken) {
            await saveTokens(result.data.accessToken, result.data.refreshToken);
            if (result.data.user) {
              await saveUserData(result.data.user);
            }
          } else if (result.tokens?.accessToken) {
            await saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
            if (result.user) {
              await saveUserData(result.user);
            }
          }
          
          router.replace('/(tabs)');
        } else {
          setError(result.error || 'Google login failed. Please try again.');
        }
      } else {
        setError('Failed to get Google ID token. Please try again.');
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - don't show error
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available. Please install or update.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // SECONDARY: Email/Password Login
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

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: logoScale },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/images/smartride-logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>
              <Text style={styles.appNameLight}>Smart </Text>
              <Text style={styles.appNameAccent}>Ride</Text>
            </Text>
            <Text style={styles.tagline}>Your premium ride-hailing experience in Uganda</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View 
            style={[
              styles.cardWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <GlassCard>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size="sm" color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* PRIMARY: Google Sign-In Button */}
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading || googleLoading}
                activeOpacity={0.8}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleIcon}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign in with email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Icon name="mail" size="md" color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading && !googleLoading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Icon name="lock" size="md" color={COLORS.textMuted} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading && !googleLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size="md" color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Email Login Button */}
              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleEmailLogin}
                disabled={isLoading || googleLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Icon name="arrow-right" size="sm" color={COLORS.background} />
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/auth/register')}
                  disabled={isLoading || googleLoading}
                >
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <Text style={styles.footerText}>
                By signing in, you agree to our{' '}
                <Text style={styles.footerLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appNameLight: {
    color: COLORS.text,
  },
  appNameAccent: {
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.googleBlue,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 16,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 8,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signUpText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  signUpLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
  },
});
