// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Google Sign-In is the PRIMARY authentication method
// Email/password is secondary fallback
// Uses design system: GlowHeader, GlassCard, IconInput, GradientButton
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
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { registerUser, isAuthenticated, saveTokens, saveUserData } from '../../services/auth';
import { COLORS } from '../../src/constants';
import { GlowHeader } from '../../src/components/GlowHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { IconInput } from '../../src/components/IconInput';
import { GradientButton } from '../../src/components/GradientButton';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
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
      // Ensure Google Sign-In is configured (safety measure)
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
          setError(result.error || 'Google sign up failed');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled - don't show error
      } else if (err.message?.includes('DEVELOPER_ERROR') || err.code === 'DEVELOPER_ERROR') {
        setError('Google Sign-In is not yet configured for this device. Please use email registration instead.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available. Please use email registration instead.');
      } else {
        setError('Google Sign-In is unavailable. Please use email registration instead.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  // SECONDARY: Email Registration
  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+256${phone.replace(/^0+/, '')}`;

      const result = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: formattedPhone,
        password,
      });

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
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
        {/* Header - Replaces solid green header with GlowHeader */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <GlowHeader title="Create Account" subtitle="Join Smart Ride Uganda" />
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.formContainer}>
          <GlassCard variant="elevated" padding={20} style={styles.formCard}>
            {/* Error Display */}
            {error && (
              <Animated.View entering={SlideInRight.duration(300)} style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* PRIMARY: Google Sign-In Button */}
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <GradientButton
                title="Sign up with Google"
                variant="outline"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                disabled={isLoading}
                size="lg"
                icon={<Text style={styles.googleLogo}>G</Text>}
              />
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or register with email</Text>
              <View style={styles.divider} />
            </Animated.View>

            {/* Name Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(250)}>
              <IconInput
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                icon="person"
                editable={!isLoading && !googleLoading}
              />
            </Animated.View>

            {/* Email Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <IconInput
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                icon="mail"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading && !googleLoading}
              />
            </Animated.View>

            {/* Phone Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(350)}>
              <IconInput
                label="Phone Number"
                placeholder="7XX XXX XXX"
                value={phone}
                onChangeText={setPhone}
                icon="call"
                keyboardType="phone-pad"
                editable={!isLoading && !googleLoading}
              />
            </Animated.View>

            {/* Password Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
              <IconInput
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                icon="lock"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                editable={!isLoading && !googleLoading}
              />
            </Animated.View>

            {/* Confirm Password Input */}
            <Animated.View entering={FadeInDown.duration(400).delay(450)}>
              <IconInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                icon="lock"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading && !googleLoading}
              />
            </Animated.View>

            {/* Register Button */}
            <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.buttonContainer}>
              <GradientButton
                title="Create Account"
                variant="primary"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading || googleLoading}
                size="lg"
              />
            </Animated.View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Sign In Link */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            disabled={isLoading || googleLoading}
          >
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  formCard: {
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 14,
  },
  googleLogo: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 16,
    fontSize: 13,
  },
  buttonContainer: {
    marginTop: 12,
  },
  termsText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  signInText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  signInLink: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
