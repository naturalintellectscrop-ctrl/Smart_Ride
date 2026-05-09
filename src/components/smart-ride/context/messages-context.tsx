'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

interface Chat {
  id: string;
  name: string;
  type: 'rider' | 'merchant';
  lastMessage: string;
  timestamp: string;
  unread: number;
  orderId?: string;
}

interface MessagesContextType {
  chats: Chat[];
  unreadCount: number;
  markChatAsRead: (chatId: string) => void;
  addUnreadMessage: (chatId: string) => void;
  resetUnreadCount: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

// Initial chat data with unread counts
const INITIAL_CHATS: Chat[] = [
  {
    id: '1',
    name: 'James K.',
    type: 'rider',
    lastMessage: "I'm almost there, please wait at the gate.",
    timestamp: '2 min ago',
    unread: 2,
    orderId: 'ORD-001',
  },
  {
    id: '2',
    name: 'Cafe Java',
    type: 'merchant',
    lastMessage: 'Your order has been prepared and is ready for pickup.',
    timestamp: '15 min ago',
    unread: 1,
    orderId: 'ORD-002',
  },
  {
    id: '3',
    name: 'Peter M.',
    type: 'rider',
    lastMessage: 'Thank you for the tip! Have a great day!',
    timestamp: '1 hour ago',
    unread: 0,
  },
  {
    id: '4',
    name: 'Health Pharmacy',
    type: 'merchant',
    lastMessage: 'Your prescription is ready for delivery.',
    timestamp: 'Yesterday',
    unread: 0,
  },
];

interface MessagesProviderProps {
  children: ReactNode;
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);

  // Calculate total unread messages
  const unreadCount = useMemo(() => {
    return chats.reduce((sum, chat) => sum + chat.unread, 0);
  }, [chats]);

  // Mark a specific chat as read
  const markChatAsRead = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unread: 0 } : chat
    ));
  }, []);

  // Add an unread message to a chat
  const addUnreadMessage = useCallback((chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unread: chat.unread + 1 } : chat
    ));
  }, []);

  // Reset all unread counts
  const resetUnreadCount = useCallback(() => {
    setChats(prev => prev.map(chat => ({ ...chat, unread: 0 })));
  }, []);

  const value: MessagesContextType = useMemo(() => ({
    chats,
    unreadCount,
    markChatAsRead,
    addUnreadMessage,
    resetUnreadCount,
  }), [chats, unreadCount, markChatAsRead, addUnreadMessage, resetUnreadCount]);

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): MessagesContextType {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
