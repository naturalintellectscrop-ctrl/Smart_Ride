'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Bike,
  Package,
  Car,
  Gift,
  Percent,
  Clock,
  ChevronRight,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TransactionType = 'ride' | 'delivery' | 'car' | 'payout' | 'bonus' | 'commission';

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  time: string;
  commission?: number;
  netAmount?: number;
}

interface EarningsData {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  totalEarnings: number;
  pendingPayout: number;
  availableBalance: number;
  todayCommission: number;
  todayNetEarnings: number;
  weeklyCommission: number;
  weeklyNetEarnings: number;
}

const earnings: EarningsData = {
  today: 45000,
  yesterday: 52000,
  thisWeek: 285000,
  lastWeek: 245000,
  thisMonth: 1120000,
  totalEarnings: 3450000,
  pendingPayout: 28000,
  availableBalance: 317000,
  todayCommission: 9000,
  todayNetEarnings: 36000,
  weeklyCommission: 57000,
  weeklyNetEarnings: 228000,
};

const recentTransactions: Transaction[] = [
  { id: '1', type: 'ride', description: 'Boda Ride - Nakasero', amount: 8500, time: '2:30 PM', commission: 1700, netAmount: 6800 },
  { id: '2', type: 'delivery', description: 'Item Delivery - Ntinda', amount: 15000, time: '1:45 PM', commission: 3000, netAmount: 12000 },
  { id: '3', type: 'ride', description: 'Boda Ride - Kololo', amount: 6500, time: '12:30 PM', commission: 1300, netAmount: 5200 },
  { id: '4', type: 'payout', description: 'Weekly Payout', amount: -200000, time: 'Yesterday' },
  { id: '5', type: 'bonus', description: 'Surge Bonus', amount: 5000, time: 'Yesterday' },
  { id: '6', type: 'car', description: 'Car Ride - Airport', amount: 85000, time: '2 days ago', commission: 17000, netAmount: 68000 },
];

const bonuses = [
  { id: '1', title: 'Complete 50 rides this week', bonus: 20000, progress: 35, target: 50, current: 35 },
  { id: '2', title: 'Morning Rush Bonus', bonus: 10000, progress: 100, target: 10, current: 10, completed: true },
  { id: '3', title: '5-Star Rating Streak', bonus: 5000, progress: 8, target: 10, current: 8 },
];

const weeklyData = [
  { day: 'Mon', amount: 42000, commission: 8400 },
  { day: 'Tue', amount: 38000, commission: 7600 },
  { day: 'Wed', amount: 55000, commission: 11000 },
  { day: 'Thu', amount: 48000, commission: 9600 },
  { day: 'Fri', amount: 52000, commission: 10400 },
  { day: 'Sat', amount: 65000, commission: 13000 },
  { day: 'Sun', amount: 45000, commission: 9000 },
];

const withdrawalHistory = [
  { id: '1', amount: 200000, date: 'Jan 15, 2024', status: 'completed', method: 'MTN Mobile Money' },
  { id: '2', amount: 150000, date: 'Jan 8, 2024', status: 'completed', method: 'Airtel Money' },
];

export function RiderEarnings() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const maxAmount = Math.max(...weeklyData.map(d => d.amount));

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'ride':
        return <Bike className="h-5 w-5 text-emerald-600" />;
      case 'delivery':
        return <Package className="h-5 w-5 text-teal-600" />;
      case 'car':
        return <Car className="h-5 w-5 text-blue-600" />;
      case 'payout':
        return <ArrowUpRight className="h-5 w-5 text-gray-600" />;
      case 'bonus':
        return <Gift className="h-5 w-5 text-yellow-600" />;
      case 'commission':
        return <Percent className="h-5 w-5 text-red-600" />;
    }
  };

  const getTransactionBgColor = (type: TransactionType) => {
    switch (type) {
      case 'ride':
        return 'bg-emerald-100';
      case 'delivery':
        return 'bg-teal-100';
      case 'car':
        return 'bg-blue-100';
      case 'payout':
        return 'bg-gray-100';
      case 'bonus':
        return 'bg-yellow-100';
      case 'commission':
        return 'bg-red-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-4 pb-8">
        <h1 className="text-xl font-bold text-white mb-4">Earnings</h1>

        {/* Available Balance */}
        <Card className="p-6 bg-white/10 border-white/20 backdrop-blur">
          <p className="text-emerald-100 text-sm">Available Balance</p>
          <p className="text-4xl font-bold text-white mt-1">
            UGX {earnings.availableBalance.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-emerald-100" />
            <span className="text-emerald-100 text-sm">
              +UGX {earnings.pendingPayout.toLocaleString()} pending
            </span>
          </div>
          <Button 
            className="mt-4 w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
            onClick={() => setShowWithdrawModal(true)}
          >
            <Wallet className="h-5 w-5 mr-2" />
            Withdraw Funds
          </Button>
        </Card>
      </div>

      <div className="px-4 -mt-4">
        {/* Period Tabs */}
        <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
                selectedPeriod === period
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-gray-500 text-xs">Gross Earnings</p>
            <p className="text-xl font-bold text-gray-900">
              UGX {selectedPeriod === 'today' ? earnings.today : selectedPeriod === 'week' ? earnings.thisWeek : earnings.thisMonth.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>+12% vs last period</span>
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-gray-500 text-xs">Net Earnings</p>
            <p className="text-xl font-bold text-emerald-600">
              UGX {selectedPeriod === 'today' ? earnings.todayNetEarnings : selectedPeriod === 'week' ? earnings.weeklyNetEarnings : (earnings.thisMonth * 0.8).toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">After commission</p>
          </Card>
        </div>

        {/* Commission Breakdown */}
        <Card className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Commission Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Ride Fare</span>
              </div>
              <span className="font-medium">UGX 10,000</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-red-400" />
                <span className="text-gray-600">Platform Commission (20%)</span>
              </div>
              <span className="font-medium text-red-600">-UGX 2,000</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-gray-900">Your Earnings</span>
              </div>
              <span className="font-bold text-emerald-600">UGX 8,000</span>
            </div>
          </div>
        </Card>

        {/* Weekly Chart */}
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">This Week</h3>
            <Button variant="ghost" size="sm" className="text-emerald-600 gap-1">
              <Calendar className="h-4 w-4" />
              View All
            </Button>
          </div>

          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col gap-0.5">
                  {/* Commission bar */}
                  <div
                    className="w-full bg-red-200 rounded-t-lg"
                    style={{ height: `${(day.commission / maxAmount) * 100}%` }}
                  />
                  {/* Earnings bar */}
                  <div
                    className="w-full bg-emerald-500 rounded-b-lg"
                    style={{ height: `${((day.amount - day.commission) / maxAmount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{day.day}</p>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-xs text-gray-500">Your Earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 rounded" />
              <span className="text-xs text-gray-500">Commission</span>
            </div>
          </div>
        </Card>

        {/* Bonuses & Incentives */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Bonuses & Incentives</h3>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
              <Gift className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="space-y-3">
            {bonuses.map((bonus) => (
              <Card key={bonus.id} className={cn(
                'p-4',
                bonus.completed && 'bg-emerald-50 border-emerald-200'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{bonus.title}</p>
                      {bonus.completed && (
                        <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>
                      )}
                    </div>
                    <p className="text-emerald-600 font-semibold mt-1">
                      +UGX {bonus.bonus.toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{bonus.current}/{bonus.target}</span>
                        <span>{Math.round(bonus.progress)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            bonus.completed ? 'bg-emerald-600' : 'bg-yellow-500'
                          )}
                          style={{ width: `${bonus.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Withdrawal Requests */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Withdrawals</h3>
            <Button variant="ghost" size="sm" className="text-emerald-600">
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {withdrawalHistory.map((withdrawal) => (
              <Card key={withdrawal.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{withdrawal.method}</p>
                      <p className="text-sm text-gray-500">{withdrawal.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      UGX {withdrawal.amount.toLocaleString()}
                    </p>
                    <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Transaction History</h3>
            <Button variant="ghost" size="sm" className="text-emerald-600 gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <Card key={tx.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      getTransactionBgColor(tx.type)
                    )}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.time}</p>
                      {tx.commission && (
                        <p className="text-xs text-gray-400">
                          Commission: UGX {tx.commission.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      tx.amount < 0 ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {tx.amount < 0 ? '-' : '+'}UGX {Math.abs(tx.amount).toLocaleString()}
                    </p>
                    {tx.netAmount && (
                      <p className="text-xs text-gray-400">
                        Net: UGX {tx.netAmount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <Card className="w-full max-w-md rounded-t-3xl rounded-b-none p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Withdraw Funds</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-3xl font-bold text-emerald-600">
                  UGX {earnings.availableBalance.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount to Withdraw</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Withdrawal Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 border-2 border-emerald-500 bg-emerald-50 rounded-xl text-center">
                    <p className="font-medium text-gray-900">MTN MoMo</p>
                  </button>
                  <button className="p-3 border border-gray-200 rounded-xl text-center hover:border-gray-300">
                    <p className="font-medium text-gray-900">Airtel Money</p>
                  </button>
                </div>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg font-semibold">
                Withdraw UGX {earnings.availableBalance.toLocaleString()}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
