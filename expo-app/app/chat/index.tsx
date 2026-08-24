// ============================================
// SMART RIDE — CONVERSATIONS
// ============================================
// Golden Screen #33 · Archetype AR-4 (List + Search).
//
//   AppHeader (unread count) → SearchInput → Card rows (Avatar, preview,
//   CountBadge) → EmptyState, pull-to-refresh
//
// Reachable two ways: the client's Messages tab, and /chat for roles without a
// tab bar (driver, merchant, pharmacist). Both render this one implementation —
// (tabs)/messages.tsx is a re-export shim.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useChatStore } from '@/src/store/chatStore';
import { socketService } from '@/src/services/socket.service';
import { SPACING, RADIUS, MOTION, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { Conversation } from '@/src/store/chatStore';
import {
  AppHeader,
  Avatar,
  Card,
  ConversationSkeleton,
  CountBadge,
  EmptyState,
  SearchInput,
} from '@/src/components';

export default function MessagesTabScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    onNewMessage,
  } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Client-side search over the loaded conversations — participant name or the
  // ride/order number the thread belongs to. No endpoint needed.
  const visibleConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.otherUser?.name, c.taskNumber].some((f) => f?.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  useEffect(() => {
    loadConversations();

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
      <Animated.View entering={FadeInDown.duration(MOTION.duration.base).delay(Math.min(index * 40, 240)).springify()}>
        <Card
          variant="raised"
          padding={SPACING.md}
          radius={RADIUS.lg}
          style={styles.conversationCard}
          onPress={() => handleConversationPress(item)}
          accessibilityLabel={`Conversation with ${item.otherUser.name}`}
        >
          <View style={styles.conversationRow}>
            <Avatar name={item.otherUser.name} icon={serviceIcon as any} size="lg" />

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
                  {isSystem ? lastMsgPreview : lastMsgPreview}
                </Text>
              </View>

              {item.unreadCount > 0 && (
                <CountBadge count={item.unreadCount} color={serviceColor} />
              )}
            </View>
          </View>

            <Ionicons name="chevron-forward" size={ICON.md} color={COLORS.outlineVariant} />
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View entering={FadeInUp.duration(MOTION.duration.slower)} style={styles.stateWrap}>
      {query.trim() ? (
        <EmptyState
          icon="search-outline"
          title="No conversations match your search"
          subtitle="Try a different name or ride number."
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : (
        <EmptyState
          icon="chatbubbles-outline"
          title="No messages yet"
          subtitle="Your conversations with drivers and merchants will appear here."
          actionLabel="Book a Ride"
          onAction={() => router.push('/rider/ride-request?type=BODA' as any)}
        />
      )}
    </Animated.View>
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Messages"
        subtitle={totalUnread > 0 ? `${totalUnread > 99 ? '99+' : totalUnread} unread` : undefined}
        variant="large"
      />

      <View style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or ride number"
        />
      </View>

      {/* Conversations List */}
      {isLoadingConversations && conversations.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </View>
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={
            visibleConversations.length === 0 ? styles.emptyList : styles.listContent
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

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  searchWrap: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.gutter,
  },
  stateWrap: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
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
    color: COLORS.onSurface,
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.outlineVariant,
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
    color: COLORS.outline,
    flex: 1,
  },
  systemMessagePreview: {
    fontStyle: 'italic',
    color: COLORS.outlineVariant,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 8,
  },
});
