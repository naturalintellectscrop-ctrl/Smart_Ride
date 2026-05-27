'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWithRetry } from '@/lib/api/client-retry';
import { socketService } from '@/services/socket';
import type { TaskStatusUpdateData } from '@/services/socket';

// API response task
interface ApiTask {
  id: string;
  taskNumber: string;
  taskType: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalAmount: number;
  riderEarnings: number | null;
  platformCommission: number | null;
  distanceKm: number | null;
  createdAt: string;
  completedAt: string | null;
  client: { id: string; name: string; phone: string | null } | null;
  rider: { id: string; fullName: string; phone: string; riderRole: string } | null;
}

// UI transaction type
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

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Map API TaskType to display type
function mapTaskType(taskType: string): { type: TransactionType; label: string } {
  switch (taskType) {
    case 'SMART_BODA_RIDE': return { type: 'ride', label: 'Boda Ride' };
    case 'SMART_CAR_RIDE': return { type: 'car', label: 'Car Ride' };
    default: return { type: 'delivery', label: 'Delivery' };
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Data freshness tracking — skip re-fetch if data is less than 30 seconds old
const DATA_FRESHNESS_MS = 30_000;
let earningsLastFetchedAt = 0;

export function RiderEarnings() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; amount: number; commission: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref for fallback polling interval when socket is disconnected
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEarnings = useCallback(async (force = false) => {
    if (!force && Date.now() - earningsLastFetchedAt < DATA_FRESHNESS_MS && earnings) {
      return; // Data is still fresh
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch completed tasks to derive earnings (with retry)
      const result = await fetchWithRetry('/api/tasks?status=COMPLETED,DELIVERED&limit=100&XTransformPort=3000', {
        headers: getAuthHeaders(),
        maxRetries: 3,
      });

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch earnings data');
      }

      const data = result.data as { data?: ApiTask[] } | null;
      const apiTasks: ApiTask[] = data?.data || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekAgo = new Date(today);
      lastWeekAgo.setDate(lastWeekAgo.getDate() - 14);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Calculate earnings by period
      const todayTasks = apiTasks.filter((t: ApiTask) => {
        const d = t.completedAt ? new Date(t.completedAt) : null;
        return d && d >= today;
      });
      const yesterdayTasks = apiTasks.filter((t: ApiTask) => {
        const d = t.completedAt ? new Date(t.completedAt) : null;
        return d && d >= yesterday && d < today;
      });
      const weekTasks = apiTasks.filter((t: ApiTask) => {
        const d = t.completedAt ? new Date(t.completedAt) : null;
        return d && d >= weekAgo;
      });
      const lastWeekTasks = apiTasks.filter((t: ApiTask) => {
        const d = t.completedAt ? new Date(t.completedAt) : null;
        return d && d >= lastWeekAgo && d < weekAgo;
      });
      const monthTasks = apiTasks.filter((t: ApiTask) => {
        const d = t.completedAt ? new Date(t.completedAt) : null;
        return d && d >= monthAgo;
      });

      const sumEarnings = (tasks: ApiTask[]) => tasks.reduce((s, t) => s + (t.riderEarnings || t.totalAmount * 0.8), 0);
      const sumCommission = (tasks: ApiTask[]) => tasks.reduce((s, t) => s + (t.platformCommission || t.totalAmount * 0.2), 0);

      const todayEarnings = sumEarnings(todayTasks);
      const todayCommission = sumCommission(todayTasks);
      const weeklyEarnings = sumEarnings(weekTasks);
      const weeklyCommission = sumCommission(weekTasks);
      const monthlyEarnings = sumEarnings(monthTasks);
      const totalEarnings = sumEarnings(apiTasks);

      setEarnings({
        today: todayEarnings,
        yesterday: sumEarnings(yesterdayTasks),
        thisWeek: weeklyEarnings,
        lastWeek: sumEarnings(lastWeekTasks),
        thisMonth: monthlyEarnings,
        totalEarnings,
        pendingPayout: 0, // TODO: Fetch from finance API when available
        availableBalance: 0, // TODO: Fetch from rider wallet when available
        todayCommission,
        todayNetEarnings: todayEarnings,
        weeklyCommission,
        weeklyNetEarnings: weeklyEarnings,
      });

      // Build transactions from completed tasks
      const mappedTransactions: Transaction[] = apiTasks.slice(0, 10).map((t: ApiTask) => {
        const mapped = mapTaskType(t.taskType);
        return {
          id: t.id,
          type: mapped.type,
          description: `${mapped.label} - ${t.dropoffAddress.split(',')[0]}`,
          amount: t.riderEarnings || t.totalAmount * 0.8,
          time: t.completedAt ? formatRelativeTime(t.completedAt) : formatRelativeTime(t.createdAt),
          commission: t.platformCommission || t.totalAmount * 0.2,
          netAmount: t.riderEarnings || t.totalAmount * 0.8,
        };
      });
      setTransactions(mappedTransactions);

      // Build weekly chart data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekChartData = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const dayTasks = apiTasks.filter((t: ApiTask) => {
          const d = t.completedAt ? new Date(t.completedAt) : null;
          return d && d >= dayStart && d < dayEnd;
        });

        weekChartData.push({
          day: days[dayStart.getDay()],
          amount: sumEarnings(dayTasks),
          commission: sumCommission(dayTasks),
        });
      }
      setWeeklyData(weekChartData);

    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError('Failed to load earnings data');
      // Set default zero values
      setEarnings({
        today: 0, yesterday: 0, thisWeek: 0, lastWeek: 0,
        thisMonth: 0, totalEarnings: 0, pendingPayout: 0,
        availableBalance: 0, todayCommission: 0, todayNetEarnings: 0,
        weeklyCommission: 0, weeklyNetEarnings: 0,
      });
      setTransactions([]);
      setWeeklyData([]);
    } finally {
      earningsLastFetchedAt = Date.now();
      setLoading(false);
    }
  }, [earnings]);

  useEffect(() => {
    fetchEarnings(true);
  }, [fetchEarnings]);

  // Socket-driven updates: refresh earnings when tasks are completed/delivered
  useEffect(() => {
    const unsubscribeStatus = socketService.on('task:status:update', (data: TaskStatusUpdateData) => {
      // Only refresh when tasks are completed or delivered (affects earnings)
      if (['COMPLETED', 'DELIVERED', 'PAID'].includes(data.status)) {
        fetchEarnings(true);
      }
    });

    // Also force refresh when socket reconnects (earnings may have changed while disconnected)
    const unsubscribeConnect = socketService.on('connect', () => {
      console.log('[RiderEarnings] Socket reconnected, refreshing earnings data');
      fetchEarnings(true);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConnect();
    };
  }, [fetchEarnings]);

  // Fallback polling: only when socket is disconnected (every 30 seconds)
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => {
        if (!socketService.isConnectedToSocket()) {
          fetchEarnings(true);
        }
      }, DATA_FRESHNESS_MS);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    startPolling();
    return () => {
      stopPolling();
    };
  }, [fetchEarnings]);

  const maxAmount = useMemo(() => {
    return weeklyData.length > 0 ? Math.max(...weeklyData.map(d => d.amount), 1) : 1;
  }, [weeklyData]);

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
          {loading ? (
            <Skeleton className="h-10 w-40 mt-1 bg-white/20" />
          ) : (
            <p className="text-4xl font-bold text-white mt-1">
              UGX {(earnings?.availableBalance || 0).toLocaleString()}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-emerald-100" />
            <span className="text-emerald-100 text-sm">
              +UGX {(earnings?.pendingPayout || 0).toLocaleString()} pending
            </span>
          </div>
          <Button 
            className="mt-4 w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
            onClick={() => setShowWithdrawModal(true)}
            disabled={!earnings || earnings.availableBalance <= 0}
          >
            <Wallet className="h-5 w-5 mr-2" />
            Withdraw Funds
          </Button>
        </Card>
      </div>

      <div className="px-4 -mt-4">
        {/* Error State */}
        {error && (
          <Card className="p-4 mb-4 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
              <button onClick={() => fetchEarnings(true)} className="text-xs text-emerald-600 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          </Card>
        )}

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
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-xl font-bold text-gray-900">
                UGX {selectedPeriod === 'today' 
                  ? (earnings?.today || 0).toLocaleString() 
                  : selectedPeriod === 'week' 
                    ? (earnings?.thisWeek || 0).toLocaleString() 
                    : (earnings?.thisMonth || 0).toLocaleString()}
              </p>
            )}
            {earnings && earnings.lastWeek > 0 && (
              <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>vs last period</span>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <p className="text-gray-500 text-xs">Net Earnings</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-xl font-bold text-emerald-600">
                UGX {selectedPeriod === 'today' 
                  ? (earnings?.todayNetEarnings || 0).toLocaleString() 
                  : selectedPeriod === 'week' 
                    ? (earnings?.weeklyNetEarnings || 0).toLocaleString() 
                    : (earnings?.thisMonth ? Math.round(earnings.thisMonth * 0.8) : 0).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">After commission</p>
          </Card>
        </div>

        {/* Commission Breakdown */}
        <Card className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Commission Breakdown</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Ride Fare</span>
                </div>
                <span className="font-medium">
                  UGX {selectedPeriod === 'today' 
                    ? (earnings?.today || 0).toLocaleString() 
                    : selectedPeriod === 'week' 
                      ? (earnings?.thisWeek || 0).toLocaleString() 
                      : (earnings?.thisMonth || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-red-400" />
                  <span className="text-gray-600">Platform Commission (20%)</span>
                </div>
                <span className="font-medium text-red-600">
                  -UGX {selectedPeriod === 'today' 
                    ? (earnings?.todayCommission || 0).toLocaleString() 
                    : selectedPeriod === 'week' 
                      ? (earnings?.weeklyCommission || 0).toLocaleString() 
                      : (earnings?.thisMonth ? Math.round(earnings.thisMonth * 0.2) : 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-gray-900">Your Earnings</span>
                </div>
                <span className="font-bold text-emerald-600">
                  UGX {selectedPeriod === 'today' 
                    ? (earnings?.todayNetEarnings || 0).toLocaleString() 
                    : selectedPeriod === 'week' 
                      ? (earnings?.weeklyNetEarnings || 0).toLocaleString() 
                      : (earnings?.thisMonth ? Math.round(earnings.thisMonth * 0.8) : 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
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

          {loading ? (
            <div className="flex items-end justify-between gap-2 h-32">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <Skeleton className="w-full rounded-lg" style={{ height: `${20 + Math.random() * 80}%` }} />
                  <Skeleton className="h-3 w-4 mt-2" />
                </div>
              ))}
            </div>
          ) : weeklyData.length > 0 && weeklyData.some(d => d.amount > 0) ? (
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((day) => (
                <div key={day.day} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col gap-0.5">
                    {/* Commission bar */}
                    <div
                      className="w-full bg-red-200 rounded-t-lg"
                      style={{ height: `${(day.commission / maxAmount) * 100}%`, minHeight: day.commission > 0 ? '2px' : '0' }}
                    />
                    {/* Earnings bar */}
                    <div
                      className="w-full bg-emerald-500 rounded-b-lg"
                      style={{ height: `${((day.amount - day.commission) / maxAmount) * 100}%`, minHeight: day.amount > 0 ? '2px' : '0' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{day.day}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400 text-sm">No earnings data this week</p>
            </div>
          )}

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

        {/* Bonuses & Incentives - Empty state since no API exists */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Bonuses & Incentives</h3>
            <Badge className="bg-gray-100 text-gray-500 border-gray-200">
              <Gift className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          </div>
          <Card className="p-6">
            <div className="text-center">
              <Gift className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No active bonuses right now</p>
              <p className="text-gray-300 text-xs mt-1">Complete more trips to unlock incentives</p>
            </div>
          </Card>
        </div>

        {/* Withdrawal Requests - Empty state */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Withdrawals</h3>
            <Button variant="ghost" size="sm" className="text-emerald-600">
              View All
            </Button>
          </div>
          <Card className="p-6">
            <div className="text-center">
              <ArrowUpRight className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No withdrawal history</p>
              <p className="text-gray-300 text-xs mt-1">Your withdrawal requests will appear here</p>
            </div>
          </Card>
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

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No transactions yet</p>
                <p className="text-gray-300 text-xs mt-1">Complete tasks to see your earnings here</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
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
                        {tx.commission && tx.commission > 0 && (
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
                      {tx.netAmount && tx.netAmount > 0 && (
                        <p className="text-xs text-gray-400">
                          Net: UGX {tx.netAmount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
                  UGX {(earnings?.availableBalance || 0).toLocaleString()}
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
                Withdraw UGX {(earnings?.availableBalance || 0).toLocaleString()}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
