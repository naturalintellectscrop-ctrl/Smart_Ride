/**
 * Smart Ride Messaging Context
 * 
 * Central state management for all messaging functionality.
 * Handles conversations, messages, read status, and real-time updates.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ==========================================
// Types
// ==========================================

export type ConversationType = 'client' | 'rider' | 'merchant' | 'safety' | 'support';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  senderId: string;
  senderType: 'me' | 'other';
  isRead: boolean;
  type: 'text' | 'system' | 'alert';
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  taskId?: string;
  taskType?: string;
  isActive: boolean;
  messages: Message[];
}

export interface QuickReply {
  id: string;
  text: string;
  icon?: string;
}

interface MessagingContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  totalUnread: number;
  isLoading: boolean;
  
  // Actions
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  getConversation: (conversationId: string) => Conversation | undefined;
  createConversation: (params: {
    type: ConversationType;
    participantId: string;
    participantName: string;
    taskId?: string;
    taskType?: string;
  }) => Conversation;
  deleteConversation: (conversationId: string) => void;
  
  // Quick replies
  quickReplies: QuickReply[];
}

// ==========================================
// Context
// ==========================================

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// ==========================================
// Default Quick Replies
// ==========================================

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: '1', text: "I'm on my way" },
  { id: '2', text: "I've arrived" },
  { id: '3', text: 'Please wait a moment' },
  { id: '4', text: 'Where are you?' },
  { id: '5', text: 'Thank you!' },
  { id: '6', text: 'See you soon!' },
];

// ==========================================
// Mock Initial Data
// ==========================================

const createMockConversations = (): Conversation[] => [
  {
    id: 'conv_1',
    type: 'client',
    participantId: 'client_001',
    participantName: 'John Doe',
    participantRole: 'Customer',
    lastMessage: 'I am at the pickup point, where are you?',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000),
    unreadCount: 2,
    taskId: 'TASK-2024-09823',
    taskType: 'BODA_RIDE',
    isActive: true,
    messages: [
      { id: 'm1', conversationId: 'conv_1', content: 'Hello, I am on my way to pickup', timestamp: new Date(Date.now() - 10 * 60 * 1000), senderId: 'rider_001', senderType: 'me', isRead: true, type: 'text' },
      { id: 'm2', conversationId: 'conv_1', content: 'Great, I will be waiting', timestamp: new Date(Date.now() - 9 * 60 * 1000), senderId: 'client_001', senderType: 'other', isRead: true, type: 'text' },
      { id: 'm3', conversationId: 'conv_1', content: 'I am at the pickup point, where are you?', timestamp: new Date(Date.now() - 2 * 60 * 1000), senderId: 'client_001', senderType: 'other', isRead: false, type: 'text' },
    ],
  },
  {
    id: 'conv_2',
    type: 'merchant',
    participantId: 'merchant_001',
    participantName: 'Javas Restaurant',
    participantRole: 'Restaurant',
    lastMessage: 'Order is ready for pickup',
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000),
    unreadCount: 1,
    taskId: 'TASK-2024-09824',
    taskType: 'FOOD_DELIVERY',
    isActive: true,
    messages: [
      { id: 'm4', conversationId: 'conv_2', content: 'Order #1234 received', timestamp: new Date(Date.now() - 30 * 60 * 1000), senderId: 'merchant_001', senderType: 'other', isRead: true, type: 'system' },
      { id: 'm5', conversationId: 'conv_2', content: 'Order is ready for pickup', timestamp: new Date(Date.now() - 15 * 60 * 1000), senderId: 'merchant_001', senderType: 'other', isRead: false, type: 'text' },
    ],
  },
  {
    id: 'conv_3',
    type: 'support',
    participantId: 'support_001',
    participantName: 'Smart Ride Support',
    participantRole: 'Support Team',
    lastMessage: 'Your verification has been approved!',
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 0,
    isActive: true,
    messages: [
      { id: 'm6', conversationId: 'conv_3', content: 'Welcome to Smart Ride Support!', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), senderId: 'support_001', senderType: 'other', isRead: true, type: 'system' },
      { id: 'm7', conversationId: 'conv_3', content: 'Your verification has been approved!', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), senderId: 'support_001', senderType: 'other', isRead: true, type: 'text' },
    ],
  },
];

// ==========================================
// Helper function to load initial data
// ==========================================

function loadInitialConversations(): Conversation[] {
  // In production, this would fetch from API
  if (typeof window === 'undefined') return initialConversations;
  
  const storedConversations = localStorage.getItem('smart_ride_conversations');
  if (storedConversations) {
    try {
      const parsed = JSON.parse(storedConversations);
      // Convert date strings back to Date objects
      return parsed.map((conv: Conversation) => ({
        ...conv,
        lastMessageTime: new Date(conv.lastMessageTime),
        messages: conv.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch {
      return initialConversations;
    }
  }
  return initialConversations;
}

// ==========================================
// Provider
// ==========================================

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(loadInitialConversations);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies] = useState<QuickReply[]>(DEFAULT_QUICK_REPLIES);

  // Persist conversations
  useEffect(() => {
    if (!isLoading && conversations.length > 0) {
      localStorage.setItem('smart_ride_conversations', JSON.stringify(conversations));
    }
  }, [conversations, isLoading]);

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      content,
      timestamp: new Date(),
      senderId: 'current_user',
      senderType: 'me',
      isRead: false,
      type: 'text',
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          lastMessage: content,
          lastMessageTime: new Date(),
          messages: [...conv.messages, newMessage],
        };
      }
      return conv;
    }));

    // Update active conversation if it's the current one
    if (activeConversation?.id === conversationId) {
      setActiveConversation(prev => prev ? {
        ...prev,
        lastMessage: content,
        lastMessageTime: new Date(),
        messages: [...prev.messages, newMessage],
      } : null);
    }

    // Simulate response in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const responses = [
          "Got it, thanks!",
          "On my way!",
          "Perfect, see you soon!",
          "Understood!",
          "I'll be there shortly.",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const responseMessage: Message = {
          id: `msg_${Date.now()}_response`,
          conversationId,
          content: randomResponse,
          timestamp: new Date(),
          senderId: 'other',
          senderType: 'other',
          isRead: false,
          type: 'text',
        };

        setConversations(prev => prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: randomResponse,
              lastMessageTime: new Date(),
              unreadCount: conv.unreadCount + 1,
              messages: [...conv.messages, responseMessage],
            };
          }
          return conv;
        }));
      }, 1000 + Math.random() * 2000);
    }
  }, [activeConversation]);

  const markAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = conv.messages.map(msg => ({ ...msg, isRead: true }));
        return {
          ...conv,
          unreadCount: 0,
          messages: updatedMessages,
        };
      }
      return conv;
    }));

    // Update active conversation
    if (activeConversation?.id === conversationId) {
      setActiveConversation(prev => prev ? {
        ...prev,
        unreadCount: 0,
        messages: prev.messages.map(msg => ({ ...msg, isRead: true })),
      } : null);
    }
  }, [activeConversation]);

  const getConversation = useCallback((conversationId: string) => {
    return conversations.find(conv => conv.id === conversationId);
  }, [conversations]);

  const createConversation = useCallback((params: {
    type: ConversationType;
    participantId: string;
    participantName: string;
    taskId?: string;
    taskType?: string;
  }): Conversation => {
    const existingConv = conversations.find(
      conv => conv.participantId === params.participantId && conv.taskId === params.taskId
    );
    if (existingConv) return existingConv;

    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      type: params.type,
      participantId: params.participantId,
      participantName: params.participantName,
      lastMessage: 'Conversation started',
      lastMessageTime: new Date(),
      unreadCount: 0,
      taskId: params.taskId,
      taskType: params.taskType,
      isActive: true,
      messages: [{
        id: `msg_${Date.now()}`,
        conversationId: `conv_${Date.now()}`,
        content: 'Conversation started',
        timestamp: new Date(),
        senderId: 'system',
        senderType: 'other',
        isRead: true,
        type: 'system',
      }],
    };

    setConversations(prev => [newConversation, ...prev]);
    return newConversation;
  }, [conversations]);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (activeConversation?.id === conversationId) {
      setActiveConversation(null);
    }
  }, [activeConversation]);

  const value: MessagingContextType = {
    conversations,
    activeConversation,
    totalUnread,
    isLoading,
    setActiveConversation,
    sendMessage,
    markAsRead,
    getConversation,
    createConversation,
    deleteConversation,
    quickReplies,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}

export default MessagingContext;
