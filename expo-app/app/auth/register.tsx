// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Stitch Design System — Material Design 3 Green Theme
// "Create Account" layout matching Stitch design files
// PRIMARY: Phone OTP, SECONDARY: Email/Password, TERTIARY: Google
// NO FadeInDown per-input animations (causes cursor jumping)
// Single fade animation for the whole form
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { registerUser, isAuthenticated, loginWithGoogle, saveTokens, saveUserData, getAccessToken, getUserData } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../src/constants';
import { IconInput } from '../../src/components/IconInput';
import { GradientButton } from '../../src/components/GradientButton';
import SmartRideLogoImage from '../../assets/images/smartride-logo.png';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Role selection
  const [selectedRole, setSelectedRole] = useState<string>('CLIENT');

  const ROLES = [
    { id: 'CLIENT', label: 'Client', icon: 'car-outline', desc: 'Book rides & order' },
    { id: 'RIDER', label: 'Rider / Boda', icon: 'bicycle-outline', desc: 'Earn on the road' },
    { id: 'DRIVER', label: 'Driver', icon: 'bus-outline', desc: 'Professional driver' },
    { id: 'MERCHANT', label: 'Merchant', icon: 'storefront-outline', desc: 'Sell & deliver' },
    { id: 'PHARMACIST', label: 'Pharmacist', icon: 'medkit-outline', desc: 'Medicine & healthcare' },
  ];

  // Animation for initial entrance — switches to plain View after completion
  // to prevent Animated transforms from interfering with TextInput cursor on Android
  const [animationDone, setAnimationDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    configureGoogleSignIn();
    checkAuth();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animation completes, switch to plain Views
      // Animated.View with transforms can cause cursor jumping on Android
      setAnimationDone(true);
    });
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth, user } = useAuthStore.getState();
    if (authenticated || storeAuth) {
      const role = user?.role;
      if (role === 'RIDER') {
        router.replace('/rider/onboarding');
      } else if (role === 'MERCHANT') {
        router.replace('/merchant/register');
      } else if (role === 'DRIVER') {
        router.replace('/driver/index');
      } else if (role === 'CLIENT') {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/role-selection');
      }
    }
  };

  // Navigate based on user role
  const navigateByRole = (role?: string) => {
    if (role === 'RIDER') {
      router.replace('/rider/onboarding');
    } else if (role === 'MERCHANT') {
      router.replace('/merchant/register');
    } else if (role === 'DRIVER') {
      router.replace('/driver/index');
    } else if (role === 'CLIENT') {
      router.replace('/(tabs)');
    } else {
      // No role set — show role selection
      router.replace('/auth/role-selection');
    }
  };

  // PRIMARY: Phone OTP Registration
  const handlePhoneRegister = () => {
    router.push({
      pathname: '/auth/phone-login',
      params: { purpose: 'register' },
    });
  };

  // TERTIARY: Google Sign-In
  const handleGoogleSignIn = async () => {
    // Guard: if native module not available, show error
    if (!GoogleSignin) {
      setError('Google Sign-In is not available on this build. Please use phone or email registration.');
      return;
    }

    setGoogleLoading(true);
    setError(null);

    try {
      // Ensure Google Sign-In is configured (safe to call multiple times)
      configureGoogleSignIn();

      console.log('[REGISTER] GoogleSignin: Checking Play Services...');
      const hasPlay = await GoogleSignin.hasPlayServices();
      console.log('[REGISTER] GoogleSignin: hasPlayServices =', hasPlay);
      if (!hasPlay) {
        setError('Google Play Services is required. Please update your device.');
        return;
      }

      console.log('[REGISTER] GoogleSignin: Calling signIn()...');
      const userInfo = await GoogleSignin.signIn();
      console.log('[REGISTER] GoogleSignin: signIn() returned:', JSON.stringify({
        type: userInfo.type,
        hasData: !!userInfo.data,
        hasIdToken: !!userInfo.data?.idToken,
        user: userInfo.data?.user ? {
          email: userInfo.data.user.email,
          name: userInfo.data.user.name,
          id: userInfo.data.user.id,
        } : null,
      }));

      // v16 API: userInfo.data contains the user info
      if (userInfo.data?.idToken) {
        console.log('[REGISTER] GoogleSignin: Got idToken, sending to backend...');
        // Send the idToken to our backend
        const result = await loginWithGoogle(userInfo.data.idToken);

        if (result.success) {
          // Sync with auth store
          const token = await getAccessToken();
          const userData = await getUserData();
          if (token && userData) {
            useAuthStore.getState().login({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              phone: userData.phone,
              role: userData.role,
            }, token);
          }
          navigateByRole(userData?.role);
        } else {
          setError(result.error || 'Google sign-in failed');
        }
      } else {
        console.warn('[REGISTER] GoogleSignin: No idToken in response. Full response:', JSON.stringify(userInfo));
        setError('Google Sign-In did not return a valid token. Please try again.');
      }
    } catch (err: any) {
      console.error('[REGISTER] Google Sign-In error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
        name: err.name,
        nativeErrorMessage: err.nativeErrorMessage,
        allKeys: Object.keys(err),
        stringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[REGISTER] GoogleSignin: User cancelled sign-in');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress — silent
      } else if (err.code === statusCodes.DEVELOPER_ERROR) {
        console.error('[REGISTER] DEVELOPER_ERROR: This typically means the APK signing certificate ' +
          'does not match any OAuth client in google-services.json. ' +
          'Check: 1) SHA-1 of the APK cert matches Firebase, 2) androidClientId is NOT being passed in configure(), ' +
          '3) google-services.json is bundled in the APK');
        setError(
          'Google Sign-In is not configured for this device. ' +
          'Please ensure Google Play Services is up to date, or try another registration method.'
        );
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services is not available on this device');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
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
        role: selectedRole,
      });

      if (result.success) {
        // Sync with auth store
        const token = await getAccessToken();
        const userData = await getUserData();
        if (token && userData) {
          useAuthStore.getState().login({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            role: userData.role || selectedRole,
          }, token);
        }
        // Navigate based on role
        if (selectedRole === 'RIDER') {
          router.replace('/rider/onboarding');
        } else if (selectedRole === 'MERCHANT') {
          router.replace('/merchant/register');
        } else if (selectedRole === 'DRIVER') {
          router.replace('/driver/index');
        } else {
          router.replace('/(tabs)');
        }
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Subtle mesh gradient background */}
      <View style={styles.meshBackground}>
        <View style={styles.meshOrb1} />
        <View style={styles.meshOrb2} />
        <View style={styles.meshOrb3} />
      </View>

      {/* Fixed top app bar */}
      <View style={[styles.appBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Image
          source={SmartRideLogoImage}
          style={styles.appBarLogo}
          resizeMode="contain"
        />
        <View style={styles.appBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        {animationDone ? (
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Join the ride</Text>
            <Text style={styles.heroSubtitle}>
              Create your account and start moving with Smart Ride
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.heroTitle}>Join the ride</Text>
            <Text style={styles.heroSubtitle}>
              Create your account and start moving with Smart Ride
            </Text>
          </Animated.View>
        )}

        {/* PRIMARY: Phone OTP Registration */}
        {animationDone ? (
          <View style={styles.phoneSection}>
            <GradientButton
              title="Sign Up with Phone Number"
              onPress={handlePhoneRegister}
              variant="primary"
              size="lg"
              icon={
                <Ionicons name="call" size={20} color={COLORS.onPrimary} />
              }
            />
            <Text style={styles.phoneHint}>
              Quick sign up with OTP — no password needed
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.phoneSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <GradientButton
              title="Sign Up with Phone Number"
              onPress={handlePhoneRegister}
              variant="primary"
              size="lg"
              icon={
                <Ionicons name="call" size={20} color={COLORS.onPrimary} />
              }
            />
            <Text style={styles.phoneHint}>
              Quick sign up with OTP — no password needed
            </Text>
          </Animated.View>
        )}

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or register with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Registration Form — plain View after animation to prevent cursor jump */}
        <View>
          <View style={styles.formCard}>
            {/* Error Display — always rendered to prevent layout shift (cursor jump) */}
            <View style={[styles.errorContainer, !error && styles.errorHidden]}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error || ''}</Text>
            </View>

            {/* Full Name Input */}
            <IconInput
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              icon="person-outline"
              autoCapitalize="words"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Email Input */}
            <IconInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Phone Number Input */}
            <IconInput
              label="Phone Number"
              placeholder="7XX XXX XXX"
              value={phone}
              onChangeText={setPhone}
              icon="call-outline"
              keyboardType="phone-pad"
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Password Input */}
            <IconInput
              label="Password"
              placeholder="Min 8 chars, upper, lower, number"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              editable={!isLoading}
              returnKeyType="next"
            />

            {/* Confirm Password Input */}
            <IconInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="lock-closed-outline"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleRegister}
            />

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>I want to use Smart Ride as:</Text>
              <View style={styles.roleGrid}>
                {ROLES.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleChip,
                        isSelected && styles.roleChipSelected,
                      ]}
                      onPress={() => setSelectedRole(role.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={role.icon as any} size={16} color={isSelected ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
                      <Text style={[
                        styles.roleChipLabel,
                        isSelected && styles.roleChipLabelSelected,
                      ]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.roleHint}>
                {selectedRole === 'RIDER'
                  ? 'You\'ll complete rider onboarding after registration'
                  : selectedRole === 'MERCHANT'
                  ? 'You\'ll set up your business after registration'
                  : 'Book rides, order food, shop & more'}
              </Text>
            </View>

            {/* Terms Checkbox */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                style={styles.checkboxWrap}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Agree to terms"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && (
                    <Ionicons name="checkmark" size={14} color={COLORS.onPrimary} />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://smartrideug.vercel.app/privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {/* Create Account CTA Button */}
            <View style={styles.ctaButtonContainer}>
              <GradientButton
                title="Create Account"
                variant="primary"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading || !agreedToTerms}
                size="lg"
              />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || isLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <Animated.View style={styles.googleLoadingContainer}>
                  <Ionicons name="refresh" size={20} color={COLORS.onSurface} />
                </Animated.View>
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Ionicons name="logo-google" size={20} color={COLORS.googleBlue} />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Decorative image card at bottom */}
        <View style={styles.decorativeCard}>
          <View style={styles.decorativeImageContainer}>
            <View style={styles.decorativeGradientOverlay}>
              <View style={styles.decorativeContent}>
                <Ionicons name="car-sport" size={32} color={COLORS.onPrimary} />
                <Text style={styles.decorativeTitle}>Start Riding Today</Text>
                <Text style={styles.decorativeSubtitle}>
                  Safe, affordable rides across Uganda
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer text */}
        <View style={styles.footerContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            disabled={isLoading || googleLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Security notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.outline} />
          <Text style={styles.securityText}>Secure registration  •  All data encrypted</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  // Subtle mesh gradient background
  meshBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  meshOrb1: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 95, 58, 0.04)',
  },
  meshOrb2: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(14, 122, 77, 0.03)',
  },
  meshOrb3: {
    position: 'absolute',
    top: height * 0.35,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(107, 255, 143, 0.03)',
  },
  // Fixed top app bar
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 56,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    ...SHADOWS.card,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.DEFAULT,
    marginLeft: -SPACING.xs,
  },
  appBarLogo: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
  },
  appBarSpacer: {
    width: 40,
  },
  // Scroll content
  scrollContent: {
    flexGrow: 1,
  },
  // Hero section
  heroSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  heroTitle: {
    ...TYPOGRAPHY.displayLg,
    color: COLORS.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  // Phone OTP section
  phoneSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  phoneHint: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  dividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginHorizontal: SPACING.md,
  },
  // Form card — Stitch design: bg-surface, p-lg, rounded-xl, shadow
  formCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  // Error
  errorContainer: {
    backgroundColor: COLORS.errorContainer,
    borderColor: 'rgba(186, 26, 26, 0.2)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onErrorContainer,
    flex: 1,
    lineHeight: 18,
  },
  // Hidden error state — preserves layout height to prevent cursor jump
  errorHidden: {
    opacity: 0,
    paddingVertical: 0,
    marginBottom: 0,
    borderWidth: 0,
    height: 0,
    overflow: 'hidden',
  },
  // Role selection
  roleSection: {
    marginTop: SPACING.md,
  },
  roleLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleChipSelected: {
    backgroundColor: 'rgba(0, 95, 58, 0.06)',
    borderColor: COLORS.primary,
  },
  roleChipIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  roleChipLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },
  roleChipLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  roleHint: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  // Terms checkbox
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  checkboxWrap: {
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // CTA button
  ctaButtonContainer: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  // Google Sign-In button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    minHeight: 52,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  googleLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Decorative card at bottom
  decorativeCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  decorativeImageContainer: {
    height: 140,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  decorativeGradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 95, 58, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  decorativeTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  decorativeSubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onPrimaryContainer,
    opacity: 0.9,
  },
  // Footer
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  signInText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  signInLink: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Security notice
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
    color: COLORS.outline,
  },
});
