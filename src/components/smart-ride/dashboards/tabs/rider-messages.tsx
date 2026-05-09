'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  User,
  Store,
  Shield,
  Headphones,
  Send,
  ArrowLeft,
  Search,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '../../context/notification-context';

type ConversationType = 'client' | 'merchant' | 'safety' | 'support';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
}

interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  taskId?: string;
  messages?: Message[];
}

const initialConversations: Conversation[] = [
  {
    id: '1',
    type: 'client',
    name: 'John Doe',
    lastMessage: 'I am at the pickup point, where are you?',
    lastMessageTime: '2 min ago',
    unreadCount: 2,
    taskId: 'TASK-2024-09823',
    messages: [
      { id: '1', content: 'Hello, I am on my way to pickup', timestamp: '10:30 AM', isMine: true, isRead: true },
      { id: '2', content: 'Great, I will be waiting', timestamp: '10:31 AM', isMine: false, isRead: true },
      { id: '3', content: 'I am at the pickup point, where are you?', timestamp: '10:35 AM', isMine: false, isRead: false },
    ]
  },
  {
    id: '2',
    type: 'merchant',
    name: 'Javas Restaurant',
    lastMessage: 'Order is ready for pickup',
    lastMessageTime: '15 min ago',
    unreadCount: 1,
    taskId: 'TASK-2024-09824',
  },
  {
    id: '3',
    type: 'safety',
    name: 'Safety Alert',
    lastMessage: 'Weather alert: Heavy rain expected in your area',
    lastMessageTime: '1 hour ago',
    unreadCount: 0,
  },
  {
    id: '4',
    type: 'support',
    name: 'Smart Ride Support',
    lastMessage: 'Your verification has been approved!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: '5',
    type: 'client',
    name: 'Sarah Wilson',
    lastMessage: 'Thank you for the ride!',
    lastMessageTime: '2 hours ago',
    unreadCount: 0,
  },
  {
    id: '6',
    type: 'merchant',
    name: 'Shoprite Kampala',
    lastMessage: 'Delivery confirmed, thank you!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
  },
];

const getTypeIcon = (type: ConversationType) => {
  switch (type) {
    case 'client':
      return <User className="h-5 w-5" />;
    case 'merchant':
      return <Store className="h-5 w-5" />;
    case 'safety':
      return <Shield className="h-5 w-5" />;
    case 'support':
      return <Headphones className="h-5 w-5" />;
  }
};

const getTypeColor = (type: ConversationType) => {
  switch (type) {
    case 'client':
      return 'bg-blue-500/15 text-blue-400';
    case 'merchant':
      return 'bg-purple-500/15 text-purple-400';
    case 'safety':
      return 'bg-rose-500/15 text-rose-400';
    case 'support':
      return 'bg-[#00FF88]/15 text-[#00FF88]';
  }
};

const getTypeLabel = (type: ConversationType) => {
  switch (type) {
    case 'client':
      return 'Client';
    case 'merchant':
      return 'Merchant';
    case 'safety':
      return 'Safety';
    case 'support':
      return 'Support';
  }
};

export function RiderMessages() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const { setUnreadCount } = useNotifications();

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Update notification context when unread count changes
  useEffect(() => {
    setUnreadCount(totalUnread);
  }, [totalUnread, setUnreadCount]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mark as read when opening conversation
    if (conversation.unreadCount > 0) {
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversation.id) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      }));
    }
  };

  // Chat View
  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-[#0D0D12] flex flex-col">
        {/* Chat Header */}
        <div className="bg-[#13131A] border-b border-white/5 px-4 py-3 sticky top-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-2 -ml-2 hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              getTypeColor(selectedConversation.type)
            )}>
              {getTypeIcon(selectedConversation.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{selectedConversation.name}</h3>
                <Badge className="bg-white/5 text-gray-400 border-white/10 text-xs">
                  {getTypeLabel(selectedConversation.type)}
                </Badge>
              </div>
              {selectedConversation.taskId && (
                <p className="text-xs text-gray-500">{selectedConversation.taskId}</p>
              )}
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full">
              <Phone className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-full">
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Safety Warning Banner */}
          {selectedConversation.type === 'safety' && (
            <Card className="p-3 bg-rose-500/10 border-rose-500/30 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-rose-300">Safety Alert</p>
                  <p className="text-sm text-rose-200/70">
                    Weather alert: Heavy rain expected in your area. Drive carefully.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Date Separator */}
          <div className="flex items-center justify-center">
            <span className="text-xs text-gray-500 bg-[#1A1A24] px-3 py-1 rounded-full">
              Today
            </span>
          </div>

          {/* Messages */}
          {(selectedConversation.messages || [
            { id: '1', content: selectedConversation.lastMessage, timestamp: selectedConversation.lastMessageTime, isMine: false, isRead: true }
          ]).map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[75%] px-4 py-2 rounded-2xl',
                message.isMine
                  ? 'bg-[#00FF88] text-[#0D0D12] rounded-br-md'
                  : 'bg-[#1A1A24] text-white rounded-bl-md border border-white/5'
              )}>
                <p className="text-sm">{message.content}</p>
                <div className={cn(
                  'flex items-center justify-end gap-1 mt-1',
                  message.isMine ? 'text-[#0D0D12]/60' : 'text-gray-500'
                )}>
                  <span className="text-xs">{message.timestamp}</span>
                  {message.isMine && (
                    message.isRead
                      ? <CheckCheck className="h-3 w-3" />
                      : <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="bg-[#13131A] border-t border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full px-4 py-2 bg-[#1A1A24] border-white/5 text-white placeholder-gray-500"
            />
            <Button
              size="icon"
              className="rounded-full bg-[#00FF88] hover:bg-[#00CC6E] text-[#0D0D12]"
              disabled={!messageInput.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations List View
  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header */}
      <div className="bg-[#13131A] border-b border-white/5 px-4 py-4 sticky top-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <p className="text-sm text-gray-400">
              {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up!'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-9 bg-[#1A1A24] border-white/5 text-white placeholder-gray-500"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#00FF88] text-[#0D0D12] rounded-full text-sm font-medium">
            All
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A24] border border-white/5 rounded-full text-sm font-medium text-gray-400 hover:border-[#00FF88]/30">
            <User className="h-4 w-4" />
            Clients
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A24] border border-white/5 rounded-full text-sm font-medium text-gray-400 hover:border-[#00FF88]/30">
            <Store className="h-4 w-4" />
            Merchants
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A24] border border-white/5 rounded-full text-sm font-medium text-gray-400 hover:border-[#00FF88]/30">
            <Shield className="h-4 w-4" />
            Safety
          </button>
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <Card className="p-8 bg-[#13131A] border-white/5">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="font-semibold text-white mb-1">No Messages</h3>
              <p className="text-sm text-gray-400">
                {searchQuery
                  ? 'No conversations match your search.'
                  : 'Start chatting with clients and merchants during tasks.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2 pb-6">
            {filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-4 bg-[#13131A] border-white/5 cursor-pointer hover:border-[#00FF88]/30 transition-all"
                onClick={() => handleConversationClick(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      getTypeColor(conversation.type)
                    )}>
                      {getTypeIcon(conversation.type)}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-medium">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{conversation.name}</p>
                        <Badge className="bg-white/5 text-gray-400 border-white/10 text-xs">
                          {getTypeLabel(conversation.type)}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">{conversation.lastMessageTime}</span>
                    </div>
                    <p className={cn(
                      'text-sm truncate mt-0.5',
                      conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'
                    )}>
                      {conversation.lastMessage}
                    </p>
                    {conversation.taskId && (
                      <p className="text-xs text-[#00FF88] mt-0.5">{conversation.taskId}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Safety Tips Card */}
        <Card className="p-4 bg-amber-500/10 border-amber-500/30 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-300">Safety First</p>
              <p className="text-sm text-amber-200/70 mt-1">
                All conversations are monitored for your safety. Report any suspicious behavior to support.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
