// ============================================
// SMART RIDE — ReceiptCard
// ============================================
// Golden Screen #39: **one receipt architecture, four content blocks** — ride,
// food, delivery and wallet receipts are this card with a different service
// block, never four receipt designs.
//
//   header (receipt #, date, status) → total → service block (children) →
//   itemised breakdown → payment method → provider → footer
//
// The DS spec calls out that **amounts must sum**. This component checks that
// in development rather than leaving a receipt whose lines silently disagree
// with its total — a receipt that does not add up is a trust failure, not a
// layout bug.
//
// Provider names are first-name only by convention; pass the already-shortened
// name (see `src/utils/formatName.ts`).
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Rating } from './Rating';

export interface ReceiptLine {
  label: string;
  /** Negative values render as a deduction (discounts, refunds). */
  amount: number;
}

interface ReceiptCardProps {
  receiptNumber: string;
  /** Already-formatted issue date. */
  issuedAt?: string;
  status?: { label: string; color?: string };
  total: number;
  currency?: string;
  breakdown: ReceiptLine[];
  /** e.g. "Paid via MTN Mobile Money" / "Cash (to be paid)". */
  paymentLabel?: string;
  provider?: { name: string; rating?: number | null; roleLabel?: string };
  /** The service block: ride route, food items, parcel legs, wallet transaction. */
  children?: React.ReactNode;
  footerNote?: string;
  style?: ViewStyle;
}

const money = (n: number, currency: string) =>
  `${currency} ${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-UG')}`;

export function ReceiptCard({
  receiptNumber,
  issuedAt,
  status,
  total,
  currency = 'UGX',
  breakdown,
  paymentLabel,
  provider,
  children,
  footerNote,
  style,
}: ReceiptCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (__DEV__ && breakdown.length > 0) {
    const summed = breakdown.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
    // Allow a shilling of rounding slack; anything more is a real discrepancy.
    if (Math.abs(summed - total) > 1) {
      console.warn(
        `[ReceiptCard] Receipt ${receiptNumber} does not add up: lines sum to ` +
        `${summed} but total is ${total}. The breakdown is missing a line or the ` +
        `total is wrong — do not ship a receipt the customer can disprove.`,
      );
    }
  }

  return (
    <Card variant="elevated" padding={SPACING.md} radius={RADIUS.xl} style={style}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.receiptNumber} numberOfLines={1}>{receiptNumber}</Text>
          {issuedAt ? <Text style={styles.issuedAt}>{issuedAt}</Text> : null}
        </View>
        {status ? <StatusBadge label={status.label} color={status.color} size="sm" /> : null}
      </View>

      {/* Total — money is the loudest type on the card */}
      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{money(total, currency)}</Text>
        {paymentLabel ? <Text style={styles.paymentLabel}>{paymentLabel}</Text> : null}
      </View>

      {/* Service block — the one part that varies by receipt type */}
      {children ? <View style={styles.section}>{children}</View> : null}

      {/* Itemised breakdown */}
      {breakdown.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Breakdown</Text>
          {breakdown.map((line, i) => (
            <View key={`${line.label}-${i}`} style={styles.line}>
              <Text style={styles.lineLabel} numberOfLines={1}>{line.label}</Text>
              <Text style={styles.lineValue}>
                {line.amount < 0 ? '−' : ''}{money(line.amount, currency)}
              </Text>
            </View>
          ))}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.lineTotalLabel}>Total</Text>
            <Text style={styles.lineTotalValue}>{money(total, currency)}</Text>
          </View>
        </View>
      ) : null}

      {/* Provider */}
      {provider?.name ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{provider.roleLabel ?? 'Your provider'}</Text>
          <View style={styles.providerRow}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.rating != null ? <Rating value={provider.rating} /> : null}
          </View>
        </View>
      ) : null}

      {footerNote ? <Text style={styles.footer}>{footerNote}</Text> : null}
    </Card>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  receiptNumber: {
    ...TYPOGRAPHY.labelLg,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  issuedAt: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },

  totalBlock: {
    marginTop: SPACING.md,
  },
  totalLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    ...TYPOGRAPHY.displayLg,
    color: COLORS.onSurface,
    marginTop: 2,
  },
  paymentLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },

  section: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: BORDER.hairline,
    borderTopColor: COLORS.outlineVariant,
    gap: SPACING.xs,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  lineLabel: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  lineValue: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurface,
    // Tabular so columns of money align down the receipt.
    fontVariant: ['tabular-nums'],
  },
  totalLine: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDER.hairline,
    borderTopColor: COLORS.outlineVariant,
  },
  lineTotalLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  lineTotalValue: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.primary,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  providerName: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },

  footer: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: BORDER.hairline,
    borderTopColor: COLORS.outlineVariant,
  },
});
