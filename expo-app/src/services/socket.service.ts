// ============================================
// SMART RIDE MOBILE - REALTIME SERVICE
// ============================================
// Supabase Realtime client for Expo React Native.
// Replaces Socket.io with Supabase Realtime channels.
// Same API surface as the old SocketService — consuming code unchanged.
// ============================================

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { secureStorage } from '../utils/secureStorage';

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

  /** Consecutive failures per channel, reset the moment it subscribes. */
  private channelRetries: Map<string, number> = new Map();
  private channelRecoveryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static readonly MAX_CHANNEL_RETRIES = 5;

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
      const token = await secureStorage.getAccessToken();
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

    // Incoming call — caller initiated a session, this user is the recipient
    channel.on('broadcast', { event: 'call:incoming' }, (payload) => {
      this.emitLocal('call:incoming', payload.payload);
    });

    // Remote call ended (caller hung up or cancelled)
    channel.on('broadcast', { event: 'call:ended' }, (payload) => {
      this.emitLocal('call:ended', payload.payload);
    });
  }

  /**
   * Create a Supabase Realtime channel and track it.
   *
   * A channel failure is recovered CHANNEL-LOCALLY. It used to call
   * scheduleReconnect(), which tears down every channel and rebuilds the whole
   * connection — so a chat room nobody was looking at could knock out the
   * `user:` channel that carries ride offers. One broken subscription became a
   * total realtime outage, and each teardown opened a window in which a
   * broadcast offer arrives and is dropped (Supabase broadcast has no replay).
   *
   * Only the personal `user:` channel escalates to a full reconnect, and only
   * after its own retries are exhausted — that one genuinely is the connection
   * as far as this app is concerned.
   */
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

    this.channels.set(name, channel);
    this.bindStatus(name, channel);
    return channel;
  }

  /** Attach the subscribe-status handler that owns per-channel recovery. */
  private bindStatus(name: string, channel: RealtimeChannel): void {
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        const wasRetrying = (this.channelRetries.get(name) ?? 0) > 0;
        this.channelRetries.set(name, 0);
        console.log(`[Realtime] Subscribed to: ${name}`);

        if (wasRetrying) {
          // The channel is live again, but anything broadcast while it was
          // down is gone for good. Tell listeners to re-read authoritative
          // state from the API rather than assume the screen is still correct.
          this.emitLocal('connection:changed', { connected: true });
          this.emitLocal('realtime:resubscribed', { channel: name });
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Realtime] ${status}: ${name}`);
        this.recoverChannel(name);
      }
    });
  }

  /**
   * Re-join one channel, with backoff, without disturbing the others.
   * Bindings live on the channel object, so re-subscribing the same object
   * restores every `.on()` handler that was registered against it.
   */
  private recoverChannel(name: string): void {
    if (this.intentionalDisconnect) return;
    if (this.channelRecoveryTimers.has(name)) return; // already in flight

    const attempt = (this.channelRetries.get(name) ?? 0) + 1;
    this.channelRetries.set(name, attempt);

    if (attempt > SocketService.MAX_CHANNEL_RETRIES) {
      console.error(`[Realtime] ${name} failed ${attempt - 1}x — giving up on this channel`);
      // The personal channel IS the connection: without it there are no
      // offers, no call invites and no notifications, so a full rebuild is
      // warranted. Any other channel stays down alone.
      if (name.startsWith('user:')) {
        this.emitLocal('connection:changed', { connected: false });
        this.scheduleReconnect();
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
    console.log(`[Realtime] Re-joining ${name} in ${delay}ms (attempt ${attempt})`);

    const timer = setTimeout(async () => {
      this.channelRecoveryTimers.delete(name);
      const channel = this.channels.get(name);
      if (!channel || this.intentionalDisconnect) return;

      try {
        // subscribe() throws if the channel is already joined/joining, so the
        // socket must be told to leave before we ask to re-join.
        await channel.unsubscribe();
        this.bindStatus(name, channel);
      } catch (e) {
        console.warn(`[Realtime] Re-join of ${name} failed:`, e);
        this.recoverChannel(name);
      }
    }, delay);

    this.channelRecoveryTimers.set(name, timer);
  }

  /**
   * Remove a channel and everything tracking it. Leaving the retry counter or
   * a pending recovery timer behind would resurrect a channel the screen has
   * deliberately left.
   */
  private dropChannel(name: string): void {
    const timer = this.channelRecoveryTimers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.channelRecoveryTimers.delete(name);
    }
    this.channelRetries.delete(name);

    const channel = this.channels.get(name);
    if (channel) {
      this.supabase?.removeChannel(channel);
      this.channels.delete(name);
    }
  }

  /** Cancel every in-flight per-channel recovery. */
  private clearChannelRecovery(): void {
    this.channelRecoveryTimers.forEach(t => clearTimeout(t));
    this.channelRecoveryTimers.clear();
    this.channelRetries.clear();
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.clearAllRequestExpiryTimers();
    this.clearChannelRecovery();

    for (const channel of this.channels.values()) {
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
    this.dropChannel(`driver:${driverId}`);
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

    console.log('[Realtime] Joined task room:', taskId);
  }

  leaveTaskRoom(taskId: string): void {
    this.currentTaskRoom = null;

    this.dropChannel(`task:${taskId}`);
    console.log('[Realtime] Left task room:', taskId);
  }

  // ==========================================
  // RIDER METHODS
  // ==========================================

  async joinRiderRoom(riderId: string): Promise<void> {
    // Awaited deliberately: connect() is what creates the Supabase client, and
    // createChannel() below throws outright if it is still null. Firing this
    // off un-awaited meant the very first join after a cold start could throw
    // before the client existed.
    if (!this.isConnected) await this.connect();
    if (!this.supabase) return;

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
    this.dropChannel(`rider:${riderId}`);
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
    this.dropChannel(`chat:${roomId}`);
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
  // WHY THERE IS NO postgres_changes FALLBACK
  // ==========================================
  // A `db:task:<id>` channel used to subscribe to Postgres Changes on Task and
  // was documented as "defense-in-depth ... ensuring the client never misses
  // updates". It did nothing of the kind. Measured against the live project:
  //
  //   subscribe status : SUBSCRIBED
  //   rows delivered   : 0
  //
  // Realtime evaluates RLS as the subscriber's role, and Task's SELECT policy
  // is `"clientId" = current_setting('app.current_user_id')` — a session
  // variable the API sets on its own pooled connection and which does not, and
  // cannot, exist on a Realtime connection. So the channel reported success
  // and silently delivered nothing, forever.
  //
  // It could only be made to work by granting the public anon key SELECT on
  // Task, which would let anyone holding a key that ships inside the APK read
  // every trip on the platform. Not a trade worth making for a backup path.
  //
  // Broadcast (which the server pushes explicitly, and which is verified
  // working) is the real-time mechanism. The actual safety net is the
  // `realtime:resubscribed` event above: after any gap, screens re-read
  // authoritative state from the API instead of trusting what they last saw.

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
    this.clearChannelRecovery();
    for (const channel of this.channels.values()) {
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

  /**
   * Schedule a full reconnect with exponential backoff.
   *
   * The backoff used to be decorative: connect() reset `reconnectAttempts` to
   * 0 on every success, and a reconnect that succeeds at the socket level then
   * fails at the channel level counts as a success. The exponent was therefore
   * always 0 and the delay always 1000ms — a permanently unhealthy channel
   * rebuilt the entire connection once a second, forever, which is what filled
   * logcat with `Channel error` and kept the offer window closed.
   *
   * The counter is now cleared only when a channel actually reaches
   * SUBSCRIBED, so repeated failure genuinely backs off toward 30s.
   */
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
