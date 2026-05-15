// ============================================
// SMART RIDE MOBILE - LOGIN SCREEN
// ============================================
// Google Sign-In is the PRIMARY authentication method
// Email/password is secondary fallback
// ============================================

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { loginWithEmail, isAuthenticated, saveTokens, saveUserData } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  border: 'rgba(255, 255, 255, 0.08)',
  error: '#FF4757',
  googleBlue: '#4285F4',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

export default function LoginScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Ensure Google Sign-In is configured (safety measure)
      configureGoogleSignIn();

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Text style={styles.headerSubtitle}>Sign in to continue to Smart Ride</Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* PRIMARY: Google Sign-In Button */}
          <TouchableOpacity 
            style={styles.googlePrimaryButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.googleLogo}>G</Text>
                <Text style={styles.googlePrimaryButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.divider} />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !googleLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
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
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In with Email</Text>
            )}
          </TouchableOpacity>
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: -20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginTop: 24,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
  },
  googlePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.googleBlue,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  googleLogo: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    marginRight: 12,
  },
  googlePrimaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  inputGroup: {
    marginTop: 16,
  },
  label: {
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  eyeText: {
    fontSize: 18,
  },
  forgotButton: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  forgotText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },
  loginButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  signUpText: {
    color: COLORS.textSecondary,
  },
  signUpLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
