// ============================================
// SMART RIDE MOBILE - RESET PASSWORD SCREEN
// ============================================
// Premium futuristic design matching login page
// Glassmorphism + animated background + neon accents
// Validates token from deep link / URL query param
// Password strength indicator matching web admin
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
  Dimensions,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resetPassword } from '../../services/auth';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#00FF88',          // Neon Green - Smart Ride brand
  primaryDark: '#00CC6D',
  accent: '#00FFF3',           // Cyan - Secondary accent
  background: '#0D0D12',       // Dark background
  backgroundElevated: '#1A1A24',
  backgroundSurface: '#252530',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDim: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderGlow: 'rgba(0, 255, 136, 0.3)',
  error: '#F43F5E',
  success: '#00FF88',
};

// Password strength requirements (matching web admin)
const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'match', label: 'Passwords match', test: (_p: string, confirm: string) => confirm.length > 0 && _p === confirm },
];

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Validate token on mount
    if (!token) {
      setTokenValid(false);
      setError('No reset token found. Please request a new password reset link.');
    } else {
      setTokenValid(true);
    }

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
  }, [token]);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handleSubmit = async () => {
    setError(null);

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (!confirmPassword) {
      setError('Please confirm your new password');
      return;
    }

    // Validate password requirements
    const failedReq = PASSWORD_REQUIREMENTS.find(r => !r.test(newPassword, confirmPassword));
    if (failedReq) {
      if (failedReq.key === 'match') {
        setError('Passwords do not match');
      } else {
        setError(`Password requirement not met: ${failedReq.label}`);
      }
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(token!, newPassword);

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.replace('/auth/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overall password strength
  const getPasswordStrength = () => {
    const metCount = PASSWORD_REQUIREMENTS.filter(r => r.test(newPassword, confirmPassword)).length;
    if (metCount <= 1) return { label: 'Weak', color: COLORS.error, percent: 20 };
    if (metCount === 2) return { label: 'Fair', color: '#F59E0B', percent: 40 };
    if (metCount === 3) return { label: 'Good', color: '#3B82F6', percent: 60 };
    if (metCount === 4) return { label: 'Strong', color: COLORS.accent, percent: 80 };
    return { label: 'Very Strong', color: COLORS.success, percent: 100 };
  };

  const strength = getPasswordStrength();

  const renderContent = () => {
    if (success) {
      return (
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successMessage}>
            Your password has been reset successfully. Redirecting to login...
          </Text>
          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={() => router.replace('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.backToLoginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tokenValid === false) {
      return (
        <View style={styles.invalidTokenContainer}>
          <View style={styles.invalidIconContainer}>
            <Text style={styles.invalidIcon}>✕</Text>
          </View>
          <Text style={styles.invalidTitle}>Invalid Link</Text>
          <Text style={styles.invalidMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.requestNewLinkButton}
            onPress={() => router.replace('/auth/forgot-password')}
            activeOpacity={0.8}
          >
            <Text style={styles.requestNewLinkButtonText}>Request New Link</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Reset form
    return (
      <>
        <View style={styles.shieldContainer}>
          <Text style={styles.shieldIcon}>🛡</Text>
        </View>
        <Text style={styles.formTitle}>New Password</Text>
        <Text style={styles.formSubtitle}>
          Create a strong password for your admin account
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* New Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              placeholderTextColor={COLORS.textDim}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Strength Bar */}
        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBarBackground}>
              <View 
                style={[
                  styles.strengthBarFill, 
                  { width: `${strength.percent}%`, backgroundColor: strength.color }
                ]} 
              />
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        )}

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your new password"
              placeholderTextColor={COLORS.textDim}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (error) setError(null);
              }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity 
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements Checklist */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password requirements:</Text>
          {PASSWORD_REQUIREMENTS.map((req) => {
            const met = req.test(newPassword, confirmPassword);
            return (
              <View key={req.key} style={styles.requirementRow}>
                <View style={[styles.requirementDot, { backgroundColor: met ? COLORS.success : 'rgba(255,255,255,0.2)' }]} />
                <Text style={[styles.requirementText, { color: met ? 'rgba(0, 255, 136, 0.7)' : 'rgba(255, 255, 255, 0.3)' }]}>
                  {req.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.background} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </>
    );
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
        {/* Header with Logo */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Floating Logo */}
          <Animated.View style={{ transform: [{ translateY: logoFloat }] }}>
            <View style={styles.logoContainer}>
              <Animated.View style={[styles.logoGlow, { opacity: glowOpacity }]} />
              <Text style={styles.logoText}>SR</Text>
            </View>
          </Animated.View>

          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>
            Create a new secure password
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View 
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {renderContent()}
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
              onPress={() => router.replace('/auth/login')}
              disabled={isLoading}
            >
              <Text style={styles.backLink}>← Back to Login</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Security Notice */}
        <Animated.View style={[styles.securityNotice, { opacity: fadeAnim }]}>
          <Text style={styles.securityText}>
            🔒 Secure reset • Smart Ride Admin
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
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
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
    marginBottom: 20,
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
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 8,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: -8,
    backgroundColor: 'rgba(26, 26, 36, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shieldContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  shieldIcon: {
    fontSize: 24,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  formSubtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 14,
    fontSize: 14,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 16,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  strengthBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 75,
    textAlign: 'right',
  },
  requirementsContainer: {
    backgroundColor: 'rgba(37, 37, 48, 0.5)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
  },
  requirementsTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  requirementText: {
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
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
  successIcon: {
    fontSize: 28,
    color: COLORS.success,
    fontWeight: 'bold',
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
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  backToLoginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backToLoginButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  invalidTokenContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  invalidIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  invalidIcon: {
    fontSize: 28,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  invalidTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  invalidMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  requestNewLinkButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'rgba(0, 255, 136, 0.2)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  requestNewLinkButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
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
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  securityText: {
    color: COLORS.textDim,
    fontSize: 11,
  },
});
