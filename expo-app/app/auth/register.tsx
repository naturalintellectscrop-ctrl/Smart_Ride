// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Google Sign-In is the PRIMARY authentication method
// Email/password is secondary fallback
// ============================================

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { registerUser, isAuthenticated, saveTokens, saveUserData } from '../../services/auth';

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
  border: 'rgba(255, 255, 255, 0.08)',
  error: '#FF4757',
  googleBlue: '#4285F4',
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://smartrideug.vercel.app/api';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '531949209415-h0ri57i233r1l767tnc4i26brdt3asb3.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

export default function RegisterScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      router.replace('/(tabs)');
    }
  };

  // PRIMARY: Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.data?.idToken) {
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: userInfo.data.idToken }),
        });

        const result = await response.json();

        if (result.success) {
          // Save tokens and user data
          if (result.data?.accessToken) {
            await saveTokens(result.data.accessToken, result.data.refreshToken);
            if (result.data.user) {
              await saveUserData(result.data.user);
            }
          } else if (result.tokens?.accessToken) {
            await saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
            if (result.user) {
              await saveUserData(result.user);
            }
          }
          
          router.replace('/(tabs)');
        } else {
          setError(result.error || 'Google sign up failed');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  // SECONDARY: Email Registration
  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+256${phone.replace(/^0+/, '')}`;
      
      const result = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: formattedPhone,
        password,
      });

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join Smart Ride today</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* PRIMARY: Google Sign-In Button */}
          <TouchableOpacity 
            style={styles.googlePrimaryButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.googleLogo}>G</Text>
                <Text style={styles.googlePrimaryButtonText}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or register with email</Text>
            <View style={styles.divider} />
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              editable={!isLoading && !googleLoading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !googleLoading}
            />
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phonePrefix}>+256</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="7XX XXX XXX"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading && !googleLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading && !googleLoading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading && !googleLoading}
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading || googleLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/login')}
            disabled={isLoading || googleLoading}
          >
            <Text style={styles.signInLink}>Sign In</Text>
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
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: -20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: 'rgba(255, 71, 87, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginTop: 24,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
  },
  googlePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.googleBlue,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  googleLogo: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    marginRight: 12,
  },
  googlePrimaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: 16,
    fontSize: 14,
  },
  inputGroup: {
    marginTop: 16,
  },
  label: {
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phonePrefix: {
    paddingLeft: 16,
    color: COLORS.textSecondary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  eyeText: {
    fontSize: 18,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },
  registerButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    paddingHorizontal: 16,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  signInText: {
    color: COLORS.textSecondary,
  },
  signInLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
