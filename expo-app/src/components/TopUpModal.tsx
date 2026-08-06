// ============================================
// SMART RIDE — Top Up sheet
// ============================================
// Golden Screen #31 · composed on `SmartBottomSheet` (DS spec §16 step 8).
//
//   provider (SegmentedControl) → amount + quick amounts (Chip) → phone →
//   confirm → SuccessCheck
//
// Previously a bespoke `<Modal>` with its own overlay, header, close button,
// provider cards, quick-amount pills and text inputs — none of which matched
// the sheets used elsewhere in the app.
//
// The name is kept (`TopUpModal`) because three screens import it; it is a
// sheet, not a modal, and the file is the single place that fact lives.
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services';
import {
  TYPOGRAPHY,
  SPACING,
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

interface TopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newBalance?: number) => void;
  /** Pre-fill phone number from user's profile */
  defaultPhoneNumber?: string;
}

const money = (value: number) => `UGX ${value.toLocaleString()}`;

export function TopUpModal({
  visible,
  onClose,
  onSuccess,
  defaultPhoneNumber,
}: TopUpModalProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber || '');
  const [provider, setProvider] = useState<ProviderId>('MTN_MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once the request lands, so the sheet can confirm before it closes. */
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
      setError(`Minimum top-up amount is ${money(WALLET_MIN_AMOUNT)}`);
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
        setOutcome({
          title: settled ? 'Top-up successful' : 'Payment initiated',
          detail: settled
            ? `${money(numericAmount)} has been added to your wallet.`
            : `Your phone (${phoneNumber.trim()}) will receive a payment prompt. Your wallet balance will update once confirmed.`,
        });
        if (settled) onSuccess?.(newBalance);
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
    <SmartBottomSheet
      visible={visible}
      title={outcome ? undefined : 'Top up wallet'}
      onDismiss={handleClose}
      // While a payment request is in flight, a stray backdrop tap must not
      // dismiss the sheet out from under it.
      dismissOnBackdrop={!isSubmitting}
    >
      {outcome ? (
        <View style={styles.outcome}>
          <SuccessCheck size="lg" title={outcome.title} subtitle={outcome.detail} />
          <GradientButton title="Done" onPress={handleClose} size="lg" fullWidth style={styles.outcomeButton} />
        </View>
      ) : (
        <View>
          <Text style={styles.subtitle}>
            Add money to your Smart Ride wallet via mobile money.
          </Text>

          <Text style={styles.fieldLabel}>Payment method</Text>
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
                onPress={() => { setAmount(String(amt)); setError(null); }}
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
            title={isSubmitting ? 'Processing…' : 'Top Up'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            size="lg"
            fullWidth
            icon={!isSubmitting ? <Ionicons name="add" size={ICON.md} color={COLORS.onPrimary} /> : undefined}
          />
        </View>
      )}
    </SmartBottomSheet>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
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
  outcome: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  outcomeButton: {
    marginTop: SPACING.lg,
  },
});
