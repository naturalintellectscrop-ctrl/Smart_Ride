// ============================================
// SMART RIDE MOBILE - REALTIME SERVICE
// ============================================
// Supabase Realtime client for Expo React Native.
// Replaces Socket.io with Supabase Realtime channels.
// Renamed from SocketService → RealtimeService for clarity.
// ============================================

import { createClient, SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { secureStorage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../constants';

// ============================================
// TYPES
// ============================================

interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
}

interface IncomingRequest {
  task: {
    id: string;
    taskNumber: string;
    taskType: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    totalAmount: number;
    paymentMethod: string;
    status: string;
  };
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  expiresAt: string;
  distance?: number;
  estimatedDuration?: number;
}

interface TaskUpdate {
  taskId: string;
  status: string;
  timestamp: string;
}

interface OrderUpdate {
  orderId: string;
  status: string;
  timestamp: string;
}

interface PaymentUpdate {
  paymentId: string;
  status: string;
  taskId?: string;
  timestamp: string;
}

// Type for Postgres Changes payload records
type PostgresRecord = Record<string, unknown>;

// Channel tracking for re-subscription
interface TrackedRoom {
  type: 'task' | 'driver' | 'rider' | 'order';
  id: string;
}

// ============================================
// REALTIME SERVICE CLASS
// ============================================

class RealtimeService {
  private supabase: SupabaseClient | null = null;
  private _connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private channels: Map<string, RealtimeChannel> = new Map();
  private realtimeAvailable: boolean = false;

  // Track current user
  private currentUserId: string | null = null;
  private currentToken: string | null = null;

  // Track rooms for re-subscription on reconnect
  private currentTaskRoom: string | null = null;
  private currentDriverRoom: string | null = null;
  private currentRiderRoom: string | null = null;
  private currentOrderRoom: string | null = null;

  // Track all active rooms for robust reconnect
  private activeRooms: TrackedRoom[] = [];

  // Track expiry timers for incoming driver requests
  private requestExpiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  async connect(token?: string): Promise<void> {
    if (this._connected) {
      console.log('[Realtime] Already connected');
      return;
    }

    try {
      // Token can be passed directly (from useRealtime hook) or read from SecureStore
      let authToken = token;
      if (!authToken) {
        // Read from SecureStore (encrypted storage)
        try {
          authToken = await secureStorage.getAccessToken() || undefined;
        } catch {
          console.warn('[Realtime] Failed to read token from SecureStore');
        }
      }

      if (!authToken) {
        console.warn('[Realtime] No auth token found');
        return;
      }

      this.currentToken = authToken;

      // Extract userId from JWT
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        this.currentUserId = payload.userId || payload.sub || '';
      } catch {
        this.currentUserId = '';
      }

      // Initialize Supabase client
      this.initSupabase();

      // Subscribe to personal channel for user-specific events
      this.subscribeToUserChannel();

      this._connected = true;
      this.reconnectAttempts = 0;
      this.emitLocal('connection:changed', { connected: true });

      console.log('[Realtime] Connected as user:', this.currentUserId);
    } catch (error) {
      console.error('[Realtime] Connection error:', error);
      this.reconnectAttempts++;
      this.emitLocal('connection:error', { error: String(error), attempts: this.reconnectAttempts });
    }
  }

  private initSupabase(): void {
    if (this.supabase) return;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('your_supabase')) {
      console.warn('[Realtime] ⚠️ Supabase credentials not configured — real-time events disabled');
      console.warn('[Realtime] Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env');
      console.warn('[Realtime] Get keys from: https://supabase.com/dashboard → Settings → API');
      this.realtimeAvailable = false;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      this.realtimeAvailable = true;
      console.log('[Realtime] Supabase client initialized');
    } catch (error) {
      console.error('[Realtime] Failed to initialize Supabase client:', error);
      this.realtimeAvailable = false;
    }
  }

  /** Subscribe to user's personal channel */
  private subscribeToUserChannel(): void {
    if (!this.supabase || !this.currentUserId) return;

    const channelName = `user:${this.currentUserId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.createChannel(channelName);

    // Driver events
    channel.on('broadcast', { event: 'driver:request' }, (payload) => {
      const data = payload.payload as IncomingRequest;
      this.emitLocal('driver:request', data);
      if (data.task?.id && data.expiresAt) {
        this.scheduleRequestExpiry(data.task.id, data.expiresAt);
      }
    });

    channel.on('broadcast', { event: 'driver:request:cancelled' }, (payload) => {
      this.emitLocal('driver:request:cancelled', payload.payload);
      const d = payload.payload as { taskId: string };
      if (d?.taskId) this.clearRequestExpiryTimer(d.taskId);
    });

    channel.on('broadcast', { event: 'driver:task:updated' }, (payload) => {
      this.emitLocal('driver:task:updated', payload.payload);
    });

    // Dispatch events
    channel.on('broadcast', { event: 'dispatch:match' }, (payload) => {
      this.emitLocal('dispatch:match', payload.payload);
    });

    channel.on('broadcast', { event: 'dispatch:new-task' }, (payload) => {
      this.emitLocal('dispatch:new-task', payload.payload);
      this.emitLocal('dispatch:match', payload.payload); // backward compat
    });

    channel.on('broadcast', { event: 'dispatch:assignment' }, (payload) => {
      this.emitLocal('dispatch:assignment', payload.payload);
    });

    // Client events
    channel.on('broadcast', { event: 'rider:task:created' }, (payload) => {
      this.emitLocal('rider:task:created', payload.payload);
    });

    channel.on('broadcast', { event: 'rider:task:matched' }, (payload) => {
      this.emitLocal('rider:task:matched', payload.payload);
    });

    channel.on('broadcast', { event: 'rider:task:completed' }, (payload) => {
      this.emitLocal('rider:task:completed', payload.payload);
    });

    // Task status
    channel.on('broadcast', { event: 'task:status:update' }, (payload) => {
      this.emitLocal('task:status:update', payload.payload);
    });

    // Notifications
    channel.on('broadcast', { event: 'notification' }, (payload) => {
      this.emitLocal('notification', payload.payload);
    });

    // Incoming call — caller initiated a session, recipient must answer or decline
    channel.on('broadcast', { event: 'call:incoming' }, (payload) => {
      this.emitLocal('call:incoming', payload.payload);
    });

    // Call ended remotely (caller cancelled or other participant ended)
    channel.on('broadcast', { event: 'call:ended' }, (payload) => {
      this.emitLocal('call:ended', payload.payload);
    });
  }

  /** Create a Supabase Realtime channel and track it */
  private createChannel(name: string): RealtimeChannel {
    if (!this.supabase) {
      throw new Error('[Realtime] Supabase not initialized');
    }

    const channel = this.supabase.channel(name, {
      config: {
        broadcast: { self: false },
        presence: { key: this.currentUserId || '' },
      },
    });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to: ${name}`);
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

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.clearAllRequestExpiryTimers();

    for (const [name, channel] of this.channels.entries()) {
      this.supabase?.removeChannel(channel);
    }
    this.channels.clear();

    this._connected = false;
    this.currentToken = null;
    this.currentUserId = null;
    this.currentTaskRoom = null;
    this.currentDriverRoom = null;
    this.currentRiderRoom = null;
    this.currentOrderRoom = null;
    this.activeRooms = [];

    this.emitLocal('connection:changed', { connected: false, reason: 'intentional' });
    console.log('[Realtime] Disconnected');
  }

  isConnected(): boolean {
    return this._connected;
  }

  /** Check if Supabase Realtime is available (credentials configured) */
  isRealtimeAvailable(): boolean {
    return this.realtimeAvailable;
  }

  // ==========================================
  // DRIVER METHODS
  // ==========================================

  joinDriverRoom(driverId: string): void {
    if (!this._connected) this.connect();

    this.currentDriverRoom = driverId;
    const channelName = `driver:${driverId}`;
    if (!this.channels.has(channelName)) {
      this.createChannel(channelName);
    }
    this.addTrackedRoom('driver', driverId);
    console.log('[Realtime] Joined driver room:', driverId);
  }

  leaveDriverRoom(driverId: string): void {
    if (this.currentDriverRoom === driverId) {
      this.currentDriverRoom = null;
    }
    const channelName = `driver:${driverId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }
    this.removeTrackedRoom('driver', driverId);
    console.log('[Realtime] Left driver room:', driverId);
  }

  updateLocation(location: LocationUpdate): void {
    if (!this._connected || !this.currentUserId) return;

    const payload = {
      riderId: this.currentUserId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading || 0,
      speed: location.speed || 0,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to task room if in one
    if (this.currentTaskRoom) {
      const channel = this.channels.get(`task:${this.currentTaskRoom}`);
      channel?.send({
        type: 'broadcast',
        event: 'rider:location:update',
        payload,
      });
    }

    // Also broadcast to rider's personal channel
    const riderChannel = this.channels.get(`rider:${this.currentUserId}`);
    if (riderChannel) {
      riderChannel.send({
        type: 'broadcast',
        event: 'rider:location:update',
        payload,
      });
    }
  }

  acceptRequest(taskId: string): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot accept request - not connected');
      return;
    }
    // Accept is handled via API call, not realtime broadcast
    this.clearRequestExpiryTimer(taskId);
    console.log('[Realtime] Accepted request:', taskId);
  }

  rejectRequest(taskId: string): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot reject request - not connected');
      return;
    }
    this.clearRequestExpiryTimer(taskId);
    console.log('[Realtime] Rejected request:', taskId);
  }

  // ==========================================
  // TASK ROOM METHODS
  // ==========================================

  /**
   * Join a task room to receive real-time updates for a specific task.
   * Subscribes to both broadcast events and Postgres Changes (defense-in-depth).
   */
  joinTaskRoom(taskId: string): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot join task room - not connected');
      return;
    }

    this.currentTaskRoom = taskId;
    const channelName = `task:${taskId}`;

    if (!this.channels.has(channelName)) {
      const channel = this.createChannel(channelName);

      // Listen for task-specific broadcasts
      channel.on('broadcast', { event: 'task:status:update' }, (payload) => {
        this.emitLocal('task:status:update', payload.payload);
      });

      channel.on('broadcast', { event: 'rider:location:update' }, (payload) => {
        const data = payload.payload as LocationUpdate & { driverId?: string };
        this.emitLocal('rider:location:update', data);
        this.emitLocal('rider:driver:location', data); // backward compat
      });

      channel.on('broadcast', { event: 'rider:task:matched' }, (payload) => {
        this.emitLocal('rider:task:matched', payload.payload);
      });

      channel.on('broadcast', { event: 'notification' }, (payload) => {
        this.emitLocal('notification', payload.payload);
      });
    }

    // Also subscribe to DB changes for this task (defense-in-depth)
    this.subscribeToTaskChanges(taskId);

    // Track room for reconnect
    this.addTrackedRoom('task', taskId);

    console.log('[Realtime] Joined task room:', taskId);
  }

  leaveTaskRoom(taskId: string): void {
    if (this.currentTaskRoom === taskId) {
      this.currentTaskRoom = null;
    }

    const channelName = `task:${taskId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }

    const dbChannelName = `db:task:${taskId}`;
    const dbChannel = this.channels.get(dbChannelName);
    if (dbChannel) {
      this.supabase?.removeChannel(dbChannel);
      this.channels.delete(dbChannelName);
    }

    this.removeTrackedRoom('task', taskId);
    console.log('[Realtime] Left task room:', taskId);
  }

  // ==========================================
  // ORDER ROOM METHODS
  // ==========================================

  /**
   * Join an order room to receive real-time updates for a specific order.
   * Subscribes to broadcast events AND Postgres Changes on the Order table.
   */
  joinOrderRoom(orderId: string): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot join order room - not connected');
      return;
    }

    this.currentOrderRoom = orderId;
    const channelName = `order:${orderId}`;

    if (!this.channels.has(channelName)) {
      const channel = this.createChannel(channelName);

      // Listen for order-specific broadcasts
      channel.on('broadcast', { event: 'order:status:update' }, (payload) => {
        this.emitLocal('order:status:update', payload.payload);
      });

      channel.on('broadcast', { event: 'notification' }, (payload) => {
        this.emitLocal('notification', payload.payload);
      });
    }

    // Subscribe to DB changes for this order (defense-in-depth)
    this.subscribeToOrderChanges(orderId);

    this.addTrackedRoom('order', orderId);
    console.log('[Realtime] Joined order room:', orderId);
  }

  leaveOrderRoom(orderId: string): void {
    if (this.currentOrderRoom === orderId) {
      this.currentOrderRoom = null;
    }

    const channelName = `order:${orderId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }

    const dbChannelName = `db:order:${orderId}`;
    const dbChannel = this.channels.get(dbChannelName);
    if (dbChannel) {
      this.supabase?.removeChannel(dbChannel);
      this.channels.delete(dbChannelName);
    }

    this.removeTrackedRoom('order', orderId);
    console.log('[Realtime] Left order room:', orderId);
  }

  // ==========================================
  // RIDER METHODS
  // ==========================================

  joinRiderRoom(riderId: string): void {
    if (!this._connected) this.connect();

    this.currentRiderRoom = riderId;
    const channelName = `rider:${riderId}`;
    if (!this.channels.has(channelName)) {
      const channel = this.createChannel(channelName);

      channel.on('broadcast', { event: 'rider:location:update' }, (payload) => {
        this.emitLocal('rider:location:update', payload.payload);
      });
    }
    this.addTrackedRoom('rider', riderId);
    console.log('[Realtime] Joined rider room:', riderId);
  }

  leaveRiderRoom(riderId: string): void {
    if (this.currentRiderRoom === riderId) {
      this.currentRiderRoom = null;
    }
    const channelName = `rider:${riderId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }
    this.removeTrackedRoom('rider', riderId);
    console.log('[Realtime] Left rider room:', riderId);
  }

  // ==========================================
  // CHAT METHODS
  // ==========================================

  chatSend(roomId: string, message: any): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot send chat message - not connected');
      return;
    }

    const channelName = `chat:${roomId}`;
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = this.createChannel(channelName);
    }

    channel.send({
      type: 'broadcast',
      event: 'chat:message',
      payload: { roomId, message, timestamp: new Date().toISOString() },
    });
  }

  chatJoin(roomId: string): void {
    if (!this._connected) {
      console.warn('[Realtime] Cannot join chat room - not connected');
      return;
    }

    const channelName = `chat:${roomId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.createChannel(channelName);

    channel.on('broadcast', { event: 'chat:message' }, (payload) => {
      this.emitLocal('chat:message', payload.payload);
    });

    channel.on('broadcast', { event: 'chat:typing' }, (payload) => {
      this.emitLocal('chat:typing', payload.payload);
    });

    console.log('[Realtime] Joined chat room:', roomId);
  }

  chatLeave(roomId: string): void {
    const channelName = `chat:${roomId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }
    console.log('[Realtime] Left chat room:', roomId);
  }

  chatTyping(roomId: string, isTyping: boolean): void {
    if (!this._connected) return;

    const channelName = `chat:${roomId}`;
    let channel = this.channels.get(channelName);
    if (!channel) return; // Must join first

    channel.send({
      type: 'broadcast',
      event: 'chat:typing',
      payload: { roomId, userId: this.currentUserId, isTyping },
    });
  }

  // ==========================================
  // EVENT LISTENERS (same API as before)
  // ==========================================

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback?: Function): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  private emitLocal(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Realtime] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // ==========================================
  // DB CHANGES SUBSCRIPTION (Defense-in-Depth)
  // ==========================================
  // Broadcast is the primary real-time mechanism (server explicitly pushes).
  // Postgres Changes is a backup — it catches direct DB mutations that bypass
  // the server's broadcastEvent() calls, ensuring the client never misses updates.
  // ==========================================

  private subscribeToTaskChanges(taskId: string): void {
    if (!this.supabase) return;

    const channelName = `db:task:${taskId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.supabase
      .channel(channelName)
      .on<PostgresRecord>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Task',
          filter: `id=eq.${taskId}`,
        },
        (payload: RealtimePostgresChangesPayload<PostgresRecord>) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newRecord = payload.new as PostgresRecord;
            this.emitLocal('task:status:update', {
              taskId: newRecord.id as string,
              status: newRecord.status as string,
              riderId: newRecord.riderId as string | null,
              connectionStatus: newRecord.connectionStatus as string | null,
              lastKnownLatitude: newRecord.lastKnownLatitude as number | null,
              lastKnownLongitude: newRecord.lastKnownLongitude as number | null,
              timestamp: new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
  }

  /** Subscribe to Postgres Changes for a specific Order (defense-in-depth) */
  private subscribeToOrderChanges(orderId: string): void {
    if (!this.supabase) return;

    const channelName = `db:order:${orderId}`;
    if (this.channels.has(channelName)) return;

    const channel = this.supabase
      .channel(channelName)
      .on<PostgresRecord>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Order',
          filter: `id=eq.${orderId}`,
        },
        (payload: RealtimePostgresChangesPayload<PostgresRecord>) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newRecord = payload.new as PostgresRecord;
            this.emitLocal('order:status:update', {
              orderId: newRecord.id as string,
              status: newRecord.status as string,
              paymentStatus: newRecord.paymentStatus as string,
              timestamp: new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
  }

  // ==========================================
  // ROOM TRACKING (for robust reconnect)
  // ==========================================

  private addTrackedRoom(type: TrackedRoom['type'], id: string): void {
    // Avoid duplicates
    if (!this.activeRooms.some(r => r.type === type && r.id === id)) {
      this.activeRooms.push({ type, id });
    }
  }

  private removeTrackedRoom(type: TrackedRoom['type'], id: string): void {
    this.activeRooms = this.activeRooms.filter(r => !(r.type === type && r.id === id));
  }

  // ==========================================
  // REQUEST EXPIRY TIMER
  // ==========================================

  private scheduleRequestExpiry(taskId: string, expiresAt: string): void {
    this.clearRequestExpiryTimer(taskId);

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const delay = expiryTime - now;

    if (delay <= 0) {
      this.emitLocal('driver:request:expired', { taskId });
      return;
    }

    const timer = setTimeout(() => {
      this.emitLocal('driver:request:expired', { taskId });
      this.requestExpiryTimers.delete(taskId);
    }, delay);

    this.requestExpiryTimers.set(taskId, timer);
  }

  private clearRequestExpiryTimer(taskId: string): void {
    const timer = this.requestExpiryTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.requestExpiryTimers.delete(taskId);
    }
  }

  private clearAllRequestExpiryTimers(): void {
    this.requestExpiryTimers.forEach((timer) => clearTimeout(timer));
    this.requestExpiryTimers.clear();
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async reconnect(): Promise<void> {
    this.intentionalDisconnect = false;

    // Save room memberships before cleaning up
    const savedRooms = [...this.activeRooms];

    // Clean up channels without clearing listeners
    for (const [name, channel] of this.channels.entries()) {
      this.supabase?.removeChannel(channel);
    }
    this.channels.clear();
    this._connected = false;
    this.currentToken = null;
    this.currentUserId = null;

    await this.connect();

    // Re-join all rooms that were active before reconnect
    if (this._connected) {
      for (const room of savedRooms) {
        switch (room.type) {
          case 'task':
            this.joinTaskRoom(room.id);
            break;
          case 'driver':
            this.joinDriverRoom(room.id);
            break;
          case 'rider':
            this.joinRiderRoom(room.id);
            break;
          case 'order':
            this.joinOrderRoom(room.id);
            break;
        }
      }
      console.log(`[Realtime] Re-joined ${savedRooms.length} rooms after reconnect`);
    }
  }

  /** Schedule a reconnect attempt with exponential backoff */
  private scheduleReconnect(): void {
    if (this.intentionalDisconnect) return;
    if (this.reconnectTimer) return; // Already scheduling

    const INITIAL_DELAY = 1000;
    const MAX_DELAY = 30000;
    const MULTIPLIER = 2;

    this.reconnectAttempts++;
    const delay = Math.min(
      INITIAL_DELAY * Math.pow(MULTIPLIER, this.reconnectAttempts - 1),
      MAX_DELAY
    );

    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.intentionalDisconnect) {
        await this.reconnect();
        if (this._connected) {
          this.reconnectAttempts = 0;
        }
      }
    }, delay);
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
// EXPORT SINGLETON
// ============================================

export const realtimeService = new RealtimeService();
export default realtimeService;

console.log('[REALTIME-SERVICE] Supabase Realtime service initialized');
