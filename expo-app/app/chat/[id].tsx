// ============================================
// SMART RIDE MOBILE - CHAT DETAIL SCREEN
// ============================================
// Stitch Design System — Secure Chat Interface
// Chat header with online status + call button,
// Message bubbles (left: surfaceContainerHighest,
// right: primaryContainer), Input bar with send
// button (bg-surfaceContainerLow rounded-full),
// Secure connection badge
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp, withRepeat, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useChatStore, Conversation, Message } from '@/src/store/chatStore';
import { firstName } from '@/src/utils/formatName';
import { useAuthStore, useLocationStore } from '@/src/store';
import { socketService } from '@/src/services/socket.service';
import { GRADIENTS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { GlassCard } from '@/src/components/GlassCard';
import { pickImage } from '@/src/utils/imagePicker';

// Module-scoped themed styles, (re)assigned from the component on each theme
// change so the sub-components and stylesheet factories below can reference them.
let COLORS: ThemedColors;
let styles: any;
let bubbleStyles: any;
let typingStyles: any;

// ============================================
// TYPING INDICATOR COMPONENT
// ============================================

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    const t2 = setTimeout(() => {
      dot2.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    }, 150);
    const t3 = setTimeout(() => {
      dot3.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    }, 300);
    return () => { clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const animDot1 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [{ translateY: -dot1.value * 4 }],
  }));
  const animDot2 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [{ translateY: -dot2.value * 4 }],
  }));
  const animDot3 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [{ translateY: -dot3.value * 4 }],
  }));

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, animDot1]} />
        <Animated.View style={[typingStyles.dot, animDot2]} />
        <Animated.View style={[typingStyles.dot, animDot3]} />
      </View>
      <Text style={typingStyles.text}>typing...</Text>
    </View>
  );
}

const create_typingStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.onSurfaceVariant,
  },
  text: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
});

// ============================================
// STITCH CHAT BUBBLE — Left: bg-surfaceContainerHighest, Right: bg-primaryContainer
// ============================================

function StitchChatBubble({
  message,
  time,
  isOwn,
  isRead,
  senderName,
  type,
  imageUrl,
  metadata,
}: {
  message: string;
  time: string;
  isOwn: boolean;
  isRead?: boolean;
  senderName?: string;
  type?: 'text' | 'image' | 'system' | 'location';
  imageUrl?: string;
  metadata?: { latitude?: number; longitude?: number; [key: string]: any };
}) {
  const handleOpenMap = useCallback(() => {
    if (!metadata?.latitude || !metadata?.longitude) return;
    const { latitude, longitude } = metadata;
    const url = Platform.OS === 'ios'
      ? `maps:?q=${latitude},${longitude}&ll=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) => {
      console.warn('[CHAT] Failed to open map:', err);
      Alert.alert('Error', 'Could not open maps app');
    });
  }, [metadata]);

  if (type === 'system') {
    return (
      <View style={bubbleStyles.systemContainer}>
        <Text style={bubbleStyles.systemText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={[bubbleStyles.container, isOwn ? bubbleStyles.ownContainer : bubbleStyles.otherContainer]}>
      {senderName && !isOwn && (
        <Text style={bubbleStyles.senderName}>{senderName}</Text>
      )}
      <View style={[bubbleStyles.bubble, isOwn ? bubbleStyles.ownBubble : bubbleStyles.otherBubble]}>
        {type === 'image' && imageUrl ? (
          <Image source={{ uri: imageUrl }} style={bubbleStyles.image} resizeMode="cover" />
        ) : null}
        {type === 'location' && metadata?.latitude && metadata?.longitude ? (
          <TouchableOpacity
            style={bubbleStyles.locationCard}
            onPress={handleOpenMap}
            activeOpacity={0.7}
          >
            <View style={bubbleStyles.locationIconWrap}>
              <Ionicons name="location" size={22} color={COLORS.primary} />
            </View>
            <View style={bubbleStyles.locationTextWrap}>
              <Text style={bubbleStyles.locationTitle}>Location</Text>
              <Text style={bubbleStyles.locationCoords} numberOfLines={1}>
                {metadata.latitude.toFixed(6)}, {metadata.longitude.toFixed(6)}
              </Text>
              <Text style={bubbleStyles.locationHint}>Tap to view on map</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.outline} />
          </TouchableOpacity>
        ) : (
          <Text style={[bubbleStyles.message, isOwn ? bubbleStyles.ownMessage : bubbleStyles.otherMessage]}>
            {message}
          </Text>
        )}
      </View>
      <View style={[bubbleStyles.meta, isOwn ? bubbleStyles.ownMeta : bubbleStyles.otherMeta]}>
        <Text style={bubbleStyles.time}>{time}</Text>
        {isOwn && (
          <Ionicons
            name={isRead ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={isRead ? COLORS.secondary : COLORS.outline}
            style={bubbleStyles.readIcon}
          />
        )}
      </View>
    </View>
  );
}

const create_bubbleStyles = (COLORS: ThemedColors) => StyleSheet.create({
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
  image: {
    width: 200,
    height: 150,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    minWidth: 220,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitle: {
    ...TYPOGRAPHY.labelLg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationCoords: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  locationHint: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
    fontStyle: 'italic',
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

// ============================================
// MAIN CHAT DETAIL SCREEN
// ============================================

export default function ChatDetailScreen() {
  { const __t = useTheme(); COLORS = makeThemedColors(__t.isDark); typingStyles = create_typingStyles(COLORS); bubbleStyles = create_bubbleStyles(COLORS); styles = create_styles(COLORS); }
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversationId = params.id;
  const { user } = useAuthStore();

  const conversations = useChatStore(s => s.conversations);
  const messages = useChatStore(s => s.messages);
  const typingStatus = useChatStore(s => s.typingStatus);
  const isLoadingMessages = useChatStore(s => s.isLoadingMessages);
  const isSendingMessage = useChatStore(s => s.isSendingMessage);
  const loadMessages = useChatStore(s => s.loadMessages);
  const sendMessage = useChatStore(s => s.sendMessage);
  const markAsRead = useChatStore(s => s.markAsRead);
  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const joinConversation = useChatStore(s => s.joinConversation);
  const leaveConversation = useChatStore(s => s.leaveConversation);
  const sendTyping = useChatStore(s => s.sendTyping);
  const onNewMessage = useChatStore(s => s.onNewMessage);
  const onTypingIndicator = useChatStore(s => s.onTypingIndicator);
  const onReadReceipt = useChatStore(s => s.onReadReceipt);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the conversation
  const conversation = conversations.find((c) => c.id === conversationId);
  const isTyping = typingStatus[conversationId]?.isTyping || false;

  // Load messages and join conversation on mount
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      setActiveConversation(conversationId);
      joinConversation(conversationId);
      markAsRead(conversationId);
    }

    // Socket listeners
    const unsubMsg = socketService.on('chat:message', (data: any) => {
      onNewMessage(data);
    });
    const unsubTyping = socketService.on('chat:typing', (data: any) => {
      onTypingIndicator(data);
    });
    const unsubRead = socketService.on('chat:read', (data: any) => {
      onReadReceipt(data);
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubRead();
      if (conversationId) {
        leaveConversation(conversationId);
        setActiveConversation(null);
      }
    };
  }, [conversationId]);

  // Mark as read when messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead(conversationId);
    }
  }, [messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;

    setInputText('');
    await sendMessage(conversationId, { content: text, type: 'TEXT' });

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, conversationId, sendMessage]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);

    // Emit typing indicator
    if (conversationId) {
      sendTyping(conversationId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketService.chatTyping(conversationId, false);
      }, 3000);
    }
  }, [conversationId, sendTyping]);

  const handleCall = useCallback(() => {
    if (conversation?.otherUser?.id) {
      router.push(`/call/${conversation.otherUser.id}?name=${encodeURIComponent(firstName(conversation.otherUser.name, 'User'))}&conversationId=${conversationId}` as any);
    }
  }, [conversation, conversationId]);

  const handleShareLocation = useCallback(async () => {
    Alert.alert(
      'Share Location',
      'Send your current location to this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            try {
              // Get current location from location store
              const { latitude, longitude } = useLocationStore.getState();
              if (!latitude || !longitude) {
                Alert.alert(
                  'Location Unavailable',
                  'Could not get your current location. Please enable location services.',
                );
                return;
              }
              if (conversationId) {
                await sendMessage(conversationId, {
                  content: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  type: 'LOCATION',
                  metadata: { latitude, longitude },
                });
              }
            } catch (error) {
              console.error('[CHAT] Share location error:', error);
              Alert.alert('Error', 'Failed to share location');
            }
          },
        },
      ]
    );
  }, [conversationId, sendMessage]);

  const handleAttachment = useCallback(async () => {
    Alert.alert('Attach', 'Choose an attachment type', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Photo',
        onPress: async () => {
          const image = await pickImage({ allowsEditing: false, quality: 0.7 });
          if (image && conversationId) {
            await sendMessage(conversationId, {
              content: 'Sent a photo',
              type: 'IMAGE',
              imageUrl: image.uri,
            });
          }
        },
      },
    ]);
  }, [conversationId, sendMessage]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === user?.id;
    const isSystem = item.type === 'SYSTEM';
    const isLocation = item.type === 'LOCATION';

    const showDateSeparator = index === 0 || (() => {
      const prevDate = new Date(messages[index - 1].createdAt).toDateString();
      const currDate = new Date(item.createdAt).toDateString();
      return prevDate !== currDate;
    })();

    const bubbleType: 'text' | 'image' | 'system' | 'location' = isSystem
      ? 'system'
      : isLocation
        ? 'location'
        : item.type === 'IMAGE'
          ? 'image'
          : 'text';

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
        <StitchChatBubble
          message={item.content}
          time={formatMessageTime(item.createdAt)}
          isOwn={isOwn}
          isRead={item.isRead}
          senderName={item.senderName}
          type={bubbleType}
          imageUrl={item.imageUrl || item.mediaUrl}
          metadata={item.metadata}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptySubtitle}>
        Send a message to {conversation?.otherUser?.name ? firstName(conversation.otherUser.name) : 'get started'}
      </Text>
    </Animated.View>
  );

  const otherUserName = firstName(conversation?.otherUser?.name, 'Chat');
  const otherUserOnline = isTyping;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Chat Header — Stitch Design with online status and call button */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm || 48 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUserName}
            </Text>
            <View style={styles.onlineRow}>
              <View style={[styles.onlineDot, otherUserOnline && styles.onlineDotActive]} />
              <Text style={[styles.onlineText, otherUserOnline && styles.onlineTextActive]}>
                {otherUserOnline ? 'typing...' : (conversation?.taskNumber || 'Online')}
              </Text>
            </View>
          </View>

          {/* Call button */}
          <TouchableOpacity
            style={styles.headerCallButton}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Secure connection badge — Stitch Design */}
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
          <Text style={styles.secureBadgeText}>End-to-end encrypted</Text>
        </View>

        {/* Subtle bottom border */}
        <View style={styles.headerBorder} />
      </View>

      {/* Messages */}
      {isLoadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator />}

      {/* Quick Action Row */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleCall}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={16} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={async () => {
            const image = await pickImage({ allowsEditing: false, quality: 0.7 });
            if (image && conversationId) {
              await sendMessage(conversationId, {
                content: 'Sent a photo',
                type: 'IMAGE',
                imageUrl: image.uri,
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="image-outline" size={16} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleShareLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Location</Text>
        </TouchableOpacity>
      </View>

      {/* Message Input Bar — Stitch: bg-surfaceContainerLow rounded-full with send button */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || SPACING.md }]}>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            activeOpacity={0.7}
          >
            <Ionicons name="attach-outline" size={22} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.onSurfaceVariant}
            multiline
            maxLength={1000}
            editable={!isSendingMessage}
          />

          {/* Send button — Stitch: gradient circle */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!inputText.trim() || isSendingMessage}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                inputText.trim()
                  ? (GRADIENTS.primary as unknown as [string, string])
                  : [COLORS.surfaceContainerHigh, COLORS.surfaceContainerHigh]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendGradient}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Ionicons name="send" size={18} color={inputText.trim() ? COLORS.onPrimary : COLORS.onSurfaceVariant} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// STYLES
// ============================================

const create_styles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Header — Stitch Design
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerCenter: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  headerName: {
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: -0.3,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.outlineVariant,
  },
  onlineDotActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  onlineText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
  },
  onlineTextActive: {
    color: COLORS.primary,
  },
  headerCallButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },

  // Secure badge — Stitch Design
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  secureBadgeText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerBorder: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
  },

  // Messages
  messageList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
  },

  // Date Separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dateText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.outline,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...TYPOGRAPHY.headlineMd,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm - 2,
    gap: SPACING.xs,
  },
  quickActionText: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },

  // Input Bar — Stitch: bg-surfaceContainerLow rounded-full with send button
  inputBar: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    maxHeight: 100,
    minHeight: 42,
  },
  sendButton: {
    borderRadius: 21,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  sendGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
