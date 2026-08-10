// ============================================
// SMART RIDE — SmartBottomSheet
// ============================================
// Canonical bottom sheet primitive: rounded-26 top, draggable grabber with
// snap points, `slow` + `gentle` spring, scrim overlay. Used for booking
// options, incoming requests, top-up/withdraw, attachments.
//
// The grabber used to be decorative — it looked draggable and did nothing, so
// a rider who wanted more of the sheet (a long address list, a full receipt)
// had no way to get it. It is now a real gesture handle: drag to resize
// between snap points, release to settle at the nearest one, drag past the
// bottom to dismiss.
// ============================================

import React, { useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ViewStyle, Pressable, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { SPACING, RADIUS, MOTION } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors, ThemedColors } from '../theme/themedColors';

/**
 * Fractions of the available height the sheet settles at, smallest first.
 * `peek` shows the header and the first row or two; `half` is the default
 * working size; `full` is as tall as the sheet is allowed to go.
 */
export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_FRACTIONS: Record<SheetSnap, number> = {
  peek: 0.32,
  half: 0.58,
  full: 0.92,
};

/** Drag past this fraction of the smallest snap and the release dismisses. */
const DISMISS_THRESHOLD = 0.6;

interface SmartBottomSheetProps {
  visible: boolean;
  title?: string;
  onDismiss: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /**
   * Cap on how tall the sheet may grow, in px. Defaults to 92% of the screen.
   * Prefer `snapPoints` — this exists for sheets that must not cover a
   * specific piece of the screen behind them.
   */
  maxHeight?: number;
  /**
   * Whether tapping the scrim (or the Android back button) dismisses the sheet.
   * Set false for sheets whose dismissal is a real decision — an incoming ride
   * offer must not be declined by a stray tap next to the sheet.
   */
  dismissOnBackdrop?: boolean;
  /**
   * Heights the sheet settles at, smallest first. **Omit for a sheet that
   * should size itself to its content** — the common case, and the behaviour
   * every existing caller had. Pass snap points only for sheets whose content
   * is long or open-ended (a map screen's trip panel, an address list), where
   * the reader should decide how much of the screen it takes.
   */
  snapPoints?: SheetSnap[];
  /** Which snap point the sheet opens at. Defaults to the largest available. */
  initialSnap?: SheetSnap;
  /**
   * Whether dragging the sheet down past the smallest snap dismisses it.
   * Follows `dismissOnBackdrop` unless set explicitly — a sheet that a stray
   * tap must not close should not be closable by a stray swipe either.
   */
  dismissOnDragDown?: boolean;
}

export function SmartBottomSheet({
  visible,
  title,
  onDismiss,
  children,
  style,
  contentStyle,
  maxHeight,
  dismissOnBackdrop = true,
  snapPoints,
  initialSnap,
  dismissOnDragDown,
}: SmartBottomSheetProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const canDismissByDrag = dismissOnDragDown ?? dismissOnBackdrop;

  // Snap heights in px, ascending. `maxHeight` clamps every stop, so a caller
  // that caps the sheet still gets working snap behaviour below that cap.
  const stops = useMemo(() => {
    if (!snapPoints?.length) return [];
    const ceiling = maxHeight ?? screenHeight * SNAP_FRACTIONS.full;
    const ordered = (['peek', 'half', 'full'] as SheetSnap[]).filter(s => snapPoints.includes(s));
    const list = (ordered.length ? ordered : (['full'] as SheetSnap[]))
      .map(s => Math.min(screenHeight * SNAP_FRACTIONS[s], ceiling));
    // Collapsing duplicates keeps a clamped sheet from having two identical
    // stops that feel like a dead zone when dragged between them.
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [maxHeight, screenHeight, snapPoints]);

  const openHeight = useMemo(() => {
    if (!stops.length) return 0;
    if (initialSnap && snapPoints?.includes(initialSnap)) {
      return Math.min(screenHeight * SNAP_FRACTIONS[initialSnap], stops[stops.length - 1]);
    }
    return stops[stops.length - 1];
  }, [initialSnap, snapPoints, screenHeight, stops]);

  const height = useSharedValue(openHeight);
  const startHeight = useSharedValue(openHeight);

  // Re-open at the intended snap. Without this the sheet would reopen at
  // whatever height the user last dragged it to before dismissing.
  useEffect(() => {
    if (visible) {
      height.value = withSpring(openHeight, { damping: 20, mass: 0.9 });
    } else {
      height.value = openHeight;
    }
  }, [visible, openHeight, height]);

  const handleDismiss = useCallback(() => onDismiss(), [onDismiss]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startHeight.value = height.value;
        })
        .onUpdate(e => {
          // Dragging down (positive translationY) shrinks the sheet.
          const next = startHeight.value - e.translationY;
          const ceiling = stops[stops.length - 1];
          // Allow a little overshoot past the top so the spring has somewhere
          // to settle back from, but never past the ceiling by more than a nudge.
          height.value = Math.min(next, ceiling + SPACING.lg);
        })
        .onEnd(e => {
          const smallest = stops[0];
          // Velocity matters as much as position: a fast flick down should
          // close even from a tall sheet, which a pure height test misses.
          const flungDown = e.velocityY > 900;
          const draggedBelow = height.value < smallest * DISMISS_THRESHOLD;

          if (canDismissByDrag && (draggedBelow || (flungDown && height.value <= smallest))) {
            runOnJS(handleDismiss)();
            return;
          }

          // Settle at whichever stop the sheet is closest to, biased by fling
          // direction so a deliberate flick moves a whole step rather than
          // snapping back to where it started.
          const projected = height.value - e.velocityY * 0.12;
          let nearest = stops[0];
          for (const s of stops) {
            if (Math.abs(s - projected) < Math.abs(nearest - projected)) nearest = s;
          }
          height.value = withSpring(nearest, {
            damping: 20,
            mass: 0.9,
            velocity: -e.velocityY,
          });
        }),
    [stops, canDismissByDrag, handleDismiss, height, startHeight],
  );

  const sheetStyle = useAnimatedStyle(() => ({ height: height.value }));

  // Resizing is opt-in: without snap points the sheet keeps its original
  // content-driven height, and the grabber stays the visual affordance it was.
  const resizable = stops.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismissOnBackdrop ? onDismiss : undefined}
    >
      {/* Durations live under MOTION.duration.*; MOTION.base/MOTION.fast were
          undefined, so these animations had no duration. */}
      <Animated.View entering={FadeIn.duration(MOTION.duration.base)} exiting={FadeOut.duration(MOTION.duration.fast)} style={styles.backdrop}>
        {dismissOnBackdrop ? <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} /> : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
        <Animated.View
          style={[
            styles.sheet,
            resizable ? sheetStyle : styles.sheetAutoHeight,
            { paddingBottom: Math.max(insets.bottom, SPACING.sm) },
            style,
          ]}
        >
          {/* Grabber — the drag target. The hit area is deliberately the full
              width of the sheet header, not the 40px pill: a 4px-tall pill is
              well under the 44px minimum touch target. */}
          {resizable ? (
            <GestureDetector gesture={dragGesture}>
              <View
                style={styles.grabberWrap}
                accessibilityRole="adjustable"
                accessibilityLabel="Resize sheet"
                accessibilityHint="Swipe up or down to change the sheet height"
              >
                <View style={styles.grabber} />
              </View>
            </GestureDetector>
          ) : (
            <View style={styles.grabberWrap}>
              <View style={styles.grabber} />
            </View>
          )}

          {/* Header (optional) */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
          )}

          {/* Content.
              Scrollable and keyboard-aware because sheets carry forms (top-up,
              withdraw, pickers). Without this a focused field sits behind the
              keyboard on both platforms — the bespoke modals these replaced
              each had their own KeyboardAvoidingView, so the behaviour belongs
              here rather than in every caller. */}
          <ScrollView
            style={resizable ? styles.scrollFill : styles.scroll}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl + 2,
    borderTopRightRadius: RADIUS.xl + 2,
    overflow: 'hidden',
  },
  sheetAutoHeight: {
    // Content-driven sheets keep the original cap so a long list still scrolls
    // rather than running off the top of the screen.
    maxHeight: '80%',
  },
  scroll: {
    // A resizable sheet has an explicit animated height, so its scroll view
    // must take the remaining space rather than sizing to content — otherwise
    // dragging taller would leave empty surface below the content. An
    // auto-height sheet needs the opposite, so the flex is applied per mode.
    flexGrow: 0,
  },
  scrollFill: {
    flex: 1,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
});
