'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, X, Zap, Gift, MapPin, DollarSign, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
  referenceType?: string;
}

interface NotificationBellProps {
  userId: string;
  userType?: 'client' | 'rider' | 'admin';
  onNotificationClick?: (notification: Notification) => void;
}

const notificationIcons: Record<string, typeof Zap> = {
  SURGE_ALERT: Zap,
  HIGH_DEMAND_ZONE: MapPin,
  INCENTIVE_AVAILABLE: Gift,
  EARNINGS_OPPORTUNITY: DollarSign,
  DRIVER_REPOSITION: MapPin,
  SURGE_WARNING: AlertTriangle,
  PROMO_AVAILABLE: Gift,
  DISCOUNT_OFFER: Gift,
  TASK_UPDATE: Bell,
  ORDER_UPDATE: Bell,
  PAYMENT: DollarSign,
  SYSTEM: Bell,
};

const notificationColors: Record<string, string> = {
  SURGE_ALERT: 'bg-orange-100 text-orange-600',
  HIGH_DEMAND_ZONE: 'bg-red-100 text-red-600',
  INCENTIVE_AVAILABLE: 'bg-green-100 text-green-600',
  EARNINGS_OPPORTUNITY: 'bg-emerald-100 text-emerald-600',
  DRIVER_REPOSITION: 'bg-blue-100 text-blue-600',
  SURGE_WARNING: 'bg-amber-100 text-amber-600',
  PROMO_AVAILABLE: 'bg-purple-100 text-purple-600',
  DISCOUNT_OFFER: 'bg-pink-100 text-pink-600',
};

export function NotificationBell({ userId, userType = 'client', onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId }),
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, userId }),
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    const Icon = notificationIcons[type] || Bell;
    return Icon;
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const allNotifications = notifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all" className="text-sm">
              All ({allNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-sm">
              Unread ({unreadNotifications.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <NotificationList 
              notifications={allNotifications}
              loading={loading}
              onNotificationClick={handleNotificationClick}
              getNotificationIcon={getNotificationIcon}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            <NotificationList 
              notifications={unreadNotifications}
              loading={loading}
              onNotificationClick={handleNotificationClick}
              getNotificationIcon={getNotificationIcon}
              emptyMessage="No unread notifications"
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onNotificationClick: (notification: Notification) => void;
  getNotificationIcon: (type: string) => typeof Bell;
  emptyMessage?: string;
}

function NotificationList({ 
  notifications, 
  loading, 
  onNotificationClick, 
  getNotificationIcon,
  emptyMessage = 'No notifications'
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600';
          
          return (
            <div
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
              className={cn(
                "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                !notification.isRead && "bg-primary/5"
              )}
            >
              <div className="flex gap-3">
                <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "font-medium text-sm leading-tight",
                      !notification.isRead && "text-foreground"
                    )}>
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default NotificationBell;
