// ============================================
// SMART RIDE MOBILE - WITHDRAW MODAL
// ============================================
// Reusable wallet withdraw modal.
// Validates amount against the wallet balance and
// submits via api.requestWithdrawal.
// ============================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { COLORS as BRAND, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GradientButton } from './GradientButton';

// Carrier brand colors are theme-independent.
const WITHDRAWAL_PROVIDERS = [
  {
    id: 'MTN_MOMO',
    name: 'MTN MoMo',
    color: BRAND.mtnYellow,
    icon: 'phone-portrait-outline' as const,
  },
  {
    id: 'AIRTEL_MONEY',
    name: 'Airtel Money',
    color: BRAND.airtelRed,
    icon: 'phone-portrait-outline' as const,
  },
];

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  /** Current wallet balance (UGX), used for validation and display */
  balance: number;
  onSuccess?: (newBalance?: number) => void;
  /** Pre-fill phone number from user's profile */
  defaultPhoneNumber?: string;
}

export function WithdrawModal({
  visible,
  onClose,
  balance,
  onSuccess,
  defaultPhoneNumber,
}: WithdrawModalProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber || '');
  const [provider, setProvider] = useState('MTN_MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && defaultPhoneNumber && !phoneNumber) {
      setPhoneNumber(defaultPhoneNumber);
    }
    if (visible) {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultPhoneNumber]);

  const formatCurrency = (value: number) => `UGX ${value.toLocaleString()}`;

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

  const handleSubmit = async () => {
    setError(null);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (numericAmount > balance) {
      setError('Insufficient wallet balance');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.requestWithdrawal(
        numericAmount,
        phoneNumber.trim(),
        provider
      );

      if (response.success) {
        const newBalance = (response.data as any)?.newBalance;
        Alert.alert(
          'Withdrawal Requested',
          `Your withdrawal of UGX ${numericAmount.toLocaleString()} via ${provider} has been submitted.`,
          [
            {
              text: 'OK',
              onPress: () => {
                reset();
                onClose();
                onSuccess?.(newBalance);
              },
            },
          ]
        );
      } else {
        setError(response.error || 'Failed to process withdrawal');
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
                  <Ionicons name="arrow-up-circle" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Withdraw Funds</Text>
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
              Available Balance:{' '}
              <Text style={styles.balanceHighlight}>{formatCurrency(balance)}</Text>
            </Text>

            {/* Provider selector */}
            <Text style={styles.fieldLabel}>PROVIDER</Text>
            <View style={styles.providerRow}>
              {WITHDRAWAL_PROVIDERS.map((p) => {
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
              {QUICK_AMOUNTS.map((amt) => {
                const disabled = amt > balance;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.quickAmountBtn,
                      amount === String(amt) && styles.quickAmountBtnActive,
                      disabled && styles.quickAmountBtnDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() => {
                      setAmount(String(amt));
                      setError(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        amount === String(amt) && styles.quickAmountTextActive,
                        disabled && styles.quickAmountTextDisabled,
                      ]}
                    >
                      {formatCurrency(amt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                title={isSubmitting ? 'Processing...' : 'Withdraw'}
                onPress={handleSubmit}
                loading={isSubmitting}
                size="md"
                style={styles.actionBtn}
                icon={
                  !isSubmitting ? (
                    <Ionicons name="arrow-up" size={18} color={COLORS.onPrimary} />
                  ) : undefined
                }
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
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
  balanceHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
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
  quickAmountBtnDisabled: {
    opacity: 0.4,
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
  quickAmountTextDisabled: {
    textDecorationLine: 'none',
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
});
