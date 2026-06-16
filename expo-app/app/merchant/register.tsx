// ============================================
// SMART RIDE MOBILE - MERCHANT REGISTRATION
// ============================================
// Registration form for users wanting to become merchants
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { Ionicons } from '@expo/vector-icons';

const MERCHANT_TYPES = [
  { key: 'RESTAURANT', label: 'Restaurant', icon: 'restaurant-outline', description: 'Food & beverage' },
  { key: 'SUPERMARKET', label: 'Supermarket', icon: 'cart-outline', description: 'Groceries & essentials' },
  { key: 'RETAIL_STORE', label: 'Retail Store', icon: 'storefront-outline', description: 'General merchandise' },
  { key: 'PHARMACY', label: 'Pharmacy', icon: 'medkit-outline', description: 'Health & medicine' },
  { key: 'GROCERY', label: 'Grocery', icon: 'leaf-outline', description: 'Fresh produce' },
];

export default function MerchantRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert('Validation', 'Business name is required');
      return;
    }
    if (!businessType) {
      Alert.alert('Validation', 'Please select a business type');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone number is required');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Validation', 'Business address is required');
      return;
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
      });

      if (response.success) {
        Alert.alert(
          'Registration Successful',
          'Your merchant account has been created! You can now access the merchant dashboard.',
          [
            {
              text: 'Go to Dashboard',
              onPress: () => router.replace('/merchant'),
            },
          ]
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Become a Merchant</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>
          Register your business to start receiving orders on Smart Ride
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Business Name */}
        <Text style={styles.formLabel}>Business Name *</Text>
        <TextInput
          style={styles.formInput}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter your business name"
          placeholderTextColor={COLORS.outline}
        />

        {/* Business Type */}
        <Text style={styles.formLabel}>Business Type *</Text>
        <View style={styles.typeGrid}>
          {MERCHANT_TYPES.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeCard,
                businessType === type.key && styles.typeCardSelected,
              ]}
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

        {/* Description */}
        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of your business"
          placeholderTextColor={COLORS.outline}
          multiline
          numberOfLines={3}
        />

        {/* Phone */}
        <Text style={styles.formLabel}>Business Phone *</Text>
        <TextInput
          style={styles.formInput}
          value={phone}
          onChangeText={setPhone}
          placeholder="+256 700 000 000"
          placeholderTextColor={COLORS.outline}
          keyboardType="phone-pad"
        />

        {/* Address */}
        <Text style={styles.formLabel}>Business Address *</Text>
        <TextInput
          style={styles.formInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your business address"
          placeholderTextColor={COLORS.outline}
        />

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Register Business</Text>
          )}
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            By registering, you agree to Smart Ride's merchant terms and conditions.
            Your account will be reviewed and activated within 24 hours.
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
  },
  headerSpacer: {
    width: 36,
  },
  headerSubtitle: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    marginTop: SPACING.sm,
    lineHeight: 20,
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
  formInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.md - 4,
    color: COLORS.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.md - 4,
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
  errorCard: {
    backgroundColor: `${COLORS.error}15`,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 2,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    ...TYPOGRAPHY.bodySm,
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
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    flex: 1,
    lineHeight: 18,
  },
});
