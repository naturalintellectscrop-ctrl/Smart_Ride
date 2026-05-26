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

// ============================================
// MOCK DATA (fallback when API doesn't work)
// ============================================

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    taskId: 'task-1',
    taskNumber: 'SR-2024-001',
    taskType: 'SMART_BODA_RIDE',
    otherUser: { id: 'rider-1', name: 'James Okello', role: 'RIDER' },
    lastMessage: { id: 'msg-10', content: "I'm on my way, 3 minutes away!", type: 'TEXT', createdAt: new Date(Date.now() - 120000).toISOString(), senderId: 'rider-1' },
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'conv-2',
    taskId: 'task-2',
    taskNumber: 'SR-2024-002',
    taskType: 'FOOD_DELIVERY',
    otherUser: { id: 'merchant-1', name: 'Cafe Javas', role: 'MERCHANT' },
    lastMessage: { id: 'msg-20', content: 'Your order is being prepared', type: 'TEXT', createdAt: new Date(Date.now() - 600000).toISOString(), senderId: 'merchant-1' },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'conv-3',
    taskId: 'task-3',
    taskNumber: 'SR-2024-003',
    taskType: 'SMART_CAR_RIDE',
    otherUser: { id: 'rider-2', name: 'Sarah Nakamya', role: 'RIDER' },
    lastMessage: { id: 'msg-30', content: 'Thanks for the ride!', type: 'TEXT', createdAt: new Date(Date.now() - 3600000).toISOString(), senderId: 'client-1' },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'conv-4',
    taskId: 'task-4',
    taskNumber: 'SR-2024-004',
    taskType: 'ITEM_DELIVERY',
    otherUser: { id: 'rider-3', name: 'Peter Mugisha', role: 'RIDER' },
    lastMessage: { id: 'msg-40', content: 'Package delivered successfully', type: 'SYSTEM', createdAt: new Date(Date.now() - 86400000).toISOString(), senderId: 'system' },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: 'msg-1', conversationId: 'conv-1', senderId: 'client-1', content: 'Hello, where are you?', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'msg-2', conversationId: 'conv-1', senderId: 'rider-1', senderName: 'James Okello', content: "I'm at the pickup point, waiting for you", type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 540000).toISOString() },
    { id: 'msg-3', conversationId: 'conv-1', senderId: 'client-1', content: 'Coming now, 2 minutes', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 480000).toISOString() },
    { id: 'msg-4', conversationId: 'conv-1', senderId: 'rider-1', senderName: 'James Okello', content: 'Great! I have a white helmet, you can spot me easily', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 420000).toISOString() },
    { id: 'msg-5', conversationId: 'conv-1', senderId: 'system', content: 'Driver has arrived at pickup location', type: 'SYSTEM', isRead: true, createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'msg-6', conversationId: 'conv-1', senderId: 'rider-1', senderName: 'James Okello', content: "I'm on my way, 3 minutes away!", type: 'TEXT', isRead: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  ],
  'conv-2': [
    { id: 'msg-7', conversationId: 'conv-2', senderId: 'merchant-1', senderName: 'Cafe Javas', content: 'Hello! We received your order #SR-2024-002', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'msg-8', conversationId: 'conv-2', senderId: 'client-1', content: 'Great, can I add extra sauce?', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 840000).toISOString() },
    { id: 'msg-9', conversationId: 'conv-2', senderId: 'merchant-1', senderName: 'Cafe Javas', content: 'Sure! Added at no extra cost 😊', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 780000).toISOString() },
    { id: 'msg-10', conversationId: 'conv-2', senderId: 'system', content: 'Order status updated: Preparing', type: 'SYSTEM', isRead: true, createdAt: new Date(Date.now() - 700000).toISOString() },
    { id: 'msg-20', conversationId: 'conv-2', senderId: 'merchant-1', senderName: 'Cafe Javas', content: 'Your order is being prepared', type: 'TEXT', isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  ],
  'conv-3': [
    { id: 'msg-11', conversationId: 'conv-3', senderId: 'rider-2', senderName: 'Sarah Nakamya', content: 'Good morning! I will be your driver today', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'msg-12', conversationId: 'conv-3', senderId: 'client-1', content: 'Morning! How far are you?', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 7100000).toISOString() },
    { id: 'msg-13', conversationId: 'conv-3', senderId: 'rider-2', senderName: 'Sarah Nakamya', content: 'About 5 mins away, a blue Toyota Premio', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 7000000).toISOString() },
    { id: 'msg-14', conversationId: 'conv-3', senderId: 'system', content: 'Trip completed successfully', type: 'SYSTEM', isRead: true, createdAt: new Date(Date.now() - 4000000).toISOString() },
    { id: 'msg-30', conversationId: 'conv-3', senderId: 'client-1', content: 'Thanks for the ride!', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],
  'conv-4': [
    { id: 'msg-15', conversationId: 'conv-4', senderId: 'rider-3', senderName: 'Peter Mugisha', content: 'I have picked up your package', type: 'TEXT', isRead: true, createdAt: new Date(Date.now() - 100000000).toISOString() },
    { id: 'msg-16', conversationId: 'conv-4', senderId: 'system', content: 'Package picked up', type: 'SYSTEM', isRead: true, createdAt: new Date(Date.now() - 95000000).toISOString() },
    { id: 'msg-40', conversationId: 'conv-4', senderId: 'system', content: 'Package delivered successfully', type: 'SYSTEM', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
};

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
        // Fall back to mock data
        console.log('[CHAT-STORE] API failed, using mock conversations');
        set({ conversations: MOCK_CONVERSATIONS, isLoadingConversations: false });
      }
    } catch (error) {
      console.log('[CHAT-STORE] Error loading conversations, using mock data:', error);
      set({ conversations: MOCK_CONVERSATIONS, isLoadingConversations: false });
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true, error: null, messages: [], activeConversationId: conversationId });
    try {
      const response = await api.getMessages(conversationId);
      if (response.success && response.data) {
        set({ messages: response.data, isLoadingMessages: false });
      } else {
        // Fall back to mock data
        console.log('[CHAT-STORE] API failed, using mock messages');
        const mockMsgs = MOCK_MESSAGES[conversationId] || [];
        set({ messages: mockMsgs, isLoadingMessages: false });
      }
    } catch (error) {
      console.log('[CHAT-STORE] Error loading messages, using mock data:', error);
      const mockMsgs = MOCK_MESSAGES[conversationId] || [];
      set({ messages: mockMsgs, isLoadingMessages: false });
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
        socketService.chatSend({
          conversationId,
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
      socketService.chatSend({ conversationId, type: 'READ' });
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
    socketService.chatTyping({ conversationId, isTyping: true });
  },

  clearError: () => set({ error: null }),

  // Socket event handlers
  onNewMessage: (message: Message) => {
    set((state) => {
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

console.log('[CHAT-STORE] Store initialized');
