// ============================================
// SMART RIDE MOBILE - ICON SYSTEM
// ============================================
// Premium icon component using Feather icons
// Matches Lucide icon style from admin dashboard
// ============================================

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Icon name mapping (Lucide -> Feather equivalent)
export type IconName =
  // Navigation & Transport
  | 'car'
  | 'truck'
  | 'bike'
  | 'navigation'
  | 'map-pin'
  | 'compass'
  | 'map'
  // Food & Shopping
  | 'coffee'
  | 'shopping-bag'
  | 'shopping-cart'
  | 'package'
  | 'gift'
  // Health
  | 'heart'
  | 'activity'
  | 'plus-circle'
  // User & Auth
  | 'user'
  | 'users'
  | 'user-plus'
  | 'user-check'
  | 'log-out'
  | 'log-in'
  // Communication
  | 'bell'
  | 'mail'
  | 'phone'
  | 'message-circle'
  | 'send'
  // Actions
  | 'search'
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'check-circle'
  | 'edit'
  | 'trash-2'
  | 'copy'
  | 'share-2'
  | 'download'
  | 'upload'
  | 'refresh-cw'
  | 'settings'
  | 'sliders'
  | 'filter'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'unlock'
  // Media
  | 'camera'
  | 'image'
  | 'video'
  | 'mic'
  // Finance
  | 'credit-card'
  | 'dollar-sign'
  | 'wallet'
  | 'trending-up'
  | 'trending-down'
  // Time & Date
  | 'clock'
  | 'calendar'
  | 'history'
  // Status
  | 'alert-circle'
  | 'alert-triangle'
  | 'info'
  | 'help-circle'
  | 'star'
  | 'award'
  // Arrows
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'external-link'
  // Files
  | 'file'
  | 'file-text'
  | 'folder'
  // Home & Misc
  | 'home'
  | 'grid'
  | 'menu'
  | 'more-horizontal'
  | 'more-vertical'
  | 'layers'
  | 'database'
  | 'shield'
  | 'zap'
  | 'sun'
  | 'moon'
  | 'cloud'
  | 'thermometer'
  | 'droplet';

// Feather icon name mapping
const iconNameMap: Record<IconName, keyof typeof Feather.glyphMap> = {
  // Navigation & Transport
  'car': 'truck',
  'truck': 'truck',
  'bike': 'navigation',
  'navigation': 'navigation',
  'map-pin': 'map-pin',
  'compass': 'compass',
  'map': 'map',
  // Food & Shopping
  'coffee': 'coffee',
  'shopping-bag': 'shopping-bag',
  'shopping-cart': 'shopping-cart',
  'package': 'package',
  'gift': 'gift',
  // Health
  'heart': 'heart',
  'activity': 'activity',
  'plus-circle': 'plus-circle',
  // User & Auth
  'user': 'user',
  'users': 'users',
  'user-plus': 'user-plus',
  'user-check': 'user-check',
  'log-out': 'log-out',
  'log-in': 'log-in',
  // Communication
  'bell': 'bell',
  'mail': 'mail',
  'phone': 'phone',
  'message-circle': 'message-circle',
  'send': 'send',
  // Actions
  'search': 'search',
  'plus': 'plus',
  'minus': 'minus',
  'x': 'x',
  'check': 'check',
  'check-circle': 'check-circle',
  'edit': 'edit',
  'trash-2': 'trash-2',
  'copy': 'copy',
  'share-2': 'share-2',
  'download': 'download',
  'upload': 'upload',
  'refresh-cw': 'refresh-cw',
  'settings': 'settings',
  'sliders': 'sliders',
  'filter': 'filter',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'lock': 'lock',
  'unlock': 'unlock',
  // Media
  'camera': 'camera',
  'image': 'image',
  'video': 'video',
  'mic': 'mic',
  // Finance
  'credit-card': 'credit-card',
  'dollar-sign': 'dollar-sign',
  'wallet': 'dollar-sign',
  'trending-up': 'trending-up',
  'trending-down': 'trending-down',
  // Time & Date
  'clock': 'clock',
  'calendar': 'calendar',
  'history': 'clock',
  // Status
  'alert-circle': 'alert-circle',
  'alert-triangle': 'alert-triangle',
  'info': 'info',
  'help-circle': 'help-circle',
  'star': 'star',
  'award': 'award',
  // Arrows
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'external-link': 'external-link',
  // Files
  'file': 'file',
  'file-text': 'file-text',
  'folder': 'folder',
  // Home & Misc
  'home': 'home',
  'grid': 'grid',
  'menu': 'menu',
  'more-horizontal': 'more-horizontal',
  'more-vertical': 'more-vertical',
  'layers': 'layers',
  'database': 'database',
  'shield': 'shield',
  'zap': 'zap',
  'sun': 'sun',
  'moon': 'moon',
  'cloud': 'cloud',
  'thermometer': 'thermometer',
  'droplet': 'droplet',
};

// Standard sizes
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<IconSize, number> = {
  'xs': 14,
  'sm': 16,
  'md': 20,
  'lg': 24,
  'xl': 28,
  '2xl': 32,
};

interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  style?: ViewStyle;
}

export function Icon({ name, size = 'md', color = '#FFFFFF', style }: IconProps) {
  const iconSize = typeof size === 'number' ? size : sizeMap[size];
  const featherName = iconNameMap[name] || 'help-circle';

  return (
    <View style={[styles.container, style]}>
      <Feather
        name={featherName}
        size={iconSize}
        color={color}
      />
    </View>
  );
}

// Pre-configured icon colors
export const IconColors = {
  primary: '#00FF88',
  accent: '#00FFF3',
  warning: '#FBBF24',
  error: '#F43F5E',
  success: '#22C55E',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  // Service colors
  ride: '#00FF88',
  food: '#F59E0B',
  shopping: '#8B5CF6',
  delivery: '#14B8A6',
  health: '#F43F5E',
  wallet: '#3B82F6',
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;
