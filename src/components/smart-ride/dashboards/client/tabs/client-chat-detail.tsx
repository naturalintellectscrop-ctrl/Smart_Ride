'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Check,
  CheckCheck,
  Phone,
  MoreVertical,
  Bike,
  Store,
  MapPin,
  Bell,
  User,
  Archive,
  Trash2,
  Ban,
  Star,
  Flag,
  Copy
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'other';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
}

interface ClientChatDetailProps {
  chatId: string;
  chatName: string;
  chatType: 'rider' | 'merchant';
  onBack: () => void;
}

export function ClientChatDetail({ chatId, chatName, chatType, onBack }: ClientChatDetailProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessages: Message[] = [
    {
      id: '1',
      content: chatType === 'rider' ? "Hello! I'm on my way to your location." : "Thank you for your order! We're preparing it now.",
      sender: 'other',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'read',
      type: 'text',
    },
    {
      id: '2',
      content: "Great, thank you!",
      sender: 'me',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      status: 'read',
      type: 'text',
    },
    {
      id: '3',
      content: chatType === 'rider' ? "I'll be there in about 3 minutes. Please wait at the gate." : "Your order will be ready in about 15 minutes.",
      sender: 'other',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      status: 'read',
      type: 'text',
    },
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'me',
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
    };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
    }, 1000);
    setTimeout(() => {
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        content: chatType === 'rider' ? "I've received your message. See you soon!" : "We've noted that. Thank you!",
        sender: 'other',
        timestamp: new Date(),
        status: 'read',
        type: 'text',
      };
      setMessages(prev => [...prev, autoReply]);
    }, 2000);
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-emerald-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-40 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          {chatType === 'rider' ? <Bike className="h-5 w-5 text-emerald-600" /> : <Store className="h-5 w-5 text-blue-600" />}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">{chatName}</h2>
          <p className="text-xs text-gray-500">{chatType === 'rider' ? 'Online' : 'Usually replies within 5 mins'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowCallDialog(true)} className="text-emerald-600 hover:bg-emerald-50">
          <Phone className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-gray-600" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="cursor-pointer"><MapPin className="h-4 w-4 mr-2" /><span>Share Location</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer"><Bell className="h-4 w-4 mr-2" /><span>Mute Notifications</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer"><User className="h-4 w-4 mr-2" /><span>View Profile</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer"><Star className="h-4 w-4 mr-2" /><span>Add to Favorites</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer"><Copy className="h-4 w-4 mr-2" /><span>Copy Chat Link</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer"><Archive className="h-4 w-4 mr-2" /><span>Archive Chat</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600" onClick={() => setShowClearDialog(true)}><Trash2 className="h-4 w-4 mr-2" /><span>Clear Chat</span></DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => setShowBlockDialog(true)}><Ban className="h-4 w-4 mr-2" /><span>Block User</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600"><Flag className="h-4 w-4 mr-2" /><span>Report User</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex justify-center mb-4"><span className="text-xs text-gray-400 bg-gray-200 px-3 py-1 rounded-full">Today</span></div>
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex mb-3", msg.sender === 'me' ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] px-4 py-2 rounded-2xl", msg.sender === 'me' ? "bg-emerald-600 text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm")}>
              <p className="text-sm">{msg.content}</p>
              <div className={cn("flex items-center justify-end gap-1 mt-1", msg.sender === 'me' ? "text-emerald-100" : "text-gray-400")}>
                <span className="text-xs">{formatTime(msg.timestamp)}</span>
                {msg.sender === 'me' && getStatusIcon(msg.status)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="bg-white px-4 py-2 border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['On my way', '5 minutes', 'At the gate', 'Thank you!'].map((quickReply) => (
            <button key={quickReply} onClick={() => setMessage(quickReply)} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 whitespace-nowrap hover:bg-gray-200 transition-colors">{quickReply}</button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-400 flex-shrink-0"><Paperclip className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="text-gray-400 flex-shrink-0"><ImageIcon className="h-5 w-5" /></Button>
          <div className="flex-1 relative">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="pr-12 h-10 rounded-full border-gray-200 focus:border-emerald-500" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400"><Mic className="h-5 w-5" /></Button>
          </div>
          <Button onClick={handleSendMessage} disabled={!message.trim()} className={cn("rounded-full h-10 w-10 p-0 flex-shrink-0", message.trim() ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-200 text-gray-400")}><Send className="h-5 w-5" /></Button>
        </div>
      </div>

      {/* Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Call {chatName}?</DialogTitle></DialogHeader>
          <div className="py-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {chatType === 'rider' ? <Bike className="h-10 w-10 text-emerald-600" /> : <Store className="h-10 w-10 text-blue-600" />}
            </div>
            <p className="text-gray-600 mb-6">{chatType === 'rider' ? "Call your rider to discuss pickup details" : "Call the merchant for order inquiries"}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowCallDialog(false)} className="w-32">Cancel</Button>
              <Button onClick={() => { window.location.href = 'tel:+256700000000'; setShowCallDialog(false); }} className="w-32 bg-emerald-600 hover:bg-emerald-700"><Phone className="h-4 w-4 mr-2" />Call Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Block {chatName}?</DialogTitle></DialogHeader>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Ban className="h-8 w-8 text-red-600" /></div>
            <p className="text-gray-600 mb-6">Blocking this user will prevent them from sending you messages. You can unblock them later in settings.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowBlockDialog(false)} className="w-32">Cancel</Button>
              <Button onClick={() => { setShowBlockDialog(false); console.log('User blocked:', chatId); }} className="w-32 bg-red-600 hover:bg-red-700">Block</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Chat Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Clear Chat?</DialogTitle></DialogHeader>
          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="h-8 w-8 text-amber-600" /></div>
            <p className="text-gray-600 mb-6">This will delete all messages in this conversation. This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowClearDialog(false)} className="w-32">Cancel</Button>
              <Button onClick={() => { setShowClearDialog(false); setMessages([]); }} className="w-32 bg-amber-600 hover:bg-amber-700">Clear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
