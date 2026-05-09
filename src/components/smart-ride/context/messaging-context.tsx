/**
 * Smart Ride Messaging Context
 * 
 * Central state management for all messaging functionality.
 * Handles conversations, messages, read status, and real-time updates.
 * 
 * PRODUCTION READY: Uses database API, no mock data.
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
  error: string | null;
  
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
  }) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => void;
  fetchConversations: () => Promise<void>;
  
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
// Provider
// ==========================================

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickReplies] = useState<QuickReply[]>(DEFAULT_QUICK_REPLIES);

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }, []);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    const token = getToken();
    if (!token) {
      // No token, use empty state
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - clear token
          localStorage.removeItem('accessToken');
          setConversations([]);
          return;
        }
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      
      // Transform API response to local format
      const transformedConversations: Conversation[] = (data.conversations || []).map((conv: any) => {
        // Find the other participant
        const otherParticipant = conv.participants?.find((p: any) => p.userId !== 'current_user')?.user;
        
        return {
          id: conv.id,
          type: getConversationType(conv.participants, otherParticipant?.role),
          participantId: otherParticipant?.id || '',
          participantName: otherParticipant?.name || 'Unknown',
          participantAvatar: otherParticipant?.avatarUrl,
          participantRole: otherParticipant?.role,
          lastMessage: conv.messages?.[0]?.content || 'No messages yet',
          lastMessageTime: new Date(conv.updatedAt || conv.createdAt),
          unreadCount: conv.unreadCount || 0,
          taskId: conv.taskId,
          taskType: conv.task?.taskType,
          isActive: conv.isActive,
          messages: (conv.messages || []).map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversationId,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            senderId: msg.senderId,
            senderType: msg.senderId === 'current_user' ? 'me' : 'other',
            isRead: msg.isRead,
            type: msg.type?.toLowerCase() || 'text',
          })),
        };
      });

      setConversations(transformedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load messages');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Helper to determine conversation type based on participants
  const getConversationType = (participants: any[], currentUserRole?: string): ConversationType => {
    const otherParticipant = participants?.find((p: any) => p.userId !== 'current_user');
    const role = otherParticipant?.user?.role || currentUserRole;
    
    switch (role) {
      case 'CLIENT': return 'client';
      case 'RIDER': return 'rider';
      case 'MERCHANT': return 'merchant';
      case 'PHARMACIST': return 'merchant';
      case 'ADMIN': return 'support';
      default: return 'support';
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

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

    // Optimistic update
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

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          message: content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Revert optimistic update on error
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.filter(m => m.id !== newMessage.id),
          };
        }
        return conv;
      }));
      setError('Failed to send message');
    }
  }, [getToken]);

  const markAsRead = useCallback(async (conversationId: string) => {
    const token = getToken();
    
    // Optimistic update
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

    // Update on server if authenticated
    if (token) {
      try {
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId }),
        });
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    }
  }, [getToken]);

  const getConversation = useCallback((conversationId: string) => {
    return conversations.find(conv => conv.id === conversationId);
  }, [conversations]);

  const createConversation = useCallback(async (params: {
    type: ConversationType;
    participantId: string;
    participantName: string;
    taskId?: string;
    taskType?: string;
  }): Promise<Conversation> => {
    const existingConv = conversations.find(
      conv => conv.participantId === params.participantId && conv.taskId === params.taskId
    );
    if (existingConv) return existingConv;

    const token = getToken();
    
    // Create local conversation for optimistic update
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

    // Create on server if authenticated
    if (token) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientId: params.participantId,
            taskId: params.taskId,
            message: 'Conversation started',
            conversationType: params.type.toUpperCase(),
          }),
        });
      } catch (err) {
        console.error('Error creating conversation:', err);
      }
    }

    return newConversation;
  }, [conversations, getToken]);

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
    error,
    setActiveConversation,
    sendMessage,
    markAsRead,
    getConversation,
    createConversation,
    deleteConversation,
    quickReplies,
    fetchConversations,
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
