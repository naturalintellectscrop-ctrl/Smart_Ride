/**
 * Smart Ride Enhanced Messaging UI
 * 
 * Full messaging interface like SafeBoda with:
 * - Map view visible during active tasks
 * - Call and text options
 * - Dynamic message badges
 * - Modern dark theme branding
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Search,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  User,
  Store,
  Shield,
  Headphones,
  Bike,
  Package,
  Clock,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Smile,
  Star,
  MapPin,
  Navigation,
  MessageSquare,
  X,
  PhoneOff,
  Volume2,
  MicOff,
} from 'lucide-react';
import { MaskedCallButton } from '@/components/shared/masked-call-button';
import { useMessaging, ConversationType, Conversation } from '../context/messaging-context';

// ==========================================
// Type Icons & Colors
// ==========================================

const getTypeIcon = (type: ConversationType) => {
  switch (type) {
    case 'client': return <User className="h-5 w-5" />;
    case 'rider': return <Bike className="h-5 w-5" />;
    case 'merchant': return <Store className="h-5 w-5" />;
    case 'safety': return <Shield className="h-5 w-5" />;
    case 'support': return <Headphones className="h-5 w-5" />;
  }
};

const getTypeColor = (type: ConversationType) => {
  switch (type) {
    case 'client': return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'rider': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'merchant': return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'safety': return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'support': return { bg: 'bg-[#00FF88]/15', text: 'text-[#00FF88]', border: 'border-[#00FF88]/30' };
  }
};

const getTypeLabel = (type: ConversationType) => {
  switch (type) {
    case 'client': return 'Customer';
    case 'rider': return 'Rider';
    case 'merchant': return 'Merchant';
    case 'safety': return 'Safety';
    case 'support': return 'Support';
  }
};

// ==========================================
// Time Formatting
// ==========================================

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const formatMessageTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// ==========================================
// Mini Map Component for Chat
// ==========================================

interface MiniMapProps {
  pickup?: { lat: number; lng: number; address: string };
  dropoff?: { lat: number; lng: number; address: string };
  riderLocation?: { lat: number; lng: number };
  taskStatus?: 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';
}

function MiniMap({ pickup, dropoff, riderLocation, taskStatus }: MiniMapProps) {
  // Mock map for demo - in production use Mapbox
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  return (
    <div className="relative w-full h-40 bg-[#1A1A24] rounded-xl overflow-hidden">
      {/* Map Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{
          backgroundImage: mapboxToken 
            ? `url(https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/32.5826,0.3476,12,0/400x200?access_token=${mapboxToken})`
            : 'linear-gradient(135deg, #1A1A24 0%, #2A2A34 100%)'
        }}
      />
      
      {/* Route Line */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00FF88" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>
        <path
          d="M 80 150 Q 200 50 320 100"
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="3"
          strokeDasharray="8,4"
          className="animate-pulse"
        />
      </svg>

      {/* Pickup Marker */}
      {pickup && (
        <div className="absolute bottom-6 left-16 transform -translate-x-1/2">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full">Pickup</span>
          </div>
        </div>
      )}

      {/* Dropoff Marker */}
      {dropoff && (
        <div className="absolute top-10 right-16">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Navigation className="h-4 w-4 text-white" />
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full">Dropoff</span>
          </div>
        </div>
      )}

      {/* Rider Location */}
      {riderLocation && taskStatus !== 'COMPLETED' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-10 h-10 bg-[#00FF88] rounded-full flex items-center justify-center shadow-lg shadow-[#00FF88]/50 animate-pulse">
              <Bike className="h-5 w-5 text-[#0D0D12]" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-[#00FF88]/20 animate-ping" />
          </div>
        </div>
      )}

      {/* Status Overlay */}
      {taskStatus && taskStatus !== 'COMPLETED' && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                taskStatus === 'EN_ROUTE' && "bg-yellow-400 animate-pulse",
                taskStatus === 'ARRIVED' && "bg-[#00FF88]",
                taskStatus === 'IN_PROGRESS' && "bg-blue-400 animate-pulse"
              )} />
              <span className="text-xs text-white font-medium">
                {taskStatus === 'EN_ROUTE' && 'Rider en route'}
                {taskStatus === 'ARRIVED' && 'Rider arrived'}
                {taskStatus === 'IN_PROGRESS' && 'In progress'}
              </span>
            </div>
            <span className="text-xs text-gray-400">Tap to expand</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Conversation List Component
// ==========================================

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  filter?: 'all' | 'client' | 'rider' | 'merchant' | 'safety' | 'support';
}

export function ConversationList({ onSelectConversation, filter = 'all' }: ConversationListProps) {
  const { conversations, totalUnread, markAsRead } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | ConversationType>(filter);

  const filteredConversations = conversations
    .filter(conv => {
      if (activeFilter !== 'all' && conv.type !== activeFilter) return false;
      if (searchQuery) {
        return (
          conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.taskId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  const handleConversationClick = (conversation: Conversation) => {
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
    onSelectConversation(conversation);
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] flex flex-col">
      {/* Header */}
      <div className="bg-[#13131A] border-b border-white/5 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <p className="text-sm text-gray-400">
              {totalUnread > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
                  {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
                </span>
              ) : (
                'All caught up!'
              )}
            </p>
          </div>
          <div className="w-10 h-10 bg-[#00FF88]/15 rounded-full flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[#00FF88]" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 h-12 bg-[#1A1A24] border-[#1A1A24] text-white placeholder-gray-500 focus:border-[#00FF88]/30 rounded-xl"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pt-3 scrollbar-hide -mx-4 px-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'client', label: 'Clients', icon: User },
            { id: 'rider', label: 'Riders', icon: Bike },
            { id: 'merchant', label: 'Merchants', icon: Store },
            { id: 'support', label: 'Support', icon: Headphones },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as 'all' | ConversationType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeFilter === tab.id
                  ? "bg-[#00FF88] text-[#0D0D12]"
                  : "bg-[#1A1A24] text-gray-400 hover:text-white hover:bg-[#1E1E28]"
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-[#1A1A24] rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="font-semibold text-white mb-1">No Messages</h3>
            <p className="text-sm text-gray-400 text-center">
              {searchQuery 
                ? 'No conversations match your search.'
                : 'Start chatting during tasks to see messages here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => {
              const colors = getTypeColor(conversation.type);
              return (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className="bg-[#13131A] border border-white/5 rounded-2xl p-4 cursor-pointer hover:border-[#00FF88]/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        colors.bg
                      )}>
                        {getTypeIcon(conversation.type)}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "font-semibold truncate",
                            conversation.unreadCount > 0 ? "text-white" : "text-gray-300"
                          )}>
                            {conversation.participantName}
                          </p>
                          <Badge className={cn("text-[10px] px-2 py-0.5", colors.bg, colors.text, colors.border)}>
                            {getTypeLabel(conversation.type)}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      </div>

                      <p className={cn(
                        "text-sm truncate",
                        conversation.unreadCount > 0 ? "text-white font-medium" : "text-gray-400"
                      )}>
                        {conversation.lastMessage}
                      </p>

                      {conversation.taskId && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-[#00FF88]" />
                          <span className="text-xs text-[#00FF88]">{conversation.taskId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Safety Notice */}
        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-300 text-sm">Safety First</p>
              <p className="text-xs text-amber-200/70 mt-1">
                All conversations are monitored for safety. Report suspicious behavior to support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Enhanced Chat View with Map
// ==========================================

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
  currentUserId?: string;
  currentUserType?: 'CLIENT' | 'RIDER' | 'MERCHANT';
  showMap?: boolean;
}

function ChatView({ conversation, onBack, currentUserId, currentUserType, showMap = true }: ChatViewProps) {
  const { sendMessage, quickReplies, markAsRead } = useMessaging();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = getTypeColor(conversation.type);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Mark as read on open
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
  }, [conversation.id, conversation.unreadCount, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const content = messageInput.trim();
    setMessageInput('');
    await sendMessage(conversation.id, content);

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleQuickReply = (text: string) => {
    setMessageInput(text);
    inputRef.current?.focus();
  };

  // Group messages by date
  const groupedMessages = conversation.messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof conversation.messages>);

  return (
    <div className="min-h-screen bg-[#0D0D12] flex flex-col">
      {/* Header */}
      <div className="bg-[#13131A] border-b border-white/5 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>

          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            colors.bg
          )}>
            {getTypeIcon(conversation.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{conversation.participantName}</h3>
              <Badge className={cn("text-[10px]", colors.bg, colors.text, colors.border)}>
                {getTypeLabel(conversation.type)}
              </Badge>
            </div>
            {conversation.taskId && (
              <p className="text-xs text-[#00FF88]">{conversation.taskId}</p>
            )}
          </div>

          {/* Call Button */}
          <button
            onClick={() => setShowCallModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors"
          >
            <Phone className="h-5 w-5 text-emerald-400" />
          </button>

          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5">
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Mini Map for Active Tasks */}
      {showMap && conversation.taskId && (
        <div className="px-4 py-3 bg-[#13131A] border-b border-white/5">
          <MiniMap
            pickup={{ lat: 0.3476, lng: 32.5826, address: 'Pickup location' }}
            dropoff={{ lat: 0.3176, lng: 32.5726, address: 'Dropoff location' }}
            riderLocation={{ lat: 0.3376, lng: 32.5776 }}
            taskStatus="EN_ROUTE"
          />
        </div>
      )}

      {/* Privacy Banner */}
      <div className="px-4 py-2 bg-[#00FF88]/5 border-b border-[#00FF88]/10">
        <div className="flex items-center gap-2 text-xs text-[#00FF88]">
          <Shield className="h-3 w-3" />
          <span>End-to-end encrypted • Phone numbers hidden</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {Object.entries(groupedMessages).map(([date, messages]) => (
          <React.Fragment key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center py-4">
              <span className="text-xs text-gray-500 bg-[#1A1A24] px-3 py-1 rounded-full">
                {date === new Date().toDateString() ? 'Today' : 
                 date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : 
                 new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Messages */}
            {messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1]?.senderType !== message.senderType;
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 items-end",
                    message.senderType === 'me' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar placeholder for alignment */}
                  {message.senderType !== 'me' && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          colors.bg
                        )}>
                          {getTypeIcon(conversation.type)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl",
                      message.senderType === 'me'
                        ? "bg-[#00FF88] text-[#0D0D12] rounded-br-md"
                        : "bg-[#1A1A24] text-white rounded-bl-md border border-white/5",
                      message.type === 'system' && "bg-blue-500/10 text-blue-300 border border-blue-500/20 text-center text-sm"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      message.senderType === 'me' ? "text-[#0D0D12]/50" : "text-gray-500"
                    )}>
                      <span className="text-[10px]">{formatMessageTime(message.timestamp)}</span>
                      {message.senderType === 'me' && (
                        message.isRead 
                          ? <CheckCheck className="h-3 w-3" />
                          : <Check className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colors.bg)}>
              {getTypeIcon(conversation.type)}
            </div>
            <div className="bg-[#1A1A24] border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 border-t border-white/5 bg-[#13131A]">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {quickReplies.slice(0, 6).map((reply) => (
            <button
              key={reply.id}
              onClick={() => handleQuickReply(reply.text)}
              className="flex-shrink-0 px-4 py-2 bg-[#1A1A24] border border-white/5 rounded-full text-sm text-gray-300 hover:bg-[#1E1E28] hover:border-[#00FF88]/30 transition-all"
            >
              {reply.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#13131A] border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Attachment buttons */}
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A24] hover:bg-[#1E1E28] transition-colors">
            <Paperclip className="h-5 w-5 text-gray-400" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full h-12 pr-10 bg-[#1A1A24] border-[#1A1A24] text-white placeholder-gray-500 focus:border-[#00FF88]/30 rounded-xl"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <Smile className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              messageInput.trim()
                ? "bg-[#00FF88] text-[#0D0D12] hover:bg-[#00CC6E]"
                : "bg-[#1A1A24] text-gray-500"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Call Modal */}
      {showCallModal && currentUserId && currentUserType && (
        <CallModal
          recipientName={conversation.participantName}
          recipientType={conversation.type}
          onClose={() => setShowCallModal(false)}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
          participantId={conversation.participantId}
          taskId={conversation.taskId}
          taskType={conversation.taskType}
        />
      )}
    </div>
  );
}

// ==========================================
// Call Modal Component
// ==========================================

interface CallModalProps {
  recipientName: string;
  recipientType: ConversationType;
  onClose: () => void;
  currentUserId: string;
  currentUserType: 'CLIENT' | 'RIDER' | 'MERCHANT';
  participantId: string;
  taskId?: string;
  taskType?: string;
}

function CallModal({ 
  recipientName, 
  recipientType, 
  onClose,
  currentUserId,
  currentUserType,
  participantId,
  taskId,
  taskType
}: CallModalProps) {
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const colors = getTypeColor(recipientType);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (callState === 'calling') {
      timer = setTimeout(() => setCallState('connected'), 3000);
    } else if (callState === 'connected') {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }

    return () => clearTimeout(timer);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(onClose, 500);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0D0D12] to-[#1A1A24] z-50 flex flex-col max-w-md mx-auto">
      {/* Privacy Header */}
      <div className="px-4 py-3 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-[#00FF88] bg-[#00FF88]/10 px-3 py-1 rounded-full">
          <Shield className="h-3 w-3" />
          <span>Secure Call • Numbers Hidden</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Avatar */}
        <div className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center mb-6 relative",
          colors.bg
        )}>
          {getTypeIcon(recipientType)}
          {callState === 'connected' && (
            <div className="absolute inset-0 rounded-full border-4 border-[#00FF88] animate-pulse" />
          )}
        </div>

        {/* Name and Status */}
        <h2 className="text-2xl font-bold text-white mb-2">{recipientName}</h2>
        <p className="text-gray-400 capitalize mb-2">{getTypeLabel(recipientType)}</p>

        {/* Call Status */}
        <div className="text-center">
          {callState === 'calling' && (
            <div className="flex items-center gap-2 text-[#00FF88]">
              <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
              <span>Calling...</span>
            </div>
          )}
          {callState === 'connected' && (
            <div className="text-white text-xl font-mono">
              {formatDuration(callDuration)}
            </div>
          )}
          {callState === 'ended' && (
            <p className="text-red-400">Call ended</p>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="px-4 pb-12">
        <div className="flex justify-center gap-6">
          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
              isMuted ? "bg-red-500/20" : "bg-[#1A1A24]"
            )}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6 text-red-400" />
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>

          {/* Speaker */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
              isSpeakerOn ? "bg-[#00FF88]/20" : "bg-[#1A1A24]"
            )}
          >
            <Volume2 className={cn("h-6 w-6", isSpeakerOn ? "text-[#00FF88]" : "text-white")} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Messaging Screen Component
// ==========================================

interface MessagingScreenProps {
  currentUserId?: string;
  currentUserType?: 'CLIENT' | 'RIDER' | 'MERCHANT';
  initialConversationId?: string;
  showMapInChat?: boolean;
}

export function EnhancedMessagingScreen({ 
  currentUserId, 
  currentUserType,
  initialConversationId,
  showMapInChat = true
}: MessagingScreenProps) {
  const { conversations } = useMessaging();
  
  // Open initial conversation if provided
  const initialConv = initialConversationId 
    ? conversations.find(c => c.id === initialConversationId) 
    : null;
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(initialConv || null);

  if (selectedConversation) {
    return (
      <ChatView
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
        currentUserId={currentUserId}
        currentUserType={currentUserType}
        showMap={showMapInChat}
      />
    );
  }

  return <ConversationList onSelectConversation={setSelectedConversation} />;
}

export default EnhancedMessagingScreen;
