// ============================================
// SMART RIDE MOBILE - PHONE LOGIN SCREEN
// ============================================
// VERSION: PRODUCTION-002
// PURPOSE: Phone + OTP authentication entry point
// FLOW: Phone Input → Send OTP → Verify OTP → Login
// Uses design system: GlowHeader, GlassCard, IconInput, GradientButton
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
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { GlowHeader } from '@/src/components/GlowHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { GradientButton } from '@/src/components/GradientButton';

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
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Purpose: 'login' | 'register'
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
    }, 600);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  
  const handleSendOTP = async () => {
    setError(null);
    
    const validation = validateUgandanPhone(phone);
    if (!validation.valid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }
    
    const normalizedPhone = normalizePhone(phone);
    setIsLoading(true);
    
    try {
      const response = await api.sendOTP(normalizedPhone, purpose);
      
      if (response.success) {
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
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <GlowHeader 
            title={purpose === 'register' ? 'Create Account' : 'Sign In'}
            subtitle="Enter your phone number to receive a verification code"
          >
            {/* Phone icon */}
            <View style={styles.iconRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait" size={32} color={COLORS.background} />
              </View>
            </View>
          </GlowHeader>
        </Animated.View>
        
        {/* Phone Input Card */}
        <Animated.View style={[styles.cardSection, { opacity: fadeAnim }]}>
          <GlassCard variant="elevated" padding={24} borderRadius={24} style={styles.inputCard}>
            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
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
                placeholderTextColor={COLORS.textDim}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={13}
                editable={!isLoading}
                autoFocus
              />
            </View>
            
            {/* Helper Text */}
            <Text style={styles.helperText}>
              We'll send you a 6-digit verification code via SMS
            </Text>
            
            {/* Send OTP Button */}
            <GradientButton
              title={isLoading ? 'Sending...' : 'Send Verification Code'}
              onPress={handleSendOTP}
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !phone.trim()}
              size="lg"
              icon={
                !isLoading ? (
                  <Ionicons name="send" size={18} color={COLORS.background} />
                ) : undefined
              }
            />
          </GlassCard>
        </Animated.View>
        
        {/* Alternative Options */}
        <Animated.View style={[styles.alternativeSection, { opacity: fadeAnim }]}>
          <Text style={styles.alternativeText}>Or continue with</Text>
          
          <View style={styles.alternativeButtons}>
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => router.push('/auth/login')}
            >
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              <Text style={styles.alternativeButtonText}>Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => router.push('/auth/register')}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <Text style={styles.alternativeButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Terms */}
        <Animated.View style={[styles.termsSection, { opacity: fadeAnim }]}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  iconRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  inputCard: {
    marginBottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 37, 48, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    minHeight: 52,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  alternativeSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  alternativeText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  alternativeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  alternativeButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  termsSection: {
    paddingHorizontal: 40,
    marginTop: 16,
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
