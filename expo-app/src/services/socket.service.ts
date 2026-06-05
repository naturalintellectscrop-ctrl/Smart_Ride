// ============================================
// SMART RIDE MOBILE - REALTIME SERVICE
// ============================================
// Supabase Realtime client for Expo React Native.
// Replaces Socket.io with Supabase Realtime channels.
// Same API surface as the old SocketService — consuming code unchanged.
// ============================================

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// ============================================
// REALTIME SERVICE CLASS
// ============================================

class SocketService {
  private supabase: SupabaseClient | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private channels: Map<string, RealtimeChannel> = new Map();

  // Track current user
  private currentUserId: string | null = null;
  private currentToken: string | null = null;

  // Track rooms for re-subscription on reconnect
  private currentTaskRoom: string | null = null;
  private currentDriverRoom: string | null = null;
  private currentRiderRoom: string | null = null;

  // Track expiry timers for incoming driver requests
  private requestExpiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('[Realtime] Already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.authToken);
      if (!token) {
        console.warn('[Realtime] No auth token found');
        return;
      }

      this.currentToken = token;

      // Extract userId from JWT
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

      this.isConnected = true;
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

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Realtime] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
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

    this.isConnected = false;
    this.currentToken = null;
    this.currentUserId = null;
    this.currentTaskRoom = null;
    this.currentDriverRoom = null;
    this.currentRiderRoom = null;

    this.emitLocal('connection:changed', { connected: false, reason: 'intentional' });
    console.log('[Realtime] Disconnected');
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // ==========================================
  // DRIVER METHODS
  // ==========================================

  async joinDriverRoom(driverId: string): Promise<void> {
    if (!this.isConnected) await this.connect();

    this.currentDriverRoom = driverId;
    const channelName = `driver:${driverId}`;
    if (!this.channels.has(channelName)) {
      this.createChannel(channelName);
    }
    console.log('[Realtime] Joined driver room:', driverId);
  }

  leaveDriverRoom(driverId: string): void {
    this.currentDriverRoom = null;
    const channelName = `driver:${driverId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }
    console.log('[Realtime] Left driver room:', driverId);
  }

  updateLocation(location: LocationUpdate): void {
    if (!this.isConnected || !this.currentUserId) return;

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
    if (!this.isConnected) {
      console.warn('[Realtime] Cannot accept request - not connected');
      return;
    }
    // Accept is handled via API call, not realtime broadcast
    this.clearRequestExpiryTimer(taskId);
    console.log('[Realtime] Accepted request:', taskId);
  }

  rejectRequest(taskId: string): void {
    if (!this.isConnected) {
      console.warn('[Realtime] Cannot reject request - not connected');
      return;
    }
    this.clearRequestExpiryTimer(taskId);
    console.log('[Realtime] Rejected request:', taskId);
  }

  // ==========================================
  // TASK ROOM METHODS
  // ==========================================

  joinTaskRoom(taskId: string): void {
    if (!this.isConnected) {
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

    // Also subscribe to DB changes for this task
    this.subscribeToTaskChanges(taskId);

    console.log('[Realtime] Joined task room:', taskId);
  }

  leaveTaskRoom(taskId: string): void {
    this.currentTaskRoom = null;

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

    console.log('[Realtime] Left task room:', taskId);
  }

  // ==========================================
  // RIDER METHODS
  // ==========================================

  joinRiderRoom(riderId: string): void {
    if (!this.isConnected) this.connect();

    this.currentRiderRoom = riderId;
    const channelName = `rider:${riderId}`;
    if (!this.channels.has(channelName)) {
      const channel = this.createChannel(channelName);

      channel.on('broadcast', { event: 'rider:location:update' }, (payload) => {
        this.emitLocal('rider:location:update', payload.payload);
      });
    }
    console.log('[Realtime] Joined rider room:', riderId);
  }

  leaveRiderRoom(riderId: string): void {
    this.currentRiderRoom = null;
    const channelName = `rider:${riderId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(channelName);
    }
    console.log('[Realtime] Left rider room:', riderId);
  }

  // ==========================================
  // CHAT METHODS
  // ==========================================

  chatSend(roomId: string, message: any): void {
    if (!this.isConnected) {
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
    if (!this.isConnected) {
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
    if (!this.isConnected) return;

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
  // DB CHANGES SUBSCRIPTION
  // ==========================================

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
              timestamp: new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
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
    const savedTaskRoom = this.currentTaskRoom;
    const savedDriverRoom = this.currentDriverRoom;
    const savedRiderRoom = this.currentRiderRoom;

    // Clean up channels without clearing listeners
    for (const [name, channel] of this.channels.entries()) {
      this.supabase?.removeChannel(channel);
    }
    this.channels.clear();
    this.isConnected = false;
    this.currentToken = null;
    this.currentUserId = null;

    await this.connect();

    // Re-join rooms that were active before reconnect
    if (this.isConnected) {
      if (savedDriverRoom) {
        this.joinDriverRoom(savedDriverRoom);
      }
      if (savedTaskRoom) {
        this.joinTaskRoom(savedTaskRoom);
      }
      if (savedRiderRoom) {
        this.joinRiderRoom(savedRiderRoom);
      }
      console.log('[Realtime] Re-joined rooms after reconnect');
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
        if (this.isConnected) {
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

export const socketService = new SocketService();
export default socketService;

console.log('[REALTIME-SERVICE] Supabase Realtime service initialized');
