// ============================================
// SMART RIDE MOBILE - CONVERSATIONS LIST SCREEN
// ============================================
// Shows list of active conversations linked to tasks/orders
// Dark theme with Smart Ride branding
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useChatStore } from '@/src/store/chatStore';
import { socketService } from '@/src/services/socket.service';
import { COLORS, GRADIENTS } from '@/src/constants';
import { Conversation } from '@/src/store/chatStore';

export default function ConversationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    onNewMessage,
  } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();

    // Listen for new messages to update conversation list
    const unsubMessage = socketService.on('chat:message', (data: any) => {
      onNewMessage(data);
    });

    return () => {
      unsubMessage();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.id}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTaskTypeIcon = (taskType?: string) => {
    if (!taskType) return 'chatbubbles-outline';
    if (taskType.includes('BODA')) return 'bicycle-outline';
    if (taskType.includes('CAR')) return 'car-outline';
    if (taskType.includes('FOOD')) return 'restaurant-outline';
    if (taskType.includes('SHOPPING')) return 'cart-outline';
    if (taskType.includes('DELIVERY')) return 'gift-outline';
    if (taskType.includes('HEALTH')) return 'heart-outline';
    return 'chatbubbles-outline';
  };

  const getTaskTypeColor = (taskType?: string) => {
    if (!taskType) return COLORS.primary;
    if (taskType.includes('BODA')) return COLORS.serviceBoda;
    if (taskType.includes('CAR')) return COLORS.serviceCar;
    if (taskType.includes('FOOD')) return COLORS.serviceFood;
    if (taskType.includes('SHOPPING')) return COLORS.serviceShop;
    if (taskType.includes('DELIVERY')) return COLORS.serviceDelivery;
    if (taskType.includes('HEALTH')) return COLORS.serviceHealth;
    return COLORS.primary;
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const serviceColor = getTaskTypeColor(item.taskType);
    const serviceIcon = getTaskTypeIcon(item.taskType);
    const lastMsgPreview = item.lastMessage?.content || 'No messages yet';
    const isSystem = item.lastMessage?.type === 'SYSTEM';

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
        <TouchableOpacity
          style={styles.conversationCard}
          onPress={() => handleConversationPress(item)}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <View style={[styles.avatarContainer, { borderColor: serviceColor + '30' }]}>
            <Ionicons name={serviceIcon as any} size={22} color={serviceColor} />
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {item.otherUser.name}
              </Text>
              <Text style={styles.conversationTime}>
                {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
              </Text>
            </View>

            <View style={styles.conversationFooter}>
              <View style={styles.messagePreviewContainer}>
                {item.taskNumber && (
                  <Text style={[styles.taskBadge, { color: serviceColor }]}>
                    {item.taskNumber} ·{' '}
                  </Text>
                )}
                <Text
                  style={[styles.messagePreview, isSystem && styles.systemMessagePreview]}
                  numberOfLines={1}
                >
                  {isSystem ? `📋 ${lastMsgPreview}` : lastMsgPreview}
                </Text>
              </View>

              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: serviceColor }]}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeInUp.duration(400).springify()} style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubbles-outline" size={56} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your conversations with drivers and merchants{'\n'}will appear here
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButtonGradient}
        >
          <Text style={styles.emptyButtonText}>Book a Ride</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Messages</Text>
            {totalUnread > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={22} color={COLORS.textSecondary} />
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

      {/* Conversations List */}
      {isLoadingConversations && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBorder: {
    height: 1,
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },

  // Conversation Card
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 19, 26, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
  },
  taskBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  systemMessagePreview: {
    fontStyle: 'italic',
    color: COLORS.textDim,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading
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
});
