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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div className="bg-[#13131A] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Transfer Money</h1>
            <p className="text-gray-400 text-sm">Balance: UGX {balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Phone input */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">Enter Phone Number</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#13131A] border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+256 7XX XXX XXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
                />
              </div>
              <Button
                onClick={handlePhoneSubmit}
                className="bg-[#00FF88] text-black px-4 hover:bg-[#00CC6E]"
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
            <h3 className="text-white font-medium mb-3">Recent Recipients</h3>
            <div className="space-y-2">
              {recentRecipients.map((recipient) => (
                <Card
                  key={recipient.id}
                  className="p-4 bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer"
                  onClick={() => handleSelectRecipient(recipient)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-[#00FF88]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{recipient.name}</p>
                      <p className="text-gray-400 text-sm">{recipient.phone}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Contacts button */}
          <Button
            variant="outline"
            className="w-full py-4 border-white/10 text-white hover:bg-white/5"
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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div className="bg-[#13131A] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
          <button
            onClick={() => setStep('select')}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Enter Amount</h1>
            <p className="text-gray-400 text-sm">To: {selectedRecipient?.name}</p>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Recipient info */}
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedRecipient?.name}</p>
                <p className="text-gray-400 text-sm">{selectedRecipient?.phone}</p>
              </div>
            </div>
          </Card>

          {/* Amount input */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">Amount (UGX)</label>
            <div className="bg-[#13131A] border border-white/10 rounded-xl p-4">
              <input
                type="text"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(formatAmount(e.target.value))}
                className="w-full bg-transparent outline-none text-white text-3xl font-bold placeholder-gray-600 text-center"
              />
            </div>
            <p className="text-gray-400 text-sm text-center mt-2">
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
            <p className="text-gray-400 text-sm mb-3">Quick amounts</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toLocaleString())}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    amount === quickAmount.toLocaleString()
                      ? "bg-[#00FF88] text-black"
                      : "bg-[#13131A] border border-white/10 text-white hover:border-[#00FF88]/50"
                  )}
                >
                  UGX {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">Note (optional)</label>
            <input
              type="text"
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#13131A] border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 outline-none focus:border-[#00FF88]/50"
            />
          </div>

          {/* Continue button */}
          <Button
            onClick={handleAmountSubmit}
            disabled={!amount}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-base transition-all",
              amount
                ? "bg-[#00FF88] text-black hover:bg-[#00CC6E]"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div className="bg-[#13131A] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
          <button
            onClick={() => setStep('amount')}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Confirm Transfer</h1>
            <p className="text-gray-400 text-sm">Review the details</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">You're sending</p>
            <p className="text-4xl font-bold text-white mt-2">UGX {amount}</p>
          </div>

          {/* Details */}
          <Card className="bg-[#13131A] border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              <div className="p-4 flex justify-between">
                <span className="text-gray-400">To</span>
                <div className="text-right">
                  <p className="text-white font-medium">{selectedRecipient?.name}</p>
                  <p className="text-gray-400 text-sm">{selectedRecipient?.phone}</p>
                </div>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-400">From</span>
                <span className="text-white">Smart Ride Wallet</span>
              </div>
              {note && (
                <div className="p-4 flex justify-between">
                  <span className="text-gray-400">Note</span>
                  <span className="text-white">{note}</span>
                </div>
              )}
              <div className="p-4 flex justify-between">
                <span className="text-gray-400">Fee</span>
                <span className="text-[#00FF88]">Free</span>
              </div>
            </div>
          </Card>

          {/* Balance after */}
          <div className="bg-[#1A1A24] rounded-xl p-4 flex justify-between">
            <span className="text-gray-400">Balance after transfer</span>
            <span className="text-white font-medium">UGX {(balance - amountNum).toLocaleString()}</span>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            className="w-full py-4 rounded-xl font-semibold text-base bg-[#00FF88] text-black hover:bg-[#00CC6E]"
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
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-[#00FF88] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Processing Transfer</h2>
          <p className="text-gray-400 mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#00FF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-10 w-10 text-[#00FF88]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Transfer Successful!</h2>
          <p className="text-gray-400 mt-2">
            UGX {amount} sent to {selectedRecipient?.name}
          </p>
          
          <Card className="mt-6 bg-[#13131A] border-white/5 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction ID</span>
                <span className="text-white font-mono">TRX{Date.now()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <div className="mt-6 space-y-3">
            <Button
              onClick={onComplete || onBack}
              className="w-full py-4 rounded-xl font-semibold bg-[#00FF88] text-black hover:bg-[#00CC6E]"
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
