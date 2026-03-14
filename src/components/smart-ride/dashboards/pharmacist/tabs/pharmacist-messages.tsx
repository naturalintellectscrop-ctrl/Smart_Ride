'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Bell,
  ChevronRight,
  Clock,
  User,
  Package
} from 'lucide-react';
import { useNotifications } from '../../../context/notification-context';

type MessageFilter = 'all' | 'clients' | 'riders' | 'system';

interface Chat {
  id: string;
  name: string;
  type: 'client' | 'rider';
  lastMessage: string;
  timestamp: string;
  unread: number;
  orderId?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'system';
  read: boolean;
}

const initialChats: Chat[] = [
  {
    id: '1',
    name: 'Mary S.',
    type: 'client',
    lastMessage: 'Is my prescription ready for pickup?',
    timestamp: '5 min ago',
    unread: 1,
    orderId: 'RX-001',
  },
  {
    id: '2',
    name: 'James (Rider)',
    type: 'rider',
    lastMessage: 'On my way to deliver order #ORD-002.',
    timestamp: '10 min ago',
    unread: 0,
    orderId: 'ORD-002',
  },
  {
    id: '3',
    name: 'Grace L.',
    type: 'client',
    lastMessage: 'Thank you for the quick delivery!',
    timestamp: '1 hour ago',
    unread: 0,
  },
];

const initialNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Prescription',
    message: 'A new prescription #RX-005 has been submitted for verification.',
    timestamp: '2 min ago',
    type: 'system',
    read: false,
  },
  {
    id: '2',
    title: 'Low Stock Alert',
    message: 'Paracetamol 500mg stock is running low. Please restock.',
    timestamp: '30 min ago',
    type: 'system',
    read: false,
  },
  {
    id: '3',
    title: 'Payment Confirmed',
    message: 'Payment of UGX 85,000 for order #ORD-003 has been confirmed.',
    timestamp: '1 hour ago',
    type: 'system',
    read: true,
  },
];

export function PharmacistMessages() {
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const { setUnreadCount } = useNotifications();

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unread, 0) + 
                      notifications.filter(n => !n.read).length;

  useEffect(() => {
    setUnreadCount(totalUnread);
  }, [totalUnread, setUnreadCount]);

  const filterChats = () => {
    if (activeFilter === 'all') return chats;
    if (activeFilter === 'clients') return chats.filter(c => c.type === 'client');
    if (activeFilter === 'riders') return chats.filter(c => c.type === 'rider');
    return [];
  };

  const filterNotifications = () => {
    if (activeFilter === 'all' || activeFilter === 'system') return notifications;
    return [];
  };

  const handleChatClick = (chatId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId && chat.unread > 0) {
        return { ...chat, unread: 0 };
      }
      return chat;
    }));
  };

  const handleNotificationClick = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    }));
  };

  const hasMessages = chats.length > 0 || notifications.length > 0;

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 border-b border-white/5 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-white">Messages</h1>
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#13131A] px-4 py-3 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeFilter === 'all'
                ? "bg-rose-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('clients')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              activeFilter === 'clients'
                ? "bg-rose-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            <User className="h-4 w-4" />
            Clients
          </button>
          <button
            onClick={() => setActiveFilter('riders')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              activeFilter === 'riders'
                ? "bg-rose-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            <Package className="h-4 w-4" />
            Riders
          </button>
          <button
            onClick={() => setActiveFilter('system')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
              activeFilter === 'system'
                ? "bg-rose-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            <Bell className="h-4 w-4" />
            System
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No messages</h3>
            <p className="text-gray-400 text-center text-sm">
              Your conversations will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Chats Section */}
            {(activeFilter === 'all' || activeFilter === 'clients' || activeFilter === 'riders') && filterChats().length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Chats
                </h2>
                <div className="space-y-2">
                  {filterChats().map((chat) => (
                    <Card 
                      key={chat.id} 
                      className="p-4 bg-[#13131A] border-white/5 hover:border-rose-500/30 transition-all cursor-pointer"
                      onClick={() => handleChatClick(chat.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className={cn(
                            chat.type === 'client' ? "bg-blue-500/15 text-blue-400" : "bg-rose-500/15 text-rose-400"
                          )}>
                            {chat.type === 'client' ? <User className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white">{chat.name}</h3>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {chat.timestamp}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-gray-400 truncate pr-2">{chat.lastMessage}</p>
                            {chat.unread > 0 && (
                              <span className="bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                          {chat.orderId && (
                            <p className="text-xs text-gray-500 mt-1">
                              Order: {chat.orderId}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* System Notifications */}
            {filterNotifications().length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  System Notifications
                </h2>
                <div className="space-y-2">
                  {filterNotifications().map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={cn(
                        "p-4 bg-[#13131A] border-white/5 hover:border-rose-500/30 transition-all cursor-pointer",
                        !notification.read && "border-rose-500/30 bg-rose-500/5"
                      )}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-rose-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bell className="h-5 w-5 text-rose-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-white">{notification.title}</h3>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {notification.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
