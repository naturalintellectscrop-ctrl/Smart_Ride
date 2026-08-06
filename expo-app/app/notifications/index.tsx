// ============================================
// SMART RIDE — NOTIFICATION CENTER
// ============================================
// Golden Screen #37 · Archetype AR-4 (List + filters).
//
//   AppHeader → Chip filter rail → NotificationCard rows → EmptyState /
//   ErrorState, pull-to-refresh, sticky "Mark all as read"
//
// Unread vs read is carried by card variant + weight + dot, not colour alone.
// ============================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NOTIFICATION_TYPES, TYPOGRAPHY, SPACING, RADIUS, MOTION, ICON } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { api } from '@/src/services';
import {
  AppHeader,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  GradientButton,
  StatusBadge,
} from '@/src/components';

// ============================================
// TYPES
// ============================================

type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  entityId?: string;
  entityType?: string;
}

// ============================================
// NOTIFICATION TYPE CONFIG
// ============================================

/**
 * Per-type presentation. Derived from theme tokens rather than fixed hex: the
 * previous table hardcoded a colour per type and then paired it with `colorDim`
 * / `colorBorder` rgba values taken from a different palette entirely (brand
 * green #005f3a next to emerald rgba(16,185,129), etc.), so the tint behind an
 * icon never matched the icon.
 */
function notificationConfig(COLORS: ThemedColors): Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colorDim: string;
  colorBorder: string;
  label: string;
}> {
  const entry = (icon: keyof typeof Ionicons.glyphMap, color: string, label: string) => ({
    icon,
    color,
    // One tint rule for every type, so dim/border can never drift from colour.
    colorDim: `${color}1A`,
    colorBorder: `${color}33`,
    label,
  });

  return {
    RIDE_UPDATE: entry('car-outline', COLORS.primary, 'Ride'),
    ORDER_UPDATE: entry('restaurant-outline', COLORS.success, 'Order'),
    PAYMENT: entry('card-outline', COLORS.info, 'Payment'),
    PROMO: entry('pricetag-outline', COLORS.secondary, 'Promo'),
    SOS: entry('alert-circle-outline', COLORS.error, 'Emergency'),
    CHAT: entry('chatbubble-outline', COLORS.tertiary, 'Chat'),
    SYSTEM: entry('settings-outline', COLORS.warning, 'System'),
  };
}


// ============================================
// FILTER TABS
// ============================================

const FILTER_TABS = [
  { key: 'ALL', label: 'All', icon: 'grid-outline' as keyof typeof Ionicons.glyphMap },
  { key: 'RIDE_UPDATE', label: 'Rides', icon: 'car-outline' as keyof typeof Ionicons.glyphMap },
  { key: 'ORDER_UPDATE', label: 'Orders', icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap },
  { key: 'PAYMENT', label: 'Payments', icon: 'card-outline' as keyof typeof Ionicons.glyphMap },
  { key: 'SYSTEM', label: 'System', icon: 'settings-outline' as keyof typeof Ionicons.glyphMap },
];

// ============================================
// HELPERS
// ============================================

function formatTimestamp(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Map raw API notification to AppNotification interface */
function mapApiNotification(raw: any): AppNotification {
  return {
    id: raw.id,
    type: raw.type || 'SYSTEM',
    title: raw.title || 'Notification',
    description: raw.message || '',
    timestamp: raw.createdAt || new Date().toISOString(),
    isRead: raw.isRead || false,
    entityId: raw.referenceId || undefined,
    entityType: raw.referenceType || undefined,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = activeFilter === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setError(null);
    try {
      const response = await api.getNotifications();
      if (response.success && response.data) {
        // API may return { notifications: [...] } or directly an array
        const rawList = Array.isArray(response.data)
          ? response.data
          : response.data.notifications || [];
        setNotifications(rawList.map(mapApiNotification));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load data. Please try again.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    try {
      await api.markNotificationRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api.markNotificationRead(undefined, true);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationPress = (notification: AppNotification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    // Navigate based on entity type
    if (notification.entityType === 'task' && notification.entityId) {
      router.push('/(tabs)/rides');
    } else if (notification.entityType === 'order' && notification.entityId) {
      router.push('/(tabs)/orders');
    } else if (notification.entityType === 'chat' && notification.entityId) {
      router.push(`/chat/${notification.entityId}` as any);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notifications"
        onBack={() => router.back()}
        rightActions={unreadCount > 0 ? [] : undefined}
      />

      {/* Filter rail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRail}
      >
        {FILTER_TABS.map((tab) => (
          <Chip
            key={tab.key}
            label={
              tab.key === 'ALL'
                ? tab.label
                : `${tab.label} ${notifications.filter((n) => n.type === tab.key).length}`
            }
            icon={tab.icon}
            active={activeFilter === tab.key}
            onPress={() => setActiveFilter(tab.key)}
          />
        ))}
      </ScrollView>

      {/* Notifications List */}
      {error && filteredNotifications.length === 0 ? (
        <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
          <ErrorState title="Something went wrong" subtitle={error} onRetry={loadNotifications} retryLabel="Try Again" />
        </Animated.View>
      ) : filteredNotifications.length === 0 ? (
        <Animated.View entering={FadeIn.duration(MOTION.duration.slower)} style={styles.stateWrap}>
          <EmptyState
            icon="notifications-outline"
            title="All caught up"
            subtitle={`You have no ${
              activeFilter === 'ALL' ? '' : (FILTER_TABS.find((t) => t.key === activeFilter)?.label.toLowerCase() ?? '') + ' '
            }notifications right now. We'll let you know when something arrives.`}
          />
        </Animated.View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item, index }) => (
            <NotificationCard
              notification={item}
              onPress={handleNotificationPress}
              delay={Math.min(index * 40, 240)}
              COLORS={COLORS}
              styles={styles}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        />
      )}

      {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <Animated.View
          entering={FadeInUp.duration(400).springify()}
          style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 || 20 }]}
        >
          <GradientButton
            title={`Mark All as Read (${unreadCount})`}
            onPress={handleMarkAllRead}
            variant="primary"
            fullWidth
            size="md"
            icon={<Ionicons name="checkmark-done-outline" size={18} color={COLORS.background} />}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// NOTIFICATION CARD
// ============================================

function NotificationCard({
  notification,
  onPress,
  delay,
  COLORS,
  styles,
}: {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  delay: number;
  COLORS: ThemedColors;
  styles: any;
}) {
  const configs = notificationConfig(COLORS);
  const config = configs[notification.type] || configs.SYSTEM;

  return (
    <Animated.View entering={FadeInUp.duration(MOTION.duration.slow).delay(delay).springify()}>
      <Card
        variant={notification.isRead ? 'flat' : 'accent'}
        padding={SPACING.md}
        radius={RADIUS.md}
        style={!notification.isRead ? styles.unreadCard : undefined}
        onPress={() => onPress(notification)}
        accessibilityLabel={notification.title}
      >
          <View style={styles.notificationRow}>
            {/* Icon container */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: config.colorDim,
                  borderColor: config.colorBorder,
                },
              ]}
            >
              <Ionicons name={config.icon} size={ICON.md} color={config.color} />
            </View>

            {/* Content */}
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle} numberOfLines={1}>
                  {notification.title}
                </Text>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationDescription} numberOfLines={2}>
                {notification.description}
              </Text>
              <View style={styles.notificationMeta}>
                <StatusBadge
                  label={config.label}
                  color={config.color}
                  size="sm"
                />
                <Text style={styles.notificationTime}>
                  {formatTimestamp(notification.timestamp)}
                </Text>
              </View>
            </View>

            {/* Chevron */}
            <Ionicons
              name="chevron-forward"
              size={ICON.sm}
              color={COLORS.onSurfaceDim}
              style={styles.chevron}
            />
          </View>
      </Card>
    </Animated.View>
  );
}

// ============================================
// STYLES
// ============================================


const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  filterRail: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.gutter,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // ---- Header ----

  // ---- Tabs ----

  // ---- List ----
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.gutter,
    paddingBottom: 100,
  },
  cardSeparator: {
    height: SPACING.sm,
  },

  // ---- Notification Card ----
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.labelLg.fontWeight,
    color: COLORS.onSurface,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  notificationDescription: {
    fontSize: 13,
    color: COLORS.onSurfaceMuted,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.onSurfaceDim,
  },
  chevron: {
    marginTop: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  // ---- Empty State ----

  // Error State

  // ---- Bottom Bar ----
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
});
