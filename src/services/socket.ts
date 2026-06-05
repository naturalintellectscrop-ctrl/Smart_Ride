// ============================================
// SMART RIDE WEB - REALTIME SERVICE
// ============================================
// Supabase Realtime client for Next.js web context.
// Replaces Socket.io with Supabase Realtime channels.
// - Singleton pattern (prevents duplicate connections)
// - Same API surface as the old SocketService
// - Uses Supabase Broadcast for real-time events
// - Uses Supabase Presence for online tracking
// - Uses Supabase Postgres Changes for DB-driven events

import { createClient, SupabaseClient, RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js';

// ============================================
// TYPES (same as before — unchanged API surface)
// ============================================

/** Task status values matching Prisma TaskStatus enum */
export type TaskStatus =
  | 'CREATED'
  | 'REQUESTED'
  | 'SEARCHING'
  | 'MATCHING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'ARRIVING'
  | 'PICKED_UP'
  | 'IN_PROGRESS'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'FAILED';

/** Minimal Task shape for socket payloads */
export interface SocketTask {
  id: string;
  status: TaskStatus;
  [key: string]: unknown;
}

/** Location data from rider/driver */
export interface LocationData {
  riderId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp?: string;
}

/** Driver dispatch request payload */
export interface DriverRequestData {
  task: SocketTask;
  matchId?: string;
  pickup: { latitude: number; longitude: number; address: string };
  expiresAt: string;
}

/** Task status update payload */
export interface TaskStatusUpdateData {
  taskId: string;
  status: TaskStatus;
  metadata?: unknown;
  timestamp?: string;
}

/** Rider task matched payload */
export interface RiderTaskMatchedData {
  taskId: string;
  riderId: string;
  matchId?: string;
  timestamp?: string;
}

/** Notification payload */
export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

/** Connection established payload */
export interface ConnectionEstablishedData {
  socketId: string;
  userId: string;
  timestamp: string;
}

/** Socket event map — keys match what the *backend emits* */
export interface SocketEventMap {
  // Connection lifecycle
  connect: undefined;
  disconnect: string; // reason
  'connection:established': ConnectionEstablishedData;

  // Task events (emitted by backend)
  'task:status:update': TaskStatusUpdateData;
  'rider:task:matched': RiderTaskMatchedData;

  // Location events (emitted by backend)
  'rider:location:update': LocationData;

  // Dispatch events (emitted by backend)
  'driver:request': DriverRequestData;

  // General notification (emitted by backend)
  notification: NotificationData;
}

/** Event callback type */
type EventCallback<T> = (data: T) => void;

// ============================================
// CONFIGURATION
// ============================================

const TOKEN_STORAGE_KEY = 'smart_ride_auth_token';

// ============================================
// REALTIME SERVICE CLASS (Singleton)
// ============================================

class RealtimeService {
  private static instance: RealtimeService | null = null;
  private supabase: SupabaseClient | null = null;
  private isConnected = false;
  private isConnecting = false;
  private currentToken: string | null = null;
  private currentUserId: string | null = null;

  // Active channels
  private channels: Map<string, RealtimeChannel> = new Map();

  // Listener management — same pattern as before
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  // Reconnect backoff state
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  private constructor() {}

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  // ------------------------------------------
  // PUBLIC API — Same surface as old SocketService
  // ------------------------------------------

  /** Connect to the realtime service with an auth token */
  connect(token: string, options?: { forceReconnect?: boolean }): void {
    if (!options?.forceReconnect) {
      if (this.isConnected) {
        console.log('[Realtime] Already connected, skipping');
        return;
      }
      if (this.isConnecting) {
        console.log('[Realtime] Connection already in progress, skipping');
        return;
      }
    } else {
      console.log('[Realtime] Force reconnect requested');
      this.clearReconnectTimer();
      this.disconnect();
    }

    if (!token) {
      console.warn('[Realtime] No auth token provided, skipping connection');
      return;
    }

    this.intentionalDisconnect = false;
    this.currentToken = token;
    this.isConnecting = true;

    // Persist token to localStorage for reconnection
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // localStorage may be unavailable (SSR, private mode)
    }

    // Extract userId from JWT token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserId = payload.userId || payload.sub || '';
    } catch {
      this.currentUserId = '';
    }

    // Initialize Supabase client
    this.initSupabase();

    // Subscribe to personal channel for user-specific events
    this.subscribeToUserChannel();

    // Mark as connected immediately (Supabase manages its own connection)
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.emitLocal('connect', undefined);
    this.emitLocal('connection:established', {
      socketId: `sr-${Date.now()}`,
      userId: this.currentUserId || '',
      timestamp: new Date().toISOString(),
    });
  }

  /** Disconnect from the realtime service */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.currentToken = null;

    // Unsubscribe from all channels
    for (const [name, channel] of this.channels.entries()) {
      this.supabase?.removeChannel(channel);
    }
    this.channels.clear();

    this.isConnected = false;
    this.isConnecting = false;

    // NOTE: Do NOT clear listeners on disconnect. Components register
    // listeners independently of connection state. Clearing them here
    // means that after a reconnect, components lose their subscriptions.
    // Listeners are cleaned up via individual `off()` calls in component
    // useEffect cleanup functions, or via `destroy()` for full teardown.

    this.emitLocal('disconnect', 'intentional');
  }

  /** Check if currently connected */
  isConnectedToSocket(): boolean {
    return this.isConnected;
  }

  /** Subscribe to a typed event. Returns an unsubscribe function. */
  on<K extends keyof SocketEventMap>(
    event: K,
    callback: EventCallback<SocketEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);

    return () => {
      this.off(event, callback);
    };
  }

  /** Unsubscribe from a typed event */
  off<K extends keyof SocketEventMap>(
    event: K,
    callback?: EventCallback<SocketEventMap[K]>
  ): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
    } else {
      this.listeners.delete(event);
    }
  }

  /** Emit a raw event (broadcasts via Supabase channel) */
  emit(event: string, data: unknown): void {
    if (!this.isConnected) {
      console.warn('[Realtime] Cannot emit, not connected:', event);
      return;
    }

    // Determine which channel to broadcast on based on the event
    const channelName = this.getChannelForEvent(event, data);
    if (!channelName) {
      console.warn('[Realtime] No channel for event:', event);
      return;
    }

    let channel = this.channels.get(channelName);
    if (!channel && this.supabase) {
      channel = this.createBroadcastChannel(channelName);
    }

    channel?.send({
      type: 'broadcast',
      event,
      payload: data,
    });
  }

  /** Join a task room for real-time updates */
  joinTaskRoom(taskId: string): void {
    const channelName = `task:${taskId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.createBroadcastChannel(channelName);

    // Listen for task-specific events
    channel.on('broadcast', { event: 'task:status:update' }, (payload) => {
      this.emitLocal('task:status:update', payload.payload as TaskStatusUpdateData);
    });

    channel.on('broadcast', { event: 'rider:location:update' }, (payload) => {
      this.emitLocal('rider:location:update', payload.payload as LocationData);
    });

    channel.on('broadcast', { event: 'rider:task:matched' }, (payload) => {
      this.emitLocal('rider:task:matched', payload.payload as RiderTaskMatchedData);
    });

    channel.on('broadcast', { event: 'notification' }, (payload) => {
      this.emitLocal('notification', payload.payload as NotificationData);
    });

    // Also subscribe to DB changes for this task
    this.subscribeToTaskChanges(taskId);
  }

  /** Leave a task room */
  leaveTaskRoom(taskId: string): void {
    const channelName = `task:${taskId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }

    // Also remove the DB changes channel
    const dbChannelName = `db:task:${taskId}`;
    const dbChannel = this.channels.get(dbChannelName);
    if (dbChannel) {
      this.supabase?.removeChannel(dbChannel);
      this.channels.delete(dbChannelName);
    }
  }

  /** Send rider location update */
  updateLocation(data: {
    riderId: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }): void {
    // Broadcast to task room if taskId is provided
    if (data.taskId) {
      const channelName = `task:${data.taskId}`;
      let channel = this.channels.get(channelName);
      if (!channel && this.supabase) {
        channel = this.createBroadcastChannel(channelName);
      }
      channel?.send({
        type: 'broadcast',
        event: 'rider:location:update',
        payload: data,
      });
    }

    // Also broadcast to rider's personal channel
    if (data.riderId) {
      const channelName = `rider:${data.riderId}`;
      let channel = this.channels.get(channelName);
      if (!channel && this.supabase) {
        channel = this.createBroadcastChannel(channelName);
      }
      channel?.send({
        type: 'broadcast',
        event: 'rider:location:update',
        payload: data,
      });
    }
  }

  /** Send driver location update */
  updateDriverLocation(data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }): void {
    if (!this.currentUserId) return;

    const channelName = `rider:${this.currentUserId}`;
    let channel = this.channels.get(channelName);
    if (!channel && this.supabase) {
      channel = this.createBroadcastChannel(channelName);
    }
    channel?.send({
      type: 'broadcast',
      event: 'rider:location:update',
      payload: {
        riderId: this.currentUserId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Try to auto-connect using a stored token (useful on page load)
   *  Checks both the dedicated socket token key and the general accessToken key.
   */
  autoConnect(): boolean {
    try {
      // First check the dedicated socket token key
      let token = localStorage.getItem(TOKEN_STORAGE_KEY);
      // Fall back to the general accessToken key used by the auth system
      if (!token) {
        token = localStorage.getItem('accessToken');
      }
      if (token) {
        this.connect(token);
        return true;
      }
    } catch {
      // localStorage unavailable
    }
    return false;
  }

  /** Get the underlying Socket instance — returns null (compat stub) */
  getSocket(): null {
    return null;
  }

  // ------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------

  /** Initialize the Supabase client */
  private initSupabase(): void {
    if (this.supabase) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Realtime] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log('[Realtime] Supabase client initialized');
  }

  /** Subscribe to user's personal channel for user-specific events */
  private subscribeToUserChannel(): void {
    if (!this.supabase || !this.currentUserId) return;

    const channelName = `user:${this.currentUserId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.createBroadcastChannel(channelName);

    // Listen for dispatch events
    channel.on('broadcast', { event: 'driver:request' }, (payload) => {
      this.emitLocal('driver:request', payload.payload as DriverRequestData);
    });

    channel.on('broadcast', { event: 'dispatch:new-task' }, (payload) => {
      this.emitLocal('driver:request', payload.payload as DriverRequestData);
    });

    channel.on('broadcast', { event: 'notification' }, (payload) => {
      this.emitLocal('notification', payload.payload as NotificationData);
    });

    channel.on('broadcast', { event: 'rider:task:matched' }, (payload) => {
      this.emitLocal('rider:task:matched', payload.payload as RiderTaskMatchedData);
    });
  }

  /** Subscribe to DB changes for a specific task */
  private subscribeToTaskChanges(taskId: string): void {
    if (!this.supabase) return;

    const channelName = `db:task:${taskId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Task',
          filter: `id=eq.${taskId}`,
        },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord) {
            this.emitLocal('task:status:update', {
              taskId: newRecord.id,
              status: newRecord.status,
              metadata: newRecord,
              timestamp: new Date().toISOString(),
            } as TaskStatusUpdateData);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
  }

  /** Create a broadcast channel and track it */
  private createBroadcastChannel(name: string): RealtimeChannel {
    if (!this.supabase) {
      throw new Error('[Realtime] Supabase not initialized');
    }

    const channel = this.supabase.channel(name, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: this.currentUserId || '' },
      },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to channel: ${name}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error: ${name}`);
        this.scheduleReconnect();
      } else if (status === 'TIMED_OUT') {
        console.warn(`[Realtime] Channel timed out: ${name}`);
        this.scheduleReconnect();
      }
    });

    this.channels.set(name, channel);
    return channel;
  }

  /** Determine which channel an event should be broadcast on */
  private getChannelForEvent(event: string, data: unknown): string | null {
    const d = data as Record<string, unknown>;

    switch (event) {
      case 'task:join':
        return `task:${d.taskId || d}`;
      case 'task:leave':
        return `task:${d.taskId || d}`;
      case 'task:status':
      case 'task:status:update':
        return `task:${d.taskId}`;
      case 'rider:location':
      case 'rider:location:update':
        return d.taskId ? `task:${d.taskId}` : d.riderId ? `rider:${d.riderId}` : null;
      case 'driver:location:update':
        return this.currentUserId ? `rider:${this.currentUserId}` : null;
      case 'driver:request':
      case 'dispatch:new-task':
      case 'notification':
      case 'rider:task:matched':
        return d.riderId ? `user:${d.riderId}` : d.userId ? `user:${d.userId}` : null;
      default:
        // For unknown events, try to find a relevant channel
        return null;
    }
  }

  /** Emit to local listeners */
  private emitLocal(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Realtime] Listener error for "${event}":`, err);
        }
      });
    }
  }

  /** Schedule a reconnect attempt with exponential backoff */
  private scheduleReconnect(): void {
    if (this.intentionalDisconnect) return;
    if (this.reconnectTimer) return;

    const INITIAL_DELAY = 1000;
    const MAX_DELAY = 30000;
    const MULTIPLIER = 2;

    this.reconnectAttempts++;
    const delay = Math.min(
      INITIAL_DELAY * Math.pow(MULTIPLIER, this.reconnectAttempts - 1),
      MAX_DELAY
    );

    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, delay);
  }

  /** Attempt a single reconnect */
  private attemptReconnect(): void {
    if (this.intentionalDisconnect) return;
    if (this.isConnected) return;

    const token = this.currentToken || this.getStoredToken();
    if (!token) {
      console.warn('[Realtime] No token available for reconnect, giving up');
      return;
    }

    console.log('[Realtime] Attempting reconnect...');
    this.connect(token, { forceReconnect: true });
  }

  /** Get stored token from localStorage */
  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Clear the reconnect timer */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ============================================
// EXPORTS
// ============================================

/** Singleton instance — always use this */
export const socketService = RealtimeService.getInstance();
export default socketService;
