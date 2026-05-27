'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Power,
  DollarSign,
  Bike,
  MapPin,
  Navigation,
  Clock,
  Star,
  TrendingUp,
  Zap,
  Bell,
  Package,
  Car,
  ChevronRight,
  RefreshCw,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '../../context/notification-context';
import { socketService } from '@/services/socket';
import type { TaskStatusUpdateData } from '@/services/socket';
import { fetchWithRetry } from '@/lib/api/client-retry';

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '👋';
  if (hour >= 12 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌅';
  return '🌙';
}

// API response types
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
  client: { id: string; name: string; phone: string | null };
  rider: { id: string; fullName: string; phone: string; riderRole: string } | null;
}

interface TaskStats {
  todayEarnings: number;
  todayTrips: number;
  weeklyEarnings: number;
  rating: number;
  completionRate: number;
  acceptanceRate: number;
}

interface ActiveTask {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  clientName: string;
  status: string;
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
function mapTaskTypeToDisplay(taskType: string): string {
  switch (taskType) {
    case 'SMART_BODA_RIDE': return 'boda';
    case 'SMART_CAR_RIDE': return 'car';
    case 'FOOD_DELIVERY':
    case 'SHOPPING':
    case 'ITEM_DELIVERY':
    case 'SMART_HEALTH_DELIVERY':
      return 'delivery';
    default: return 'delivery';
  }
}

interface RiderHomeProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  onBellClick?: () => void;
}

// Data freshness tracking — skip re-fetch if data is less than 30 seconds old
const DATA_FRESHNESS_MS = 30_000;
let statsLastFetchedAt = 0;
let activeTaskLastFetchedAt = 0;

export function RiderHome({ isOnline, onToggleOnline, onBellClick }: RiderHomeProps) {
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [emoji, setEmoji] = useState(getGreetingEmoji());
  const { unreadCount } = useNotifications();

  // Data states
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTaskLoading, setActiveTaskLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activeTaskError, setActiveTaskError] = useState<string | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Ref for fallback polling interval when socket is disconnected
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch today's stats from tasks — respects data freshness
  const fetchStats = useCallback(async (force = false) => {
    if (!force && Date.now() - statsLastFetchedAt < DATA_FRESHNESS_MS && stats) {
      return; // Data is still fresh
    }
    setStatsLoading(true);
    setStatsError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch in-progress and today's completed tasks for stats (with retry)
      const [activeResult, completedResult] = await Promise.all([
        fetchWithRetry('/api/tasks?status=IN_PROGRESS,ASSIGNED,ACCEPTED,ARRIVED,PICKED_UP,IN_TRANSIT,DELIVERING&limit=100&XTransformPort=3000', {
          headers: getAuthHeaders(),
          maxRetries: 3,
        }),
        fetchWithRetry('/api/tasks?status=COMPLETED,DELIVERED&limit=100&XTransformPort=3000', {
          headers: getAuthHeaders(),
          maxRetries: 3,
        }),
      ]);

      if (!activeResult.ok || !completedResult.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const activeData = activeResult.data as { data?: ApiTask[] } | null;
      const completedData = completedResult.data as { data?: ApiTask[] } | null;

      const activeTasks: ApiTask[] = activeData?.data || [];
      const completedTasks: ApiTask[] = completedData?.data || [];

      // Calculate today's earnings from completed tasks
      const todayCompleted = completedTasks.filter((t: ApiTask) => {
        const completedAt = t.completedAt ? new Date(t.completedAt) : null;
        return completedAt && completedAt >= today;
      });

      const todayEarnings = todayCompleted.reduce(
        (sum: number, t: ApiTask) => sum + (t.riderEarnings || t.totalAmount * 0.8),
        0
      );
      const todayTrips = todayCompleted.length;

      // Calculate weekly earnings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyCompleted = completedTasks.filter((t: ApiTask) => {
        const completedAt = t.completedAt ? new Date(t.completedAt) : null;
        return completedAt && completedAt >= weekAgo;
      });
      const weeklyEarnings = weeklyCompleted.reduce(
        (sum: number, t: ApiTask) => sum + (t.riderEarnings || t.totalAmount * 0.8),
        0
      );

      setStats({
        todayEarnings,
        todayTrips,
        weeklyEarnings,
        rating: 4.8, // TODO: Fetch from rider profile when API available
        completionRate: completedTasks.length > 0
          ? Math.round((todayCompleted.length / Math.max(completedTasks.length, 1)) * 100)
          : 0,
        acceptanceRate: 92, // TODO: Fetch from rider stats when API available
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStatsError('Failed to load stats');
      // Set default zero values on error
      setStats({
        todayEarnings: 0,
        todayTrips: 0,
        weeklyEarnings: 0,
        rating: 0,
        completionRate: 0,
        acceptanceRate: 0,
      });
    } finally {
      statsLastFetchedAt = Date.now();
      setStatsLoading(false);
    }
  }, [stats]);

  // Fetch active task — respects data freshness
  const fetchActiveTask = useCallback(async (force = false) => {
    if (!force && Date.now() - activeTaskLastFetchedAt < DATA_FRESHNESS_MS && activeTask !== undefined) {
      return; // Data is still fresh
    }
    setActiveTaskLoading(true);
    setActiveTaskError(null);
    try {
      const result = await fetchWithRetry(
        '/api/tasks?status=ASSIGNED,ACCEPTED,ARRIVING,ARRIVED,PICKED_UP,IN_TRANSIT,IN_PROGRESS,DELIVERING&limit=1&XTransformPort=3000',
        { headers: getAuthHeaders(), maxRetries: 3 }
      );

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch active task');
      }

      const data = result.data as { data?: ApiTask[] } | null;
      const tasks: ApiTask[] = data?.data || [];

      if (tasks.length > 0) {
        const t = tasks[0];
        setActiveTask({
          id: t.id,
          type: mapTaskTypeToDisplay(t.taskType),
          from: t.pickupAddress,
          to: t.dropoffAddress,
          amount: t.riderEarnings || t.totalAmount,
          clientName: t.client?.name || 'Client',
          status: t.status,
        });
      } else {
        setActiveTask(null);
      }
    } catch (err) {
      console.error('Error fetching active task:', err);
      setActiveTaskError('Failed to load active task');
      setActiveTask(null);
    } finally {
      activeTaskLastFetchedAt = Date.now();
      setActiveTaskLoading(false);
    }
  }, [activeTask]);

  // Handle online toggle with API call
  const handleToggleOnline = useCallback(async () => {
    if (togglingOnline) return;
    setTogglingOnline(true);
    try {
      const result = await fetchWithRetry('/api/riders/status?XTransformPort=3000', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isOnline: !isOnline }),
        maxRetries: 3,
      });

      if (!result.ok) {
        const errorData = result.data as { error?: string } | null;
        console.error('Failed to toggle online status:', errorData?.error || result.error?.message);
      }
      // Always call onToggleOnline to update UI state
      onToggleOnline();
    } catch (err) {
      console.error('Error toggling online status:', err);
      onToggleOnline();
    } finally {
      setTogglingOnline(false);
    }
  }, [isOnline, onToggleOnline, togglingOnline]);

  // Initial data fetch
  useEffect(() => {
    fetchStats(true);
    fetchActiveTask(true);
  }, [fetchStats, fetchActiveTask]);

  // Socket-driven updates: refresh data on task status changes
  useEffect(() => {
    const unsubscribeStatus = socketService.on('task:status:update', (_data: TaskStatusUpdateData) => {
      // Force refresh when any task status changes
      fetchStats(true);
      fetchActiveTask(true);
    });

    // Also force refresh when socket reconnects (state may have changed while disconnected)
    const unsubscribeConnect = socketService.on('connect', () => {
      console.log('[RiderHome] Socket reconnected, refreshing data');
      fetchStats(true);
      fetchActiveTask(true);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConnect();
    };
  }, [fetchStats, fetchActiveTask]);

  // Fallback polling: only when socket is disconnected (every 30 seconds)
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return; // Already polling
      pollingRef.current = setInterval(() => {
        if (!socketService.isConnectedToSocket()) {
          fetchStats(true);
          fetchActiveTask(true);
        }
      }, DATA_FRESHNESS_MS);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Start fallback polling; socket handler above handles the connected case
    startPolling();

    return () => {
      stopPolling();
    };
  }, [fetchStats, fetchActiveTask]);

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
      setEmoji(getGreetingEmoji());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boda':
        return <Bike className="h-5 w-5" />;
      case 'car':
        return <Car className="h-5 w-5" />;
      case 'delivery':
        return <Package className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'boda':
        return 'from-emerald-500 to-teal-600';
      case 'car':
        return 'from-blue-500 to-indigo-600';
      case 'delivery':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{greeting} {emoji}</p>
            <h1 className="text-xl font-bold text-white">
              Emmanuel
            </h1>
          </div>
          <button className="relative" onClick={onBellClick}>
            <Bell className="h-6 w-6 text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Online/Offline Toggle */}
        <Card className="p-4 bg-[#1A1A24]/80 backdrop-blur border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  isOnline 
                    ? 'bg-[#00FF88]/20' 
                    : 'bg-gray-500/20'
                )}
                style={isOnline ? { boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)' } : {}}
              >
                <Power className={cn("h-6 w-6", isOnline ? "text-[#00FF88]" : "text-gray-400")} />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {togglingOnline ? 'Updating...' : isOnline ? 'You are Online' : 'You are Offline'}
                </p>
                <p className="text-gray-400 text-sm">
                  {isOnline ? 'Accepting ride requests' : 'Go online to receive tasks'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              className={cn(
                'w-14 h-8 rounded-full transition-all relative',
                isOnline ? 'bg-[#00FF88]' : 'bg-gray-600',
                togglingOnline && 'opacity-50'
              )}
              style={isOnline ? { boxShadow: '0 0 15px rgba(0, 255, 136, 0.5)' } : {}}
            >
              <div
                className={cn(
                  'w-6 h-6 bg-white rounded-full transition-transform absolute top-1',
                  isOnline ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </Card>
      </div>

      <div className="px-4 -mt-2">
        {/* Offline State */}
        {!isOnline && (
          <Card className="p-6 mt-4 bg-[#13131A] border-white/5">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4">
                <Power className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">You&apos;re Offline</h3>
              <p className="text-gray-400 text-sm mb-4">
                Go online to start receiving ride and delivery requests from nearby customers.
              </p>
              <Button
                onClick={handleToggleOnline}
                disabled={togglingOnline}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] font-semibold text-lg flex items-center justify-center gap-2"
                style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)' }}
              >
                <Power className="h-5 w-5" />
                Go Online
              </Button>
            </div>
          </Card>
        )}

        {/* Online State Content */}
        {isOnline && (
          <>
            {/* Surge Zones - TODO: Requires marketplace/surge API that doesn't exist yet */}
            <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Surge Zones
                </h3>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                  High Demand
                </Badge>
              </div>
              {/* TODO: Replace with real surge zone data when marketplace/surge API is available */}
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <Zap className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Surge data unavailable</p>
                  <p className="text-gray-600 text-xs mt-1">Requires marketplace API</p>
                </div>
              </div>
            </Card>

            {/* Nearby Requests - comes from socket events driver:request */}
            <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Nearby Requests</h3>
                <span className="text-sm text-gray-400">0 available</span>
              </div>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Wifi className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Waiting for requests...</p>
                  <p className="text-gray-600 text-xs mt-1">New requests will appear here in real-time</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF88]/15 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Today&apos;s Earnings</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-24 mt-1" />
                ) : statsError ? (
                  <button onClick={() => fetchStats(true)} className="text-xs text-red-400 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                ) : (
                  <p className="text-xl font-bold text-white">
                    UGX {(stats?.todayEarnings || 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center">
                <Bike className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Today&apos;s Trips</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : statsError ? (
                  <button onClick={() => fetchStats(true)} className="text-xs text-red-400 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                ) : (
                  <p className="text-xl font-bold text-white">{stats?.todayTrips || 0}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Active Task Preview */}
        {isOnline && (
          activeTaskLoading ? (
            <Card className="mt-4 p-4 bg-[#13131A] border-[#00FF88]/30">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            </Card>
          ) : activeTaskError ? (
            <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Failed to load active task</p>
                <button onClick={() => fetchActiveTask(true)} className="text-xs text-[#00FF88] flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            </Card>
          ) : activeTask ? (
            <Card className="mt-4 p-4 bg-[#13131A] border-[#00FF88]/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Active Task</h3>
                <Badge className="bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30 animate-pulse">
                  {activeTask.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                    getTypeGradient(activeTask.type)
                  )}
                >
                  {getTypeIcon(activeTask.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white capitalize">
                    {activeTask.type === 'boda' ? 'Boda Ride' : 'Delivery'}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{activeTask.from}</span>
                    <span className="mx-1">→</span>
                    <Navigation className="h-3 w-3" />
                    <span className="truncate">{activeTask.to}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#00FF88]">
                    UGX {activeTask.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ) : null
        )}

        {/* Performance Stats */}
        <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
          <h3 className="font-semibold text-white mb-3">Your Performance</h3>
          {statsLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="text-center">
                  <Skeleton className="h-5 w-10 mx-auto" />
                  <Skeleton className="h-3 w-12 mx-auto mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-white">{stats?.rating || 0}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Rating</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{stats?.completionRate || 0}%</p>
                <p className="text-xs text-gray-400 mt-1">Completion</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{stats?.acceptanceRate || 0}%</p>
                <p className="text-xs text-gray-400 mt-1">Acceptance</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-[#00FF88]">
                  UGX {((stats?.weeklyEarnings || 0) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-400 mt-1">This Week</p>
              </div>
            </div>
          )}
        </Card>

        {/* Weekly Trend */}
        {/* TODO: Replace with real weekly data when analytics API is available */}
        <Card className="mt-4 p-4 mb-6 bg-[#13131A] border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Weekly Earnings Trend</h3>
            {stats && stats.weeklyEarnings > 0 && (
              <div className="flex items-center gap-1 text-[#00FF88]">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            )}
          </div>
          {statsLoading ? (
            <div className="flex items-end justify-between gap-2 h-20">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <Skeleton className="w-full rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
                  <Skeleton className="h-3 w-3 mt-1" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 h-20">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-[#00FF88] to-[#00CC6E] rounded-t-lg"
                    style={{ height: `${stats?.weeklyEarnings ? Math.min(30, 10) : 5}%`, opacity: 0.3 }}
                  />
                  <p className="text-xs text-gray-500 mt-1">{day}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
