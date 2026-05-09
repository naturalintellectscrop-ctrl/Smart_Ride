'use client';

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bell,
  X,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Gift,
  Clock,
  ChevronRight,
  Check,
  Trash2,
  Settings,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type NotificationType = 
  | 'order_update' 
  | 'promotion' 
  | 'system_alert' 
  | 'payment' 
  | 'delivery' 
  | 'security'
  | 'general';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: NotificationPriority;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
  showBadge?: boolean;
}

export interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// ============================================================================
// Theme Constants
// ============================================================================

const THEME = {
  primary: '#00FF88',
  glow: 'rgba(0, 255, 136, 0.4)',
  secondary: '#3B82F6',
  background: '#0D0D12',
  card: '#1A1A24',
  cardHover: '#252530',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// ============================================================================
// Notification Type Configuration
// ============================================================================

const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  order_update: {
    icon: Package,
    color: '#00FF88',
    bgColor: 'rgba(0, 255, 136, 0.15)',
    label: 'Order Update',
  },
  delivery: {
    icon: Truck,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    label: 'Delivery',
  },
  payment: {
    icon: DollarSign,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    label: 'Payment',
  },
  promotion: {
    icon: Gift,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: 'Promotion',
  },
  system_alert: {
    icon: AlertTriangle,
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'System Alert',
  },
  security: {
    icon: CheckCircle,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    label: 'Security',
  },
  general: {
    icon: Info,
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    label: 'General',
  },
};

const PRIORITY_CONFIG: Record<NotificationPriority, {
  borderColor: string;
  badge?: string;
}> = {
  low: { borderColor: 'transparent' },
  normal: { borderColor: 'transparent' },
  high: { borderColor: '#F59E0B', badge: 'High' },
  urgent: { borderColor: '#EF4444', badge: 'Urgent' },
};

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'order_update',
    title: 'Order Delivered Successfully',
    message: 'Your order #ORD-2024-1234 has been delivered to Kampala Central. Rate your experience!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isRead: false,
    priority: 'normal',
    actionUrl: '/orders/ORD-2024-1234',
    actionText: 'View Order',
    metadata: { orderId: 'ORD-2024-1234' },
  },
  {
    id: 'notif-002',
    type: 'promotion',
    title: '50% Off Your Next Ride!',
    message: 'Use code SMART50 to get 50% off your next boda boda ride. Valid until midnight!',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isRead: false,
    priority: 'normal',
    actionText: 'Use Now',
    metadata: { promoCode: 'SMART50' },
  },
  {
    id: 'notif-003',
    type: 'payment',
    title: 'Payment Received',
    message: 'UGX 45,000 has been credited to your wallet from order #ORD-2024-1230.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    priority: 'normal',
    metadata: { amount: 45000, transactionId: 'TXN-98765' },
  },
  {
    id: 'notif-004',
    type: 'delivery',
    title: 'Rider Nearby',
    message: 'Your rider James is 2 minutes away from your pickup location.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    isRead: true,
    priority: 'high',
    metadata: { riderId: 'rider-123', eta: 2 },
  },
  {
    id: 'notif-005',
    type: 'system_alert',
    title: 'Scheduled Maintenance',
    message: 'Smart Ride will undergo maintenance on March 15, 2024 from 2:00 AM to 4:00 AM EAT.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    isRead: true,
    priority: 'high',
  },
  {
    id: 'notif-006',
    type: 'security',
    title: 'New Login Detected',
    message: 'A new device logged into your account from Kampala, Uganda. Was this you?',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    isRead: true,
    priority: 'urgent',
    actionText: 'Review Activity',
    metadata: { deviceId: 'device-xyz', location: 'Kampala, Uganda' },
  },
  {
    id: 'notif-007',
    type: 'promotion',
    title: 'Refer & Earn UGX 10,000',
    message: 'Invite friends to Smart Ride and earn UGX 10,000 for each successful referral!',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    isRead: true,
    priority: 'normal',
    actionText: 'Share Link',
  },
  {
    id: 'notif-008',
    type: 'order_update',
    title: 'Order Cancelled',
    message: 'Your order #ORD-2024-1200 has been cancelled. Refund will be processed within 24 hours.',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    isRead: true,
    priority: 'high',
    metadata: { orderId: 'ORD-2024-1200', refundAmount: 25000 },
  },
];

// ============================================================================
// Context
// ============================================================================

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

// Internal hook that manages local state (used when no context is provided)
function useLocalNotifications(): NotificationsContextValue {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        isRead: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  const localNotifications = useLocalNotifications();
  
  // Return context if available, otherwise use local state
  // Note: We always call the local hook to satisfy rules of hooks
  return context || localNotifications;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Notification Bell Component
// ============================================================================

export function NotificationBell({
  className,
  onClick,
  showBadge = true,
}: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2.5 rounded-xl transition-all duration-200',
        'bg-[#1A1A24] hover:bg-[#252530] border border-white/5',
        'focus:outline-none focus:ring-2 focus:ring-[#00FF88]/50',
        className
      )}
      aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5 text-white/80" />
      
      {showBadge && hasUnread && (
        <span
          className={cn(
            'absolute -top-1 -right-1 min-w-5 h-5 px-1',
            'flex items-center justify-center',
            'text-xs font-bold text-white',
            'rounded-full animate-pulse'
          )}
          style={{
            backgroundColor: unreadCount > 5 ? THEME.danger : THEME.primary,
            boxShadow: unreadCount > 5 
              ? `0 0 12px ${THEME.danger}60` 
              : `0 0 12px ${THEME.glow}`,
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
  onClick,
}: NotificationItemProps) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const priorityConfig = PRIORITY_CONFIG[notification.priority];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onClick?.(notification);
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl transition-all duration-200 cursor-pointer',
        'hover:bg-[#252530]',
        notification.isRead ? 'bg-[#1A1A24]' : 'bg-[#1F1F2A]',
        !notification.isRead && 'border-l-2',
        'border-white/5'
      )}
      style={{
        borderLeftColor: !notification.isRead ? THEME.primary : undefined,
        borderLeftWidth: !notification.isRead ? 2 : undefined,
      }}
      onClick={handleClick}
    >
      {/* Priority border for high/urgent */}
      {priorityConfig.borderColor !== 'transparent' && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: priorityConfig.borderColor + '20',
            color: priorityConfig.borderColor,
          }}
        >
          {priorityConfig.badge}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon className="h-5 w-5" style={{ color: config.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              'font-medium text-sm truncate',
              notification.isRead ? 'text-white/70' : 'text-white'
            )}>
              {notification.title}
            </p>
            {!notification.isRead && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            )}
          </div>
          
          <p className={cn(
            'text-xs mt-1 line-clamp-2',
            notification.isRead ? 'text-white/50' : 'text-white/60'
          )}>
            {notification.message}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(notification.timestamp)}
            </span>
            
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Action button */}
          {notification.actionText && (
            <button
              className={cn(
                'mt-3 flex items-center gap-1 text-xs font-medium',
                'text-[#00FF88] hover:text-[#00FF88]/80 transition-colors'
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {notification.actionText}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5 text-[#00FF88]" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors"
          title="Remove"
        >
          <X className="h-3.5 w-3.5 text-white/50 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Panel Component
// ============================================================================

export function NotificationPanel({
  open,
  onOpenChange,
  onNotificationClick,
}: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleClearAll = () => {
    clearAll();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'fixed right-0 top-0 bottom-0 h-screen w-full max-w-md',
          'translate-x-0 translate-y-0',
          'bg-[#0D0D12] border-l border-white/10',
          'p-0 rounded-none'
        )}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 255, 136, 0.15)' }}
              >
                <Bell className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Notifications
                </DialogTitle>
                <p className="text-xs text-white/50">
                  {unreadCount > 0 
                    ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
                    : 'All caught up!'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filter === 'all'
                  ? 'bg-[#00FF88] text-[#0D0D12]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                filter === 'unread'
                  ? 'bg-[#00FF88] text-[#0D0D12]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              )}
            >
              Unread
              {unreadCount > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-bold',
                    filter === 'unread'
                      ? 'bg-[#0D0D12]/20'
                      : 'bg-[#00FF88]/20 text-[#00FF88]'
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1A1A24]/50">
            <span className="text-xs text-white/40">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#00FF88] bg-[#00FF88]/10 hover:bg-[#00FF88]/20 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
              >
                <Bell className="h-10 w-10 text-white/20" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-sm text-white/40 max-w-[200px]">
                {filter === 'unread'
                  ? "You've read all your notifications"
                  : "We'll notify you when something arrives"
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onRemove={removeNotification}
                onClick={onNotificationClick}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0D0D12]">
          <button
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Notification Settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Combined Component with Bell and Panel
// ============================================================================

export function NotificationSystem({
  onNotificationClick,
}: {
  onNotificationClick?: (notification: Notification) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <NotificationBell onClick={() => setIsOpen(true)} />
      <NotificationPanel
        open={isOpen}
        onOpenChange={setIsOpen}
        onNotificationClick={onNotificationClick}
      />
    </>
  );
}

// ============================================================================
// Provider Component (Optional for global state)
// ============================================================================

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useNotifications();

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  NotificationBellProps,
  NotificationPanelProps,
  NotificationsContextValue,
};
