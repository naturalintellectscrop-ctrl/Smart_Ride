// ============================================
// SMART RIDE MOBILE - CONVERSATIONS LIST SCREEN
// ============================================
// Shows list of active conversations linked to tasks/orders
// Dark theme with Smart Ride branding
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useChatStore } from '@/src/store/chatStore';
import { socketService } from '@/src/services/socket.service';
import { COLORS, GRADIENTS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter conversations by search query (name or last message content)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherUser?.name?.toLowerCase().includes(q) ||
        c.lastMessage?.content?.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

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
                  {isSystem ? lastMsgPreview : lastMsgPreview}
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
          <Ionicons name="chevron-forward" size={18} color={COLORS.outlineVariant} />
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
        onPress={() => router.push('/rider/ride-request?type=BODA' as any)}
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
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
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
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={22} color={COLORS.onSurfaceSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={COLORS.outline} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor={COLORS.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.outline} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Gradient glow border */}
        <LinearGradient
          colors={['#4ae176', '#98f6be', 'transparent']}
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
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={
            filteredConversations.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={
            searchQuery.trim()
              ? () => (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="search-outline" size={48} color={COLORS.outlineVariant} />
                    <Text style={styles.loadingText}>No conversations match "{searchQuery}"</Text>
                  </View>
                )
              : renderEmptyState
          }
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
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surface,
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
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.gutter,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.headlineLgMobile.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: 'bold',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBorder: {
    height: 1,
    marginTop: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADIUS.xl,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  emptyList: {
    flexGrow: 1,
  },

  // Conversation Card
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
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.gutter,
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
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    flex: 1,
    marginRight: SPACING.sm,
  },
  conversationTime: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
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
    marginRight: SPACING.sm,
  },
  taskBadge: {
    fontSize: TYPOGRAPHY.labelMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
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
  unreadBadge: {
    borderRadius: RADIUS.md,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.labelMd.fontSize,
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
    backgroundColor: '#98f6be',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.headlineMd.fontSize,
    fontWeight: 'bold',
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    color: COLORS.onPrimary,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
});
