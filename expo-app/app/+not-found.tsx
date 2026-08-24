// ============================================
// SMART RIDE MOBILE - NOT FOUND (recovery) SCREEN
// ============================================
// Replaces Expo Router's default "Unmatched Route" screen so a bad/stale
// navigation never traps the user. Auto-redirects to the correct home for
// their role after a short beat, with a manual button as a fallback.
// ============================================

import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { getHomeRouteForRole } from '@/src/utils/roleRouting';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

export default function NotFoundScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { isAuthenticated, user } = useAuthStore();

  const goHome = () => {
    if (isAuthenticated) {
      router.replace(getHomeRouteForRole(user?.role) as any);
    } else {
      router.replace('/');
    }
  };

  // Auto-recover after a brief moment so a stale route never traps the user.
  useEffect(() => {
    const t = setTimeout(goHome, 1200);
    return () => clearTimeout(t);
  }, [isAuthenticated, user?.role]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="compass-outline" size={44} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Taking you back…</Text>
      <Text style={styles.subtitle}>That screen moved. Redirecting you home.</Text>

      <TouchableOpacity style={styles.button} onPress={goHome} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Go Home Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonText: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
});
