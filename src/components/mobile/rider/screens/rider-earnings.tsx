'use client';

import { MobileCard } from '../../shared/mobile-components';
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  Download,
  Wallet,
  ArrowUpRight,
  Bike,
  Package
} from 'lucide-react';

export function RiderEarnings() {
  const earnings = {
    today: 45000,
    yesterday: 52000,
    thisWeek: 285000,
    lastWeek: 245000,
    thisMonth: 1120000,
    totalEarnings: 3450000,
    pendingPayout: 28000,
    availableBalance: 317000,
  };

  const recentTransactions = [
    { id: '1', type: 'ride', description: 'Boda Ride - Nakasero', amount: 8500, time: '2:30 PM' },
    { id: '2', type: 'delivery', description: 'Item Delivery - Ntinda', amount: 15000, time: '1:45 PM' },
    { id: '3', type: 'ride', description: 'Boda Ride - Kololo', amount: 6500, time: '12:30 PM' },
    { id: '4', type: 'payout', description: 'Weekly Payout', amount: -200000, time: 'Yesterday' },
    { id: '5', type: 'ride', description: 'Boda Ride - CBD', amount: 12000, time: 'Yesterday' },
  ];

  const weeklyData = [
    { day: 'Mon', amount: 42000 },
    { day: 'Tue', amount: 38000 },
    { day: 'Wed', amount: 55000 },
    { day: 'Thu', amount: 48000 },
    { day: 'Fri', amount: 52000 },
    { day: 'Sat', amount: 65000 },
    { day: 'Sun', amount: 45000 },
  ];

  const maxAmount = Math.max(...weeklyData.map(d => d.amount));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-4 pb-8">
        <h1 className="text-xl font-bold text-white mb-4">Earnings</h1>
        
        {/* Available Balance */}
        <MobileCard className="p-6 bg-white/10 border-white/20 backdrop-blur">
          <p className="text-emerald-100 text-sm">Available Balance</p>
          <p className="text-4xl font-bold text-white mt-1">UGX {earnings.availableBalance.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-emerald-100 text-sm">+UGX {earnings.pendingPayout.toLocaleString()} pending</span>
          </div>
          <button className="mt-4 w-full bg-white text-emerald-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" />
            Withdraw Funds
          </button>
        </MobileCard>
      </div>

      <div className="px-4 -mt-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="p-4">
            <p className="text-gray-500 text-xs">Today</p>
            <p className="text-xl font-bold text-gray-900">UGX {earnings.today.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12% vs yesterday
            </p>
          </MobileCard>
          <MobileCard className="p-4">
            <p className="text-gray-500 text-xs">This Week</p>
            <p className="text-xl font-bold text-gray-900">UGX {earnings.thisWeek.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +16% vs last week
            </p>
          </MobileCard>
        </div>

        {/* Weekly Chart */}
        <MobileCard className="mt-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">This Week</h3>
            <button className="text-emerald-600 text-sm font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              View All
            </button>
          </div>
          
          <div className="flex items-end justify-between gap-2 h-32">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-emerald-100 rounded-t-lg relative overflow-hidden"
                  style={{ height: `${(day.amount / maxAmount) * 100}%` }}
                >
                  <div 
                    className="absolute bottom-0 w-full bg-emerald-500"
                    style={{ height: `${(day.amount / maxAmount) * 80}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{day.day}</p>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Recent Transactions */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            <button className="text-emerald-600 text-sm font-medium">See All</button>
          </div>
          
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <MobileCard key={tx.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'ride' ? 'bg-emerald-100' :
                      tx.type === 'delivery' ? 'bg-teal-100' : 'bg-gray-100'
                    }`}>
                      {tx.type === 'ride' && <Bike className="h-5 w-5 text-emerald-600" />}
                      {tx.type === 'delivery' && <Package className="h-5 w-5 text-teal-600" />}
                      {tx.type === 'payout' && <ArrowUpRight className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.time}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {tx.amount < 0 ? '-' : '+'}UGX {Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Earnings Summary */}
        <MobileCard className="mt-4 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Earnings Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">This Month</span>
              <span className="font-medium">UGX {earnings.thisMonth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">All Time</span>
              <span className="font-bold">UGX {earnings.totalEarnings.toLocaleString()}</span>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}
