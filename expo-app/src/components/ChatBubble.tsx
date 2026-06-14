// ============================================
// SMART RIDE MOBILE - CHAT BUBBLE COMPONENT
// ============================================
// Stitch Design System — Material Design 3
// Left: bg-surfaceContainerHighest
// Right: bg-primaryContainer
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';

interface ChatBubbleProps {
  message: string;
  time: string;
  isOwn: boolean;
  isRead?: boolean;
  senderName?: string;
  type?: 'text' | 'image' | 'system';
}

export function ChatBubble({
  message,
  time,
  isOwn,
  isRead,
  senderName,
  type = 'text',
}: ChatBubbleProps) {
  if (type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {senderName && !isOwn && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.message, isOwn ? styles.ownMessage : styles.otherMessage]}>
          {message}
        </Text>
      </View>
      <View style={[styles.meta, isOwn ? styles.ownMeta : styles.otherMeta]}>
        <Text style={styles.time}>{time}</Text>
        {isOwn && (
          <Ionicons
            name={isRead ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={isRead ? COLORS.secondary : COLORS.outline}
            style={styles.readIcon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    maxWidth: '78%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  senderName: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  // Right: bg-primaryContainer — Stitch Design
  ownBubble: {
    backgroundColor: COLORS.primaryContainer,
    borderBottomRightRadius: 4,
  },
  // Left: bg-surfaceContainerHighest — Stitch Design
  otherBubble: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderBottomLeftRadius: 4,
  },
  message: {
    ...TYPOGRAPHY.bodyMd,
    lineHeight: 20,
  },
  ownMessage: {
    color: COLORS.onSurface,
  },
  otherMessage: {
    color: COLORS.onSurface,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  ownMeta: {
    justifyContent: 'flex-end',
    marginRight: SPACING.xs,
  },
  otherMeta: {
    marginLeft: SPACING.xs,
  },
  time: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  readIcon: {
    marginTop: -1,
  },
  systemContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  systemText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
});
