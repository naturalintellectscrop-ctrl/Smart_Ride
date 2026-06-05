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
import { COLORS } from '@/src/constants';

const MERCHANT_TYPES = [
  { key: 'RESTAURANT', label: '🍽️ Restaurant', description: 'Food & beverage' },
  { key: 'SUPERMARKET', label: '🛒 Supermarket', description: 'Groceries & essentials' },
  { key: 'RETAIL_STORE', label: '🏪 Retail Store', description: 'General merchandise' },
  { key: 'PHARMACY', label: '💊 Pharmacy', description: 'Health & medicine' },
  { key: 'GROCERY', label: '🥬 Grocery', description: 'Fresh produce' },
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
      <View style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}>
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
          placeholderTextColor={COLORS.textMuted}
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
          placeholderTextColor={COLORS.textMuted}
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
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />

        {/* Address */}
        <Text style={styles.formLabel}>Business Address *</Text>
        <TextInput
          style={styles.formInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your business address"
          placeholderTextColor={COLORS.textMuted}
        />

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.submitButtonText}>Register Business</Text>
          )}
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 36,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  typeGrid: {
    gap: 8,
  },
  typeCard: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeCardSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderColor: COLORS.primary,
  },
  typeLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  typeDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  typeDescSelected: {
    color: COLORS.textSecondary,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
