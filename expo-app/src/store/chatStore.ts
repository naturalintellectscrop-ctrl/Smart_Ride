// ============================================
// SMART RIDE MOBILE - CHAT STORE
// ============================================
// State management for messaging/chat feature
// ============================================

import { create } from 'zustand';
import { api } from '../services/api';
import { socketService } from '../services/socket.service';

// ============================================
// TYPES
// ============================================

export interface Conversation {
  id: string;
  taskId?: string;
  taskNumber?: string;
  taskType?: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'SYSTEM';
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  imageUrl?: string;
  mediaUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface TypingStatus {
  [conversationId: string]: {
    isTyping: boolean;
    userId: string;
    userName?: string;
  };
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  typingStatus: TypingStatus;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, data: { content: string; type?: 'TEXT' | 'IMAGE'; imageUrl?: string }) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string) => void;
  clearError: () => void;

  // Socket event handlers
  onNewMessage: (message: Message) => void;
  onTypingIndicator: (data: { conversationId: string; userId: string; userName?: string; isTyping: boolean }) => void;
  onReadReceipt: (data: { conversationId: string; messageIds: string[]; readAt: string }) => void;
}

// Mock data removed — show empty state instead of fake data when API fails

// ============================================
// CHAT STORE
// ============================================

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  typingStatus: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,

  loadConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const response = await api.getConversations();
      if (response.success && response.data) {
        set({ conversations: response.data, isLoadingConversations: false });
      } else {
        // Show empty state instead of mock data
        console.warn('[CHAT-STORE] API failed to load conversations');
        set({ conversations: [], isLoadingConversations: false });
      }
    } catch (error) {
      console.warn('[CHAT-STORE] Error loading conversations:', error);
      set({ conversations: [], isLoadingConversations: false });
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true, error: null, messages: [], activeConversationId: conversationId });
    try {
      const response = await api.getMessages(conversationId);
      if (response.success && response.data) {
        set({ messages: response.data, isLoadingMessages: false });
      } else {
        // Show empty state instead of mock data
        console.warn('[CHAT-STORE] API failed to load messages');
        set({ messages: [], isLoadingMessages: false });
      }
    } catch (error) {
      console.warn('[CHAT-STORE] Error loading messages:', error);
      set({ messages: [], isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId: string, data: { content: string; type?: 'TEXT' | 'IMAGE'; imageUrl?: string }) => {
    set({ isSendingMessage: true, error: null });
    try {
      const response = await api.sendMessage(conversationId, data);
      if (response.success && response.data) {
        // Add message to local state
        const newMessage: Message = {
          id: response.data.id || `msg-${Date.now()}`,
          conversationId,
          senderId: 'client-1',
          content: data.content,
          type: data.type || 'TEXT',
          imageUrl: data.imageUrl,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
          isSendingMessage: false,
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: {
                    id: newMessage.id,
                    content: newMessage.content,
                    type: newMessage.type,
                    createdAt: newMessage.createdAt,
                    senderId: newMessage.senderId,
                  },
                  updatedAt: newMessage.createdAt,
                }
              : conv
          ),
        }));

        // Also send via socket for real-time
        socketService.chatSend(conversationId, {
          content: data.content,
          type: data.type || 'TEXT',
          imageUrl: data.imageUrl,
        });
      } else {
        // Even if API fails, add the message locally (optimistic)
        const optimisticMessage: Message = {
          id: `msg-local-${Date.now()}`,
          conversationId,
          senderId: 'client-1',
          content: data.content,
          type: data.type || 'TEXT',
          imageUrl: data.imageUrl,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, optimisticMessage],
          isSendingMessage: false,
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: {
                    id: optimisticMessage.id,
                    content: optimisticMessage.content,
                    type: optimisticMessage.type,
                    createdAt: optimisticMessage.createdAt,
                    senderId: optimisticMessage.senderId,
                  },
                  updatedAt: optimisticMessage.createdAt,
                }
              : conv
          ),
        }));
      }
    } catch (error) {
      // Optimistic update on error too
      const optimisticMessage: Message = {
        id: `msg-local-${Date.now()}`,
        conversationId,
        senderId: 'client-1',
        content: data.content,
        type: data.type || 'TEXT',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, optimisticMessage],
        isSendingMessage: false,
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: {
                  id: optimisticMessage.id,
                  content: optimisticMessage.content,
                  type: optimisticMessage.type,
                  createdAt: optimisticMessage.createdAt,
                  senderId: optimisticMessage.senderId,
                },
                updatedAt: optimisticMessage.createdAt,
              }
            : conv
        ),
      }));
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      // Update local state optimistically
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        ),
        messages: state.messages.map((msg) =>
          msg.conversationId === conversationId ? { ...msg, isRead: true } : msg
        ),
      }));

      // Try API call (non-blocking)
      api.markMessagesRead(conversationId).catch(() => {});

      // Emit read receipt via socket
      socketService.chatSend(conversationId, { type: 'READ' });
    } catch (error) {
      console.log('[CHAT-STORE] Error marking as read:', error);
    }
  },

  setActiveConversation: (conversationId: string | null) => {
    set({ activeConversationId: conversationId });
  },

  joinConversation: (conversationId: string) => {
    socketService.chatJoin(conversationId);
  },

  leaveConversation: (conversationId: string) => {
    socketService.chatLeave(conversationId);
    set((state) => {
      const newTyping = { ...state.typingStatus };
      delete newTyping[conversationId];
      return { typingStatus: newTyping };
    });
  },

  sendTyping: (conversationId: string) => {
    socketService.chatTyping(conversationId, true);
  },

  clearError: () => set({ error: null }),

  // Socket event handlers
  onNewMessage: (message: Message) => {
    set((state) => {
      // Deduplication: skip if a message with the same id already exists
      const existsById = state.messages.some((m) => m.id === message.id);
      if (existsById) {
        return state; // no change needed
      }

      // Secondary dedup: check by tempId / clientTimestamp if id isn't reliable yet
      // When sendMessage adds an optimistic local message, it uses `msg-local-*` ids.
      // If the socket delivers the same message from the server, match by
      // conversationId + senderId + content + close timestamp (within 5s).
      const isDuplicateByContent = state.messages.some(
        (m) =>
          m.conversationId === message.conversationId &&
          m.senderId === message.senderId &&
          m.content === message.content &&
          Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000
      );
      if (isDuplicateByContent) {
        return state; // duplicate — skip
      }

      // Add message if it belongs to active conversation
      const updatedMessages =
        state.activeConversationId === message.conversationId
          ? [...state.messages, message]
          : state.messages;

      // Update conversation's last message and unread count
      const updatedConversations = state.conversations.map((conv) => {
        if (conv.id === message.conversationId) {
          return {
            ...conv,
            lastMessage: {
              id: message.id,
              content: message.content,
              type: message.type,
              createdAt: message.createdAt,
              senderId: message.senderId,
            },
            unreadCount:
              state.activeConversationId === message.conversationId
                ? conv.unreadCount
                : conv.unreadCount + 1,
            updatedAt: message.createdAt,
          };
        }
        return conv;
      });

      return { messages: updatedMessages, conversations: updatedConversations };
    });
  },

  onTypingIndicator: (data) => {
    set((state) => ({
      typingStatus: {
        ...state.typingStatus,
        [data.conversationId]: {
          isTyping: data.isTyping,
          userId: data.userId,
          userName: data.userName,
        },
      },
    }));
  },

  onReadReceipt: (data) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        data.messageIds.includes(msg.id)
          ? { ...msg, isRead: true, readAt: data.readAt }
          : msg
      ),
    }));
  },
}));
