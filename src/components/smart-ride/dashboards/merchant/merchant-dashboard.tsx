'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '../../context/user-context';
import { NotificationProvider, useNotifications } from '../../context/notification-context';
import { MerchantHome } from './tabs/merchant-home';
import { MerchantOrders } from './tabs/merchant-orders';
import { MerchantMenu } from './tabs/merchant-menu';
import { MerchantFinance } from './tabs/merchant-finance';
import { MerchantProfile } from './tabs/merchant-profile';
import { MerchantMessages } from './tabs/merchant-messages';
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Wallet,
  User,
  MessageSquare
} from 'lucide-react';

type MerchantTab = 'dashboard' | 'orders' | 'messages' | 'menu' | 'finance' | 'profile';

function MerchantDashboardContent() {
  const [activeTab, setActiveTab] = useState<MerchantTab>('dashboard');
  const { logout, switchRole } = useUser();
  const { unreadCount } = useNotifications();

  const handleBellClick = () => {
    setActiveTab('messages');
  };

  const tabs = [
    { id: 'dashboard' as MerchantTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders' as MerchantTab, label: 'Orders', icon: ClipboardList },
    { id: 'messages' as MerchantTab, label: 'Messages', icon: MessageSquare },
    { id: 'menu' as MerchantTab, label: 'Menu', icon: UtensilsCrossed },
    { id: 'finance' as MerchantTab, label: 'Finance', icon: Wallet },
    { id: 'profile' as MerchantTab, label: 'Profile', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MerchantHome onBellClick={handleBellClick} />;
      case 'orders':
        return <MerchantOrders />;
      case 'messages':
        return <MerchantMessages />;
      case 'menu':
        return <MerchantMenu />;
      case 'finance':
        return <MerchantFinance />;
      case 'profile':
        return <MerchantProfile onLogout={logout} onSwitchRole={switchRole} />;
      default:
        return <MerchantHome onBellClick={handleBellClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto relative">
      {/* Status Bar */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-6 flex items-center justify-center sticky top-0 z-50">
        <span className="text-white text-xs font-bold">Smart Ride Merchant</span>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#13131A]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 z-50 max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] relative",
                  activeTab === tab.id
                    ? "text-orange-400 bg-orange-500/15"
                    : "text-gray-500 hover:bg-white/5"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.id === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function MerchantDashboard() {
  return (
    <NotificationProvider initialUnreadCount={5}>
      <MerchantDashboardContent />
    </NotificationProvider>
  );
}
