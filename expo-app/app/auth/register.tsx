// ============================================
// SMART RIDE MOBILE - REGISTER SCREEN
// ============================================
// Premium, progressive-disclosure sign-up (Uber / Bolt / Material 3 feel):
//   Step 1 — account details (name, email, phone, password) + Google / Phone
//   Step 2 — "I want to join as": one elegant grouped selector
//            (Client · Rider ▸ Boda/Car/Delivery · Business ▸ Merchant/Pharmacist)
//            + Terms + Create Account
// Step 3 (extra info per account type) is the existing onboarding flow the
// user is routed into after registration (/rider/onboarding, /merchant/register).
//
// Android-cursor safety: text fields are a self-contained memoized <Field/> that
// keeps its own focus state, so typing in one field never re-renders/!jumps the
// others. No Animated transforms wrap inputs.
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { statusCodes, GoogleSignin, configureGoogleSignIn } from '../../src/config/google';
import { registerUser, isAuthenticated, loginWithGoogle, getAccessToken, getUserData } from '../../src/services/auth';
import { useAuthStore } from '../../src/store/authStore';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS, OPACITY, BORDER } from '../../src/constants';
import { useTheme } from '../../src/context/theme-context';
import { makeThemedColors, ThemedColors } from '../../src/theme/themedColors';
import SmartRideLogoImage from '../../assets/images/smartride-logo.png';
import { navigateToRoleHome } from '../../src/utils/roleRouting';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Account type model ────────────────────────────
// Six backend roles grouped into three human-friendly choices.
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

// ============================================================
// Self-contained text field (own focus state → no cursor jump)
// ============================================================
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon: string;
  COLORS: ThemedColors;
  styles: ReturnType<typeof createStyles>;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  secure?: boolean;
  onToggleSecure?: () => void;
  secureVisible?: boolean;
  prefix?: string;
  hint?: string;
  editable?: boolean;
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
}

const Field = React.memo(function Field(props: FieldProps) {
  const { label, value, onChangeText, placeholder, icon, COLORS, styles, keyboardType = 'default', autoCapitalize = 'none', secure, onToggleSecure, secureVisible, prefix, hint, editable = true, returnKeyType, onSubmitEditing } = props;
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Ionicons name={icon as any} size={20} color={focused ? COLORS.primary : COLORS.onSurfaceVariant} style={styles.inputIcon} />
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.outline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !secureVisible}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={1.3}
        />
        {secure ? (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={secureVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
});

export default function RegisterScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  // ── Validation ───────────────────────────────
  const validateStep1 = (): boolean => {
    if (!name.trim()) { setError('Please enter your full name'); return false; }
    if (!email.trim()) { setError('Please enter your email'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return false; }
    if (!phone.trim()) { setError('Please enter your phone number'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return false; }
    if (!/[a-z]/.test(password)) { setError('Password must contain at least one lowercase letter'); return false; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number'); return false; }
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

  // ── Role selection ───────────────────────────
  const selectRole = useCallback((role: RoleId) => {
    setError(null);
    setSelectedRole(role);
  }, []);

  const toggleGroup = useCallback((group: GroupId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenGroup((cur) => (cur === group ? null : group));
  }, []);

  // ── Submit (email/password registration) ─────
  const handleRegister = async () => {
    if (!validateStep1()) { setStep(1); return; }
    if (!agreedToTerms) { setError('Please agree to the Terms of Service and Privacy Policy'); return; }

    setIsLoading(true);
    setError(null);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+256${phone.replace(/^0+/, '')}`;
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

  // ── Google ───────────────────────────────────
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

  const handlePhoneRegister = () => {
    router.push({ pathname: '/auth/phone-login', params: { purpose: 'register' } });
  };

  const busy = isLoading || googleLoading;

  // ── Grouped selector row helpers ─────────────
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {/* App bar with 2-step progress */}
      <View style={[styles.appBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
          <View style={[styles.progressFill, step === 2 ? styles.progressFillOn : styles.progressFillOff]} />
        </View>
        <Text style={styles.stepText}>{step} / 2</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brandRow}>
          <Image source={SmartRideLogoImage} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brandName}>Smart Ride</Text>
            <Text style={styles.brandTag}>Drive. Deliver. Earn.</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join Smart Ride and enjoy safe, reliable rides, deliveries and more.</Text>

            <Field label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" icon="person-outline" autoCapitalize="words" COLORS={COLORS} styles={styles} editable={!busy} />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" icon="mail-outline" keyboardType="email-address" COLORS={COLORS} styles={styles} editable={!busy} />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="700 000 000" icon="call-outline" keyboardType="phone-pad" prefix="+256" COLORS={COLORS} styles={styles} editable={!busy} />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" icon="lock-closed-outline" secure secureVisible={showPassword} onToggleSecure={() => setShowPassword((s) => !s)} hint="Min 8 characters, with uppercase & a number" COLORS={COLORS} styles={styles} editable={!busy} />
            <Field label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" icon="lock-closed-outline" secure secureVisible={showConfirmPassword} onToggleSecure={() => setShowConfirmPassword((s) => !s)} COLORS={COLORS} styles={styles} editable={!busy} returnKeyType="done" onSubmitEditing={goToStep2} />

            <TouchableOpacity style={styles.cta} onPress={goToStep2} activeOpacity={0.9} disabled={busy}>
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.onPrimary} />
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={[styles.socialButton, styles.googleButton]} onPress={handleGoogleSignIn} disabled={busy} activeOpacity={0.85}>
              {googleLoading ? <ActivityIndicator color={COLORS.googleBlue} /> : (<><Ionicons name="logo-google" size={20} color={COLORS.googleBlue} /><Text style={styles.googleText}>Continue with Google</Text></>)}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, styles.phoneButton]} onPress={handlePhoneRegister} disabled={busy} activeOpacity={0.85}>
              <Ionicons name="call" size={19} color={COLORS.inverseOnSurface} />
              <Text style={styles.phoneText}>Continue with Phone</Text>
            </TouchableOpacity>

            <View style={styles.signInRow}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>I want to join as</Text>
            <Text style={styles.subtitle}>Choose how you&apos;ll use Smart Ride. You can change this later.</Text>

            {/* Client — direct choice */}
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

            <TouchableOpacity style={[styles.cta, (!agreedToTerms || busy) && styles.ctaDisabled]} onPress={handleRegister} activeOpacity={0.9} disabled={!agreedToTerms || busy}>
              {isLoading ? <ActivityIndicator color={COLORS.onPrimary} /> : (<><Text style={styles.ctaText}>Create Account</Text><Ionicons name="arrow-forward" size={20} color={COLORS.onPrimary} /></>)}
            </TouchableOpacity>

            <View style={styles.safeNote}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
              <Text style={styles.safeNoteText}>Safe. Secure. Always. Your data is protected and never shared.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // App bar + progress
  appBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 6 },
  progressFill: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  progressFillOn: { backgroundColor: COLORS.primary },
  progressFillOff: { backgroundColor: COLORS.borderLight },
  stepText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
  },
  brandName: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: '700',
    color: COLORS.primary,
  },
  brandTag: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  title: {
    ...TYPOGRAPHY.displayLg,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
  },

  // Fields
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputWrapFocused: {
    borderColor: COLORS.primary,
    borderWidth: BORDER.emphasis,
    backgroundColor: COLORS.backgroundElevated,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  inputPrefix: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    paddingVertical: SPACING.sm,
  },
  fieldHint: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },

  // Primary CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 56,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.lg,
    ...SHADOWS.button,
  },
  ctaDisabled: {
    opacity: OPACITY.disabled,
  },
  ctaText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onPrimary,
  },

  // Divider + social
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: BORDER.hairline,
    backgroundColor: COLORS.borderLight,
  },
  dividerText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.sm,
  },
  googleButton: {
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.border,
  },
  googleText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  phoneButton: {
    backgroundColor: COLORS.inverseSurface,
  },
  phoneText: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.inverseOnSurface,
  },

  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  signInText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  signInLink: {
    ...TYPOGRAPHY.bodySm,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Grouped account selector
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  groupCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: BORDER.hairline,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  groupCardOn: {
    borderColor: COLORS.primary,
    borderWidth: BORDER.emphasis,
    backgroundColor: COLORS.primaryContainer + '14',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  groupIconWrapOn: {
    backgroundColor: COLORS.primary,
  },
  groupLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  optionText: {
    flex: 1,
  },
  optionDesc: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  groupBody: {
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: BORDER.hairline,
    borderColor: 'transparent',
  },
  optionRowOn: {
    borderColor: COLORS.primary,
    borderWidth: BORDER.emphasis,
    backgroundColor: COLORS.primaryContainer + '10',
  },
  optionLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
  },
  optionLabelOn: {
    color: COLORS.primary,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.outline,
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
    gap: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: BORDER.emphasis,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  checkboxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  safeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  safeNoteText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
});
