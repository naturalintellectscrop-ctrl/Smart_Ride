'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { User } from '../types';
import { NotificationProvider, useNotifications } from '../context/notification-context';
import { PharmacistHome } from './pharmacist/tabs/pharmacist-home';
import { PharmacistOrders } from './pharmacist/tabs/pharmacist-orders';
import { PharmacistMessages } from './pharmacist/tabs/pharmacist-messages';
import { PharmacistPrescriptions } from './pharmacist/tabs/pharmacist-prescriptions';
import { PharmacistInventory } from './pharmacist/tabs/pharmacist-inventory';
import { PharmacistProfile } from './pharmacist/tabs/pharmacist-profile';
import {
  Home,
  Package,
  FileText,
  Pill,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';

interface PharmacistDashboardProps {
  user: User;
}

type PharmacistTab = 'home' | 'orders' | 'messages' | 'prescriptions' | 'inventory' | 'profile';

function PharmacistDashboardContent({ user }: PharmacistDashboardProps) {
  const [activeTab, setActiveTab] = useState<PharmacistTab>('home');
  const [isOnline, setIsOnline] = useState(true);
  const { unreadCount } = useNotifications();

  const handleBellClick = () => {
    setActiveTab('messages');
  };

  const tabs: { id: PharmacistTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'orders', label: 'Orders', icon: <Package className="h-5 w-5" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
    { id: 'prescriptions', label: 'Rx', icon: <FileText className="h-5 w-5" /> },
    { id: 'inventory', label: 'Inventory', icon: <Pill className="h-5 w-5" /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <PharmacistHome isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} onBellClick={handleBellClick} />;
      case 'orders':
        return <PharmacistOrders />;
      case 'messages':
        return <PharmacistMessages />;
      case 'prescriptions':
        return <PharmacistPrescriptions />;
      case 'inventory':
        return <PharmacistInventory />;
      case 'profile':
        return <PharmacistProfile />;
      default:
        return <PharmacistHome isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} onBellClick={handleBellClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto relative">
      {/* Status Bar */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-6 flex items-center justify-center sticky top-0 z-50">
        <span className="text-white text-xs font-bold">Smart Health - Pharmacy</span>
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
                "flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all min-w-[48px] relative",
                activeTab === tab.id
                  ? "text-rose-400 bg-rose-500/15"
                  : "text-gray-500 hover:bg-white/5"
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 right-0 w-5 h-5 bg-amber-400 rounded-full text-xs flex items-center justify-center text-[#0D0D12] font-bold">
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

export function PharmacistDashboard({ user }: PharmacistDashboardProps) {
  return (
    <NotificationProvider initialUnreadCount={7}>
      <PharmacistDashboardContent user={user} />
    </NotificationProvider>
  );
}
