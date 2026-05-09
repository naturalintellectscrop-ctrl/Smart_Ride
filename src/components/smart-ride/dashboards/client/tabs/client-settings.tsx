'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bell,
  Moon,
  Globe,
  Shield,
  Smartphone,
  MapPin,
  CreditCard,
  FileText,
  ChevronRight,
  Phone,
  Mail,
  ExternalLink,
  Lock,
  Eye,
  Trash2
} from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsProps) {
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    orderUpdates: true,
    promotions: true,
    safety: true,
  });

  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    showProfile: false,
    analytics: true,
  });

  const [appearance, setAppearance] = useState({
    darkMode: true,
    compactView: false,
  });

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Notifications */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Push Notifications</p>
                  <p className="text-gray-500 text-sm">Receive alerts on your device</p>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Email Notifications</p>
                  <p className="text-gray-500 text-sm">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Order Updates</p>
                  <p className="text-gray-500 text-sm">Get notified about order status</p>
                </div>
              </div>
              <Switch
                checked={notifications.orderUpdates}
                onCheckedChange={(checked) => setNotifications({ ...notifications, orderUpdates: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Safety Alerts</p>
                  <p className="text-gray-500 text-sm">Important safety notifications</p>
                </div>
              </div>
              <Switch
                checked={notifications.safety}
                onCheckedChange={(checked) => setNotifications({ ...notifications, safety: checked })}
              />
            </div>
          </Card>
        </div>

        {/* Privacy */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Share Location</p>
                  <p className="text-gray-500 text-sm">Allow location sharing during rides</p>
                </div>
              </div>
              <Switch
                checked={privacy.shareLocation}
                onCheckedChange={(checked) => setPrivacy({ ...privacy, shareLocation: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Profile Visibility</p>
                  <p className="text-gray-500 text-sm">Show profile to other users</p>
                </div>
              </div>
              <Switch
                checked={privacy.showProfile}
                onCheckedChange={(checked) => setPrivacy({ ...privacy, showProfile: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Analytics</p>
                  <p className="text-gray-500 text-sm">Help improve Smart Ride</p>
                </div>
              </div>
              <Switch
                checked={privacy.analytics}
                onCheckedChange={(checked) => setPrivacy({ ...privacy, analytics: checked })}
              />
            </div>
          </Card>
        </div>

        {/* Appearance */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Appearance
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-white">Dark Mode</p>
                  <p className="text-gray-500 text-sm">Use dark theme</p>
                </div>
              </div>
              <Switch
                checked={appearance.darkMode}
                onCheckedChange={(checked) => setAppearance({ ...appearance, darkMode: checked })}
              />
            </div>
          </Card>
        </div>

        {/* Language & Region */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language & Region
          </h2>
          <Card className="bg-[#13131A] border-white/5">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <p className="text-white">Language</p>
                  <p className="text-gray-500 text-sm">English</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </Card>
        </div>

        {/* Payment Methods */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-500" />
                <span className="text-white">Manage Payment Methods</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-white">Billing History</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </Card>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Legal
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Terms of Service</span>
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Privacy Policy</span>
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Cookie Policy</span>
              <ExternalLink className="h-4 w-4 text-gray-500" />
            </button>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <Card className="bg-[#13131A] border-red-500/20">
            <button className="w-full p-4 flex items-center justify-between hover:bg-red-500/5 transition-colors rounded-xl">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span className="text-red-500">Delete Account</span>
              </div>
              <ChevronRight className="h-5 w-5 text-red-500" />
            </button>
          </Card>
        </div>

        {/* Version Info */}
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Smart Ride v1.0.0</p>
          <p className="text-gray-600 text-xs mt-1">© 2024 Smart Ride Uganda</p>
        </div>
      </div>
    </div>
  );
}

// Help & Support Screen
interface HelpSupportProps {
  onBack: () => void;
}

export function HelpSupportScreen({ onBack }: HelpSupportProps) {
  const faqs = [
    {
      question: 'How do I book a ride?',
      answer: 'Select Smart Boda or Smart Car from the home screen, enter your pickup and destination, then confirm your booking.',
    },
    {
      question: 'How do I track my order?',
      answer: 'Go to Orders tab to see all your active and past orders. Tap on an order to see real-time tracking.',
    },
    {
      question: 'How do I add a payment method?',
      answer: 'Go to Wallet > Payment Methods > Add New to add MTN MoMo, Airtel Money, or card payment.',
    },
    {
      question: 'How do I contact support?',
      answer: 'Call our support line at +256 700 123 456 or email support@smartride.ug',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">Help & Support</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Support */}
        <Card className="p-6 bg-gradient-to-br from-[#00FF88] to-[#00CC6E] text-black border-0">
          <h2 className="text-xl font-bold mb-2">Need help?</h2>
          <p className="text-black/80 mb-4">Our support team is available 24/7 to assist you.</p>
          <div className="flex gap-3">
            <Button className="flex-1 bg-black text-white hover:bg-black/80">
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </Button>
            <Button variant="outline" className="flex-1 border-black text-black hover:bg-black/10">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>
          <p className="text-sm text-black/60 mt-3">Support: +256 700 123 456</p>
        </Card>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-[#13131A] border-white/5 p-4">
                <h3 className="text-white font-medium mb-2">{faq.question}</h3>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Report a Problem</span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Submit Feedback</span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <span className="text-white">Safety Center</span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
