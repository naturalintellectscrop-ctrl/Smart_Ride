// ============================================
// SMART RIDE MOBILE - OTP VERIFICATION SCREEN
// ============================================
// Premium OTP verification with animated
// particles and glassmorphism UI
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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { GlassCard } from '../../components/GlassCard';
import { Icon } from '../../components/Icon';

const COLORS = {
  primary: '#00FF88',
  primaryDark: '#00CC6D',
  accent: '#00FFF3',
  background: '#0D0D12',
  backgroundElevated: '#1A1A24',
  backgroundSurface: 'rgba(37, 37, 48, 0.8)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#FF4757',
  warning: '#FBBF24',
};

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    purpose: string;
    expiresIn?: string;
  }>();
  
  const { login, isAuthenticated } = useAuthStore();
  
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(
    params.expiresIn ? parseInt(params.expiresIn, 10) : OTP_EXPIRY_SECONDS
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  
  const phone = params.phone || '';
  const purpose = (params.purpose as 'login' | 'register') || 'login';
  
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
    
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
  }, [isAuthenticated, router]);
  
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
  
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === OTP_LENGTH && !isLoading) {
      handleVerifyOTP(otpString);
    }
  }, [otp]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
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
  }, []);
  
  const handleOtpChange = (text: string, index: number) => {
    if (error) setError(null);
    
    const digit = text.replace(/[^0-9]/g, '');
    
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
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
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
        
        await login(user, accessToken);
        
        if (refreshToken) {
          await AsyncStorage.setItem('smart_ride_refresh_token', refreshToken);
        }
        
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
        
      } else {
        const errorMsg = response.error || 'Verification failed';
        
        if (errorMsg.toLowerCase().includes('expired')) {
          setError('OTP has expired. Please request a new one.');
          setOtpExpired(true);
        } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('incorrect')) {
          setError('Invalid OTP. Please try again.');
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
      setError('An unexpected error occurred. Please try again.');
      shake();
      setIsLoading(false);
    }
  };
  
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
  
  const displayPhone = phone.replace(/(\+256)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  
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
          </Animated.View>

          {/* OTP Card */}
          <Animated.View 
            style={[
              styles.cardWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            <GlassCard>
              {/* Timer Badge */}
              <View style={styles.timerBadge}>
                <Text style={[styles.timerText, countdown <= 30 && styles.timerWarning]}>
                  {formatTime(countdown)}
                </Text>
              </View>

              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {otpExpired ? 'OTP Expired' : 'Enter Verification Code'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {otpExpired
                    ? 'Your verification code has expired.\nPlease request a new one.'
                    : `We sent a 6-digit code to\n${displayPhone}`}
                </Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size="sm" color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* OTP Inputs */}
              {!otpExpired && (
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputRefs.current[index] = ref; }}
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
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                  <Text style={styles.loadingText}>Verifying...</Text>
                </View>
              )}

              {/* Resend Section */}
              <View style={styles.resendSection}>
                {otpExpired ? (
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendOTP}
                    disabled={isResending || resendCooldown > 0}
                    activeOpacity={0.8}
                  >
                    {isResending ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <>
                        <Icon name="refresh-cw" size="sm" color={COLORS.primary} />
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

              {/* Help Link */}
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isLoading}
                style={styles.helpButton}
              >
                <Text style={styles.helpLink}>Wrong phone number? Go back</Text>
              </TouchableOpacity>
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
    marginBottom: 24,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  appNameLight: {
    color: COLORS.text,
  },
  appNameAccent: {
    color: COLORS.primary,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  timerBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundSurface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: COLORS.warning,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 0.75,
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    fontSize: 22,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: COLORS.backgroundSurface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  resendIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resendButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  helpLink: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
