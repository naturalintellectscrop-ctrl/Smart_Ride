// ============================================
// SMART RIDE MOBILE - TOP UP MODAL
// ============================================
// Reusable wallet top-up modal.
// Pattern follows the rider wallet withdraw modal in
// app/rider/wallet.tsx, but for adding money via MTN
// MoMo / Airtel Money.
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { GradientButton } from './GradientButton';

const PAYMENT_PROVIDERS = [
  {
    id: 'MTN_MOMO',
    name: 'MTN MoMo',
    color: COLORS.mtnYellow,
    icon: 'phone-portrait-outline' as const,
  },
  {
    id: 'AIRTEL_MONEY',
    name: 'Airtel Money',
    color: COLORS.airtelRed,
    icon: 'phone-portrait-outline' as const,
  },
];

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

interface TopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newBalance?: number) => void;
  /** Pre-fill phone number from user's profile */
  defaultPhoneNumber?: string;
}

export function TopUpModal({
  visible,
  onClose,
  onSuccess,
  defaultPhoneNumber,
}: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber || '');
  const [provider, setProvider] = useState('MTN_MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep phone number in sync when modal opens with a default
  useEffect(() => {
    if (visible && defaultPhoneNumber && !phoneNumber) {
      setPhoneNumber(defaultPhoneNumber);
    }
    if (visible) {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultPhoneNumber]);

  const reset = () => {
    setAmount('');
    setProvider('MTN_MOMO');
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const formatCurrency = (value: number) => `UGX ${value.toLocaleString()}`;

  const handleSubmit = async () => {
    setError(null);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (numericAmount < 1000) {
      setError('Minimum top-up amount is UGX 1,000');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.requestTopUp({
        amount: numericAmount,
        paymentMethod: provider,
        phoneNumber: phoneNumber.trim(),
      });

      if (response.success) {
        const rawData = response.data as any;
        // Mobile money may confirm immediately (direct credit) or after a phone
        // prompt. If a new balance is returned, the top-up already settled.
        const newBalance = rawData?.newBalance;
        const settled = typeof newBalance === 'number';
        const message = settled
          ? `UGX ${numericAmount.toLocaleString()} has been added to your wallet.`
          : `Your phone (${phoneNumber.trim()}) will receive a payment prompt. Your wallet balance will update once confirmed.`;
        Alert.alert(settled ? 'Top-up Successful' : 'Payment Initiated', message, [
          {
            text: 'OK',
            onPress: () => {
              reset();
              onClose();
              if (settled) onSuccess?.(newBalance);
            },
          },
        ]);
      } else {
        setError(response.error || 'Failed to process top-up');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Top Up Wallet</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Add money to your Smart Ride wallet via mobile money — MTN and
              Airtel are both supported.
            </Text>

            {/* Provider selector */}
            <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
            <View style={styles.providerRow}>
              {PAYMENT_PROVIDERS.map((p) => {
                const active = provider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.providerCard,
                      active && styles.providerCardActive,
                    ]}
                    onPress={() => setProvider(p.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.providerIconCircle,
                        { backgroundColor: `${p.color}20` },
                      ]}
                    >
                      <Ionicons name={p.icon} size={16} color={p.color} />
                    </View>
                    <Text
                      style={[
                        styles.providerName,
                        active && styles.providerNameActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                    {'badge' in p && p.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{p.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>AMOUNT (UGX)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.outline}
              value={amount}
              onChangeText={(text) => {
                setAmount(text.replace(/[^0-9.]/g, ''));
                setError(null);
              }}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    amount === String(amt) && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => {
                    setAmount(String(amt));
                    setError(null);
                  }}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === String(amt) && styles.quickAmountTextActive,
                    ]}
                  >
                    {formatCurrency(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Phone number */}
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., +256 700 000 000"
              placeholderTextColor={COLORS.outline}
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setError(null);
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            {/* Error message */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <GradientButton
                title="Cancel"
                variant="outline"
                onPress={handleClose}
                size="md"
                style={styles.actionBtn}
              />
              <GradientButton
                title={isSubmitting ? 'Processing...' : 'Top Up'}
                onPress={handleSubmit}
                loading={isSubmitting}
                size="md"
                style={styles.actionBtn}
                icon={
                  !isSubmitting ? (
                    <Ionicons name="add" size={18} color={COLORS.onPrimary} />
                  ) : undefined
                }
              />
            </View>

            {isSubmitting ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.active,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  providerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  providerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  badgeText: {
    color: COLORS.onPrimary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  providerCardActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: `${COLORS.primary}40`,
  },
  providerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
    flex: 1,
  },
  providerNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  quickAmountBtn: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  quickAmountBtnActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  quickAmountTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.error}10`,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  errorText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.error,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
});
