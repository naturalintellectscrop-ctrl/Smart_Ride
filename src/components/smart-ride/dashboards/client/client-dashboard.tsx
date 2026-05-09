'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ClientHome } from './tabs/client-home';
import { ClientOrders } from './tabs/client-orders';
import { ClientMessages } from './tabs/client-messages';
import { ClientWallet } from './tabs/client-wallet';
import { ClientProfile } from './tabs/client-profile';
import { NotificationProvider, useNotifications } from '../../context/notification-context';
import { MessagingProvider, useMessaging } from '../../context/messaging-context';
import { CartProvider } from '../../services/cart-context';
import {
  Home,
  ClipboardList,
  MessageSquare,
  Wallet,
  User
} from 'lucide-react';

type ClientTab = 'home' | 'orders' | 'messages' | 'wallet' | 'profile';

const tabs: { id: ClientTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
  { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
];

// Inner component that uses messaging context
function ClientDashboardContent() {
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const { unreadCount, setUnreadCount } = useNotifications();
  const { totalUnread } = useMessaging();

  // Sync message unread count with notification context
  useEffect(() => {
    setUnreadCount(totalUnread);
  }, [totalUnread, setUnreadCount]);

  const handleBellClick = () => {
    setActiveTab('messages');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <ClientHome onBellClick={handleBellClick} />;
      case 'orders':
        return <ClientOrders />;
      case 'messages':
        return <ClientMessages />;
      case 'wallet':
        return <ClientWallet />;
      case 'profile':
        return <ClientProfile />;
      default:
        return <ClientHome onBellClick={handleBellClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto relative">
      {/* Status Bar */}
      <div className="bg-gradient-to-r from-[#00FF88] to-[#00CC6E] h-6 flex items-center justify-center sticky top-0 z-50">
        <span className="text-[#0D0D12] text-xs font-bold">Smart Ride</span>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#13131A]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 z-50 max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] relative",
                activeTab === tab.id
                  ? "text-[#00FF88] bg-[#00FF88]/15"
                  : "text-gray-500 hover:bg-white/5"
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
              {/* Only show badge when there are unread messages */}
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ClientDashboard() {
  return (
    <CartProvider>
      <MessagingProvider>
        <NotificationProvider initialUnreadCount={0}>
          <ClientDashboardContent />
        </NotificationProvider>
      </MessagingProvider>
    </CartProvider>
  );
}
