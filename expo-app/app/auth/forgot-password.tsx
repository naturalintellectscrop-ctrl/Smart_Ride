// ============================================
// SMART RIDE MOBILE - FORGOT PASSWORD SCREEN
// ============================================
// Premium futuristic design matching login page
// Glassmorphism + animated background + neon accents
// Sends reset link via Resend email (admin API)
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
import { forgotPassword } from '../../services/auth';
import { COLORS } from '../../src/constants';
import { GlassCard, GradientButton, GlowHeader, IconInput } from '../../src/components';

const { height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
  }, []);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await forgotPassword(email.trim().toLowerCase());

      // API always returns success to prevent email enumeration,
      // but we still check for actual errors
      if (result.success) {
        setSuccess(true);
      } else {
        // Only show real errors, not enumeration-related ones
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Animated Background */}
      <View style={styles.backgroundGradient}>
        <View style={styles.ambientGreen} />
        <View style={styles.ambientCyan} />
        <View style={styles.ambientPurple} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
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
            title="Forgot Password"
            subtitle="Enter your email and we'll send you a reset link"
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
            {success ? (
              /* Success State */
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successMessage}>
                  If an account with that email exists, a reset link has been sent.
                </Text>
                <Text style={styles.successHint}>
                  Didn't receive the email? Check your spam folder.
                </Text>
                <GradientButton
                  title="Back to Login"
                  onPress={() => router.replace('/auth/login')}
                  variant="primary"
                  size="md"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              /* Forgot Password Form */
              <>
                {/* Info Banner */}
                <View style={styles.infoContainer}>
                  <Ionicons name="key-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.infoText}>
                    We'll send a password reset link to your registered email address
                  </Text>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Email Input */}
                <IconInput
                  label="Email Address"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(null);
                  }}
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />

                {/* Submit Button */}
                <GradientButton
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={isLoading}
                  disabled={isLoading}
                  size="lg"
                />
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* Back to Login Link */}
        {!success && (
          <Animated.View 
            style={[
              styles.backContainer,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity 
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.backLink}>← Back to Login</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Security Notice */}
        <Animated.View style={[styles.securityNotice, { opacity: fadeAnim }]}>
          <Ionicons name="lock-closed-outline" size={12} color={COLORS.textDim} />
          <Text style={styles.securityText}>
            Secure reset • Link expires in 1 hour
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
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
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
    borderColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  successMessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  successHint: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  backLink: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  securityText: {
    color: COLORS.textDim,
    fontSize: 11,
  },
});
