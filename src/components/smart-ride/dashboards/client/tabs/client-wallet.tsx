'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Plus,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  Banknote,
  Gift,
  Tag
} from 'lucide-react';
import { WalletTransfer } from '../../../services/wallet-transfer';

type TransactionType = 'debit' | 'credit';
type PaymentMethodType = 'mtn' | 'airtel' | 'visa' | 'mastercard' | 'cash';

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  number?: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface Promotion {
  id: string;
  code: string;
  discount: string;
  description: string;
  expiresAt: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'mtn',
    name: 'MTN Mobile Money',
    number: '**** 456',
    isDefault: true,
  },
  {
    id: '2',
    type: 'airtel',
    name: 'Airtel Money',
    number: '**** 789',
    isDefault: false,
  },
  {
    id: '3',
    type: 'visa',
    name: 'Visa Card',
    number: '**** 1234',
    isDefault: false,
  },
  {
    id: '4',
    type: 'cash',
    name: 'Cash',
    isDefault: false,
  },
];

const transactions: Transaction[] = [
  {
    id: '1',
    type: 'debit',
    description: 'Boda Ride - Kampala to Nakasero',
    amount: 8500,
    timestamp: 'Today, 2:30 PM',
    status: 'completed',
  },
  {
    id: '2',
    type: 'credit',
    description: 'Wallet Top-up - MTN MoMo',
    amount: 100000,
    timestamp: 'Today, 10:15 AM',
    status: 'completed',
  },
  {
    id: '3',
    type: 'debit',
    description: 'Food Delivery - Cafe Java',
    amount: 50000,
    timestamp: 'Yesterday',
    status: 'completed',
  },
  {
    id: '4',
    type: 'credit',
    description: 'Refund - Cancelled Order',
    amount: 25000,
    timestamp: '2 days ago',
    status: 'completed',
  },
  {
    id: '5',
    type: 'debit',
    description: 'Shopping - Shoprite',
    amount: 125000,
    timestamp: '3 days ago',
    status: 'completed',
  },
  {
    id: '6',
    type: 'credit',
    description: 'Promo Credit - SMART20',
    amount: 15000,
    timestamp: '1 week ago',
    status: 'completed',
  },
];

const promotions: Promotion[] = [
  {
    id: '1',
    code: 'SMART20',
    discount: '20% OFF',
    description: 'On your next 3 rides',
    expiresAt: 'Dec 31, 2024',
  },
  {
    id: '2',
    code: 'FREEDEL',
    discount: 'Free Delivery',
    description: 'On orders above UGX 50,000',
    expiresAt: 'Dec 25, 2024',
  },
];

const getPaymentIcon = (type: PaymentMethodType) => {
  switch (type) {
    case 'mtn':
      return <Smartphone className="h-5 w-5 text-yellow-600" />;
    case 'airtel':
      return <Smartphone className="h-5 w-5 text-red-600" />;
    case 'visa':
    case 'mastercard':
      return <CreditCard className="h-5 w-5 text-blue-600" />;
    case 'cash':
      return <Banknote className="h-5 w-5 text-green-600" />;
    default:
      return <CreditCard className="h-5 w-5 text-gray-600" />;
  }
};

export function ClientWallet() {
  const walletBalance = 245000;
  const currency = 'UGX';
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  // Show transfer screen
  if (showTransfer) {
    return (
      <WalletTransfer 
        balance={walletBalance} 
        onBack={() => setShowTransfer(false)}
        onComplete={() => setShowTransfer(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 border-b border-white/5 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-white">Wallet</h1>
      </div>

      {/* Wallet Balance Card */}
      <div className="px-4 pt-4">
        <Card className="p-6 bg-gradient-to-br from-[#00FF88] to-[#00CC6E] text-black border-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              <span className="text-sm font-medium opacity-80">Smart Ride Wallet</span>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm opacity-80">Available Balance</p>
            <h2 className="text-3xl font-bold mt-1">
              {currency} {walletBalance.toLocaleString()}
            </h2>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowTopUp(true)}
              className="flex-1 bg-black text-white hover:bg-black/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Top Up
            </Button>
            <Button 
              onClick={() => setShowTransfer(true)}
              variant="outline" 
              className="flex-1 border-black text-black hover:bg-black/10"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Transfer
            </Button>
          </div>
        </Card>
      </div>

      {/* Payment Methods */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Payment Methods</h2>
          <button className="text-[#00FF88] text-sm font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <Card key={method.id} className="p-4 bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1A1A24] rounded-xl flex items-center justify-center">
                  {getPaymentIcon(method.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{method.name}</h3>
                    {method.isDefault && (
                      <span className="text-xs bg-[#00FF88]/20 text-[#00FF88] px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {method.number && (
                    <p className="text-sm text-gray-400">{method.number}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Promotions & Credits */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#00FF88]" />
            Promotions & Credits
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {promotions.map((promo) => (
            <Card
              key={promo.id}
              className="min-w-[260px] p-4 bg-[#13131A] border-white/5 border-l-4 border-l-[#00FF88]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl font-bold text-[#00FF88]">{promo.discount}</span>
                  <p className="text-sm text-gray-400 mt-1">{promo.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{promo.code}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Expires: {promo.expiresAt}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
          <button className="text-[#00FF88] text-sm font-medium flex items-center gap-1">
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Card className="bg-[#13131A] border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-[#1A1A24] cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    transaction.type === 'credit' ? "bg-[#00FF88]/20" : "bg-[#1A1A24]"
                  )}>
                    {transaction.type === 'credit' ? (
                      <ArrowDownLeft className="h-5 w-5 text-[#00FF88]" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm truncate">
                      {transaction.description}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">{transaction.timestamp}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "font-semibold",
                      transaction.type === 'credit' ? "text-[#00FF88]" : "text-white"
                    )}>
                      {transaction.type === 'credit' ? '+' : '-'}UGX {transaction.amount.toLocaleString()}
                    </span>
                    <p className={cn(
                      "text-xs",
                      transaction.status === 'completed' ? "text-gray-500" :
                      transaction.status === 'pending' ? "text-yellow-500" : "text-red-500"
                    )}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
