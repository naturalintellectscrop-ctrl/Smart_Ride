// ============================================
// SMART RIDE MOBILE - CHAT DETAIL SCREEN
// ============================================
// Full chat interface with messages, typing indicator,
// quick actions, and real-time updates
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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp, withRepeat, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useChatStore, Conversation, Message } from '@/src/store/chatStore';
import { socketService } from '@/src/services/socket.service';
import { ChatBubble } from '@/src/components';
import { COLORS, GRADIENTS } from '@/src/constants';

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

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 4,
    marginBottom: 8,
    gap: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 37, 48, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  text: {
    fontSize: 12,
    color: COLORS.textDim,
    fontStyle: 'italic',
  },
});

// ============================================
// MAIN CHAT DETAIL SCREEN
// ============================================

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversationId = params.id;

  const {
    conversations,
    messages,
    typingStatus,
    isLoadingMessages,
    isSendingMessage,
    loadMessages,
    sendMessage,
    markAsRead,
    setActiveConversation,
    joinConversation,
    leaveConversation,
    sendTyping,
    onNewMessage,
    onTypingIndicator,
    onReadReceipt,
  } = useChatStore();

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

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketService.chatTyping({ conversationId, isTyping: false });
      }, 3000);
    }
  }, [conversationId, sendTyping]);

  const handleCall = useCallback(() => {
    if (conversation?.otherUser?.id) {
      router.push(`/call/${conversation.otherUser.id}?name=${encodeURIComponent(conversation.otherUser.name)}&conversationId=${conversationId}` as any);
    }
  }, [conversation, conversationId]);

  const handleShareLocation = useCallback(() => {
    Alert.alert(
      'Share Location',
      'Send your current location to this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => {
            if (conversationId) {
              sendMessage(conversationId, {
                content: '📍 Shared current location',
                type: 'TEXT',
              });
            }
          },
        },
      ]
    );
  }, [conversationId, sendMessage]);

  const handleAttachment = useCallback(() => {
    Alert.alert('Attach', 'Choose an attachment type', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Photo',
        onPress: () => {
          // Placeholder for image picker
          if (conversationId) {
            sendMessage(conversationId, {
              content: '📷 Sent a photo',
              type: 'TEXT',
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
    const isOwn = item.senderId === 'client-1';
    const isSystem = item.type === 'SYSTEM';

    // Check if we should show a date separator
    const showDateSeparator = index === 0 || (() => {
      const prevDate = new Date(messages[index - 1].createdAt).toDateString();
      const currDate = new Date(item.createdAt).toDateString();
      return prevDate !== currDate;
    })();

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
        <ChatBubble
          message={item.content}
          time={formatMessageTime(item.createdAt)}
          isOwn={isOwn}
          isRead={item.isRead}
          senderName={item.senderName}
          type={isSystem ? 'system' : 'text'}
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
        Send a message to {conversation?.otherUser?.name || 'get started'}
      </Text>
    </Animated.View>
  );

  const otherUserName = conversation?.otherUser?.name || 'Chat';
  const otherUserOnline = isTyping;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 || 48 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
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

          <TouchableOpacity
            style={styles.headerCallButton}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* Gradient glow border */}
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
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
          <Ionicons name="call-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.quickActionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handleShareLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Location</Text>
        </TouchableOpacity>
      </View>

      {/* Message Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachment}
            activeOpacity={0.7}
          >
            <Ionicons name="attach-outline" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={1000}
            editable={!isSendingMessage}
          />

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
                  : ['#333', '#444']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendGradient}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Ionicons name="send" size={18} color={inputText.trim() ? COLORS.background : COLORS.textDim} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.background,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 4,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textDim,
  },
  onlineDotActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  onlineText: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  onlineTextActive: {
    color: COLORS.primary,
  },
  headerCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  glowBorder: {
    height: 1,
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Date Separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textDim,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Input Bar
  inputBar: {
    backgroundColor: COLORS.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    minHeight: 42,
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 2,
  },
  sendGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
