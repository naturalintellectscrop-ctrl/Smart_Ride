// ============================================
// SMART RIDE MOBILE - MERCHANT / PHARMACY REGISTRATION
// ============================================
// Onboarding form for users becoming a Merchant or a Pharmacist.
// A Pharmacy is a Merchant of type PHARMACY with extra licensing fields, so
// the same screen serves both — pharmacy mode is entered via ?type=PHARMACY
// or when the signed-in user's role is PHARMACIST.
//
// Collects business details + REAL document uploads (business/pharmacy licence,
// National ID front/back) which are uploaded to storage and submitted as URLs.
// Submission creates a PENDING_APPROVAL record — the user is NOT active until
// an admin approves. No mock data, no auto-activation.
// ============================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  IconInput,
} from '@/src/components';
import { Ionicons } from '@expo/vector-icons';
import { pickImage } from '@/src/utils/imagePicker';
import { useAuthStore } from '@/src/store/authStore';

const MERCHANT_TYPES = [
  { key: 'RESTAURANT', label: 'Restaurant', icon: 'restaurant-outline', description: 'Food & beverage' },
  { key: 'SUPERMARKET', label: 'Supermarket', icon: 'cart-outline', description: 'Groceries & essentials' },
  { key: 'RETAIL_STORE', label: 'Retail Store', icon: 'storefront-outline', description: 'General merchandise' },
  { key: 'PHARMACY', label: 'Pharmacy', icon: 'medkit-outline', description: 'Health & medicine' },
  { key: 'GROCERY', label: 'Grocery', icon: 'leaf-outline', description: 'Fresh produce' },
];

type DocKey = 'businessLicense' | 'nationalIdFront' | 'nationalIdBack';

export default function MerchantRegisterScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const params = useLocalSearchParams<{ type?: string }>();
  const { user } = useAuthStore();

  // Pharmacy mode: explicit param OR the signed-in user is a pharmacist.
  const isPharmacy = params.type === 'PHARMACY' || user?.role === 'PHARMACIST';

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(isPharmacy ? 'PHARMACY' : '');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Pharmacy-specific fields
  const [pharmacyLicense, setPharmacyLicense] = useState('');
  const [pharmacistInCharge, setPharmacistInCharge] = useState('');
  const [pharmacistLicense, setPharmacistLicense] = useState('');

  // Uploaded document storage URLs
  const [docs, setDocs] = useState<Partial<Record<DocKey, string>>>({});
  const [uploading, setUploading] = useState<DocKey | null>(null);

  const [checking, setChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const licenceLabel = isPharmacy ? 'Pharmacy Licence' : 'Business Licence';

  // If the user already submitted an application, don't let them re-onboard —
  // send them to the right dashboard (which shows their approval status).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getMerchantProfile();
        const existing = res.success ? (res.data as any) : null;
        if (active && existing?.id) {
          const role = user?.role || (existing.type === 'PHARMACY' ? 'PHARMACIST' : 'MERCHANT');
          router.replace(role === 'PHARMACIST' ? '/pharmacist' : '/merchant');
          return;
        }
      } catch {
        // Not registered yet (or offline) — show the form.
      }
      if (active) setChecking(false);
    })();
    return () => { active = false; };
  }, []);

  const uploadDoc = useCallback(async (key: DocKey) => {
    const img = await pickImage({ aspect: [4, 3] });
    if (!img) return;
    setUploading(key);
    setError(null);
    try {
      const res = await api.uploadDocument({ uri: img.uri, type: img.type, name: img.name }, `merchant_${key}`);
      if (res.success && res.data?.url) {
        setDocs(prev => ({ ...prev, [key]: res.data!.url }));
      } else {
        setError(res.error || 'Upload failed. Please try again.');
      }
    } catch {
      setError('Upload failed. Check your connection and try again.');
    } finally {
      setUploading(null);
    }
  }, []);

  const handleSubmit = async () => {
    if (!businessName.trim()) return Alert.alert('Validation', 'Business name is required');
    if (!businessType) return Alert.alert('Validation', 'Please select a business type');
    if (!phone.trim()) return Alert.alert('Validation', 'Phone number is required');
    if (!address.trim()) return Alert.alert('Validation', 'Business address is required');
    if (!docs.businessLicense) return Alert.alert('Documents required', `Please upload your ${licenceLabel.toLowerCase()}.`);
    if (!docs.nationalIdFront) return Alert.alert('Documents required', 'Please upload your National ID (front).');
    if (isPharmacy) {
      if (!pharmacyLicense.trim()) return Alert.alert('Validation', 'Pharmacy licence number is required');
      if (!pharmacistInCharge.trim()) return Alert.alert('Validation', 'Pharmacist-in-charge is required');
      if (!pharmacistLicense.trim()) return Alert.alert('Validation', 'Pharmacist licence number is required');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.registerMerchant({
        name: businessName.trim(),
        type: businessType,
        description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        documents: {
          businessLicense: docs.businessLicense,
          nationalIdFront: docs.nationalIdFront,
          nationalIdBack: docs.nationalIdBack,
        },
        ...(isPharmacy
          ? {
              pharmacyLicense: pharmacyLicense.trim(),
              pharmacistInCharge: pharmacistInCharge.trim(),
              pharmacistLicense: pharmacistLicense.trim(),
            }
          : {}),
      });

      if (response.success) {
        const role = (response.data as any)?.role || (isPharmacy ? 'PHARMACIST' : 'MERCHANT');
        Alert.alert(
          'Application Submitted',
          `Your ${isPharmacy ? 'pharmacy' : 'business'} application is now pending admin approval. ` +
            `You'll be notified once it's reviewed. You can't start operating until it's approved.`,
          [{ text: 'OK', onPress: () => router.replace(role === 'PHARMACIST' ? '/pharmacist' : '/merchant') }]
        );
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDocTile = (key: DocKey, label: string) => {
    const url = docs[key];
    const busy = uploading === key;
    return (
      <TouchableOpacity
        style={[styles.docTile, url && styles.docTileDone]}
        onPress={() => uploadDoc(key)}
        disabled={busy}
        activeOpacity={0.8}
      >
        {url ? (
          <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
        ) : (
          <View style={styles.docThumbPlaceholder}>
            {busy ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color={COLORS.onSurfaceVariant} />
            )}
          </View>
        )}
        <View style={styles.docTileInfo}>
          <Text style={styles.docTileLabel}>{label}</Text>
          <Text style={[styles.docTileStatus, url && { color: COLORS.primary }]}>
            {busy ? 'Uploading…' : url ? 'Uploaded — tap to replace' : 'Tap to upload'}
          </Text>
        </View>
        {url ? <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} /> : null}
      </TouchableOpacity>
    );
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        title={isPharmacy ? 'Register Pharmacy' : 'Become a Merchant'}
        subtitle={
          isPharmacy
            ? 'Fulfil medicine orders on Smart Ride'
            : 'Start receiving orders on Smart Ride'
        }
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Business Name */}
        <IconInput
          label={isPharmacy ? 'Pharmacy Name *' : 'Business Name *'}
          placeholder={isPharmacy ? 'Enter your pharmacy name' : 'Enter your business name'}
          value={businessName}
          onChangeText={setBusinessName}
          icon="create-outline"
        />

        {/* Business Type — locked to Pharmacy in pharmacy mode */}
        {!isPharmacy && (
          <>
            <Text style={styles.formLabel}>Business Type *</Text>
            <View style={styles.typeGrid}>
              {MERCHANT_TYPES.filter(t => t.key !== 'PHARMACY').map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeCard, businessType === type.key && styles.typeCardSelected]}
                  onPress={() => setBusinessType(type.key)}
                >
                  <Ionicons name={type.icon as any} size={24} color={businessType === type.key ? COLORS.primary : COLORS.onSurfaceVariant} />
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={[styles.typeDesc, businessType === type.key && styles.typeDescSelected]}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Description */}
        <IconInput
          label="Description"
          placeholder={isPharmacy ? 'Brief description of your pharmacy' : 'Brief description of your business'}
          value={description}
          onChangeText={setDescription}
          icon="create-outline"
          multiline
        />

        {/* Phone */}
        <IconInput
          label={isPharmacy ? 'Pharmacy Phone *' : 'Business Phone *'}
          placeholder="+256 700 000 000"
          value={phone}
          onChangeText={setPhone}
          icon="create-outline"
          keyboardType="phone-pad"
        />

        {/* Address */}
        <IconInput
          label={isPharmacy ? 'Pharmacy Address *' : 'Business Address *'}
          placeholder="Enter your address"
          value={address}
          onChangeText={setAddress}
          icon="create-outline"
        />

        {/* Pharmacy-specific licensing */}
        {isPharmacy && (
          <>
            <IconInput
          label="Pharmacy Licence Number *"
          placeholder="e.g. NDA/PH/2024/0123"
          value={pharmacyLicense}
          onChangeText={setPharmacyLicense}
          icon="create-outline"
          autoCapitalize="characters"
        />
            <IconInput
          label="Pharmacist In Charge *"
          placeholder="Full name of the supervising pharmacist"
          value={pharmacistInCharge}
          onChangeText={setPharmacistInCharge}
          icon="create-outline"
        />
            <IconInput
          label="Pharmacist Licence Number *"
          placeholder="Pharmacist's professional licence number"
          value={pharmacistLicense}
          onChangeText={setPharmacistLicense}
          icon="create-outline"
          autoCapitalize="characters"
        />
          </>
        )}

        {/* Documents */}
        <Text style={[styles.formLabel, { marginTop: SPACING.lg }]}>Documents *</Text>
        <Text style={styles.docsHint}>
          Upload clear photos. These are reviewed by our team before approval.
        </Text>
        {renderDocTile('businessLicense', licenceLabel)}
        {renderDocTile('nationalIdFront', 'National ID (Front)')}
        {renderDocTile('nationalIdBack', 'National ID (Back)')}

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Your application will be reviewed by an admin. You can&apos;t start operating until it&apos;s
            approved — you&apos;ll see your status on the dashboard.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md + 4,
  },
  formLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  typeGrid: {
    gap: SPACING.sm,
  },
  typeCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  typeCardSelected: {
    backgroundColor: `${COLORS.primary}08`,
    borderColor: COLORS.primary,
  },
  typeLabel: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '600',
  },
  typeDesc: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },
  typeDescSelected: {
    color: COLORS.onSurfaceVariant,
  },
  docsHint: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  docTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.sm,
  },
  docTileDone: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}08`,
  },
  docThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  docThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTileInfo: {
    flex: 1,
  },
  docTileLabel: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  docTileStatus: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: `${COLORS.error}15`,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    ...TYPOGRAPHY.bodySm,
    flex: 1,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg + 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: `${COLORS.tertiary}08`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: `${COLORS.tertiary}15`,
    flexDirection: 'row',
    marginTop: SPACING.md + 4,
    gap: SPACING.sm + 2,
  },
  infoText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    flex: 1,
    lineHeight: 18,
  },
});
