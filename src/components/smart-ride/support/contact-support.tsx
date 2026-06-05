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
    <div className="min-h-screen bg-[#f8f9fa] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-[#f3f4f5] px-4 py-6 sticky top-0 z-50 border-b border-[#bec9bf]/20">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="text-[#6f7a71] hover:text-[#191c1d] hover:bg-[#edeeef]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Contact Support</h1>
            <p className="text-sm text-[#6f7a71]">We're here to help</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Support Hero */}
        <Card className="bg-gradient-to-br from-[#005f3a]/20 to-[#0e7a4d]/10 border-[#005f3a]/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-[#005f3a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8 text-[#005f3a]" />
            </div>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] mb-2 ">
              Need Help?
            </h2>
            <p className="text-[#6f7a71] text-sm">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <div className="space-y-3">
          {/* Phone Call */}
          <Card className="bg-white border-[#bec9bf]/20">
            <CardContent className="p-4">
              <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <Phone className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#191c1d]">Call Us</p>
                  <p className="text-sm text-[#6f7a71]">{contactInfo.phone}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-[#6f7a71]" />
              </a>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="bg-white border-[#bec9bf]/20">
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
                  <p className="font-semibold text-[#191c1d]">WhatsApp</p>
                  <p className="text-sm text-[#6f7a71]">Message us on WhatsApp</p>
                </div>
                <ExternalLink className="h-5 w-5 text-[#6f7a71]" />
              </a>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="bg-white border-[#bec9bf]/20">
            <CardContent className="p-4">
              <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#191c1d]">Email</p>
                  <p className="text-sm text-[#6f7a71]">{contactInfo.email}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-[#6f7a71]" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Support Hours */}
        <Card className="bg-white border-[#bec9bf]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-[#191c1d]">Support Hours</p>
                <p className="text-sm text-[#6f7a71]">{contactInfo.hours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-white border-[#bec9bf]/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/15 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-[#191c1d]">Office Location</p>
                <p className="text-sm text-[#6f7a71]">{contactInfo.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="pt-4">
          <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] mb-4 flex items-center gap-2 ">
            <HelpCircle className="h-5 w-5 text-[#005f3a]" />
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <Card key={index} className="bg-white border-[#bec9bf]/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-[#191c1d] mb-2">{item.question}</h4>
                  <p className="text-sm text-[#6f7a71]">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="pt-4">
          <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] mb-4 flex items-center gap-2 ">
            <FileText className="h-5 w-5 text-[#005f3a]" />
            Resources
          </h3>
          
          <div className="space-y-3">
            <Card className="bg-white border-[#bec9bf]/20">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-[#3f4941]">Terms of Service</span>
                  <ExternalLink className="h-4 w-4 text-[#6f7a71]" />
                </button>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#bec9bf]/20">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-[#3f4941]">Privacy Policy</span>
                  <ExternalLink className="h-4 w-4 text-[#6f7a71]" />
                </button>
              </CardContent>
            </Card>
            <Card className="bg-white border-[#bec9bf]/20">
              <CardContent className="p-4">
                <button className="w-full flex items-center justify-between">
                  <span className="text-[#3f4941]">Merchant Guidelines</span>
                  <ExternalLink className="h-4 w-4 text-[#6f7a71]" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-6 pb-8">
          <p className="text-[#6f7a71] text-sm">Smart Ride v1.0.0</p>
          <p className="text-[#bec9bf] text-xs mt-1">© 2024 Smart Ride Uganda</p>
        </div>
      </div>
    </div>
  );
}
