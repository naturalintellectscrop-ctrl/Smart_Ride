'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Bell,
  Volume2,
  Vibrate,
  Moon,
  Printer,
  Download,
  Globe,
  Shield,
  HelpCircle,
  MessageSquare,
  Phone,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Clock,
  Smartphone,
  FileText,
  Database
} from 'lucide-react';

export function PharmacySettings() {
  const [settings, setSettings] = useState({
    newOrderSound: true,
    newOrderVibrate: true,
    prescriptionAlertSound: true,
    orderUpdates: true,
    marketingMessages: false,
    darkMode: false,
    autoPrintPOT: true,
    potPrintSize: 'thermal',
    language: 'en',
    autoAcceptOTC: false,
    showOutOfStock: true,
    offlineMode: false
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Customize your pharmacy app</p>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Notification Settings */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Notifications
          </h2>
          <MobileCard className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New Order Sound</p>
                  <p className="text-sm text-gray-500">Play sound for new orders</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('newOrderSound')}
                className="flex items-center"
              >
                {settings.newOrderSound ? (
                  <ToggleRight className="h-8 w-8 text-rose-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Vibrate className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Vibration</p>
                  <p className="text-sm text-gray-500">Vibrate for important alerts</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('newOrderVibrate')}
                className="flex items-center"
              >
                {settings.newOrderVibrate ? (
                  <ToggleRight className="h-8 w-8 text-purple-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Prescription Alerts</p>
                  <p className="text-sm text-gray-500">Sound for Rx verification needed</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('prescriptionAlertSound')}
                className="flex items-center"
              >
                {settings.prescriptionAlertSound ? (
                  <ToggleRight className="h-8 w-8 text-amber-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Updates</p>
                  <p className="text-sm text-gray-500">Delivery status notifications</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('orderUpdates')}
                className="flex items-center"
              >
                {settings.orderUpdates ? (
                  <ToggleRight className="h-8 w-8 text-teal-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>
          </MobileCard>
        </div>

        {/* Print Settings */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Print Settings
          </h2>
          <MobileCard className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Printer className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Auto-Print POT</p>
                  <p className="text-sm text-gray-500">Print tickets automatically</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('autoPrintPOT')}
                className="flex items-center"
              >
                {settings.autoPrintPOT ? (
                  <ToggleRight className="h-8 w-8 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">POT Print Size</p>
                  <p className="text-sm text-gray-500">Ticket paper size</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  settings.potPrintSize === 'thermal' 
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-300' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Thermal (80mm)
                </button>
                <button className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  settings.potPrintSize === 'a4' 
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-300' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  A4 Paper
                </button>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Order Settings */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Order Settings
          </h2>
          <MobileCard className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Auto-Accept OTC</p>
                  <p className="text-sm text-gray-500">Accept OTC orders automatically</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('autoAcceptOTC')}
                className="flex items-center"
              >
                {settings.autoAcceptOTC ? (
                  <ToggleRight className="h-8 w-8 text-green-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Show Out of Stock</p>
                  <p className="text-sm text-gray-500">Display unavailable items</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('showOutOfStock')}
                className="flex items-center"
              >
                {settings.showOutOfStock ? (
                  <ToggleRight className="h-8 w-8 text-orange-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>
          </MobileCard>
        </div>

        {/* App Settings */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            App Settings
          </h2>
          <MobileCard className="divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Moon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dark Mode</p>
                  <p className="text-sm text-gray-500">Reduce eye strain at night</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('darkMode')}
                className="flex items-center"
              >
                {settings.darkMode ? (
                  <ToggleRight className="h-8 w-8 text-indigo-600" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Language</p>
                  <p className="text-sm text-gray-500">App display language</p>
                </div>
              </div>
              <select className="w-full p-3 bg-gray-100 rounded-lg text-gray-700 outline-none">
                <option value="en">English</option>
                <option value="lg">Luganda</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
          </MobileCard>
        </div>

        {/* Support */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Support
          </h2>
          <MobileCard className="divide-y divide-gray-100">
            <button className="w-full flex items-center gap-3 p-4 text-left">
              <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Help Center</p>
                <p className="text-sm text-gray-500">FAQs and tutorials</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center gap-3 p-4 text-left">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Chat Support</p>
                <p className="text-sm text-gray-500">Talk to our support team</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center gap-3 p-4 text-left">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Call Support</p>
                <p className="text-sm text-gray-500">0800-SMARTRIDE (Toll free)</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </MobileCard>
        </div>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Smart Health Pharmacy App</p>
          <p className="text-xs text-gray-400">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
