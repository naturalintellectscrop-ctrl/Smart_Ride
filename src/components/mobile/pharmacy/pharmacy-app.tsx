'use client';

import { useState } from 'react';
import { PharmacyHome } from './screens/pharmacy-home';
import { BottomNav } from '../shared/mobile-components';
import { Store, Package, FileText, User } from 'lucide-react';

type PharmacyView = 'dashboard' | 'orders' | 'prescriptions' | 'profile';

export function PharmacyApp() {
  const [activeView, setActiveView] = useState<PharmacyView>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Store className="h-5 w-5" /> },
    { id: 'orders', label: 'Orders', icon: <Package className="h-5 w-5" /> },
    { id: 'prescriptions', label: 'Rx', icon: <FileText className="h-5 w-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PharmacyHome />
      
      <BottomNav 
        activeTab={activeView}
        onTabChange={(tab) => setActiveView(tab as PharmacyView)}
        tabs={tabs}
      />
    </div>
  );
}
