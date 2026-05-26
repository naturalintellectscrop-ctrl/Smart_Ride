// ============================================
// SMART RIDE MOBILE - NOTIFICATIONS CENTER
// ============================================
// Organized notification center with filter tabs,
// glassmorphism cards, and pull-to-refresh
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
  Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, NOTIFICATION_TYPES } from '@/src/constants';
import { GlassCard, GradientButton, StatusBadge } from '@/src/components';

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

const NOTIFICATION_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colorDim: string;
  colorBorder: string;
  label: string;
}> = {
  RIDE_UPDATE: {
    icon: 'car-outline',
    color: COLORS.serviceBoda,
    colorDim: 'rgba(16, 185, 129, 0.1)',
    colorBorder: 'rgba(16, 185, 129, 0.2)',
    label: 'Ride',
  },
  ORDER_UPDATE: {
    icon: 'restaurant-outline',
    color: COLORS.serviceFood,
    colorDim: 'rgba(249, 115, 22, 0.1)',
    colorBorder: 'rgba(249, 115, 22, 0.2)',
    label: 'Order',
  },
  PAYMENT: {
    icon: 'card-outline',
    color: COLORS.serviceCar,
    colorDim: 'rgba(59, 130, 246, 0.1)',
    colorBorder: 'rgba(59, 130, 246, 0.2)',
    label: 'Payment',
  },
  PROMO: {
    icon: 'pricetag-outline',
    color: COLORS.serviceShop,
    colorDim: 'rgba(139, 92, 246, 0.1)',
    colorBorder: 'rgba(139, 92, 246, 0.2)',
    label: 'Promo',
  },
  SOS: {
    icon: 'alert-circle-outline',
    color: COLORS.error,
    colorDim: 'rgba(239, 68, 68, 0.1)',
    colorBorder: 'rgba(239, 68, 68, 0.2)',
    label: 'Emergency',
  },
  CHAT: {
    icon: 'chatbubble-outline',
    color: COLORS.secondary,
    colorDim: 'rgba(0, 212, 255, 0.1)',
    colorBorder: 'rgba(0, 212, 255, 0.2)',
    label: 'Chat',
  },
  SYSTEM: {
    icon: 'settings-outline',
    color: COLORS.warning,
    colorDim: 'rgba(245, 158, 11, 0.1)',
    colorBorder: 'rgba(245, 158, 11, 0.2)',
    label: 'System',
  },
};

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
// MOCK DATA
// ============================================

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'RIDE_UPDATE',
    title: 'Ride Completed',
    description: 'Your Smart Boda ride from Kampala Road to Ntinda has been completed. Total fare: UGX 8,500.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isRead: false,
    entityId: 'task-001',
    entityType: 'task',
  },
  {
    id: '2',
    type: 'ORDER_UPDATE',
    title: 'Order On The Way',
    description: 'Your order from Cafe Javas is being delivered. Estimated arrival in 15 minutes.',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    isRead: false,
    entityId: 'order-001',
    entityType: 'order',
  },
  {
    id: '3',
    type: 'PAYMENT',
    title: 'Payment Received',
    description: 'UGX 50,000 has been added to your Smart Ride wallet via MTN MoMo.',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: '4',
    type: 'PROMO',
    title: 'Weekend Special!',
    description: 'Get 20% off your next 3 rides this weekend. Use code WEEKEND20 at checkout.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '5',
    type: 'CHAT',
    title: 'New Message from Driver',
    description: 'James: "I am at the pickup point, near the blue gate."',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    entityId: 'conv-001',
    entityType: 'chat',
  },
  {
    id: '6',
    type: 'RIDE_UPDATE',
    title: 'Driver Arrived',
    description: 'Your Smart Car driver has arrived at the pickup location. Please head to the vehicle.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    entityId: 'task-002',
    entityType: 'task',
  },
  {
    id: '7',
    type: 'SYSTEM',
    title: 'App Update Available',
    description: 'A new version of Smart Ride is available. Update now for the best experience.',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '8',
    type: 'PAYMENT',
    title: 'Withdrawal Processed',
    description: 'Your withdrawal of UGX 30,000 to Airtel Money has been processed successfully.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '9',
    type: 'ORDER_UPDATE',
    title: 'Order Delivered',
    description: 'Your pharmacy order from MedPlus has been delivered. Thank you for using Smart Ride!',
    timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    entityId: 'order-002',
    entityType: 'order',
  },
  {
    id: '10',
    type: 'SOS',
    title: 'Emergency Resolved',
    description: 'Your SOS alert from yesterday has been resolved by our emergency response team.',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = activeFilter === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
      router.push('/chat');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Glow Border */}
      <Animated.View entering={FadeInDown.duration(400).springify()}>
        <View style={[styles.header, { paddingTop: insets.top + 12 || 56 }]}>
          {/* Ambient circles */}
          <View style={styles.ambientCircle1} />
          <View style={styles.ambientCircle2} />

          {/* Back button + Title */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.7}
                  style={styles.tabWrapper}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={GRADIENTS.primary as unknown as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTab}
                    >
                      <Ionicons name={tab.icon} size={14} color={COLORS.background} />
                      <Text style={styles.activeTabText}>{tab.label}</Text>
                      {tab.key !== 'ALL' && (
                        <View style={styles.tabCountBadge}>
                          <Text style={styles.tabCountText}>
                            {notifications.filter(n => n.type === tab.key).length}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveTab}>
                      <Ionicons name={tab.icon} size={14} color={COLORS.textMuted} />
                      <Text style={styles.inactiveTabText}>{tab.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Glow border at bottom */}
          <LinearGradient
            colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGlowBorder}
          />
        </View>
      </Animated.View>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Animated.View
          entering={ZoomIn.duration(400).delay(200)}
          style={styles.emptyContainer}
        >
          <GlassCard variant="default" padding={24} borderRadius={50} style={styles.emptyIconCircle}>
            <Ionicons name="notifications-outline" size={48} color={COLORS.primary} />
          </GlassCard>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyDescription}>
            You have no {activeFilter === 'ALL' ? '' : FILTER_TABS.find(t => t.key === activeFilter)?.label.toLowerCase() + ' '}
            notifications right now.
          </Text>
          <Text style={styles.emptySubtext}>
            We'll let you know when something arrives.
          </Text>
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
              delay={index * 60}
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
}: {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  delay: number;
}) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.SYSTEM;

  return (
    <Animated.View
      entering={FadeInUp.duration(350).delay(delay).springify()}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(notification)}
      >
        <GlassCard
          variant={notification.isRead ? 'default' : 'accent'}
          padding={14}
          borderRadius={14}
          style={!notification.isRead ? [styles.notificationCard, styles.unreadCard] : styles.notificationCard}
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
              <Ionicons name={config.icon} size={20} color={config.color} />
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
              size={16}
              color={COLORS.textDim}
              style={styles.chevron}
            />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// STYLES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ---- Header ----
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientCircle1: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  ambientCircle2: {
    position: 'absolute',
    top: 60,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
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
  unreadBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerGlowBorder: {
    height: 1,
    marginTop: 12,
  },

  // ---- Tabs ----
  tabsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  tabWrapper: {
    marginRight: 4,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 5,
  },
  activeTabText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: '600',
  },
  tabCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: 'bold',
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSurface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 5,
  },
  inactiveTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },

  // ---- List ----
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  cardSeparator: {
    height: 8,
  },

  // ---- Notification Card ----
  notificationCard: {
    // extra styles for card
  },
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
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notificationDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  chevron: {
    marginTop: 8,
    marginLeft: 4,
  },

  // ---- Empty State ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // ---- Bottom Bar ----
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
});
