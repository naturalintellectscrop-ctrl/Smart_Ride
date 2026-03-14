'use client';

import { useState } from 'react';
import { MobileCard } from '../shared/mobile-components';
import { MerchantDashboard } from './screens/merchant-dashboard';
import { MerchantOrders } from './screens/merchant-orders';
import { MerchantMenu } from './screens/merchant-menu';
import { MerchantProfile } from './screens/merchant-profile';
import { Store, ClipboardList, UtensilsCrossed, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type MerchantScreen = 'dashboard' | 'orders' | 'menu' | 'profile';

export function MerchantApp() {
  const [activeTab, setActiveTab] = useState<MerchantScreen>('dashboard');

  const tabs = [
    { id: 'dashboard' as MerchantScreen, label: 'Dashboard', icon: <Store className="h-5 w-5" /> },
    { id: 'orders' as MerchantScreen, label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'menu' as MerchantScreen, label: 'Menu', icon: <UtensilsCrossed className="h-5 w-5" /> },
    { id: 'profile' as MerchantScreen, label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MerchantDashboard />;
      case 'orders':
        return <MerchantOrders />;
      case 'menu':
        return <MerchantMenu />;
      case 'profile':
        return <MerchantProfile />;
      default:
        return <MerchantDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Status Bar Simulation */}
      <div className="bg-orange-600 h-6 flex items-center justify-center">
        <span className="text-white text-xs font-medium">Smart Ride Merchant</span>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50 max-w-md mx-auto safe-area-bottom">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]",
                activeTab === tab.id
                  ? "text-orange-600 bg-orange-50"
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
