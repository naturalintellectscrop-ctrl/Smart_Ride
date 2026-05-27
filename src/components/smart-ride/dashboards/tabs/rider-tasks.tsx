'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bike,
  Car,
  Package,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  MessageSquare,
  Filter,
  ChevronRight,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchWithRetry } from '@/lib/api/client-retry';
import { transitionDeduplicator, buildTransitionDedupKey } from '@/lib/api/request-dedup';
import { socketService } from '@/services/socket';
import type { TaskStatusUpdateData } from '@/services/socket';

// Prisma TaskStatus enum values
type PrismaTaskStatus = 
  | 'CREATED' | 'REQUESTED' | 'SEARCHING' | 'MATCHING'
  | 'ASSIGNED' | 'ACCEPTED' | 'ARRIVED' | 'ARRIVING'
  | 'PICKED_UP' | 'IN_PROGRESS' | 'IN_TRANSIT' | 'DELIVERING'
  | 'DELIVERED' | 'COMPLETED' | 'PAID' | 'CLOSED'
  | 'CANCELLED' | 'FAILED';

// UI-facing task type
type TaskType = 'boda' | 'car' | 'delivery';

interface Task {
  id: string;
  taskNumber: string;
  type: TaskType;
  from: string;
  to: string;
  distance: number;
  amount: number;
  clientName: string;
  status: PrismaTaskStatus;
  createdAt: string;
  completedAt?: string;
}

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
  distanceKm: number | null;
  createdAt: string;
  completedAt: string | null;
  client: { id: string; name: string; phone: string | null } | null;
  rider: { id: string; fullName: string; phone: string; riderRole: string } | null;
}

// Map API TaskType to display type
function mapTaskTypeToDisplay(taskType: string): TaskType {
  switch (taskType) {
    case 'SMART_BODA_RIDE': return 'boda';
    case 'SMART_CAR_RIDE': return 'car';
    default: return 'delivery';
  }
}

// Map Prisma TaskStatus to UI filter values
type UIFilterStatus = 'all' | 'active' | 'completed' | 'cancelled';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CREATED: { label: 'Created', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  REQUESTED: { label: 'Requested', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  SEARCHING: { label: 'Searching', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  MATCHING: { label: 'Matching', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  ASSIGNED: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ARRIVED: { label: 'Arrived', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ARRIVING: { label: 'Arriving', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  PICKED_UP: { label: 'Picked Up', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  DELIVERING: { label: 'Delivering', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  DELIVERED: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
  PAID: { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-100' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
  FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const filterOptions: { value: UIFilterStatus; label: string }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Get next status for transition
function getNextStatus(currentStatus: PrismaTaskStatus): PrismaTaskStatus | null {
  const transitions: Record<string, PrismaTaskStatus> = {
    ASSIGNED: 'ACCEPTED',
    ACCEPTED: 'ARRIVED',
    ARRIVING: 'ARRIVED',
    ARRIVED: 'PICKED_UP',
    PICKED_UP: 'IN_TRANSIT',
    IN_PROGRESS: 'IN_TRANSIT',
    IN_TRANSIT: 'DELIVERED',
    DELIVERING: 'DELIVERED',
    DELIVERED: 'COMPLETED',
  };
  return transitions[currentStatus] || null;
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

// Active statuses
const ACTIVE_STATUSES: PrismaTaskStatus[] = [
  'ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT', 'DELIVERING'
];

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
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return dateStr;
  }
}

// Data freshness tracking — skip re-fetch if data is less than 30 seconds old
const DATA_FRESHNESS_MS = 30_000;
let tasksLastFetchedAt = 0;

export function RiderTasks() {
  const [filter, setFilter] = useState<UIFilterStatus>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  // Ref for fallback polling interval when socket is disconnected
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTasks = useCallback(async (force = false) => {
    if (!force && Date.now() - tasksLastFetchedAt < DATA_FRESHNESS_MS && tasks.length > 0) {
      return; // Data is still fresh
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithRetry('/api/tasks?limit=50&XTransformPort=3000', {
        headers: getAuthHeaders(),
        maxRetries: 3,
      });

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to fetch tasks');
      }

      const data = result.data as { data?: ApiTask[] } | null;
      const apiTasks: ApiTask[] = data?.data || [];

      // Map API tasks to UI format
      const mappedTasks: Task[] = apiTasks.map((t: ApiTask) => ({
        id: t.id,
        taskNumber: t.taskNumber,
        type: mapTaskTypeToDisplay(t.taskType),
        from: t.pickupAddress,
        to: t.dropoffAddress,
        distance: t.distanceKm || 0,
        amount: t.riderEarnings || t.totalAmount,
        clientName: t.client?.name || 'Client',
        status: t.status as PrismaTaskStatus,
        createdAt: formatRelativeTime(t.createdAt),
        completedAt: t.completedAt ? formatRelativeTime(t.completedAt) : undefined,
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Check your connection and try again.');
    } finally {
      tasksLastFetchedAt = Date.now();
      setLoading(false);
    }
  }, [tasks.length]);

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  // Socket-driven updates: refresh data on task status changes
  useEffect(() => {
    const unsubscribeStatus = socketService.on('task:status:update', (_data: TaskStatusUpdateData) => {
      // Force refresh when any task status changes
      fetchTasks(true);
    });

    // Also force refresh when socket reconnects (state may have changed while disconnected)
    const unsubscribeConnect = socketService.on('connect', () => {
      console.log('[RiderTasks] Socket reconnected, refreshing task data');
      fetchTasks(true);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConnect();
    };
  }, [fetchTasks]);

  // Fallback polling: only when socket is disconnected (every 30 seconds)
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => {
        if (!socketService.isConnectedToSocket()) {
          fetchTasks(true);
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
  }, [fetchTasks]);

  // Memoize filtered tasks to prevent unnecessary recalculations
  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'active') return tasks.filter(t => ACTIVE_STATUSES.includes(t.status));
    if (filter === 'completed') return tasks.filter(t => ['COMPLETED', 'DELIVERED', 'PAID', 'CLOSED'].includes(t.status));
    return tasks.filter(t => ['CANCELLED', 'FAILED'].includes(t.status));
  }, [tasks, filter]);

  const activeTask = useMemo(() => tasks.find(t => ACTIVE_STATUSES.includes(t.status)), [tasks]);

  const handleTransition = useCallback(async (taskId: string, toStatus: PrismaTaskStatus) => {
    const dedupKey = buildTransitionDedupKey(taskId, toStatus);

    // Check deduplication — prevent double-submit within 5 seconds
    const existingPromise = transitionDeduplicator.getExisting<void>(dedupKey);
    if (existingPromise) {
      console.log(`[RiderTasks] Transition ${taskId} → ${toStatus} already in progress, waiting...`);
      setTransitioning(taskId);
      try {
        await existingPromise;
        await fetchTasks(true);
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
      } catch {
        // The original request failed, ignore
      } finally {
        setTransitioning(null);
      }
      return;
    }

    setTransitioning(taskId);
    const promise = (async () => {
      try {
        const result = await fetchWithRetry(`/api/tasks/${taskId}/transition?XTransformPort=3000`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ toStatus }),
          maxRetries: 3,
        });

        if (!result.ok) {
          const errorData = result.data as { error?: string } | null;
          console.error('Failed to transition task:', errorData?.error || result.error?.message);
        }

        // Refresh tasks after transition
        await fetchTasks(true);
        
        // Update selected task if it's the same
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
      } catch (err) {
        console.error('Error transitioning task:', err);
      } finally {
        setTransitioning(null);
      }
    })();

    transitionDeduplicator.register(dedupKey, promise);
    await promise;
  }, [fetchTasks, selectedTask]);

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return <Bike className="h-5 w-5" />;
      case 'car':
        return <Car className="h-5 w-5" />;
      case 'delivery':
        return <Package className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return 'bg-emerald-100 text-emerald-600';
      case 'car':
        return 'bg-blue-100 text-blue-600';
      case 'delivery':
        return 'bg-teal-100 text-teal-600';
    }
  };

  const getTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'boda':
        return 'Boda Ride';
      case 'car':
        return 'Car Ride';
      case 'delivery':
        return 'Delivery';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500">Manage your rides and deliveries</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading State */}
        {loading && (
          <>
            {/* Active Task Skeleton */}
            <Card className="p-4 border-2 border-emerald-200 bg-emerald-50 mb-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32 mb-1" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            </Card>
            {/* Task List Skeletons */}
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-4 mb-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Failed to Load Tasks</h3>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <Button onClick={() => fetchTasks(true)} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Loaded Content */}
        {!loading && !error && (
          <>
            {/* Active Task Banner */}
            {activeTask && (
              <Card className="p-4 border-2 border-emerald-200 bg-emerald-50 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-emerald-800">Active Task</h3>
                  <Badge className={cn(
                    'animate-pulse',
                    statusConfig[activeTask.status]?.bgColor,
                    statusConfig[activeTask.status]?.color
                  )}>
                    {statusConfig[activeTask.status]?.label || activeTask.status}
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    getTypeColor(activeTask.type)
                  )}>
                    {getTypeIcon(activeTask.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{getTypeLabel(activeTask.type)}</p>
                    <p className="text-sm text-gray-500">{activeTask.taskNumber}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{activeTask.from}</span>
                      <span className="mx-1">→</span>
                      <Navigation className="h-3 w-3" />
                      <span className="truncate">{activeTask.to}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">
                      UGX {activeTask.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Phone className="h-4 w-4" />
                    Call Client
                  </Button>
                  {getNextStatus(activeTask.status) && (
                    <Button
                      size="sm"
                      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleTransition(activeTask.id, getNextStatus(activeTask.status)!)}
                      disabled={transitioning === activeTask.id}
                    >
                      {transitioning === activeTask.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Update Status
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    filter === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <Card className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No Tasks Found</h3>
                  <p className="text-sm text-gray-500">
                    {filter === 'all' 
                      ? 'You have no tasks yet. Go online to start receiving requests.'
                      : `No ${filter} tasks at the moment.`}
                  </p>
                </div>
              </Card>
            )}

            {/* Tasks List */}
            {filteredTasks.length > 0 && (
              <div className="space-y-3 pb-6">
                {filteredTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        getTypeColor(task.type)
                      )}>
                        {getTypeIcon(task.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{getTypeLabel(task.type)}</p>
                            <p className="text-xs text-gray-400">{task.taskNumber}</p>
                          </div>
                          <Badge className={cn(
                            statusConfig[task.status]?.bgColor,
                            statusConfig[task.status]?.color
                          )}>
                            {statusConfig[task.status]?.label || task.status}
                          </Badge>
                        </div>
                        
                        {/* Route */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                              <MapPin className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="text-gray-600 truncate">{task.from}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                              <Navigation className="h-3 w-3 text-orange-600" />
                            </div>
                            <span className="text-gray-600 truncate">{task.to}</span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.createdAt}
                            </span>
                            <span>{task.distance} km</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-emerald-600">
                              UGX {task.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <Card className="w-full max-w-md rounded-t-3xl rounded-b-none p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Task Details</h3>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  getTypeColor(selectedTask.type)
                )}>
                  {getTypeIcon(selectedTask.type)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{getTypeLabel(selectedTask.type)}</p>
                  <p className="text-sm text-gray-500">{selectedTask.taskNumber}</p>
                </div>
                <Badge className={cn(
                  'ml-auto',
                  statusConfig[selectedTask.status]?.bgColor,
                  statusConfig[selectedTask.status]?.color
                )}>
                  {statusConfig[selectedTask.status]?.label || selectedTask.status}
                </Badge>
              </div>

              {/* Route Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="font-medium text-gray-900">{selectedTask.from}</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-gray-200 ml-4 h-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Navigation className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="font-medium text-gray-900">{selectedTask.to}</p>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{selectedTask.clientName}</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors">
                    <Phone className="h-5 w-5 text-emerald-600" />
                  </button>
                  <button className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* Earnings */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Your Earnings</span>
                <span className="text-xl font-bold text-emerald-600">
                  UGX {selectedTask.amount.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'CANCELLED' && selectedTask.status !== 'CLOSED' && selectedTask.status !== 'FAILED' && (
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1">
                    Cancel Task
                  </Button>
                  {getNextStatus(selectedTask.status) && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                      onClick={() => handleTransition(selectedTask.id, getNextStatus(selectedTask.status)!)}
                      disabled={transitioning === selectedTask.id}
                    >
                      {transitioning === selectedTask.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Update Status
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
