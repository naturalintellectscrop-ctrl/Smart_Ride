// ============================================
// SMART RIDE MOBILE - OFFLINE BANNER
// ============================================
// Detects network status via NetInfo and shows
// an animated banner when the device is offline
// ============================================

import React, { useEffect, useState, useMemo } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors } from '@/src/theme/themedColors';

export function OfflineBanner() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -50,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: COLORS.error, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.onError} />
      <Text style={[styles.text, { color: COLORS.onError }]}>
        You're offline. Some features may not be available.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    zIndex: 9999,
  },
  text: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: '500',
  },
});
