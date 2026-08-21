// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Progressive-disclosure sign-up on the shared auth design language:
//   Step 1 "Details" — account details (name, email, phone, password) + Google / Phone
//   Step 2 "Role"    — "I want to join as": one grouped selector
//            (Client / Rider > Boda/Car/Delivery / Business > Merchant/Pharmacist)
//            + Terms + Create Account
// Step 3 (extra info per account type) is the existing onboarding flow the
// user is routed into after registration (/rider/onboarding, /merchant/register).
//
// Android-cursor safety: the text fields are FieldCard, a memoised leaf with
// no focus state (see src/components/auth/FieldCard.tsx). The `trailing`
// adornments are memoised too, otherwise a fresh JSX object every render
// would defeat React.memo and put us back where we started. No Animated
// transforms wrap the inputs.
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { registerUser, isAuthenticated, loginWithGoogle, getAccessToken, getUserData } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { SPACING, RADIUS, TYPOGRAPHY, OPACITY, BORDER, ICON } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { makeThemedColors, ThemedColors, withAlpha } from '../../src/theme/themedColors';
import { navigateToRoleHome } from '../../src/utils/roleRouting';
import { normalizePhone } from '../../src/utils/phone';
import { validatePassword } from '../../src/utils/password';
import { GradientButton } from '../../src/components/GradientButton';
import {
  AuthScreen,
  FieldCard,
  PhoneFieldCard,
  PasswordStrength,
  AuthDivider,
  SocialButtons,
} from '../../src/components/auth';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Account type model: six backend roles grouped into three human-friendly choices.
type RoleId = 'CLIENT' | 'RIDER' | 'DRIVER' | 'DELIVERY' | 'MERCHANT' | 'PHARMACIST';
type GroupId = 'rider' | 'business';

const RIDER_OPTIONS: { id: RoleId; label: string; desc: string; icon: string }[] = [
  { id: 'RIDER', label: 'Smart Boda', desc: 'Ride with a boda', icon: 'bicycle' },
  { id: 'DRIVER', label: 'Smart Car', desc: 'Drive with a car', icon: 'car-sport' },
  { id: 'DELIVERY', label: 'Delivery Rider', desc: 'Deliver packages & items', icon: 'cube' },
];
const BUSINESS_OPTIONS: { id: RoleId; label: string; desc: string; icon: string }[] = [
  { id: 'MERCHANT', label: 'Merchant', desc: 'Restaurant or shop', icon: 'storefront' },
  { id: 'PHARMACIST', label: 'Pharmacist', desc: 'Medicine & health', icon: 'medkit' },
];
const RIDER_IDS: RoleId[] = ['RIDER', 'DRIVER', 'DELIVERY'];
const BUSINESS_IDS: RoleId[] = ['MERCHANT', 'PHARMACIST'];

const STEP_LABELS = ['Details', 'Role'];

export default function RegisterScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [selectedRole, setSelectedRole] = useState<RoleId>('CLIENT');
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);

  // Map a selected UI role to the backend UserRole + where onboarding starts.
  // Delivery riders are RIDERs who pick a delivery vehicle in onboarding.
  const backendRoleFor = (r: RoleId) => (r === 'DELIVERY' ? 'RIDER' : r);
  const routeAfterRegister = (r: RoleId) => {
    switch (r) {
      case 'RIDER': return '/rider/onboarding?vehicle=MOTORCYCLE';
      case 'DRIVER': return '/rider/onboarding?vehicle=CAR';
      case 'DELIVERY': return '/rider/onboarding?vehicle=BICYCLE';
      case 'MERCHANT': return '/merchant/register';
      case 'PHARMACIST': return '/merchant/register?type=PHARMACY';
      default: return '/(tabs)';
    }
  };

  useEffect(() => {
    configureGoogleSignIn();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    const { isAuthenticated: storeAuth, user } = useAuthStore.getState();
    if (authenticated || storeAuth) {
      navigateToRoleHome(user?.role);
    }
  };

  // Validation. The password rules come from src/utils/password.ts, which
  // mirrors the server's validatePasswordStrength.
  const validateStep1 = (): boolean => {
    if (!name.trim()) { setError('Please enter your full name'); return false; }
    if (!email.trim()) { setError('Please enter your email'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return false; }
    if (!phone.trim()) { setError('Please enter your phone number'); return false; }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const goToStep2 = () => {
    setError(null);
    if (!validateStep1()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(2);
  };

  const goBack = () => {
    if (step === 2) {
      setError(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStep(1);
    } else {
      router.back();
    }
  };

  // Role selection
  const selectRole = useCallback((role: RoleId) => {
    setError(null);
    setSelectedRole(role);
  }, []);

  const toggleGroup = useCallback((group: GroupId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenGroup((cur) => (cur === group ? null : group));
  }, []);

  // Submit (email/password registration)
  const handleRegister = async () => {
    if (!validateStep1()) { setStep(1); return; }
    if (!agreedToTerms) { setError('Please agree to the Terms of Service and Privacy Policy'); return; }

    setIsLoading(true);
    setError(null);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : normalizePhone(phone);
      const result = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: formattedPhone,
        password,
        role: backendRoleFor(selectedRole),
      });

      if (result.success) {
        const token = await getAccessToken();
        const userData = await getUserData();
        if (token && userData) {
          useAuthStore.getState().login({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            role: userData.role || backendRoleFor(selectedRole),
          }, token);
        }
        router.replace(routeAfterRegister(selectedRole) as any);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google
  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      setError('Google Sign-In is not available on this build. Please use phone or email registration.');
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      configureGoogleSignIn();
      const hasPlay = await GoogleSignin.hasPlayServices();
      if (!hasPlay) { setError('Google Play Services is required. Please update your device.'); return; }
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const result = await loginWithGoogle(userInfo.data.idToken);
        if (result.success) {
          const token = await getAccessToken();
          const userData = await getUserData();
          if (token && userData) {
            useAuthStore.getState().login({
              id: userData.id, email: userData.email, name: userData.name, phone: userData.phone, role: userData.role,
            }, token);
          }
          router.replace('/auth/role-selection' as any);
        } else {
          setError(result.error || 'Google sign-in failed');
        }
      } else {
        setError('Google Sign-In did not return a valid token. Please try again.');
      }
    } catch (err: any) {
      const errCode = (err?.code ?? '') + '';
      const errMsg = (err?.message ?? '') + '';
      const isCancelled = errCode === statusCodes.SIGN_IN_CANCELLED || errCode === 'SIGN_IN_CANCELLED' || errMsg.includes('SIGN_IN_CANCELLED');
      const isDeveloperError = errCode === statusCodes.DEVELOPER_ERROR || errCode === 'DEVELOPER_ERROR' || errMsg.includes('DEVELOPER_ERROR');
      const isPlayServicesMissing = errCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE || errCode === 'PLAY_SERVICES_NOT_AVAILABLE' || errMsg.includes('PLAY_SERVICES_NOT_AVAILABLE');
      const isInProgress = errCode === statusCodes.IN_PROGRESS || errCode === 'IN_PROGRESS';
      if (isCancelled || isInProgress) { /* silent */ }
      else if (isDeveloperError) setError('Google Sign-In needs to be reconfigured for this build. Please use email/phone registration for now.');
      else if (isPlayServicesMissing) setError('Google Play Services is not available on this device');
      else setError(errMsg.split(': Follow troubleshooting')[0] || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePhoneRegister = useCallback(() => {
    router.push({ pathname: '/auth/phone-login', params: { purpose: 'register' } });
  }, [router]);

  const busy = isLoading || googleLoading;

  // Memoised so FieldCard's React.memo actually holds. A fresh JSX object on
  // every keystroke would re-render the field and reintroduce the caret jump.
  const passwordToggle = useMemo(
    () => (
      <TouchableOpacity
        onPress={() => setShowPassword((s) => !s)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={ICON.md} color={COLORS.textMuted} />
      </TouchableOpacity>
    ),
    [showPassword, COLORS.textMuted]
  );

  const confirmToggle = useMemo(
    () => (
      <TouchableOpacity
        onPress={() => setShowConfirmPassword((s) => !s)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
      >
        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={ICON.md} color={COLORS.textMuted} />
      </TouchableOpacity>
    ),
    [showConfirmPassword, COLORS.textMuted]
  );

  const strengthFooter = useMemo(
    () => <PasswordStrength password={password} />,
    [password]
  );

  // Grouped selector row helpers
  const Radio = ({ on }: { on: boolean }) => (
    <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
  );

  const OptionRow = ({ id, label, desc, icon }: { id: RoleId; label: string; desc: string; icon: string }) => {
    const on = selectedRole === id;
    return (
      <TouchableOpacity style={[styles.optionRow, on && styles.optionRowOn]} onPress={() => selectRole(id)} activeOpacity={0.8} accessibilityRole="radio" accessibilityState={{ selected: on }}>
        <Ionicons name={icon as any} size={20} color={on ? COLORS.primary : COLORS.onSurfaceVariant} />
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{label}</Text>
          <Text style={styles.optionDesc}>{desc}</Text>
        </View>
        <Radio on={on} />
      </TouchableOpacity>
    );
  };

  const GroupCard = ({ group, icon, label, desc, options }: { group: GroupId; icon: string; label: string; desc: string; options: typeof RIDER_OPTIONS }) => {
    const ids = group === 'rider' ? RIDER_IDS : BUSINESS_IDS;
    const groupHasSelection = ids.includes(selectedRole);
    const open = openGroup === group;
    return (
      <View style={[styles.groupCard, groupHasSelection && styles.groupCardOn]}>
        <TouchableOpacity style={styles.groupHeader} onPress={() => toggleGroup(group)} activeOpacity={0.8}>
          <View style={[styles.groupIconWrap, groupHasSelection && styles.groupIconWrapOn]}>
            <Ionicons name={icon as any} size={20} color={groupHasSelection ? COLORS.onPrimary : COLORS.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.groupLabel}>{label}</Text>
            <Text style={styles.optionDesc}>{groupHasSelection ? options.find((o) => o.id === selectedRole)?.label : desc}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        {open ? (
          <View style={styles.groupBody}>
            {options.map((o) => <OptionRow key={o.id} {...o} />)}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <AuthScreen
      onBack={goBack}
      step={{ current: step, labels: STEP_LABELS }}
      lead={step === 1 ? 'Create your' : 'Choose your'}
      accent={step === 1 ? 'account' : 'role'}
      subtitle={
        step === 1
          ? 'Join Smart Ride and enjoy safe, reliable rides, deliveries and more.'
          : 'Pick how you will use Smart Ride. You can change this later.'
      }
      showHero={step === 1}
    >
      {/* Always mounted so revealing an error never re-lays-out a live field. */}
      <View style={[styles.errorBanner, !error && styles.hidden]}>
        <Ionicons name="alert-circle" size={16} color={COLORS.error} />
        <Text style={styles.errorText}>{error || ''}</Text>
      </View>

      {step === 1 ? (
        <>
          <FieldCard
            label="Full Name"
            icon="person-outline"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!busy}
            maxFontSizeMultiplier={1.3}
          />

          <FieldCard
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!busy}
            maxFontSizeMultiplier={1.3}
          />

          <PhoneFieldCard
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />

          <FieldCard
            label="Password"
            icon="lock-closed-outline"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!busy}
            maxFontSizeMultiplier={1.3}
            trailing={passwordToggle}
            footer={strengthFooter}
          />

          <FieldCard
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={goToStep2}
            maxFontSizeMultiplier={1.3}
            trailing={confirmToggle}
          />

          <GradientButton
            title="Continue"
            onPress={goToStep2}
            disabled={busy}
            size="lg"
            shape="pill"
            iconPosition="right"
            icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
            style={styles.cta}
          />

          <AuthDivider style={styles.divider} />

          <SocialButtons
            onGoogle={handleGoogleSignIn}
            googleLoading={googleLoading}
            onPhone={handlePhoneRegister}
            disabled={busy}
          />

          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {/* Client, a direct choice */}
          <TouchableOpacity style={[styles.groupCard, styles.clientCard, selectedRole === 'CLIENT' && styles.groupCardOn]} onPress={() => selectRole('CLIENT')} activeOpacity={0.85} accessibilityRole="radio" accessibilityState={{ selected: selectedRole === 'CLIENT' }}>
            <View style={[styles.groupIconWrap, selectedRole === 'CLIENT' && styles.groupIconWrapOn]}>
              <Ionicons name="person" size={20} color={selectedRole === 'CLIENT' ? COLORS.onPrimary : COLORS.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.groupLabel}>Client</Text>
              <Text style={styles.optionDesc}>Ride, food, shopping & deliveries</Text>
            </View>
            <Radio on={selectedRole === 'CLIENT'} />
          </TouchableOpacity>

          <GroupCard group="rider" icon="bicycle" label="Rider" desc="Earn on the road" options={RIDER_OPTIONS} />
          <GroupCard group="business" icon="storefront" label="Business" desc="Sell & manage on Smart Ride" options={BUSINESS_OPTIONS} />

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms((v) => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}>
              {agreedToTerms ? <Ionicons name="checkmark" size={15} color={COLORS.onPrimary} /> : null}
            </View>
            <Text style={styles.termsText}>
              By creating an account you agree to our{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL('https://smartrideug.vercel.app/terms')}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL('https://smartrideug.vercel.app/privacy')}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          <GradientButton
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={!agreedToTerms || busy}
            size="lg"
            shape="pill"
            iconPosition="right"
            icon={<Ionicons name="arrow-forward" size={ICON.md} color="#FFFFFF" />}
            style={styles.cta}
          />

          <View style={styles.safeNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
            <Text style={styles.safeNoteText}>Safe. Secure. Always. Your data is protected and never shared.</Text>
          </View>
        </>
      )}
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
    cta: {
      marginTop: SPACING.sm,
    },
    divider: {
      marginVertical: SPACING.sm,
    },

    // Role selector
    groupCard: {
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.border,
      backgroundColor: COLORS.authCard,
      overflow: 'hidden',
    },
    groupCardOn: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.authGutter,
    },
    clientCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      padding: SPACING.md,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      padding: SPACING.md,
    },
    groupIconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.authGutter,
    },
    groupIconWrapOn: {
      backgroundColor: COLORS.primary,
    },
    groupLabel: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
    },
    groupBody: {
      borderTopWidth: BORDER.hairline,
      borderTopColor: COLORS.authHairline,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      paddingVertical: SPACING.gutter,
      paddingHorizontal: SPACING.md,
    },
    optionRowOn: {
      backgroundColor: COLORS.authGutter,
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurface,
      fontWeight: '600',
    },
    optionLabelOn: {
      color: COLORS.primary,
    },
    optionDesc: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.full,
      borderWidth: BORDER.emphasis,
      borderColor: COLORS.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: {
      borderColor: COLORS.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },

    // Terms
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.gutter,
      marginTop: SPACING.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.sm + 2,
      borderWidth: BORDER.emphasis,
      borderColor: COLORS.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxOn: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    termsText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
      flex: 1,
      lineHeight: 20,
    },
    termsLink: {
      color: COLORS.primary,
      fontWeight: '600',
    },

    // Footer bits
    signInRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.md,
    },
    signInText: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurfaceVariant,
    },
    signInLink: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.primary,
      fontWeight: '700',
    },
    safeNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.sm,
      opacity: OPACITY.pressed,
    },
    safeNoteText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.textMuted,
      flex: 1,
    },
  });
