'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MobileHeader, BottomNav, MobileCard, ServiceButton } from '../shared/mobile-components';
import { ClientHome } from './screens/client-home';
import { BodaRideScreen } from './screens/boda-ride';
import { CarRideScreen } from './screens/car-ride';
import { FoodDeliveryScreen } from './screens/food-delivery';
import { ShoppingScreen } from './screens/shopping';
import { ItemDeliveryScreen } from './screens/item-delivery';
import { SmartHealthScreen } from './screens/smart-health';
import { OrdersHistory } from './screens/orders-history';
import { ClientProfile } from './screens/client-profile';
import { 
  Home, 
  ClipboardList, 
  User,
  Bike,
  Car,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  Heart
} from 'lucide-react';

type ClientScreen = 'home' | 'boda' | 'car' | 'food' | 'health' | 'shopping' | 'item' | 'orders' | 'profile';

export function ClientApp() {
  const [activeScreen, setActiveScreen] = useState<ClientScreen>('home');
  const [activeTab, setActiveTab] = useState('home');

  const handleServiceSelect = (service: string) => {
    setActiveScreen(service as ClientScreen);
  };

  const handleBack = () => {
    setActiveScreen('home');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveScreen(tab as ClientScreen);
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <ClientHome onServiceSelect={handleServiceSelect} />;
      case 'boda':
        return <BodaRideScreen onBack={handleBack} />;
      case 'car':
        return <CarRideScreen onBack={handleBack} />;
      case 'food':
        return <FoodDeliveryScreen onBack={handleBack} />;
      case 'health':
        return <SmartHealthScreen onBack={handleBack} />;
      case 'shopping':
        return <ShoppingScreen onBack={handleBack} />;
      case 'item':
        return <ItemDeliveryScreen onBack={handleBack} />;
      case 'orders':
        return <OrdersHistory />;
      case 'profile':
        return <ClientProfile />;
      default:
        return <ClientHome onServiceSelect={handleServiceSelect} />;
    }
  };

  const showBottomNav = ['home', 'orders', 'profile'].includes(activeScreen);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Status Bar Simulation */}
      <div className="bg-emerald-600 h-6 flex items-center justify-center">
        <span className="text-white text-xs font-medium">Smart Ride</span>
      </div>
      
      {/* Main Content */}
      <main className={cn("pb-20", !showBottomNav && "pb-0")}>
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          tabs={tabs}
        />
      )}
    </div>
  );
}
