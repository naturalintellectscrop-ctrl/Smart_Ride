// ============================================
// SMART RIDE MOBILE - AUTH SCREEN SCAFFOLD
// ============================================
// The shared page frame for every login and onboarding screen: safe area,
// keyboard avoidance, scroll, the 24pt gutter, an optional back button and
// step rail, the brand lockup, the hero plate, and the two-tone headline.
//
// ANDROID CURSOR RULE — read before editing:
// The entrance animation wraps ONLY the header chrome (lockup, hero,
// headline). `children` — the form — is rendered outside the Animated.View,
// deliberately. Wrapping inputs in an Animated.View with a transform is what
// made forgot-password.tsx duplicate its whole card JSX across an
// `animationDone ? <View> : <Animated.View>` branch. Keeping the form out of
// the animated subtree removes the need for that trick entirely, so do not
// "tidy up" by moving children inside.
// ============================================

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandLockup } from './BrandLockup';
import { AuthHeadline } from './AuthHeadline';
import { AuthHeroArt } from './AuthHeroArt';
import { StepRail } from './StepRail';
import { SPACING, RADIUS, ICON, MOTION } from '../../constants';
import { useTheme } from '../../context/theme-context';
import { makeThemedColors, ThemedColors } from '../../theme/themedColors';

export interface AuthScreenProps {
  /** Headline first line, in ink. */
  lead?: string;
  /** Headline second line, in brand green. */
  accent?: string;
  subtitle?: string;
  /** Omit to hide the back button. */
  onBack?: () => void;
  /** Renders the step rail in the top bar. */
  step?: { current: number; labels: string[] };
  /** Brand lockup above the headline. On by default. */
  showLockup?: boolean;
  /** Hero illustration plate. Off by default — it belongs on the screens that
   *  open a flow, not on every step of one. */
  showHero?: boolean;
  /** Extra chrome between the headline and the form (a security notice, a
   *  countdown). Part of the animated header. */
  headerExtra?: React.ReactNode;
  /** The form. Rendered outside the animated subtree — see the header note. */
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Right-hand action in the top bar, when there is no step rail. */
  headerRight?: React.ReactNode;
}

export function AuthScreen({
  lead,
  accent,
  subtitle,
  onBack,
  step,
  showLockup = true,
  showHero = false,
  headerExtra,
  children,
  contentStyle,
  headerRight,
}: AuthScreenProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  // Header-only entrance. Opacity + translateY both run on the native driver,
  // so no JS-thread style work happens while the user is typing.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: MOTION.duration.slow,
      easing: Easing.bezier(...MOTION.easing.decelerate),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const headerStyle = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const hasTopBar = !!onBack || !!step || !!headerRight;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + SPACING.lg, 40) },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hasTopBar ? (
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, SPACING.sm) }]}>
            {onBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={ICON.lg} color={COLORS.onSurface} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButton} />
            )}

            {step ? (
              <StepRail current={step.current} labels={step.labels} style={styles.stepRail} />
            ) : (
              <View style={styles.stepRail} />
            )}

            {headerRight ?? <View style={styles.backButton} />}
          </View>
        ) : (
          <View style={{ height: Math.max(insets.top, SPACING.lg) }} />
        )}

        <Animated.View style={[styles.header, headerStyle]}>
          {showLockup ? <BrandLockup style={styles.lockup} /> : null}
          {showHero ? <AuthHeroArt style={styles.hero} /> : null}
          {lead && accent ? (
            <AuthHeadline lead={lead} accent={accent} subtitle={subtitle} />
          ) : subtitle ? (
            <Text style={styles.standaloneSubtitle}>{subtitle}</Text>
          ) : null}
          {headerExtra}
        </Animated.View>

        <View style={styles.body}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingBottom: SPACING.md,
      gap: SPACING.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.full,
    },
    stepRail: {
      flex: 1,
      marginTop: SPACING.sm,
    },
    header: {
      marginBottom: SPACING.lg,
    },
    lockup: {
      marginBottom: SPACING.lg,
    },
    hero: {
      marginBottom: SPACING.lg,
    },
    standaloneSubtitle: {
      color: COLORS.onSurfaceVariant,
      fontSize: 16,
      lineHeight: 24,
    },
    body: {
      flex: 1,
      gap: SPACING.gutter,
    },
  });
