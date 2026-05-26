// ============================================
// SMART RIDE MOBILE - GLASS CARD COMPONENT
// ============================================
// Glassmorphism card matching admin dashboard
// ============================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, GLASS } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent' | 'cyan';
  padding?: number;
  borderRadius?: number;
  noBorder?: boolean;
}

export function GlassCard({ 
  children, 
  style, 
  variant = 'default', 
  padding = 16,
  borderRadius = 16,
  noBorder = false,
}: GlassCardProps) {
  const variantStyle = getVariantStyle(variant);

  return (
    <View
      style={[
        styles.card,
        { padding, borderRadius },
        variantStyle,
        noBorder && styles.noBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function getVariantStyle(variant: string): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: 'rgba(30, 30, 40, 0.8)',
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
      };
    case 'accent':
      return {
        backgroundColor: 'rgba(0, 255, 136, 0.05)',
        borderColor: 'rgba(0, 255, 136, 0.15)',
      };
    case 'cyan':
      return {
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        borderColor: 'rgba(0, 212, 255, 0.15)',
      };
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(19, 19, 26, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  noBorder: {
    borderWidth: 0,
  },
});
