'use client';

import { useState, useRef, useEffect } from 'react';
import { MobileCard } from './mobile-components';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  Send,
  ArrowLeft,
  MoreVertical,
  User,
  Shield,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

// ============================================
// PRIVACY-FIRST CONTACT INFO
// ============================================

interface PrivacyContactProps {
  name: string;
  role: 'client' | 'rider' | 'merchant';
  rating?: number;
  taskId?: string;
}

export function PrivacyContactInfo({ name, role, rating, taskId }: PrivacyContactProps) {
  // Phone numbers are NEVER displayed - only masked identifiers
  const getRoleLabel = () => {
    switch (role) {
      case 'client': return 'Customer';
      case 'rider': return 'Rider';
      case 'merchant': return 'Merchant';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
        <User className="h-6 w-6 text-gray-500" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{name}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Shield className="h-3 w-3" />
            <span>Verified</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">{getRoleLabel()}</span>
          {rating && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">★ {rating}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Privacy notice component
export function PrivacyNotice() {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
      <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-blue-900">Privacy Protected</p>
        <p className="text-xs text-blue-700 mt-0.5">
          Phone numbers are never shared. All communication happens securely through the app.
        </p>
      </div>
    </div>
  );
}

// ============================================
// IN-APP MESSAGING
// ============================================

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  read: boolean;
}

interface InAppChatProps {
  recipientName: string;
  recipientRole: 'client' | 'rider' | 'merchant';
  taskId: string;
  onClose: () => void;
}

export function InAppChat({ recipientName, recipientRole, taskId, onClose }: InAppChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm on my way to pick you up. I'll be there in about 3 minutes.",
      sender: 'other',
      timestamp: new Date(Date.now() - 180000),
      read: true,
    },
    {
      id: '2',
      text: "Great, I'm waiting near the entrance of the building.",
      sender: 'me',
      timestamp: new Date(Date.now() - 120000),
      read: true,
    },
    {
      id: '3',
      text: "Perfect! I can see you now. I'm on the red motorcycle.",
      sender: 'other',
      timestamp: new Date(Date.now() - 60000),
      read: true,
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'me',
      timestamp: new Date(),
      read: false,
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simulate typing indicator and response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <PrivacyContactInfo name={recipientName} role={recipientRole} />
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <Shield className="h-3 w-3" />
          <span>Secure chat • Phone numbers are hidden</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === 'me'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <div
                className={`flex items-center justify-end gap-1 mt-1 ${
                  message.sender === 'me' ? 'text-emerald-200' : 'text-gray-400'
                }`}
              >
                <span className="text-xs">{formatTime(message.timestamp)}</span>
                {message.sender === 'me' && (
                  <CheckCheck className="h-3 w-3" />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
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
      <div className="px-4 py-2 border-t border-gray-100 bg-white">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['I\'m here', 'On my way', 'Please wait', 'Thank you'].map((reply) => (
            <button
              key={reply}
              onClick={() => setNewMessage(reply)}
              className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 whitespace-nowrap hover:bg-gray-200"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center disabled:bg-gray-300"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// IN-APP VOICE CALL
// ============================================

interface InAppCallProps {
  recipientName: string;
  recipientRole: 'client' | 'rider' | 'merchant';
  isIncoming?: boolean;
  onEnd: () => void;
}

export function InAppCall({ recipientName, recipientRole, isIncoming = false, onEnd }: InAppCallProps) {
  const [callState, setCallState] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (callState === 'calling') {
      // Simulate call connecting
      timer = setTimeout(() => setCallState('connected'), 3000);
    } else if (callState === 'ringing') {
      // Auto-decline after 30 seconds
      timer = setTimeout(() => setCallState('ended'), 30000);
    } else if (callState === 'connected') {
      // Track call duration
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }

    return () => clearTimeout(timer);
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = () => {
    setCallState('connected');
  };

  const handleEnd = () => {
    setCallState('ended');
    setTimeout(onEnd, 500);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-50 flex flex-col max-w-md mx-auto">
      {/* Privacy Header */}
      <div className="px-4 py-3 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full">
          <Shield className="h-3 w-3" />
          <span>Secure Call • Numbers Hidden</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Avatar */}
        <div className="w-28 h-28 bg-gray-700 rounded-full flex items-center justify-center mb-6 relative">
          <User className="h-14 w-14 text-gray-400" />
          {callState === 'connected' && (
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-pulse" />
          )}
        </div>

        {/* Name and Status */}
        <h2 className="text-2xl font-bold text-white mb-2">{recipientName}</h2>
        <p className="text-gray-400 capitalize mb-2">{recipientRole}</p>

        {/* Call Status */}
        <div className="text-center">
          {callState === 'calling' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Calling...</span>
            </div>
          )}
          {callState === 'ringing' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Incoming call...</span>
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
        {callState === 'ringing' ? (
          <div className="flex justify-center gap-8">
            {/* Decline */}
            <button
              onClick={handleEnd}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
            {/* Answer */}
            <button
              onClick={handleAnswer}
              className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center animate-pulse"
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-6">
            {/* Mute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isMuted ? 'bg-red-600' : 'bg-gray-700'
              }`}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6 text-white" />
              ) : (
                <Mic className="h-6 w-6 text-white" />
              )}
            </button>

            {/* End Call */}
            <button
              onClick={handleEnd}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>

            {/* Speaker */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isSpeakerOn ? 'bg-emerald-600' : 'bg-gray-700'
              }`}
            >
              <Volume2 className="h-6 w-6 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMMUNICATION BUTTONS (for Task/Order cards)
// ============================================

interface CommunicationButtonsProps {
  onCall: () => void;
  onMessage: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dark';
}

export function CommunicationButtons({
  onCall,
  onMessage,
  size = 'md',
  variant = 'default',
}: CommunicationButtonsProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const callColor = variant === 'dark' ? 'bg-emerald-600' : 'bg-emerald-100';
  const callIconColor = variant === 'dark' ? 'text-white' : 'text-emerald-600';
  const messageColor = variant === 'dark' ? 'bg-blue-600' : 'bg-blue-100';
  const messageIconColor = variant === 'dark' ? 'text-white' : 'text-blue-600';

  return (
    <div className="flex gap-2">
      <button
        onClick={onCall}
        className={`${sizeClasses[size]} ${callColor} rounded-full flex items-center justify-center`}
        title="In-App Call"
      >
        <Phone className={`${iconSizes[size]} ${callIconColor}`} />
      </button>
      <button
        onClick={onMessage}
        className={`${sizeClasses[size]} ${messageColor} rounded-full flex items-center justify-center`}
        title="In-App Message"
      >
        <MessageSquare className={`${iconSizes[size]} ${messageIconColor}`} />
      </button>
    </div>
  );
}
