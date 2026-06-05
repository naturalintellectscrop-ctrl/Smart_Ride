'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowUpRight,
  User,
  Phone,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  Contact
} from 'lucide-react';

interface WalletTransferProps {
  balance: number;
  onBack: () => void;
  onComplete?: () => void;
}

interface Recipient {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  recent: boolean;
}

const recentRecipients: Recipient[] = [
  { id: '1', name: 'Sarah Nakamya', phone: '+256 700 123 456', recent: true },
  { id: '2', name: 'James Okello', phone: '+256 701 234 567', recent: true },
  { id: '3', name: 'Grace Auma', phone: '+256 702 345 678', recent: true },
];

export function WalletTransfer({ balance, onBack, onComplete }: WalletTransferProps) {
  const [step, setStep] = useState<'select' | 'amount' | 'confirm' | 'processing' | 'success'>('select');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setStep('amount');
  };

  const handlePhoneSubmit = () => {
    if (phoneInput.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    const newRecipient: Recipient = {
      id: `new_${Date.now()}`,
      name: 'New Contact',
      phone: phoneInput,
      recent: false,
    };
    setSelectedRecipient(newRecipient);
    setStep('amount');
    setError(null);
  };

  const handleAmountSubmit = () => {
    const amountNum = parseInt(amount.replace(/,/g, ''));
    if (!amountNum || amountNum < 500) {
      setError('Minimum transfer amount is UGX 500');
      return;
    }
    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('processing');
    
    // Simulate transfer processing
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];

  // Select recipient step
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-[#bec9bf]/20">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#e7e8e9] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] ">Transfer Money</h1>
            <p className="text-[#6f7a71] text-sm">Balance: UGX {balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Phone input */}
          <div>
            <label className="text-[#191c1d] text-sm font-medium mb-2 block">Enter Phone Number</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-white border border-[#bec9bf]/30 rounded-xl p-4 flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#6f7a71]" />
                <input
                  type="tel"
                  placeholder="+256 7XX XXX XXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[#191c1d] placeholder-[#6f7a71]"
                />
              </div>
              <Button
                onClick={handlePhoneSubmit}
                className="bg-[#005f3a] text-white px-4 hover:bg-[#0e7a4d]"
              >
                <ArrowUpRight className="h-5 w-5" />
              </Button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {/* Recent recipients */}
          <div>
            <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[#191c1d] font-medium mb-3 ">Recent Recipients</h3>
            <div className="space-y-2">
              {recentRecipients.map((recipient) => (
                <Card
                  key={recipient.id}
                  className="p-4 bg-white border-[#bec9bf]/20 hover:border-[#005f3a]/30 transition-all cursor-pointer"
                  onClick={() => handleSelectRecipient(recipient)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#005f3a]/20 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-[#005f3a]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#191c1d] font-medium">{recipient.name}</p>
                      <p className="text-[#6f7a71] text-sm">{recipient.phone}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#6f7a71]" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Contacts button */}
          <Button
            variant="outline"
            className="w-full py-4 border-[#bec9bf]/30 text-[#191c1d] hover:bg-[#edeeef]"
          >
            <Contact className="h-5 w-5 mr-2" />
            Choose from Contacts
          </Button>
        </div>
      </div>
    );
  }

  // Amount step
  if (step === 'amount') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-[#bec9bf]/20">
          <button
            onClick={() => setStep('select')}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#e7e8e9] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] ">Enter Amount</h1>
            <p className="text-[#6f7a71] text-sm">To: {selectedRecipient?.name}</p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Recipient info */}
          <Card className="p-4 bg-white border-[#bec9bf]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#005f3a]/20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-[#005f3a]" />
              </div>
              <div>
                <p className="text-[#191c1d] font-medium">{selectedRecipient?.name}</p>
                <p className="text-[#6f7a71] text-sm">{selectedRecipient?.phone}</p>
              </div>
            </div>
          </Card>

          {/* Amount input */}
          <div>
            <label className="text-[#191c1d] text-sm font-medium mb-2 block">Amount (UGX)</label>
            <div className="bg-white border border-[#bec9bf]/30 rounded-xl p-4">
              <input
                type="text"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(formatAmount(e.target.value))}
                className="w-full bg-transparent outline-none text-[#191c1d] text-3xl font-bold placeholder-[#bec9bf] text-center"
              />
            </div>
            <p className="text-[#6f7a71] text-sm text-center mt-2">
              Available: UGX {balance.toLocaleString()}
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-2 flex items-center gap-1 justify-center">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-[#6f7a71] text-sm mb-3">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toLocaleString())}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    amount === quickAmount.toLocaleString()
                      ? "bg-[#005f3a] text-white"
                      : "bg-white border border-[#bec9bf]/30 text-[#191c1d] hover:border-[#005f3a]/50"
                  )}
                >
                  UGX {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[#191c1d] text-sm font-medium mb-2 block">Note (optional)</label>
            <input
              type="text"
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-[#bec9bf]/30 rounded-xl p-4 text-[#191c1d] placeholder-[#6f7a71] outline-none focus:border-[#005f3a]/50"
            />
          </div>

          {/* Continue button */}
          <Button
            onClick={handleAmountSubmit}
            disabled={!amount}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-base transition-all",
              amount
                ? "bg-[#005f3a] text-white hover:bg-[#0e7a4d]"
                : "bg-[#bec9bf] text-[#6f7a71] cursor-not-allowed"
            )}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Confirm step
  if (step === 'confirm') {
    const amountNum = parseInt(amount.replace(/,/g, ''));
    
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-[#bec9bf]/20">
          <button
            onClick={() => setStep('amount')}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-[#e7e8e9] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#191c1d] ">Confirm Transfer</h1>
            <p className="text-[#6f7a71] text-sm">Review the details</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="text-center py-8">
            <p className="text-[#6f7a71] text-sm">You're sending</p>
            <p className="text-4xl font-bold text-[#191c1d] mt-2">UGX {amount}</p>
          </div>

          {/* Details */}
          <Card className="bg-white border-[#bec9bf]/20 overflow-hidden">
            <div className="divide-y divide-[#bec9bf]/20">
              <div className="p-4 flex justify-between">
                <span className="text-[#6f7a71]">To</span>
                <div className="text-right">
                  <p className="text-[#191c1d] font-medium">{selectedRecipient?.name}</p>
                  <p className="text-[#6f7a71] text-sm">{selectedRecipient?.phone}</p>
                </div>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-[#6f7a71]">From</span>
                <span className="text-[#191c1d]">Smart Ride Wallet</span>
              </div>
              {note && (
                <div className="p-4 flex justify-between">
                  <span className="text-[#6f7a71]">Note</span>
                  <span className="text-[#191c1d]">{note}</span>
                </div>
              )}
              <div className="p-4 flex justify-between">
                <span className="text-[#6f7a71]">Fee</span>
                <span className="text-[#005f3a]">Free</span>
              </div>
            </div>
          </Card>

          {/* Balance after */}
          <div className="bg-[#f3f4f5] rounded-xl p-4 flex justify-between">
            <span className="text-[#6f7a71]">Balance after transfer</span>
            <span className="text-[#191c1d] font-medium">UGX {(balance - amountNum).toLocaleString()}</span>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            className="w-full py-4 rounded-xl font-semibold text-base bg-[#005f3a] text-white hover:bg-[#0e7a4d]"
          >
            Confirm & Send
          </Button>
        </div>
      </div>
    );
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-[#005f3a] animate-spin mx-auto mb-4" />
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Processing Transfer</h2>
          <p className="text-[#6f7a71] mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#005f3a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-10 w-10 text-[#005f3a]" />
          </div>
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-[#191c1d] ">Transfer Successful!</h2>
          <p className="text-[#6f7a71] mt-2">
            UGX {amount} sent to {selectedRecipient?.name}
          </p>
          
          <Card className="mt-6 bg-white border-[#bec9bf]/20 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6f7a71]">Transaction ID</span>
                <span className="text-[#191c1d] font-mono">TRX{Date.now()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6f7a71]">Date</span>
                <span className="text-[#191c1d]">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <div className="mt-6 space-y-3">
            <Button
              onClick={onComplete || onBack}
              className="w-full py-4 rounded-xl font-semibold bg-[#005f3a] text-white hover:bg-[#0e7a4d]"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
