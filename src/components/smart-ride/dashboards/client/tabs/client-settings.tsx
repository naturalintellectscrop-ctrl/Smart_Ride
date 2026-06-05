'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
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
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

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

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="bg-card px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-border shadow-sm">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-accent/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Notifications */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Push Notifications</p>
                  <p className="text-muted-foreground text-sm">Receive alerts on your device</p>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Email Notifications</p>
                  <p className="text-muted-foreground text-sm">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Order Updates</p>
                  <p className="text-muted-foreground text-sm">Get notified about order status</p>
                </div>
              </div>
              <Switch
                checked={notifications.orderUpdates}
                onCheckedChange={(checked) => setNotifications({ ...notifications, orderUpdates: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Safety Alerts</p>
                  <p className="text-muted-foreground text-sm">Important safety notifications</p>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Share Location</p>
                  <p className="text-muted-foreground text-sm">Allow location sharing during rides</p>
                </div>
              </div>
              <Switch
                checked={privacy.shareLocation}
                onCheckedChange={(checked) => setPrivacy({ ...privacy, shareLocation: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Profile Visibility</p>
                  <p className="text-muted-foreground text-sm">Show profile to other users</p>
                </div>
              </div>
              <Switch
                checked={privacy.showProfile}
                onCheckedChange={(checked) => setPrivacy({ ...privacy, showProfile: checked })}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground">Analytics</p>
                  <p className="text-muted-foreground text-sm">Help improve Smart Ride</p>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Appearance
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                <div>
                  <p className="text-foreground">Dark Mode</p>
                  <p className="text-muted-foreground text-sm">Switch between light and dark theme</p>
                </div>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </Card>
        </div>

        {/* Language & Region */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language & Region
          </h2>
          <Card className="bg-card border border-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-foreground">Language</p>
                  <p className="text-muted-foreground text-sm">English</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Payment Methods */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Manage Payment Methods</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Billing History</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Legal
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Terms of Service</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Privacy Policy</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Cookie Policy</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-sm font-semibold text-[#ba1a1a] uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <Card className="bg-card border border-destructive/20">
            <button className="w-full p-4 flex items-center justify-between hover:bg-destructive/5 transition-colors rounded-xl">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-destructive" />
                <span className="text-destructive">Delete Account</span>
              </div>
              <ChevronRight className="h-5 w-5 text-destructive" />
            </button>
          </Card>
        </div>

        {/* Version Info */}
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm">Smart Ride v1.0.0</p>
          <p className="text-muted-foreground/50 text-xs mt-1">© 2024 Smart Ride Uganda</p>
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
    <div className="min-h-screen bg-background pb-4">
      {/* Header */}
      <div className="bg-card px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-border shadow-sm">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-accent/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Support */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-[#005f3a]">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-2">Need help?</h2>
            <p className="text-white/80 mb-4">Our support team is available 24/7 to assist you.</p>
            <div className="flex gap-3">
              <Button className="flex-1 bg-white text-[#005f3a] hover:bg-white/90">
                <Phone className="h-4 w-4 mr-2" />
                Call Us
              </Button>
              <Button variant="outline" className="flex-1 border-white/40 text-white hover:bg-white/10">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
            <p className="text-sm text-white/60 mt-3">Support: +256 700 123 456</p>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-card border border-border p-4 shadow-sm rounded-2xl">
                <h3 className="text-foreground font-medium mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <Card className="bg-card border border-border divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Report a Problem</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Submit Feedback</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors">
              <span className="text-foreground">Safety Center</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
