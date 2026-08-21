// ============================================
// SMART RIDE — JourneyActions
// ============================================
// One primary action, and a row of secondaries that never compete with it.
//
// The primary action is always the single next legal step the server published.
// Call, message, share, SOS and support are icon buttons — reachable in one tap,
// but visually subordinate, so at every state there is exactly one obvious thing
// to do.
// ============================================

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../GradientButton';
import { SPACING, RADIUS, ICON } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export interface JourneySecondaryAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Emergency styling — used for SOS only, so it stays unmistakable. */
  danger?: boolean;
  disabled?: boolean;
}

interface JourneyActionsProps {
  /** Primary label. Hidden entirely when there is no legal next step. */
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  /**
   * Cancel, when the server says it is legal. Rendered as a quiet outline
   * button beside the primary — never as a second filled button.
   */
  onCancelPress?: () => void;
  cancelDisabled?: boolean;
  /**
   * What the quiet button says. Giving back a job you have not started is
   * DECLINING it, and calling that "Cancel" both misdescribes it and invites
   * the transition the server will refuse (DEV-6).
   */
  cancelLabel?: string;
  secondary?: JourneySecondaryAction[];
  style?: ViewStyle;
}

export function JourneyActions({
  primaryLabel,
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
  onCancelPress,
  cancelDisabled = false,
  cancelLabel = 'Cancel',
  secondary = [],
  style,
}: JourneyActionsProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const hasPrimary = !!primaryLabel && !!onPrimaryPress;

  return (
    <View style={[styles.wrap, style]}>
      {secondary.length > 0 && (
        <View style={styles.secondaryRow}>
          {secondary.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.secondaryButton,
                action.danger && styles.secondaryButtonDanger,
                action.disabled && styles.secondaryButtonDisabled,
              ]}
              onPress={action.onPress}
              disabled={action.disabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: !!action.disabled }}
            >
              {/* Icon only. The labels were truncating to "Naviga…" and
                  "Messa…" at this width, which reads as broken rather than
                  terse, and the wrapped text pushed the primary action further
                  down a panel that was already short of room. These five are
                  conventional enough to carry their own meaning, and the
                  accessibilityLabel above still gives screen readers the word. */}
              <Ionicons
                name={action.icon}
                size={ICON.md}
                color={
                  action.disabled
                    ? COLORS.outlineVariant
                    : action.danger
                      ? COLORS.error
                      : COLORS.secondary
                }
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(hasPrimary || !!onCancelPress) && (
        <View style={styles.primaryRow}>
          {/* Cancel only appears when the backend actually permits it, so the
              driver is never offered a button that is guaranteed to 409. */}
          {!!onCancelPress && (
            <View style={styles.cancelWrap}>
              <GradientButton
                title={cancelLabel}
                onPress={onCancelPress}
                variant="outline"
                size="md"
                fullWidth
                disabled={cancelDisabled}
              />
            </View>
          )}
          {hasPrimary && (
            <View style={onCancelPress ? styles.primaryWrapSplit : styles.primaryWrapFull}>
              <GradientButton
                title={primaryLabel!}
                onPress={onPrimaryPress!}
                variant="primary"
                size="md"
                fullWidth
                loading={primaryLoading}
                disabled={primaryDisabled}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** Circular tap target for the secondary actions — comfortably above the 44pt
 *  minimum, and identical for all five so the row reads as one set. */
const SECONDARY_SIZE = 52;

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    wrap: {
      gap: SPACING.md,
    },
    secondaryRow: {
      flexDirection: 'row',
      // Evenly spread rather than stretched: circles of a fixed size read as a
      // set of controls, where full-width rounded rectangles read as five
      // competing buttons and crowded out the primary action.
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.xs,
    },
    secondaryButton: {
      width: SECONDARY_SIZE,
      height: SECONDARY_SIZE,
      borderRadius: SECONDARY_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: `${COLORS.secondary}30`,
    },
    secondaryButtonDanger: {
      borderColor: `${COLORS.error}40`,
      backgroundColor: `${COLORS.error}12`,
    },
    secondaryButtonDisabled: {
      borderColor: COLORS.outlineVariant,
      backgroundColor: 'transparent',
    },
    primaryRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    cancelWrap: {
      flex: 1,
    },
    primaryWrapSplit: {
      flex: 1.5,
    },
    primaryWrapFull: {
      flex: 1,
    },
  });
