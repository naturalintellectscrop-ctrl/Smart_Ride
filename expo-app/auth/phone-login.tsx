// ============================================
// SMART RIDE MOBILE - PHONE LOGIN SCREEN
// ============================================
// VERSION: PRODUCTION-001
// PURPOSE: Phone + OTP authentication entry point
// FLOW: Phone Input → Send OTP → Verify OTP → Login
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';

// Uganda phone number validation
const UGANDAN_PHONE_REGEX = /^(\+256|0)(7\d|4\d)\d{7}$/;

function validateUgandanPhone(phone: string): { valid: boolean; error?: string } {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s\-]/g, '');
  
  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Check length
  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number is too short' };
  }
  
  if (cleaned.length > 13) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  // Validate format
  if (!UGANDAN_PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Ugandan phone number' };
  }
  
  return { valid: true };
}

function normalizePhone(phone: string): string {
  // Remove spaces and dashes
  let normalized = phone.replace(/[\s\-]/g, '');
  
  // Convert 0XXX to +256XXX
  if (normalized.startsWith('0')) {
    normalized = '+256' + normalized.substring(1);
  }
  
  // Add + if missing and starts with 256
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
  const [buttonScale] = useState(new Animated.Value(1));
  
  const inputRef = useRef<TextInput>(null);
  
  // Purpose: 'login' | 'register' | 'reset_password'
  const purpose = (params.purpose as 'login' | 'register') || 'login';
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);
  
  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, []);
  
  const handleSendOTP = async () => {
    // Clear previous error
    setError(null);
    
    // Validate phone
    const validation = validateUgandanPhone(phone);
    if (!validation.valid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }
    
    // Normalize phone
    const normalizedPhone = normalizePhone(phone);
    
    // Animate button press
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
      console.log('[PHONE-LOGIN] Sending OTP to:', normalizedPhone);
      
      const response = await api.sendOTP(normalizedPhone, purpose);
      
      if (response.success) {
        console.log('[PHONE-LOGIN] OTP sent successfully');
        
        // MVP FIX: Show OTP in alert for testing (no SMS required)
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
        
        // Navigate to OTP verification screen
        router.push({
          pathname: '/auth/verify-otp',
          params: {
            phone: normalizedPhone,
            purpose: purpose,
            expiresIn: response.data?.expiresIn?.toString() || '300',
          },
        });
      } else {
        console.error('[PHONE-LOGIN] Failed to send OTP:', response.error);
        setError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('[PHONE-LOGIN] Unexpected error:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhoneChange = (text: string) => {
    // Only allow digits, spaces, dashes, and +
    const filtered = text.replace(/[^\d\s\-\+]/g, '');
    setPhone(filtered);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
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
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>📱</Text>
          </View>
        </View>
        
        {/* Title */}
        <Text style={styles.title}>
          {purpose === 'register' ? 'Create Account' : 'Sign In'}
        </Text>
        <Text style={styles.subtitle}>
          Enter your phone number to receive a verification code
        </Text>
        
        {/* Phone Input Card */}
        <View style={styles.inputCard}>
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* Phone Label */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          
          {/* Phone Input */}
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇺🇬 +256</Text>
            </View>
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
          
          {/* Helper Text */}
          <Text style={styles.helperText}>
            We'll send you a 6-digit verification code via SMS
          </Text>
          
          {/* Send OTP Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading && styles.sendButtonDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={isLoading || !phone.trim()}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                  <Text style={styles.sendingText}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.sendButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* Alternative Options */}
        <View style={styles.alternativeSection}>
          <Text style={styles.alternativeText}>Or continue with</Text>
          
          <View style={styles.alternativeButtons}>
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.alternativeButtonIcon}>📧</Text>
              <Text style={styles.alternativeButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    marginBottom: 20,
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
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
  logoEmoji: {
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
  },
  inputCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  inputLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryCodeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.7,
  },
  sendButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  alternativeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  alternativeText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 16,
  },
  alternativeButtons: {
    flexDirection: 'row',
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alternativeButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alternativeButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  termsSection: {
    paddingHorizontal: 20,
  },
  termsText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
