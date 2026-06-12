// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Phone OTP is the PRIMARY authentication method
// Email/password is secondary fallback
// NO Google Sign-In (requires Google Play Services
// which is unreliable on user devices in Uganda)
// NO FadeInDown animations on inputs (causes cursor jumping)
// Uses design system: GlowHeader, GlassCard, IconInput, GradientButton
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
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { registerUser, isAuthenticated } from '@/src/services/auth';
import { COLORS } from '../../src/constants';
import { GlowHeader } from '../../src/components/GlowHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { IconInput } from '../../src/components/IconInput';
import { GradientButton } from '../../src/components/GradientButton';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Simple fade animation for the whole form (no per-input animations)
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuth();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      router.replace('/(tabs)');
    }
  };

  // PRIMARY: Phone OTP Registration
  const handlePhoneRegister = () => {
    router.push({
      pathname: '/auth/phone-login',
      params: { purpose: 'register' },
    });
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <GlowHeader title="Create Account" subtitle="Join Smart Ride Uganda" />
        </Animated.View>

        {/* PRIMARY: Phone OTP Registration */}
        <Animated.View style={[styles.phoneSection, { opacity: fadeAnim }]}>
          <GradientButton
            title="Sign Up with Phone Number"
            onPress={handlePhoneRegister}
            variant="primary"
            size="lg"
            icon={
              <Ionicons name="call" size={20} color={COLORS.background} />
            }
          />
          <Text style={styles.phoneHint}>
            Quick sign up with OTP — no password needed
          </Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View style={[styles.dividerContainer, { opacity: fadeAnim }]}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or register with email</Text>
          <View style={styles.divider} />
        </Animated.View>

        {/* Email Registration Form - NO per-input FadeInDown animations */}
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          <GlassCard variant="elevated" padding={20} style={styles.formCard}>
            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name Input - NO FadeInDown wrapper */}
            <IconInput
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={(text) => { setName(text); if (error) setError(null); }}
              icon="person-outline"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Email Input */}
            <IconInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => { setEmail(text); if (error) setError(null); }}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Phone Input */}
            <IconInput
              label="Phone Number"
              placeholder="7XX XXX XXX"
              value={phone}
              onChangeText={(text) => { setPhone(text); if (error) setError(null); }}
              icon="call-outline"
              keyboardType="phone-pad"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Password Input */}
            <IconInput
              label="Password"
              placeholder="Min 8 chars, upper, lower, number"
              value={password}
              onChangeText={(text) => { setPassword(text); if (error) setError(null); }}
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Confirm Password Input */}
            <IconInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); if (error) setError(null); }}
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleRegister}
            />

            {/* Register Button */}
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Create Account"
                variant="secondary"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                size="lg"
                icon={
                  !isLoading ? (
                    <Ionicons name="mail" size={20} color={COLORS.text} />
                  ) : undefined
                }
              />
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Sign In Link */}
        <Animated.View style={[styles.signInContainer, { opacity: fadeAnim }]}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            disabled={isLoading}
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
    paddingBottom: 32,
  },
  phoneSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  phoneHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
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
  formContainer: {
    paddingHorizontal: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
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
