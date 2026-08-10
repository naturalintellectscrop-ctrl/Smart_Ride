// ============================================
// SMART RIDE MOBILE - FORGOT PASSWORD SCREEN
// ============================================
// Premium futuristic design matching login page
// Glassmorphism + animated background + neon accents
// Sends reset link via Resend email (admin API)
// Uses shared design-system components & constants
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { forgotPassword } from '@/src/services/auth';
import { useTheme } from '../../src/context/theme-context';
import { ThemedColors, makeThemedColors, withAlpha } from '../../src/theme/themedColors';
import { AppHeader, Card, GradientButton, IconInput } from '../../src/components';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER } from '../../src/constants';

const { height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Animation swap state — switches form wrapper to plain View after entrance
  // animation completes to prevent Animated.View transforms from interfering
  // with TextInput cursor on Android (pattern proven in register.tsx).
  const [animationDone, setAnimationDone] = useState(false);

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
    ]).start(() => {
      // After entrance animation completes, swap form wrapper to plain View
      // to prevent Animated.View transforms from causing cursor jitter on Android.
      setAnimationDone(true);
    });

    // Logo floating animation
    const logoLoop = Animated.loop(
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
    );
    logoLoop.start();

    // Glow pulse animation
    const glowLoop = Animated.loop(
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
    );
    glowLoop.start();

    return () => {
      logoLoop.stop();
      glowLoop.stop();
    };
  }, []);


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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        <AppHeader title="Forgot password" onBack={() => router.back()} />

        {/* Form Card — Animated.View swapped to plain View after entrance animation
            completes to prevent transforms from interfering with TextInput cursor on Android. */}
        {animationDone ? (
          <View>
            <Card variant="elevated" padding={24} radius={24} style={styles.formCard}>
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

                  <View style={[styles.errorContainer, !error && styles.errorHidden]}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.errorText}>{error || ''}</Text>
                  </View>

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
            </Card>
          </View>
        ) : (
          <Animated.View 
            style={[
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Card variant="elevated" padding={24} radius={24} style={styles.formCard}>
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

                  <View style={[styles.errorContainer, !error && styles.errorHidden]}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.errorText}>{error || ''}</Text>
                  </View>

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
            </Card>
          </Animated.View>
        )}

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
          <Ionicons name="lock-closed-outline" size={12} color={COLORS.outlineVariant} />
          <Text style={styles.securityText}>
            Secure reset • Link expires in 1 hour
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
    backgroundColor: withAlpha(COLORS.primary, 0.08),
  },
  ambientCyan: {
    position: 'absolute',
    bottom: -40,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.surfaceContainer,
  },
  ambientPurple: {
    position: 'absolute',
    top: height * 0.35,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: withAlpha(COLORS.tertiary, 0.05),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  formCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  infoContainer: {
    backgroundColor: withAlpha(COLORS.primary, 0.06),
    borderColor: withAlpha(COLORS.primary, 0.12),
    borderWidth: BORDER.hairline,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  errorContainer: {
    backgroundColor: withAlpha(COLORS.error, 0.1),
    borderColor: withAlpha(COLORS.error, 0.2),
    borderWidth: BORDER.hairline,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // Always-rendered error container — zeroed-out style applied when no error
  // so the container occupies no height, preventing layout shift on keystroke
  // (which would cause Android cursor jitter).
  errorHidden: {
    opacity: 0,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  successIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    backgroundColor: withAlpha(COLORS.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  successMessage: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  successHint: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  backLink: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  securityText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outlineVariant,
  },
});
