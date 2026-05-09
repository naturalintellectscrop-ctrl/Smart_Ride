'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  Bell,
  Clock,
  CreditCard,
  MapPin,
  Truck,
  FileText,
  Shield,
  HelpCircle,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Globe,
  Moon,
  Smartphone,
} from 'lucide-react';

interface ProviderSettingsScreenProps {
  providerId: string | null;
  onNavigate: (screen: any) => void;
}

export function ProviderSettingsScreen({ providerId, onNavigate }: ProviderSettingsScreenProps) {
  const [settings, setSettings] = useState({
    notifications: true,
    orderAlerts: true,
    prescriptionAlerts: true,
    autoAcceptOrders: false,
    deliveryMode: true,
    darkMode: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Receive order and update notifications',
          key: 'notifications' as const,
          type: 'toggle',
        },
        {
          icon: Smartphone,
          label: 'Order Alerts',
          description: 'Sound alerts for new orders',
          key: 'orderAlerts' as const,
          type: 'toggle',
        },
        {
          icon: FileText,
          label: 'Prescription Alerts',
          description: 'Notifications for pending prescriptions',
          key: 'prescriptionAlerts' as const,
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          icon: Clock,
          label: 'Operating Hours',
          description: 'Set your business hours',
          type: 'link',
        },
        {
          icon: Truck,
          label: 'Delivery Settings',
          description: 'Delivery radius, fees, and zones',
          type: 'link',
        },
        {
          icon: MapPin,
          label: 'Service Areas',
          description: 'Manage delivery coverage areas',
          type: 'link',
        },
        {
          icon: CreditCard,
          label: 'Payment Settings',
          description: 'Payout account and methods',
          type: 'link',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Globe,
          label: 'Language',
          description: 'English',
          type: 'link',
        },
        {
          icon: Moon,
          label: 'Dark Mode',
          description: 'Switch to dark theme',
          key: 'darkMode' as const,
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          description: 'FAQs and guides',
          type: 'link',
        },
        {
          icon: Shield,
          label: 'Privacy & Security',
          description: 'Manage your data and security',
          type: 'link',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Settings" />

      <div className="px-4 pt-4">
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{group.title}</h3>
            <MobileCard className="overflow-hidden">
              <div className="divide-y divide-gray-100">
                {group.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    
                    {item.type === 'toggle' && item.key && (
                      <button
                        onClick={() => toggleSetting(item.key)}
                        className="flex-shrink-0"
                      >
                        {settings[item.key] ? (
                          <ToggleRight className="h-8 w-8 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-300" />
                        )}
                      </button>
                    )}
                    
                    {item.type === 'link' && (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </MobileCard>
          </div>
        ))}

        {/* App Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">SmartRide Health Provider</p>
          <p className="text-xs text-gray-400 mt-1">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
