// ============================================
// SMART RIDE MOBILE - OTP VERIFICATION SCREEN
// ============================================
// Step 2 of the phone flow, on the shared auth design language.
//
// FEATURES (all preserved from the original implementation):
// - 6-digit OTP input with auto-focus & paste support
// - Countdown timer (5 minutes), warning colour under 30s
// - Resend button with 60s cooldown
// - Shake animation on error
// - Auto-submit when all 6 digits entered
//
// The boxes themselves now live in src/components/auth/OtpBoxes.tsx, which is
// purely presentational: the state, refs and every handler below stay here.
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors, withAlpha } from '@/src/theme/themedColors';
import { navigateToRoleHome } from '@/src/utils/roleRouting';
import { GradientButton } from '@/src/components/GradientButton';
import { AuthScreen, OtpBoxes, OTP_LENGTH } from '@/src/components/auth';

// OTP Configuration
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60; // 1 minute
const STEP_LABELS = ['Number', 'Verify'];

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
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

        // Login using authStore - user is guaranteed non-null here
        await login(user, accessToken);

        if (refreshToken) {
          await AsyncStorage.setItem('smart_ride_refresh_token', refreshToken);
        }

        setTimeout(() => {
          // Always show role-selection after phone OTP login so the user
          // can choose or change what kind of user they are. The screen
          // pre-selects their current role and has a Skip button, so
          // returning users can proceed quickly.
          router.replace('/auth/role-selection' as any);
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
    <AuthScreen
      onBack={() => router.back()}
      step={{ current: 2, labels: STEP_LABELS }}
      lead="Verify your"
      accent="number"
      subtitle={`Enter the 6-digit code we sent to ${displayPhone}.`}
      showLockup={false}
    >
      {/* Always mounted so revealing an error never shifts the boxes. */}
      <View style={[styles.errorBanner, !error && styles.hidden]}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{error || ''}</Text>
      </View>

      {!otpExpired && (
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <OtpBoxes
            value={otp}
            onChangeDigit={handleOtpChange}
            onKeyPress={handleKeyPress}
            onFocusIndex={handleFocus}
            focusedIndex={focusedIndex}
            inputRefs={inputRefs}
            error={!!error}
            editable={!isLoading && !otpExpired}
          />
        </Animated.View>
      )}

      {!otpExpired && (
        <View style={styles.timerRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={countdown <= 30 ? COLORS.warning : COLORS.textMuted}
          />
          <Text style={styles.timerLabel}>
            Code expires in{' '}
            <Text style={[styles.timerValue, countdown <= 30 && styles.timerWarning]}>
              {formatTime(countdown)}
            </Text>
          </Text>
        </View>
      )}

      {otpExpired && (
        <View style={styles.expiredCard}>
          <Ionicons name="time-outline" size={44} color={COLORS.outline} />
          <Text style={styles.expiredTitle}>Code Expired</Text>
          <Text style={styles.expiredSubtitle}>
            Your verification code has expired. Please request a new one.
          </Text>
        </View>
      )}

      {!otpExpired && (
        <GradientButton
          title="Verify"
          onPress={() => handleVerifyOTP()}
          loading={isLoading}
          disabled={!isOtpComplete || isLoading}
          size="lg"
          shape="pill"
          iconPosition="right"
          icon={<Ionicons name="checkmark-circle" size={ICON.lg} color="#FFFFFF" />}
          style={styles.cta}
        />
      )}

      {/* Security note */}
      <View style={styles.securityCard}>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>Secure Verification</Text>
          <Text style={styles.securitySubtitle}>
            Your code is encrypted and only valid for 5 minutes.
          </Text>
        </View>
      </View>

      {/* Resend */}
      <View style={styles.resendSection}>
        {otpExpired ? (
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={isResending || resendCooldown > 0}
            style={styles.resendButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Send a new code"
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
            <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
            {resendCooldown > 0 ? (
              <Text style={styles.resendCooldown}>Resend in {resendCooldown}s</Text>
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

      <TouchableOpacity
        onPress={() => router.back()}
        disabled={isLoading}
        style={styles.wrongNumberRow}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
        <Text style={styles.wrongNumberText}>Wrong number? Go back</Text>
      </TouchableOpacity>
    </AuthScreen>
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
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
    },
    timerLabel: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.textMuted,
    },
    timerValue: {
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    timerWarning: {
      color: COLORS.warning,
    },
    expiredCard: {
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
    },
    expiredTitle: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
    },
    expiredSubtitle: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      textAlign: 'center',
    },
    cta: {
      marginTop: SPACING.sm,
    },
    securityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.authHairline,
      backgroundColor: COLORS.authGutter,
      marginTop: SPACING.sm,
    },
    shieldBadge: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authCard,
    },
    securityText: {
      flex: 1,
    },
    securityTitle: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
    securitySubtitle: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    resendSection: {
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    resendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      minHeight: 52,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.emphasis,
      borderColor: COLORS.primary,
      alignSelf: 'stretch',
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
      color: COLORS.textMuted,
      fontWeight: '600',
    },
    resendLink: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.primary,
      fontWeight: '700',
    },
    wrongNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs + 2,
      marginTop: SPACING.md,
    },
    wrongNumberText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.textMuted,
    },
  });
