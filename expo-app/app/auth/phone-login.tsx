// ============================================
// SMART RIDE MOBILE - PHONE LOGIN SCREEN
// ============================================
// Premium phone authentication with animated
// particles and glassmorphism UI
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
  Animated,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { GlassCard } from '../../components/GlassCard';

const COLORS = {
  primary: '#00FF88',          // Neon Green - Smart Ride brand
  primaryDark: '#00CC6D',
  accent: '#00FFF3',           // Cyan - Secondary accent
  background: '#0D0D12',       // Dark background
  backgroundElevated: '#1A1A24',
  backgroundSurface: 'rgba(37, 37, 48, 0.8)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#FF4757',
  googleBlue: '#4285F4',
};

// Uganda phone number validation
const UGANDAN_PHONE_REGEX = /^(\+256|0)(7\d|4\d)\d{7}$/;

function validateUgandanPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/[\s\-]/g, '');
  
  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number is too short' };
  }
  
  if (cleaned.length > 13) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  if (!UGANDAN_PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Ugandan phone number' };
  }
  
  return { valid: true };
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-]/g, '');
  
  if (normalized.startsWith('0')) {
    normalized = '+256' + normalized.substring(1);
  }
  
  if (normalized.startsWith('256') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

export default function PhoneLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ purpose?: string }>();
  const { isAuthenticated } = useAuthStore();
  
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  
  const inputRef = useRef<TextInput>(null);
  
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
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, [isAuthenticated, router]);
  
  const handleSendOTP = async () => {
    setError(null);
    
    const validation = validateUgandanPhone(phone);
    if (!validation.valid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsLoading(true);
    
    try {
      const response = await api.sendOTP(normalizedPhone, purpose);
      
      if (response.success) {
        const otp = response.data?.otp;
        if (otp) {
          Alert.alert(
            'Test OTP',
            `Your verification code is: ${otp}`,
            [{ text: 'OK', onPress: () => {} }]
          );
        } else {
          Alert.alert('OTP Sent', 'Check your phone for the verification code');
        }
        
        router.push({
          pathname: '/auth/verify-otp',
          params: {
            phone: normalizedPhone,
            purpose: purpose,
            expiresIn: response.data?.expiresIn?.toString() || '300',
          },
        });
      } else {
        setError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhoneChange = (text: string) => {
    const filtered = text.replace(/[^\d\s\-\+]/g, '');
    setPhone(filtered);
    if (error) {
      setError(null);
    }
  };

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
            <Text style={styles.tagline}>
              {purpose === 'register' ? 'Create your account' : 'Sign in to continue'}
            </Text>
          </Animated.View>

          {/* Phone Input Card */}
          <Animated.View 
            style={[
              styles.cardWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <GlassCard>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {purpose === 'register' ? 'Create Account' : 'Sign In'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Enter your phone number to receive a verification code
                </Text>
              </View>

              {/* Error Display */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.countryFlag}>🇺🇬</Text>
                  <Text style={styles.countryCode}>+256</Text>
                  <TextInput
                    ref={inputRef}
                    style={styles.phoneInput}
                    placeholder="7XX XXX XXX"
                    placeholderTextColor={COLORS.textMuted}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    maxLength={13}
                    editable={!isLoading}
                  />
                </View>
                <Text style={styles.helperText}>
                  We'll send you a 6-digit verification code via SMS
                </Text>
              </View>

              {/* Send OTP Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading || !phone.trim()}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color={COLORS.background} size="small" />
                      <Text style={styles.sendingText}>Sending...</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>Send Verification Code</Text>
                      <Text style={styles.sendButtonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Alternative Options */}
              <View style={styles.alternativeSection}>
                <Text style={styles.alternativeText}>Or continue with</Text>
                
                <TouchableOpacity
                  style={styles.alternativeButton}
                  onPress={() => router.push('/auth/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alternativeButtonIcon}>📧</Text>
                  <Text style={styles.alternativeButtonText}>Email</Text>
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
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
    marginBottom: 32,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appNameLight: {
    color: COLORS.text,
  },
  appNameAccent: {
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cardWrapper: {
    marginBottom: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
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
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCode: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.7,
  },
  sendButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonArrow: {
    color: COLORS.background,
    fontSize: 18,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  alternativeSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  alternativeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alternativeButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  alternativeButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  termsText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  termsLink: {
    color: COLORS.primary,
  },
});
