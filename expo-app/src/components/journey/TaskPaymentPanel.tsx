// ============================================
// SMART RIDE — TaskPaymentPanel
// ============================================
// The honest payment state of a finished task, and the way to settle it.
//
// The rule this component exists to enforce: A TASK BEING COMPLETED IS NOT A
// PAYMENT. The backend only auto-settles CASH — `recordTaskCompletion` sets
// paymentStatus COMPLETED for cash because the driver physically took the fare.
// Every gateway method leaves the task PENDING with nothing charged, and nothing
// in the backend moves a task to the PAID status at all. A summary screen that
// prints "Payment: MTN Mobile Money" beside a success tick is therefore claiming
// a settlement that never happened.
//
// So: the status shown is `task.paymentStatus`, straight from the server, and
// the pay action calls the real gateway. Amount comes from `task.totalAmount`,
// never from anything the user can influence.
// ============================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../GradientButton';
import { StatusBadge } from '../StatusBadge';
import { JourneyBanner } from './JourneyBanner';
import { translatePaymentError, JourneyError } from './taskErrors';
import { api } from '../../services/api';
import { SPACING, RADIUS, TYPOGRAPHY, ICON } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import type { Task, PaymentMethod, PaymentStatus } from '../../types';

const ugx = (n?: number | null) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`;

/** Never surface an internal gateway brand to a customer. */
const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  WALLET: 'Smart Ride Wallet',
  VISA: 'Card',
  MASTERCARD: 'Card',
  NYLON_PAY: 'Mobile Money',
};

/** Methods a customer can settle a finished task with, in order of friction. */
const SELECTABLE: PaymentMethod[] = ['WALLET', 'MTN_MOMO', 'AIRTEL_MONEY'];

const NEEDS_PHONE: PaymentMethod[] = ['MTN_MOMO', 'AIRTEL_MONEY'];

interface TaskPaymentPanelProps {
  task: Task;
  /** Called after a payment reports success, so the parent can refetch. */
  onSettled?: () => void;
  style?: ViewStyle;
}

export function TaskPaymentPanel({ task, onSettled, style }: TaskPaymentPanelProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const bookedMethod = task.paymentMethod;
  const isCash = bookedMethod === 'CASH';

  const [method, setMethod] = useState<PaymentMethod>(
    SELECTABLE.includes(bookedMethod) ? bookedMethod : 'WALLET'
  );
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<JourneyError | null>(null);
  /** Local view of the payment we just started; the task is still the truth. */
  const [attemptStatus, setAttemptStatus] = useState<PaymentStatus | null>(null);

  const serverStatus = task.paymentStatus;
  // The server's word wins. A local attempt only fills the gap between firing
  // the request and the task being refetched.
  const status: PaymentStatus =
    serverStatus === 'COMPLETED' ? 'COMPLETED' : (attemptStatus ?? serverStatus);

  const settled = status === 'COMPLETED';
  const processing = status === 'PROCESSING' || submitting;
  const failed = status === 'FAILED';

  const total = Number(task.totalAmount ?? 0);
  const waiting = Number(task.waitingCharge ?? 0);
  const discount = Number(task.discount ?? 0);
  const serviceFee = Number(task.serviceFee ?? 0);
  const deliveryFee = Number(task.deliveryFee ?? 0);

  const handlePay = async () => {
    if (NEEDS_PHONE.includes(method) && phone.trim().length < 9) {
      setError(translatePaymentError('Invalid phone number'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setAttemptStatus('PROCESSING');
    try {
      const res = await api.payForTask({
        taskId: task.id,
        // Authoritative: the fare the server computed, not a figure from the UI.
        amount: total,
        paymentMethod: method,
        phoneNumber: NEEDS_PHONE.includes(method) ? phone.trim() : undefined,
      });

      if (res.success && res.data) {
        const s = res.data.status;
        setAttemptStatus(s);
        if (s === 'COMPLETED') {
          onSettled?.();
        } else if (s === 'FAILED') {
          setError(translatePaymentError(res.data.message));
        }
        // PENDING/PROCESSING is a real outcome for mobile money: the customer
        // still has to approve the prompt on their handset. Say so rather than
        // pretending the payment is done.
      } else {
        setAttemptStatus('FAILED');
        setError(translatePaymentError(res.error, res.status));
      }
    } catch {
      setAttemptStatus('FAILED');
      setError(translatePaymentError('Network error'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status chip ────────────────────────────────────────
  const statusChip = settled
    ? { label: 'Paid', color: COLORS.success }
    : failed
      ? { label: 'Payment failed', color: COLORS.error }
      : processing
        ? { label: 'Processing', color: COLORS.info }
        : { label: 'Payment pending', color: COLORS.warning };

  return (
    <View style={[styles.wrap, style]}>
      {/* Fare breakdown */}
      <View style={styles.row}>
        <Text style={styles.label}>Trip fare</Text>
        <Text style={styles.value}>{ugx(total - waiting)}</Text>
      </View>

      {waiting > 0 && (
        <View style={styles.row}>
          <Text style={styles.labelMuted}>
            Waiting{task.waitingMinutes ? ` (${task.waitingMinutes} min)` : ''}
          </Text>
          <Text style={styles.valueMuted}>{ugx(waiting)}</Text>
        </View>
      )}
      {deliveryFee > 0 && (
        <View style={styles.row}>
          <Text style={styles.labelMuted}>Delivery fee</Text>
          <Text style={styles.valueMuted}>{ugx(deliveryFee)}</Text>
        </View>
      )}
      {serviceFee > 0 && (
        <View style={styles.row}>
          <Text style={styles.labelMuted}>Service fee</Text>
          <Text style={styles.valueMuted}>{ugx(serviceFee)}</Text>
        </View>
      )}
      {discount > 0 && (
        <View style={styles.row}>
          <Text style={styles.labelMuted}>Discount</Text>
          <Text style={[styles.valueMuted, { color: COLORS.success }]}>-{ugx(discount)}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{ugx(total)}</Text>
      </View>

      {/* Payment state — the point of this panel */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <Ionicons name="card-outline" size={ICON.sm} color={COLORS.onSurfaceVariant} />
          <Text style={styles.labelMuted}>
            {METHOD_LABEL[settled || isCash ? bookedMethod : method] ?? bookedMethod}
          </Text>
        </View>
        <StatusBadge label={statusChip.label} color={statusChip.color} />
      </View>

      {/* Cash is genuinely settled at handover — the driver has the money. */}
      {isCash && (
        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={ICON.sm} color={COLORS.primary} />
          <Text style={styles.noteText}>
            {settled
              ? 'Paid to your driver in cash.'
              : 'Please pay your driver in cash before you leave.'}
          </Text>
        </View>
      )}

      {/* Everything else has to actually be collected. */}
      {!isCash && !settled && (
        <View style={styles.payBlock}>
          {processing ? (
            <View style={styles.noteRow}>
              <Ionicons name="time-outline" size={ICON.sm} color={COLORS.info} />
              <Text style={styles.noteText}>
                {NEEDS_PHONE.includes(method)
                  ? 'Approve the prompt on your phone to complete this payment.'
                  : 'Completing your payment…'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.chooseLabel}>Pay with</Text>
              <View style={styles.methodRow}>
                {SELECTABLE.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[styles.methodChip, method === m && styles.methodChipActive]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: method === m }}
                    accessibilityLabel={METHOD_LABEL[m]}
                  >
                    <Text
                      style={[styles.methodText, method === m && styles.methodTextActive]}
                      numberOfLines={1}
                    >
                      {METHOD_LABEL[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {NEEDS_PHONE.includes(method) && (
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Mobile money number"
                  placeholderTextColor={COLORS.onSurfaceVariant}
                  keyboardType="phone-pad"
                  editable={!submitting}
                  accessibilityLabel="Mobile money number"
                />
              )}
            </>
          )}

          {!!error && (
            <JourneyBanner
              error={error}
              onAction={error.retrySafe ? handlePay : undefined}
              onDismiss={() => setError(null)}
              style={styles.errorBanner}
            />
          )}

          <GradientButton
            title={failed ? 'Try payment again' : `Pay ${ugx(total)}`}
            onPress={handlePay}
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting}
          />
        </View>
      )}

      {!isCash && settled && (
        <View style={styles.noteRow}>
          <Ionicons name="checkmark-circle" size={ICON.sm} color={COLORS.success} />
          <Text style={styles.noteText}>Payment received. Nothing further is owed.</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    wrap: {
      gap: SPACING.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    label: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
    },
    value: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '600',
    },
    labelMuted: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    valueMuted: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.outlineVariant,
      marginVertical: SPACING.sm,
    },
    totalLabel: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    totalValue: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
      fontWeight: '700',
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      paddingTop: SPACING.sm,
    },
    statusLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      flex: 1,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
      paddingTop: SPACING.sm,
    },
    noteText: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurface,
      flex: 1,
    },
    payBlock: {
      gap: SPACING.sm,
      paddingTop: SPACING.md,
    },
    chooseLabel: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    methodRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    methodChip: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      backgroundColor: COLORS.surfaceContainerLowest,
      alignItems: 'center',
    },
    methodChipActive: {
      borderColor: COLORS.primary,
      backgroundColor: `${COLORS.primary}14`,
    },
    methodText: {
      ...TYPOGRAPHY.labelMd,
      color: COLORS.onSurfaceVariant,
    },
    methodTextActive: {
      color: COLORS.primary,
      fontWeight: '700',
    },
    phoneInput: {
      ...TYPOGRAPHY.bodyMd,
      color: COLORS.onSurface,
      backgroundColor: COLORS.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    errorBanner: {
      marginTop: SPACING.xs,
    },
  });
