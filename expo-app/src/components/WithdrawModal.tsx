// ============================================
// SMART RIDE — Withdraw sheet
// ============================================
// Golden Screen #32 · composed on `SmartBottomSheet` (DS spec §16 step 8), and
// the mirror of the Top Up sheet — same anatomy, same order, opposite direction:
//
//   available balance → provider (SegmentedControl) → amount + quick amounts →
//   phone → confirm → SuccessCheck
//
// Behaviour fix: this sheet enforced no minimum while Top Up enforced UGX 1,000,
// so a user could request a 200-shilling payout that mobile money would reject.
// Both now read `WALLET_MIN_AMOUNT`, and quick amounts above the available
// balance are disabled rather than offered and then refused.
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services';
import {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  ICON,
  WALLET_QUICK_AMOUNTS,
  WALLET_MIN_AMOUNT,
  WALLET_PROVIDERS,
} from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';
import { SmartBottomSheet } from './SmartBottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { IconInput } from './IconInput';
import { Chip } from './Chip';
import { GradientButton } from './GradientButton';
import { SuccessCheck } from './SuccessCheck';

type ProviderId = (typeof WALLET_PROVIDERS)[number]['id'];

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  /** Current wallet balance (UGX), used for validation and display */
  balance: number;
  onSuccess?: (newBalance?: number) => void;
  /** Pre-fill phone number from user's profile */
  defaultPhoneNumber?: string;
  /**
   * Override how the withdrawal is submitted. Defaults to
   * `api.requestWithdrawal` (POST /wallet/withdraw).
   *
   * The driver earnings screen posts to /riders/withdraw instead — a separate
   * backend implementation of the same operation that goes through the atomic
   * wallet-service and records a payout, where /wallet/withdraw hand-rolls the
   * balance update. Rather than silently move one caller onto the other's
   * endpoint, each keeps its own and they share this UI.
   */
  onSubmit?: (amount: number, phone: string, provider: string) => Promise<{ success: boolean; error?: string; data?: any }>;
}

const money = (value: number) => `UGX ${value.toLocaleString()}`;

export function WithdrawModal({
  visible,
  onClose,
  balance,
  onSuccess,
  defaultPhoneNumber,
  onSubmit,
}: WithdrawModalProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber || '');
  const [provider, setProvider] = useState<ProviderId>('MTN_MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ title: string; detail: string } | null>(null);

  useEffect(() => {
    if (visible && defaultPhoneNumber && !phoneNumber) setPhoneNumber(defaultPhoneNumber);
    if (visible) {
      setError(null);
      setOutcome(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultPhoneNumber]);

  const reset = () => {
    setAmount('');
    setProvider('MTN_MOMO');
    setError(null);
    setOutcome(null);
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
    if (numericAmount < WALLET_MIN_AMOUNT) {
      setError(`Minimum withdrawal amount is ${money(WALLET_MIN_AMOUNT)}`);
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
      const submit = onSubmit ?? ((a: number, p: string, pr: string) => api.requestWithdrawal(a, p, pr));
      const response = await submit(numericAmount, phoneNumber.trim(), provider);

      if (response.success) {
        const newBalance = (response.data as any)?.newBalance;
        const providerName = WALLET_PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
        setOutcome({
          title: 'Withdrawal requested',
          detail: `${money(numericAmount)} via ${providerName} has been submitted.`,
        });
        onSuccess?.(newBalance);
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
    <SmartBottomSheet
      visible={visible}
      title={outcome ? undefined : 'Withdraw funds'}
      onDismiss={handleClose}
      dismissOnBackdrop={!isSubmitting}
    >
      {outcome ? (
        <View style={styles.outcome}>
          <SuccessCheck size="lg" title={outcome.title} subtitle={outcome.detail} />
          <GradientButton title="Done" onPress={handleClose} size="lg" fullWidth style={styles.outcomeButton} />
        </View>
      ) : (
        <View>
          <View style={styles.balanceStrip}>
            <Text style={styles.balanceLabel}>Available</Text>
            <Text style={styles.balanceValue}>{money(balance)}</Text>
          </View>

          <Text style={styles.fieldLabel}>Send to</Text>
          <SegmentedControl
            segments={WALLET_PROVIDERS.map((p) => ({ value: p.id, label: p.name }))}
            value={provider}
            onChange={(v) => { setProvider(v); setError(null); }}
          />

          <View style={styles.field}>
            <IconInput
              label="Amount (UGX)"
              placeholder="0"
              value={amount}
              onChangeText={(text) => { setAmount(text.replace(/[^0-9.]/g, '')); setError(null); }}
              icon="cash-outline"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.quickAmounts}>
            {WALLET_QUICK_AMOUNTS.map((amt) => (
              <Chip
                key={amt}
                label={money(amt)}
                active={amount === String(amt)}
                // Don't offer an amount the balance cannot cover.
                onPress={amt > balance ? undefined : () => { setAmount(String(amt)); setError(null); }}
                style={amt > balance ? styles.quickAmountDisabled : undefined}
              />
            ))}
          </View>

          <IconInput
            label="Phone number"
            placeholder="e.g. +256 700 000 000"
            value={phoneNumber}
            onChangeText={(text) => { setPhoneNumber(text); setError(null); }}
            icon="phone-portrait-outline"
            keyboardType="phone-pad"
            error={error ?? undefined}
          />

          <GradientButton
            title={isSubmitting ? 'Processing…' : 'Withdraw'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="lg"
            fullWidth
            icon={!isSubmitting ? <Ionicons name="arrow-up-circle" size={ICON.md} color={COLORS.onPrimary} /> : undefined}
          />
        </View>
      )}
    </SmartBottomSheet>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.gutter,
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
  },
  balanceValue: {
    ...TYPOGRAPHY.bodyLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  fieldLabel: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  field: {
    marginTop: SPACING.md,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAmountDisabled: {
    opacity: 0.4,
  },
  outcome: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  outcomeButton: {
    marginTop: SPACING.lg,
  },
});
