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
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '../../context/notification-context';
import { socketService, DriverRequestData, TaskStatusUpdateData } from '@/services/socket';
import { fetchWithRetry } from '@/lib/api/client-retry';

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
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

// Incoming ride request from dispatch
interface IncomingRequest {
  matchId: string;
  taskId: string;
  taskNumber?: string;
  taskType: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  totalAmount: number;
  distanceKm?: number;
  expiresAt: string;
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
  riderName?: string;
}

// Data freshness tracking
const DATA_FRESHNESS_MS = 30_000;
let statsLastFetchedAt = 0;
let activeTaskLastFetchedAt = 0;

export function RiderHome({ isOnline, onToggleOnline, onBellClick, riderName }: RiderHomeProps) {
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const { unreadCount } = useNotifications();

  // Data states
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTaskLoading, setActiveTaskLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activeTaskError, setActiveTaskError] = useState<string | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  // Incoming request state
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);

  // Refs
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Fetch today's stats from tasks
  const fetchStats = useCallback(async (force = false) => {
    if (!force && Date.now() - statsLastFetchedAt < DATA_FRESHNESS_MS && stats) {
      return;
    }
    setStatsLoading(true);
    setStatsError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeResult, completedResult] = await Promise.all([
        fetchWithRetry('/api/tasks?status=IN_PROGRESS,ASSIGNED,ACCEPTED,ARRIVED,PICKED_UP,IN_TRANSIT,DELIVERED&limit=100&XTransformPort=3000', {
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

      const todayCompleted = completedTasks.filter((t: ApiTask) => {
        const completedAt = t.completedAt ? new Date(t.completedAt) : null;
        return completedAt && completedAt >= today;
      });

      const todayEarnings = todayCompleted.reduce(
        (sum: number, t: ApiTask) => sum + (t.riderEarnings || t.totalAmount * 0.8),
        0
      );
      const todayTrips = todayCompleted.length;

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

      // Fetch rider profile for real rating/acceptance rate
      let rating = 0;
      let acceptanceRate = 0;
      try {
        const profileResult = await fetchWithRetry('/api/riders/profile?XTransformPort=3000', {
          headers: getAuthHeaders(),
          maxRetries: 1,
        });
        if (profileResult.ok) {
          const profileData = profileResult.data as { data?: any } | null;
          rating = profileData?.data?.rating || 0;
          acceptanceRate = profileData?.data?.acceptanceRate || 0;
        }
      } catch {}

      setStats({
        todayEarnings,
        todayTrips,
        weeklyEarnings,
        rating,
        completionRate: completedTasks.length > 0
          ? Math.round((todayCompleted.length / Math.max(completedTasks.length, 1)) * 100)
          : 0,
        acceptanceRate,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStatsError('Failed to load stats');
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

  // Fetch active task
  const fetchActiveTask = useCallback(async (force = false) => {
    if (!force && Date.now() - activeTaskLastFetchedAt < DATA_FRESHNESS_MS && activeTask !== undefined) {
      return;
    }
    setActiveTaskLoading(true);
    setActiveTaskError(null);
    try {
      const result = await fetchWithRetry(
        '/api/tasks?status=ASSIGNED,ACCEPTED,ARRIVING,ARRIVED,PICKED_UP,IN_TRANSIT,IN_PROGRESS,DELIVERED&limit=1&XTransformPort=3000',
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
      // Get current location if available
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (navigator.geolocation && !isOnline) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {}
      }

      const result = await fetchWithRetry('/api/riders/status?XTransformPort=3000', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isOnline: !isOnline, latitude, longitude }),
        maxRetries: 3,
      });

      if (!result.ok) {
        const errorData = result.data as { error?: string } | null;
        console.error('Failed to toggle online status:', errorData?.error || result.error?.message);
      }
      onToggleOnline();
    } catch (err) {
      console.error('Error toggling online status:', err);
      onToggleOnline();
    } finally {
      setTogglingOnline(false);
    }
  }, [isOnline, onToggleOnline, togglingOnline]);

  // ========================================
  // INCOMING REQUEST HANDLING
  // ========================================

  const handleAcceptRequest = useCallback(async (matchId: string) => {
    setAcceptingRequestId(matchId);
    try {
      const result = await fetchWithRetry(`/api/dispatch/${matchId}/accept?XTransformPort=3000`, {
        method: 'POST',
        headers: getAuthHeaders(),
        maxRetries: 2,
      });

      if (result.ok) {
        // Remove from incoming requests
        setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
        // Clear the expiry timer
        const timer = requestTimersRef.current.get(matchId);
        if (timer) {
          clearInterval(timer);
          requestTimersRef.current.delete(matchId);
        }
        // Refresh active task
        fetchActiveTask(true);
        fetchStats(true);
      } else {
        const errorData = result.data as { error?: string } | null;
        console.error('Failed to accept dispatch:', errorData?.error || result.error?.message);
        // Remove the request anyway as it may have expired
        setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
      }
    } catch (err) {
      console.error('Error accepting dispatch:', err);
      setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
    } finally {
      setAcceptingRequestId(null);
    }
  }, [fetchActiveTask, fetchStats]);

  const handleRejectRequest = useCallback(async (matchId: string, reason?: string) => {
    setRejectingRequestId(matchId);
    try {
      await fetchWithRetry(`/api/dispatch/${matchId}/reject?XTransformPort=3000`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: reason || 'RIDER_DECLINED' }),
        maxRetries: 2,
      });
    } catch (err) {
      console.error('Error rejecting dispatch:', err);
    }
    // Remove from incoming requests
    setIncomingRequests(prev => prev.filter(r => r.matchId !== matchId));
    const timer = requestTimersRef.current.get(matchId);
    if (timer) {
      clearInterval(timer);
      requestTimersRef.current.delete(matchId);
    }
    setRejectingRequestId(null);
  }, []);

  // Listen for incoming ride requests via socket
  useEffect(() => {
    if (!isOnline) return;

    const unsubRequest = socketService.on('driver:request', (data: DriverRequestData) => {
      // New incoming ride/delivery request from dispatch
      const task = data.task;
      const request: IncomingRequest = {
        matchId: data.matchId || '',
        taskId: task.id,
        taskNumber: (task as any).taskNumber,
        taskType: (task as any).taskType || 'UNKNOWN',
        pickupAddress: data.pickup?.address || (task as any).pickupAddress || 'Pickup location',
        pickupLat: data.pickup?.latitude,
        pickupLng: data.pickup?.longitude,
        dropoffAddress: (task as any).dropoffAddress || 'Dropoff location',
        totalAmount: (task as any).totalAmount || 0,
        distanceKm: (task as any).distanceKm,
        expiresAt: data.expiresAt,
      };

      setIncomingRequests(prev => {
        // Avoid duplicates
        if (prev.find(r => r.matchId === request.matchId)) return prev;
        return [request, ...prev];
      });

      // Set expiry timer
      const expiresAtMs = new Date(data.expiresAt).getTime();
      const nowMs = Date.now();
      const timeUntilExpiry = Math.max(expiresAtMs - nowMs, 0);
      
      if (timeUntilExpiry > 0) {
        const timer = setInterval(() => {
          const remaining = new Date(data.expiresAt).getTime() - Date.now();
          if (remaining <= 0) {
            // Request expired, remove it
            setIncomingRequests(prev => prev.filter(r => r.matchId !== request.matchId));
            clearInterval(timer);
            requestTimersRef.current.delete(request.matchId);
          }
        }, 1000);
        requestTimersRef.current.set(request.matchId, timer);
      }
    });

    return () => {
      unsubRequest();
      // Clear all timers
      requestTimersRef.current.forEach(timer => clearInterval(timer));
      requestTimersRef.current.clear();
    };
  }, [isOnline]);

  // Initial data fetch
  useEffect(() => {
    fetchStats(true);
    fetchActiveTask(true);
  }, [fetchStats, fetchActiveTask]);

  // Socket-driven updates
  useEffect(() => {
    const unsubStatus = socketService.on('task:status:update', (_data: TaskStatusUpdateData) => {
      fetchStats(true);
      fetchActiveTask(true);
    });

    const unsubConnect = socketService.on('connect', () => {
      console.log('[RiderHome] Socket reconnected, refreshing data');
      fetchStats(true);
      fetchActiveTask(true);
    });

    return () => {
      unsubStatus();
      unsubConnect();
    };
  }, [fetchStats, fetchActiveTask]);

  // Fallback polling when socket is disconnected
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return;
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

    startPolling();
    return () => { stopPolling(); };
  }, [fetchStats, fetchActiveTask]);

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
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
        return 'from-cyan-500 to-teal-600';
      case 'delivery':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Get remaining time for a request
  const getRequestTimeLeft = (expiresAt: string): number => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.round(remaining / 1000));
  };

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{greeting}</p>
            <h1 className="text-xl font-bold text-white">
              {riderName || 'Rider'}
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
            {/* Incoming Ride Requests */}
            {incomingRequests.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#00FF88] animate-pulse" />
                  Incoming Requests ({incomingRequests.length})
                </h3>
                {incomingRequests.map((request) => {
                  const timeLeft = getRequestTimeLeft(request.expiresAt);
                  const isExpiring = timeLeft <= 10;
                  const taskType = mapTaskTypeToDisplay(request.taskType);

                  return (
                    <Card key={request.matchId} className={cn(
                      'p-4 border-2',
                      isExpiring ? 'bg-red-500/5 border-red-500/40' : 'bg-[#13131A] border-[#00FF88]/30'
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br',
                            getTypeGradient(taskType)
                          )}>
                            {getTypeIcon(taskType)}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm capitalize">
                              {taskType === 'boda' ? 'Boda Ride' : taskType === 'car' ? 'Car Ride' : 'Delivery'}
                            </p>
                            {request.taskNumber && (
                              <p className="text-gray-500 text-xs">{request.taskNumber}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#00FF88] text-sm">
                            UGX {request.totalAmount.toLocaleString()}
                          </p>
                          <p className={cn(
                            'text-xs',
                            isExpiring ? 'text-red-400 animate-pulse' : 'text-gray-500'
                          )}>
                            {timeLeft}s left
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-[#00FF88] flex-shrink-0" />
                          <p className="text-gray-400 text-xs truncate">{request.pickupAddress}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          <p className="text-gray-400 text-xs truncate">{request.dropoffAddress}</p>
                        </div>
                        {request.distanceKm && (
                          <p className="text-gray-500 text-xs">{request.distanceKm.toFixed(1)} km</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-[#00FF88] text-black hover:bg-[#00CC6E] gap-1"
                          onClick={() => handleAcceptRequest(request.matchId)}
                          disabled={acceptingRequestId === request.matchId || timeLeft <= 0}
                        >
                          {acceptingRequestId === request.matchId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-gray-400 hover:bg-white/5 gap-1"
                          onClick={() => handleRejectRequest(request.matchId)}
                          disabled={rejectingRequestId === request.matchId}
                        >
                          {rejectingRequestId === request.matchId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Decline
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Nearby Requests placeholder when no active requests */}
            {incomingRequests.length === 0 && (
              <Card className="mt-4 p-4 bg-[#13131A] border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">Nearby Requests</h3>
                  <Badge className="bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30">
                    <Wifi className="h-3 w-3 mr-1" />
                    Listening
                  </Badge>
                </div>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <Wifi className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Waiting for requests...</p>
                    <p className="text-gray-600 text-xs mt-1">New requests will appear here in real-time</p>
                  </div>
                </div>
              </Card>
            )}
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
              <div className="w-10 h-10 bg-cyan-500/15 rounded-full flex items-center justify-center">
                <Bike className="h-5 w-5 text-cyan-400" />
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
                    {activeTask.type === 'boda' ? 'Boda Ride' : activeTask.type === 'car' ? 'Car Ride' : 'Delivery'}
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
