// ============================================
// SMART RIDE MOBILE - OTP VERIFICATION SCREEN
// ============================================
// VERSION: PRODUCTION-001
// PURPOSE: Verify OTP code and complete authentication
// FLOW: Enter OTP → Verify → Login → Home
// FEATURES:
// - 6-digit OTP input with auto-focus
// - Countdown timer (5 minutes)
// - Resend button with 60s cooldown
// - Comprehensive error handling
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
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';

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
  
  // Refs
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animations
  const [shakeAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));
  
  // Get params
  const phone = params.phone || '';
  const purpose = (params.purpose as 'login' | 'register') || 'login';
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
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
  
  // Success animation
  const animateSuccess = useCallback(() => {
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successAnim]);
  
  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    // Clear error when user types
    if (error) setError(null);
    
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste of full OTP
      const digits = digit.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < OTP_LENGTH) {
          newOtp[i] = d;
        }
      });
      setOtp(newOtp);
      
      // Focus last input or submit
      const lastFilledIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }
    
    // Single digit input
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  // Verify OTP
  const handleVerifyOTP = async (otpString?: string) => {
    const otpToVerify = otpString || otp.join('');
    
    // Validate OTP
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
      console.log('[VERIFY-OTP] Verifying OTP for:', phone);
      
      // Get device info
      const deviceInfo = {
        deviceId: 'mobile-' + Date.now(), // In production, use actual device ID
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
        console.log('[VERIFY-OTP] Verification successful');
        
        // Validate tokens
        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const user = response.data.user;
        
        if (!accessToken || !refreshToken || !user) {
          console.error('[VERIFY-OTP] Missing tokens or user in response');
          setError('Authentication error. Please try again.');
          shake();
          setIsLoading(false);
          return;
        }
        
        // Animate success
        animateSuccess();
        
        // Login using authStore
        await login(user, accessToken, refreshToken);
        
        console.log('[VERIFY-OTP] Login successful, navigating to home');
        
        // Navigate to home
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
        
      } else {
        console.error('[VERIFY-OTP] Verification failed:', response.error);
        
        // Handle specific errors
        const errorMsg = response.error || 'Verification failed';
        
        if (errorMsg.toLowerCase().includes('expired')) {
          setError('OTP has expired. Please request a new one.');
          setOtpExpired(true);
        } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('incorrect')) {
          setError('Invalid OTP. Please try again.');
          // Clear OTP
          setOtp(Array(OTP_LENGTH).fill(''));
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
      console.error('[VERIFY-OTP] Unexpected error:', err);
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
      console.log('[VERIFY-OTP] Resending OTP to:', phone);
      
      const response = await api.sendOTP(phone, purpose as 'login' | 'register');
      
      if (response.success) {
        console.log('[VERIFY-OTP] OTP resent successfully');
        
        // Reset state
        setOtp(Array(OTP_LENGTH).fill(''));
        setOtpExpired(false);
        setCountdown(response.data?.expiresIn || OTP_EXPIRY_SECONDS);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        
        // Focus first input
        inputRefs.current[0]?.focus();
        
      } else {
        console.error('[VERIFY-OTP] Failed to resend OTP:', response.error);
        setError(response.error || 'Failed to send OTP. Please try again.');
        shake();
      }
    } catch (err) {
      console.error('[VERIFY-OTP] Resend error:', err);
      setError('Failed to resend OTP. Please check your connection.');
      shake();
    } finally {
      setIsResending(false);
    }
  };
  
  // Format phone for display
  const displayPhone = phone.replace(/(\+256)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  
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
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          {/* Countdown Timer */}
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, countdown <= 30 && styles.timerWarning]}>
              {formatTime(countdown)}
            </Text>
          </View>
        </View>
        
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, otpExpired && styles.iconCircleExpired]}>
            <Text style={styles.iconEmoji}>{otpExpired ? '⏰' : '🔐'}</Text>
          </View>
        </View>
        
        {/* Title */}
        <Text style={styles.title}>
          {otpExpired ? 'OTP Expired' : 'Enter Verification Code'}
        </Text>
        <Text style={styles.subtitle}>
          {otpExpired
            ? 'Your verification code has expired. Please request a new one.'
            : `We sent a 6-digit code to\n${displayPhone}`}
        </Text>
        
        {/* OTP Input Card */}
        <Animated.View
          style={[
            styles.inputCard,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* OTP Inputs */}
          {!otpExpired && (
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    error && styles.otpInputError,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="number-pad"
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  selectTextOnFocus
                  editable={!isLoading && !otpExpired}
                  textContentType="oneTimeCode"
                  autoFocus={index === 0}
                />
              ))}
            </View>
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}
        </Animated.View>
        
        {/* Resend Section */}
        <View style={styles.resendSection}>
          {otpExpired ? (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <>
                  <Text style={styles.resendIcon}>🔄</Text>
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
                >
                  {isResending ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <Text style={styles.resendLink}>Resend</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Help Section */}
        <View style={styles.helpSection}>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.helpLink}>
              Wrong phone number? Go back
            </Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 24,
  },
  timerContainer: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: COLORS.warning,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircleExpired: {
    backgroundColor: COLORS.warning,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 0.8,
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  otpInputFilled: {
    backgroundColor: COLORS.backgroundElevated,
    borderColor: COLORS.primary,
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 13, 18, 0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    marginTop: 12,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  resendCooldown: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  resendIcon: {
    fontSize: 18,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    alignItems: 'center',
  },
  helpLink: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
