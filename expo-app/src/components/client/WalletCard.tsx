// ============================================
// SMART RIDE MOBILE - WALLET CARD
// ============================================
// The balance strip on the client home: brand-tinted card, wallet icon tile,
// label over balance with a hide/show toggle, a divider, then the Top Up pill.
//
// The balance can be hidden. That is a real privacy affordance on a phone
// someone else may be looking at, and the reference calls for the eye, so the
// toggle actually masks the number rather than being decorative.
// ============================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, BORDER, ICON, OPACITY } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';
import { Skeleton } from '../Skeleton';

interface WalletCardProps {
  /** null while loading — the card shows a skeleton in place of the number. */
  balance: number | null;
  currency?: string;
  onPress?: () => void;
  onTopUp: () => void;
  style?: ViewStyle;
}

export function WalletCard({
  balance,
  currency = 'UGX',
  onPress,
  onTopUp,
  style,
}: WalletCardProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [hidden, setHidden] = useState(false);

  const formatted =
    balance === null ? null : `${currency} ${balance.toLocaleString()}`;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={OPACITY.pressed}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel="Open wallet"
    >
      <View style={styles.tile}>
        <Ionicons name="wallet-outline" size={ICON.lg} color={COLORS.primary} />
      </View>

      <View style={styles.info}>
        <Text style={styles.label}>Wallet Balance</Text>
        <View style={styles.balanceRow}>
          {formatted === null ? (
            <Skeleton width={120} height={26} borderRadius={RADIUS.sm} />
          ) : (
            <Text style={styles.balance} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {hidden ? '••••••' : formatted}
            </Text>
          )}
          {formatted !== null ? (
            <TouchableOpacity
              onPress={() => setHidden((h) => !h)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            >
              <Ionicons
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={ICON.md}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.topUp}
        onPress={onTopUp}
        activeOpacity={OPACITY.pressed}
        accessibilityRole="button"
        accessibilityLabel="Top up your wallet"
      >
        <Ionicons name="add" size={ICON.md} color={COLORS.onPrimary} />
        <Text style={styles.topUpText} numberOfLines={1}>
          Top Up
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.gutter,
      padding: SPACING.gutter,
      borderRadius: RADIUS.lg,
      borderWidth: BORDER.hairline,
      borderColor: COLORS.hairlineSoft,
      backgroundColor: COLORS.tintSurface,
    },
    tile: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.cardSurface,
      flexShrink: 0,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      ...TYPOGRAPHY.bodySm,
      color: COLORS.onSurfaceVariant,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    balance: {
      ...TYPOGRAPHY.headlineMd,
      color: COLORS.onSurface,
      fontWeight: '700',
      flexShrink: 1,
    },
    divider: {
      width: BORDER.hairline,
      alignSelf: 'stretch',
      marginVertical: SPACING.xs,
      backgroundColor: COLORS.outlineVariant,
      flexShrink: 0,
    },
    topUp: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      minHeight: 48,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      flexShrink: 0,
    },
    topUpText: {
      ...TYPOGRAPHY.labelLg,
      color: COLORS.onPrimary,
    },
  });
