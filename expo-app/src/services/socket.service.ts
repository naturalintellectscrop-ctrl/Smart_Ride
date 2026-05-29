// ============================================
// SMART RIDE MOBILE - SOCKET SERVICE
// ============================================
// Real-time communication for driver and rider apps
// ============================================

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_CONFIG } from '../constants';

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
// SOCKET SERVICE CLASS
// ============================================

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  // Track current task room for re-subscription on reconnect
  private currentTaskRoom: string | null = null;

  // Track current driver room for re-subscription on reconnect
  private currentDriverRoom: string | null = null;

  // Track current rider room for re-subscription on reconnect
  private currentRiderRoom: string | null = null;

  // Track expiry timers for incoming driver requests
  private requestExpiryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[SOCKET] Already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.authToken);
      
      // Build the socket URL: connect through gateway to realtime service
      // The gateway uses XTransformPort query param to route to the correct service
      let wsUrl: string;
      
      if (API_CONFIG.socketUrl) {
        // Explicit socket URL provided (e.g. for production)
        wsUrl = API_CONFIG.socketUrl;
      } else {
        // Derive from API base URL, add XTransformPort for gateway routing
        const apiBase = API_CONFIG.baseUrl;
        // Strip /api suffix if present, then add gateway routing params
        const baseUrl = apiBase.replace(/\/api$/, '');
        const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const host = baseUrl.replace(/^https?:\/\//, '');
        wsUrl = `${protocol}://${host}/?XTransformPort=${API_CONFIG.realtimePort}`;
      }
      
      console.log('[SOCKET] Connecting to:', wsUrl);

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        // Socket.io path - default is /socket.io/
        path: '/socket.io/',
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('[SOCKET] Connection error:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection:changed', { connected: true });

      // Re-subscribe to rooms after reconnect
      this.resubscribeRooms();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      this.isConnected = false;
      this.emit('connection:changed', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error.message);
      this.reconnectAttempts++;
      this.emit('connection:error', { error: error.message, attempts: this.reconnectAttempts });
    });

    this.socket.on('error', (error) => {
      console.error('[SOCKET] Error:', error);
      this.emit('error', error);
    });

    // ==========================================
    // DRIVER EVENTS (matching backend realtime service)
    // ==========================================

    this.socket.on('driver:request', (data: IncomingRequest) => {
      console.log('[SOCKET] Incoming ride request:', data.task?.id);
      this.emit('driver:request', data);

      // Set up local expiry timer for this request
      this.scheduleRequestExpiry(data.task.id, data.expiresAt);
    });

    this.socket.on('driver:request:cancelled', (data: { taskId: string }) => {
      console.log('[SOCKET] Request cancelled:', data.taskId);
      this.emit('driver:request:cancelled', data);

      // Clear the expiry timer since request was cancelled
      this.clearRequestExpiryTimer(data.taskId);
    });

    this.socket.on('driver:task:updated', (data: TaskUpdate) => {
      console.log('[SOCKET] Task updated:', data);
      this.emit('driver:task:updated', data);
    });

    // ==========================================
    // DISPATCH MATCH EVENTS
    // ==========================================

    this.socket.on('dispatch:match', (data: { matchId: string; taskId: string; riderId: string }) => {
      console.log('[SOCKET] Dispatch match:', data);
      this.emit('dispatch:match', data);
    });

    this.socket.on('dispatch:new-task', (data: { matchId: string; taskId: string; riderId: string }) => {
      console.log('[SOCKET] Dispatch new task:', data);
      this.emit('dispatch:new-task', data);
      // Also emit as dispatch:match for backward compatibility
      this.emit('dispatch:match', data);
    });

    this.socket.on('dispatch:assignment', (data: { taskId: string; riderId: string }) => {
      console.log('[SOCKET] Dispatch assignment:', data);
      this.emit('dispatch:assignment', data);
    });

    // ==========================================
    // CLIENT EVENTS (customer side)
    // ==========================================

    this.socket.on('rider:task:created', (data: TaskUpdate) => {
      console.log('[SOCKET] Task created:', data);
      this.emit('rider:task:created', data);
    });

    this.socket.on('rider:task:matched', (data: any) => {
      console.log('[SOCKET] Driver matched:', data);
      this.emit('rider:task:matched', data);
    });

    // Fixed: server emits 'rider:location:update' not 'rider:driver:location'
    this.socket.on('rider:location:update', (data: LocationUpdate & { driverId: string }) => {
      console.log('[SOCKET] Rider location update:', data);
      this.emit('rider:location:update', data);
      // Also emit under old name for backward compatibility
      this.emit('rider:driver:location', data);
    });

    // Fixed: server emits 'task:status:update' not 'rider:task:status'
    this.socket.on('task:status:update', (data: TaskUpdate) => {
      console.log('[SOCKET] Task status update:', data);
      this.emit('task:status:update', data);
    });

    this.socket.on('rider:task:completed', (data: any) => {
      console.log('[SOCKET] Task completed:', data);
      this.emit('rider:task:completed', data);
    });

    // ==========================================
    // CHAT EVENTS
    // ==========================================

    this.socket.on('chat:message', (data: any) => {
      console.log('[SOCKET] Chat message received');
      this.emit('chat:message', data);
    });

    this.socket.on('chat:typing', (data: { roomId: string; userId: string; isTyping: boolean }) => {
      this.emit('chat:typing', data);
    });

    // Notification events from backend
    this.socket.on('notification', (data: any) => {
      console.log('[SOCKET] Notification received');
      this.emit('notification', data);
    });
  }

  // ==========================================
  // RE-SUBSCRIPTION ON RECONNECT
  // ==========================================

  private resubscribeRooms(): void {
    if (!this.socket?.connected) return;

    // Re-join driver room if previously joined
    if (this.currentDriverRoom) {
      console.log('[SOCKET] Re-subscribing to driver room:', this.currentDriverRoom);
      this.socket.emit('driver:join', { driverId: this.currentDriverRoom });
    }

    // Re-join rider room if previously joined
    if (this.currentRiderRoom) {
      console.log('[SOCKET] Re-subscribing to rider room:', this.currentRiderRoom);
      this.socket.emit('rider:join', { riderId: this.currentRiderRoom });
    }

    // Re-join task room if previously joined
    if (this.currentTaskRoom) {
      console.log('[SOCKET] Re-subscribing to task room:', this.currentTaskRoom);
      this.socket.emit('task:join', this.currentTaskRoom);
    }
  }

  // ==========================================
  // REQUEST EXPIRY TIMER
  // ==========================================

  /**
   * Schedule a local timer that fires `driver:request:expired` when the
   * request's expiresAt time is reached. This is a client-side fallback
   * since the server may not emit this event.
   */
  private scheduleRequestExpiry(taskId: string, expiresAt: string): void {
    // Clear any existing timer for this task
    this.clearRequestExpiryTimer(taskId);

    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const delay = expiryTime - now;

    if (delay <= 0) {
      // Already expired
      console.log('[SOCKET] Request already expired:', taskId);
      this.emit('driver:request:expired', { taskId });
      return;
    }

    console.log('[SOCKET] Scheduling expiry timer for task:', taskId, 'in', delay, 'ms');

    const timer = setTimeout(() => {
      console.log('[SOCKET] Request expired (local timer):', taskId);
      this.emit('driver:request:expired', { taskId });
      this.requestExpiryTimers.delete(taskId);
    }, delay);

    this.requestExpiryTimers.set(taskId, timer);
  }

  /**
   * Clear the expiry timer for a given task.
   */
  private clearRequestExpiryTimer(taskId: string): void {
    const timer = this.requestExpiryTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.requestExpiryTimers.delete(taskId);
      console.log('[SOCKET] Cleared expiry timer for task:', taskId);
    }
  }

  /**
   * Clear all request expiry timers.
   */
  private clearAllRequestExpiryTimers(): void {
    this.requestExpiryTimers.forEach((timer, taskId) => {
      clearTimeout(timer);
      console.log('[SOCKET] Cleared expiry timer for task:', taskId);
    });
    this.requestExpiryTimers.clear();
  }

  disconnect(): void {
    if (this.socket) {
      console.log('[SOCKET] Disconnecting...');
      this.clearAllRequestExpiryTimers();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // ==========================================
  // DRIVER METHODS
  // ==========================================

  async joinDriverRoom(driverId: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connect();
    }
    
    this.currentDriverRoom = driverId;
    this.socket?.emit('driver:join', { driverId });
    console.log('[SOCKET] Joined driver room:', driverId);
  }

  leaveDriverRoom(driverId: string): void {
    this.currentDriverRoom = null;
    this.socket?.emit('driver:leave', { driverId });
    console.log('[SOCKET] Left driver room:', driverId);
  }

  updateLocation(location: LocationUpdate): void {
    if (!this.socket?.connected) {
      // Silently fail - will retry on next update
      return;
    }
    
    this.socket.emit('driver:location:update', {
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading || 0,
      speed: location.speed || 0,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Accept an incoming ride/delivery request.
   */
  acceptRequest(taskId: string): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot accept request - not connected');
      return;
    }

    this.socket.emit('driver:request:accept', { taskId });
    // Clear expiry timer since the driver accepted
    this.clearRequestExpiryTimer(taskId);
    console.log('[SOCKET] Accepted request:', taskId);
  }

  /**
   * Reject/decline an incoming ride/delivery request.
   */
  rejectRequest(taskId: string): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot reject request - not connected');
      return;
    }

    this.socket.emit('driver:request:reject', { taskId });
    // Clear expiry timer since the driver rejected
    this.clearRequestExpiryTimer(taskId);
    console.log('[SOCKET] Rejected request:', taskId);
  }

  // ==========================================
  // TASK ROOM METHODS
  // ==========================================

  joinTaskRoom(taskId: string): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot join task room - not connected');
      return;
    }
    
    // Fixed: server expects plain string, not object
    this.currentTaskRoom = taskId;
    this.socket.emit('task:join', taskId);
    console.log('[SOCKET] Joined task room:', taskId);
  }

  leaveTaskRoom(taskId: string): void {
    this.currentTaskRoom = null;
    // Fixed: server expects plain string, not object
    this.socket?.emit('task:leave', taskId);
    console.log('[SOCKET] Left task room:', taskId);
  }

  // ==========================================
  // RIDER METHODS
  // ==========================================

  joinRiderRoom(riderId: string): void {
    if (!this.socket?.connected) {
      this.connect();
    }
    
    this.currentRiderRoom = riderId;
    this.socket?.emit('rider:join', { riderId });
    console.log('[SOCKET] Joined rider room:', riderId);
  }

  leaveRiderRoom(riderId: string): void {
    this.currentRiderRoom = null;
    this.socket?.emit('rider:leave', { riderId });
    console.log('[SOCKET] Left rider room:', riderId);
  }

  // ==========================================
  // CHAT METHODS
  // ==========================================

  /**
   * Send a chat message to a room.
   */
  chatSend(roomId: string, message: any): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot send chat message - not connected');
      return;
    }

    this.socket.emit('chat:message', { roomId, message });
    console.log('[SOCKET] Chat message sent to room:', roomId);
  }

  /**
   * Join a chat room to receive messages.
   */
  chatJoin(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot join chat room - not connected');
      return;
    }

    this.socket.emit('chat:join', roomId);
    console.log('[SOCKET] Joined chat room:', roomId);
  }

  /**
   * Leave a chat room.
   */
  chatLeave(roomId: string): void {
    this.socket?.emit('chat:leave', roomId);
    console.log('[SOCKET] Left chat room:', roomId);
  }

  /**
   * Indicate typing status in a chat room.
   */
  chatTyping(roomId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot send typing status - not connected');
      return;
    }

    this.socket.emit('chat:typing', { roomId, isTyping });
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
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

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SOCKET] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const socketService = new SocketService();
export default socketService;

console.log('[SOCKET-SERVICE] Service initialized');
