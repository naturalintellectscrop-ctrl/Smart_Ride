// ============================================
// SMART RIDE — Avatar
// ============================================
// One avatar for people/providers across Active Ride, Chat, Profile, receipts.
// Image → initials → icon fallback. Sizes from the AVATAR token scale.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR, BORDER } from '../constants';
import { useTheme } from '../context/theme-context';
import { makeThemedColors } from '../theme/themedColors';

export type AvatarSize = keyof typeof AVATAR; // 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

function initialsOf(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({ uri, name, size = 'md', icon = 'person', style }: AvatarProps) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const dim = AVATAR[size];
  const initials = initialsOf(name);
  const label = name ? `${name} avatar` : 'Avatar';

  const base: ViewStyle = {
    width: dim, height: dim, borderRadius: dim / 2,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: BORDER.hairline, borderColor: COLORS.borderLight,
    overflow: 'hidden',
  };

  if (uri) {
    return <Image source={{ uri }} style={[base, style]} accessibilityLabel={label} accessible />;
  }
  return (
    <View style={[base, style]} accessibilityLabel={label} accessible>
      {initials ? (
        <Text style={{ fontSize: dim * 0.4, fontWeight: '700', color: COLORS.onSurfaceVariant }}>{initials}</Text>
      ) : (
        <Ionicons name={icon} size={dim * 0.5} color={COLORS.onSurfaceVariant} />
      )}
    </View>
  );
}
