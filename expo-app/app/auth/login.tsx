// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Premium futuristic design matching admin page
// Glassmorphism + animated background + neon accents
// Google Sign-In PRIMARY, Email/Password SECONDARY
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
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, saveTokens, saveUserData } from '../../services/auth';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',          // Neon Green - Smart Ride brand
  primaryDark: '#00CC6D',
  accent: '#00FFF3',           // Cyan - Secondary accent
  background: '#0D0D12',       // Dark background
  backgroundElevated: '#1A1A24',
  backgroundSurface: '#252530',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDim: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderGlow: 'rgba(0, 255, 136, 0.3)',
  error: '#F43F5E',
  googleBlue: '#4285F4',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

// Particle component for animated background
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

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
    if (authenticated) {
      router.replace('/(tabs)');
    }
  };

  // PRIMARY: Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      configureGoogleSignIn();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: userInfo.data.idToken }),
        });

        const result = await response.json();

        if (result.success) {
          if (result.data?.accessToken) {
            await saveTokens(result.data.accessToken, result.data.refreshToken);
            if (result.data.user) await saveUserData(result.data.user);
          } else if (result.tokens?.accessToken) {
            await saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
            if (result.user) await saveUserData(result.user);
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
      } else if (err.message?.includes('DEVELOPER_ERROR') || err.code === 'DEVELOPER_ERROR') {
        setError('Google Sign-In is not yet configured for this device. Please use email login instead.');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available. Please use email login instead.');
      } else {
        setError('Google Sign-In is unavailable. Please use email login instead.');
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

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Logo */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Floating Logo */}
          <Animated.View style={{ transform: [{ translateY: logoFloat }] }}>
            <View style={styles.logoContainer}>
              <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
              <Text style={styles.logoText}>SR</Text>
            </View>
          </Animated.View>

          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Text style={styles.headerSubtitle}>Sign in to continue to Smart Ride</Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View 
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠</Text>
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
              <ActivityIndicator color="#fff" size="small" />
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
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textDim}
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
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textDim}
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
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Email Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleEmailLogin}
            disabled={isLoading || googleLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In with Email</Text>
            )}
          </TouchableOpacity>
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
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Security Notice */}
        <Animated.View style={[styles.securityNotice, { opacity: fadeAnim }]}>
          <Text style={styles.securityText}>
            🔒 Secure login • All data encrypted
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ambientGreen: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
  },
  ambientCyan: {
    position: 'absolute',
    bottom: -40,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 255, 243, 0.06)',
  },
  ambientPurple: {
    position: 'absolute',
    top: height * 0.35,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: -8,
    backgroundColor: 'rgba(26, 26, 36, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.googleBlue,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textDim,
    marginHorizontal: 14,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 14,
    fontSize: 14,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 16,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 13,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  signUpLink: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  securityNotice: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  securityText: {
    color: COLORS.textDim,
    fontSize: 11,
  },
});
