// ============================================
// SMART RIDE MOBILE - CHAT BUBBLE COMPONENT
// ============================================
// Message bubble for in-app messaging
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

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
            color={isRead ? COLORS.secondary : COLORS.textDim}
            style={styles.readIcon}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  otherBubble: {
    backgroundColor: 'rgba(37, 37, 48, 0.8)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessage: {
    color: COLORS.text,
  },
  otherMessage: {
    color: COLORS.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ownMeta: {
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  otherMeta: {
    marginLeft: 4,
  },
  time: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  readIcon: {
    marginTop: -1,
  },
  systemContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  systemText: {
    fontSize: 12,
    color: COLORS.textDim,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
