'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  Headphones,
  HelpCircle,
  FileText,
  ExternalLink
} from 'lucide-react';

interface ContactSupportProps {
  onBack: () => void;
}

export function ContactSupport({ onBack }: ContactSupportProps) {
  const contactInfo = {
    phone: '+256 700 123 456',
    email: 'support@smartride.ug',
    whatsapp: '+256 700 123 456',
    hours: '24/7 - We\'re always here to help',
    address: 'Kampala, Uganda',
  };

  const faqItems = [
    {
      question: 'How long does verification take?',
      answer: 'Verification typically takes 1-3 business days. You\'ll receive a notification once approved.',
    },
    {
      question: 'How do I update my business information?',
      answer: 'Go to your Profile tab and tap the edit button to update your business details.',
    },
    {
      question: 'When do I receive my earnings?',
      answer: 'Earnings are paid out weekly every Monday. Minimum payout is UGX 50,000.',
    },
    {
      question: 'How do I add products to my store?',
      answer: 'After approval, go to Menu/Inventory tab and tap the + button to add items.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 py-6 sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">Contact Support</h1>
            <p className="text-sm text-gray-400">We're here to help</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Support Hero */}
        <Card className="bg-gradient-to-br from-[#00FF88]/20 to-[#00CC6E]/10 border-[#00FF88]/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-[#00FF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8 text-[#00FF88]" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Need Help?
            </h2>
            <p className="text-gray-400 text-sm">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <div className="space-y-3">
          {/* Phone Call */}
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <Phone className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Call Us</p>
                  <p className="text-sm text-gray-400">{contactInfo.phone}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </a>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <a 
                href={`https://wa.me/${contactInfo.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">WhatsApp</p>
                  <p className="text-sm text-gray-400">Message us on WhatsApp</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </a>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Email</p>
                  <p className="text-sm text-gray-400">{contactInfo.email}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Support Hours */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Support Hours</p>
                <p className="text-sm text-gray-400">{contactInfo.hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/15 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Office Location</p>
                <p className="text-sm text-gray-400">{contactInfo.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="pt-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#00FF88]" />
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <Card key={index} className="bg-[#13131A] border-white/5">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-white mb-2">{item.question}</h4>
                  <p className="text-sm text-gray-400">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="pt-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#00FF88]" />
            Resources
          </h3>
          
          <div className="space-y-3">
            <Card className="bg-[#13131A] border-white/5">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-gray-300">Terms of Service</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>
            <Card className="bg-[#13131A] border-white/5">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-gray-300">Privacy Policy</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>
            <Card className="bg-[#13131A] border-white/5">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-gray-300">Merchant Guidelines</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-6 pb-8">
          <p className="text-gray-500 text-sm">Smart Ride v1.0.0</p>
          <p className="text-gray-600 text-xs mt-1">© 2024 Smart Ride Uganda</p>
        </div>
      </div>
    </div>
  );
}
