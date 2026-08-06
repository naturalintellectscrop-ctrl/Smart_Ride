// ============================================
// SMART RIDE — ListRow
// ============================================
// The one grouped-list row (DS spec §4):
//
//   leading (icon / avatar) → primary line → secondary line → trailing
//   (chevron / badge / amount / control)
//
// Settings rows, transaction rows, saved addresses, payment methods, order
// rows and conversation rows are all this component with different slots —
// before it existed each screen re-implemented the row with its own paddings,
// divider offsets and chevron glyph.
//
// The whole row is the tap target and is at least 48dp tall.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING, RADIUS, MOTION, ICON, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

interface ListRowProps {
  /** Primary line — the label the user reads first. */
  title: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** Leading Ionicon. Ignored when `leading` is supplied. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Tint for the leading icon and its container. Defaults to the brand green. */
  iconColor?: string;
  /** Arbitrary leading element (an `Avatar`, a brand mark) replacing `icon`. */
  leading?: React.ReactNode;
  /** Right-aligned value text — an amount, a current setting, a timestamp. */
  value?: string;
  /** Arbitrary trailing element (a `CountBadge`, a `Toggle`, a `StatusBadge`). */
  trailing?: React.ReactNode;
  /**
   * Show a chevron. Defaults to true when the row is pressable and nothing else
   * occupies the trailing slot, so navigation rows are self-describing.
   */
  chevron?: boolean;
  onPress?: () => void;
  /** Renders the row in the error colour — destructive settings entries. */
  danger?: boolean;
  disabled?: boolean;
  /** Hairline separator below the row, inset past the leading slot. */
  divider?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  leading,
  value,
  trailing,
  chevron,
  onPress,
  danger = false,
  disabled = false,
  divider = false,
  style,
  accessibilityLabel,
}: ListRowProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const tint = danger ? COLORS.error : (iconColor ?? COLORS.primary);
  const showChevron = chevron ?? (!!onPress && !trailing && !value);

  const body = (
    <>
      <View style={styles.row}>
        {leading ?? (icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${tint}1A` }]}>
            <Ionicons name={icon} size={ICON.md} color={tint} />
          </View>
        ) : null)}

        <View style={styles.text}>
          <Text style={[styles.title, danger && styles.titleDanger]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          ) : null}
        </View>

        {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
        {trailing}
        {showChevron ? (
          <Ionicons name="chevron-forward" size={ICON.sm} color={COLORS.onSurfaceVariant} />
        ) : null}
      </View>
      {divider ? <View style={styles.divider} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.wrap, style]}>{body}</View>;
  }

  return (
    <PressableRow
      style={[styles.wrap, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {body}
    </PressableRow>
  );
}

/** Shares MOTION.spring.press with Card and GradientButton so every tap matches. */
function PressableRow({
  style,
  onPress,
  disabled,
  accessibilityLabel,
  children,
}: {
  style: StyleProp<ViewStyle>;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        style={style}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(MOTION.pressScale, MOTION.spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, MOTION.spring.press); }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  wrap: {
    minHeight: 48,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
    paddingVertical: SPACING.gutter,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  titleDanger: {
    color: COLORS.error,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  value: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  divider: {
    height: BORDER.hairline,
    backgroundColor: COLORS.outlineVariant,
    // Inset past the leading slot so dividers align under the text column.
    marginLeft: 40 + SPACING.gutter,
  },
});
