'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Filter,
  CreditCard,
  Building2,
  Phone
} from 'lucide-react';

type TimeFilter = 'today' | 'week' | 'month' | 'year';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export function MerchantFinance() {
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>('month');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const platformCommission = 15; // 15%

  const financialData = {
    totalSales: 12500000,
    commission: 1875000,
    netEarnings: 10625000,
    pendingPayout: 2100000,
    availableBalance: 8525000,
    lastPayout: 5000000,
    lastPayoutDate: '2024-01-15',
    nextPayoutDate: '2024-01-30',
  };

  const transactions: Transaction[] = [
    {
      id: 'TXN-001',
      type: 'credit',
      amount: 88000,
      description: 'Order ORD-2024-09823',
      date: 'Today, 2:30 PM',
      status: 'completed',
      reference: 'ORD-2024-09823',
    },
    {
      id: 'TXN-002',
      type: 'credit',
      amount: 63000,
      description: 'Order ORD-2024-09824',
      date: 'Today, 1:15 PM',
      status: 'completed',
      reference: 'ORD-2024-09824',
    },
    {
      id: 'TXN-003',
      type: 'debit',
      amount: 11250,
      description: 'Platform commission',
      date: 'Today, 12:00 PM',
      status: 'completed',
    },
    {
      id: 'TXN-004',
      type: 'credit',
      amount: 45000,
      description: 'Order ORD-2024-09820',
      date: 'Yesterday',
      status: 'completed',
      reference: 'ORD-2024-09820',
    },
    {
      id: 'TXN-005',
      type: 'debit',
      amount: 5000000,
      description: 'Payout to Bank Account',
      date: 'Jan 15, 2024',
      status: 'completed',
    },
    {
      id: 'TXN-006',
      type: 'credit',
      amount: 76000,
      description: 'Order ORD-2024-09815',
      date: 'Jan 14, 2024',
      status: 'completed',
      reference: 'ORD-2024-09815',
    },
  ];

  const timeFilters: { id: TimeFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  const withdrawalMethods = [
    { id: 'mobile_money', label: 'Mobile Money', icon: Phone, accounts: ['MTN +256 700 111 222'] },
    { id: 'bank', label: 'Bank Transfer', icon: Building2, accounts: ['Stanbic ****4521'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 pt-4 pb-6">
        <h1 className="text-xl font-bold text-white mb-2">Finance</h1>
        <p className="text-orange-100 text-sm">Track your earnings and payouts</p>
      </div>

      <div className="px-4 -mt-2">
        {/* Available Balance Card */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                UGX {(financialData.availableBalance / 1000000).toFixed(2)}M
              </p>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-orange-700 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Next payout: Jan 30</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Auto-payout enabled</span>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Sales</span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              UGX {(financialData.totalSales / 1000000).toFixed(1)}M
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs">Commission</span>
            </div>
            <p className="text-lg font-bold text-red-600">
              -{platformCommission}%
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Net Earnings</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              UGX {(financialData.netEarnings / 1000000).toFixed(1)}M
            </p>
          </Card>
        </div>

        {/* Payout Schedule */}
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Payout Schedule</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Auto</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Last Payout</p>
                  <p className="text-sm text-gray-500">Jan 15, 2024</p>
                </div>
              </div>
              <p className="font-bold text-gray-900">UGX {(financialData.lastPayout / 1000000).toFixed(1)}M</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pending Payout</p>
                  <p className="text-sm text-gray-500">Scheduled: Jan 30</p>
                </div>
              </div>
              <p className="font-bold text-orange-600">UGX {(financialData.pendingPayout / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>

        {/* Commission Breakdown */}
        <Card className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Commission Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Platform fee</span>
              <span className="text-gray-900">{platformCommission}% per order</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">This month&apos;s commission</span>
              <span className="text-red-600 font-medium">UGX {financialData.commission.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-medium text-gray-900">Your earnings</span>
              <span className="font-bold text-green-600">
                {((100 - platformCommission) / 100 * 100).toFixed(0)}% of sales
              </span>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Transaction History</h3>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
              <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Download className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Time Filter */}
          <div className="flex gap-2 mb-3">
            {timeFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveTimeFilter(filter.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  activeTimeFilter === filter.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Transactions List */}
          <Card className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    txn.type === 'credit' ? "bg-green-100" : "bg-red-100"
                  )}>
                    {txn.type === 'credit' ? (
                      <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{txn.description}</p>
                    <p className="text-sm text-gray-500">{txn.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold",
                    txn.type === 'credit' ? "text-green-600" : "text-red-600"
                  )}>
                    {txn.type === 'credit' ? '+' : '-'}UGX {txn.amount.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {txn.status === 'completed' && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {txn.status === 'pending' && (
                      <Clock className="h-3 w-3 text-yellow-500" />
                    )}
                    {txn.status === 'failed' && (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-gray-400 capitalize">{txn.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <button className="w-full mt-3 py-3 text-orange-600 font-medium flex items-center justify-center gap-1">
            View All Transactions
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Withdrawal Options */}
        <Card className="mt-4 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Withdrawal Methods</h3>
          <div className="space-y-3">
            {withdrawalMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-500">{method.accounts[0]}</p>
                    </div>
                  </div>
                  <button className="text-orange-600 text-sm font-medium">Edit</button>
                </div>
              );
            })}
            <button className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-orange-300 hover:text-orange-600 transition-colors">
              <Plus className="h-4 w-4" />
              Add Withdrawal Method
            </button>
          </div>
        </Card>
      </div>

      {/* Withdraw Modal Placeholder */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <Card className="w-full max-w-md rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Withdraw Funds</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">UGX</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-16 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Available: UGX {financialData.availableBalance.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-2 block">Withdraw to</label>
                <div className="space-y-2">
                  {withdrawalMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button key={method.id} className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div className="text-left flex-1">
                          <p className="font-medium text-gray-900">{method.label}</p>
                          <p className="text-sm text-gray-500">{method.accounts[0]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button className="w-full py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors">
                Withdraw Funds
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Import Plus at the top
import { Plus } from 'lucide-react';
