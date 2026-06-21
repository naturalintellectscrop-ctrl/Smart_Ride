// ============================================
// SMART RIDE MOBILE - OTP VERIFICATION SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// Light mode surface background, MD3 top app bar,
// 64×80 OTP boxes, security graphic card
// FEATURES:
// - 6-digit OTP input with auto-focus & paste support
// - Countdown timer (5 minutes)
// - Resend button with 60s cooldown
// - Shake animation on error
// - Auto-submit when all 6 digits entered
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { navigateToRoleHome } from '@/src/utils/roleRouting';

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    purpose: string;
    expiresIn?: string;
  }>();

  const { login, isAuthenticated } = useAuthStore();

  // State
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(
    params.expiresIn ? parseInt(params.expiresIn, 10) : OTP_EXPIRY_SECONDS
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Refs
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const [shakeAnim] = useState(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get params
  const phone = params.phone || '';
  const purpose = (params.purpose as 'login' | 'register') || 'login';

  // Redirect if already authenticated (auto-login)
  useEffect(() => {
    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      navigateToRoleHome(user?.role);
    }
  }, [isAuthenticated, router]);

  // Fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setOtpExpired(true);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    resendIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
      }
    };
  }, [resendCooldown > 0]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === OTP_LENGTH && !isLoading) {
      handleVerifyOTP(otpString);
    }
  }, [otp]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Shake animation for error
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    if (error) setError(null);

    const digit = text.replace(/[^0-9]/g, '');

    // Paste support: if multiple digits pasted into first box
    if (digit.length > 1) {
      const digits = digit.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < OTP_LENGTH) {
          newOtp[i] = d;
        }
      });
      setOtp(newOtp);

      const lastFilledIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      setFocusedIndex(lastFilledIndex);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      setFocusedIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle focus
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  // Verify OTP
  const handleVerifyOTP = async (otpString?: string) => {
    const otpToVerify = otpString || otp.join('');

    if (otpToVerify.length !== OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits`);
      shake();
      return;
    }

    if (otpExpired) {
      setError('OTP has expired. Please request a new one.');
      shake();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deviceInfo = {
        deviceId: 'mobile-' + Date.now(),
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        deviceType: Platform.OS as 'ios' | 'android',
      };

      const response = await api.verifyOTP({
        phone,
        otp: otpToVerify,
        purpose: purpose as 'login' | 'register',
        ...deviceInfo,
      });

      if (response.success && response.data) {
        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const user = response.data.user;

        if (!accessToken || !refreshToken || !user) {
          setError('Authentication error. Please try again.');
          shake();
          setIsLoading(false);
          return;
        }

        // Login using authStore — user is guaranteed non-null here
        await login(user, accessToken);

        if (refreshToken) {
          await AsyncStorage.setItem('smart_ride_refresh_token', refreshToken);
        }

        setTimeout(() => {
          // Always show role-selection after phone OTP login so the user
          // can choose or change what kind of user they are. The screen
          // pre-selects their current role and has a Skip button, so
          // returning users can proceed quickly.
          router.replace('/auth/role-selection');
        }, 500);
      } else {
        const errorMsg = response.error || 'Verification failed';

        if (errorMsg.toLowerCase().includes('expired')) {
          setError('OTP has expired. Please request a new one.');
          setOtpExpired(true);
        } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('incorrect')) {
          setError('Invalid OTP. Please try again.');
          setOtp(Array(OTP_LENGTH).fill(''));
          setFocusedIndex(0);
          inputRefs.current[0]?.focus();
        } else if (errorMsg.toLowerCase().includes('attempts')) {
          setError('Too many failed attempts. Please request a new OTP.');
          setOtpExpired(true);
        } else {
          setError(errorMsg);
        }

        shake();
        setIsLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      shake();
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const response = await api.sendOTP(phone, purpose as 'login' | 'register');

      if (response.success) {
        setOtp(Array(OTP_LENGTH).fill(''));
        setOtpExpired(false);
        setCountdown(response.data?.expiresIn || OTP_EXPIRY_SECONDS);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setFocusedIndex(0);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.error || 'Failed to send OTP. Please try again.');
        shake();
      }
    } catch (err) {
      setError('Failed to resend OTP. Please check your connection.');
      shake();
    } finally {
      setIsResending(false);
    }
  };

  // Format phone for display
  const displayPhone = phone.replace(/(\+256)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');

  // Check if all digits filled
  const isOtpComplete = otp.every((d) => d.length === 1);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* ── Fixed Top App Bar ── */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isLoading}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Verify Number</Text>
        <View style={styles.appBarTrailing} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── Header Instruction ── */}
          <View style={styles.headerSection}>
            <Text style={styles.instructionText}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneText}>{displayPhone}</Text>
            </Text>
          </View>

          {/* ── Error Message ── */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── OTP Input Boxes ── */}
          {!otpExpired && (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => {
                  const isFocused = focusedIndex === index;
                  return (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.otpBox,
                        isFocused && styles.otpBoxFocused,
                        digit.length === 1 && styles.otpBoxFilled,
                        error && styles.otpBoxError,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleKeyPress(nativeEvent.key, index)
                      }
                      onFocus={() => handleFocus(index)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      selectTextOnFocus
                      editable={!isLoading && !otpExpired}
                      textContentType="oneTimeCode"
                      autoFocus={index === 0}
                      maxFontSizeMultiplier={1}
                      placeholder="•"
                      placeholderTextColor={COLORS.outlineVariant}
                    />
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* ── Timer Countdown ── */}
          {!otpExpired && (
            <View style={styles.timerRow}>
              <Text style={styles.timerLabel}>
                Code expires in{' '}
                <Text style={[
                  styles.timerValue,
                  countdown <= 30 && styles.timerWarning,
                ]}>
                  {formatTime(countdown)}
                </Text>
              </Text>
            </View>
          )}

          {/* ── Expired State ── */}
          {otpExpired && (
            <View style={styles.expiredContainer}>
              <Ionicons name="time-outline" size={48} color={COLORS.outline} />
              <Text style={styles.expiredTitle}>Code Expired</Text>
              <Text style={styles.expiredSubtitle}>
                Your verification code has expired.{'\n'}Please request a new one.
              </Text>
            </View>
          )}

          {/* ── Verify Button ── */}
          {!otpExpired && (
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isOtpComplete || isLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerifyOTP()}
              disabled={!isOtpComplete || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.onPrimary} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={COLORS.onPrimary}
                  />
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── Security Graphic Card ── */}
          <View style={styles.securityCard}>
            <View style={styles.securityGradientOverlay} />
            <View style={styles.securityContent}>
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.securityTextContainer}>
                <Text style={styles.securityTitle}>Secure Verification</Text>
                <Text style={styles.securitySubtitle}>
                  Your code is encrypted and only valid for 5 minutes
                </Text>
              </View>
            </View>
          </View>

          {/* ── Resend OTP ── */}
          <View style={styles.resendSection}>
            {otpExpired ? (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={isResending || resendCooldown > 0}
                style={styles.resendButton}
                activeOpacity={0.7}
              >
                {isResending ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color={COLORS.primary} />
                    <Text style={styles.resendButtonText}>Send New Code</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.resendInfo}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendCooldown}>
                    Resend in {resendCooldown}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={isResending || resendCooldown > 0}
                    activeOpacity={0.7}
                  >
                    {isResending ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <Text style={styles.resendLink}>Resend OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Wrong Number ── */}
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={isLoading}
            style={styles.wrongNumberSection}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={14} color={COLORS.outline} />
            <Text style={styles.wrongNumberText}>Wrong number? Go back</Text>
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

  // ── Top App Bar ──
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.outlineVariant,
    ...SHADOWS.card,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.primary,
  },
  appBarTrailing: {
    width: 40,
  },

  // ── Scroll Content ──
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
  },

  // ── Header Instruction ──
  headerSection: {
    marginBottom: SPACING.lg,
  },
  instructionText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
    textAlign: 'center',
  },
  phoneText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── Error Container ──
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onErrorContainer,
    flex: 1,
  },

  // ── OTP Boxes ──
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  otpBox: {
    width: 64,
    height: 80,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: RADIUS.lg,
    textAlign: 'center',
    ...TYPOGRAPHY.displayLg,
    color: COLORS.onSurface,
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceContainerLowest,
    // Ring glow effect via shadow
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  otpBoxFilled: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderColor: 'transparent',
  },
  otpBoxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorContainer,
  },

  // ── Timer Row ──
  timerRow: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  timerLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  timerValue: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: COLORS.error,
  },

  // ── Expired State ──
  expiredContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  expiredTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
  },
  expiredSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Verify Button ──
  verifyButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.button,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: COLORS.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },

  // ── Security Graphic Card ──
  securityCard: {
    marginTop: SPACING.lg,
    height: 128,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  securityGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.06,
  },
  securityContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  shieldBadge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextContainer: {
    flex: 1,
    gap: 2,
  },
  securityTitle: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  securitySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },

  // ── Resend Section ──
  resendSection: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  resendButtonText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },
  resendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  resendCooldown: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  resendLink: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.primary,
  },

  // ── Wrong Number ──
  wrongNumberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  wrongNumberText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
  },
});
