// ============================================
// SMART RIDE WEB - SOCKET SERVICE
// ============================================
// Production-ready socket.io client for Next.js web context.
// - Singleton pattern (prevents duplicate connections)
// - Exponential backoff reconnect
// - Proper listener cleanup on disconnect
// - Event names match backend realtime-service emissions
// - Connects through Caddy gateway via XTransformPort

import { io, Socket } from 'socket.io-client';

// ============================================
// TYPES
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

const SOCKET_PORT = 3001;
const TOKEN_STORAGE_KEY = 'smart_ride_auth_token';

// Exponential backoff settings
const INITIAL_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 30000; // 30s
const RECONNECT_MULTIPLIER = 2;

// ============================================
// SOCKET SERVICE CLASS (Singleton)
// ============================================

class SocketService {
  private static instance: SocketService | null = null;
  private socket: Socket | null = null;
  private isConnected = false;
  private isConnecting = false;
  private currentToken: string | null = null;

  // Listener management
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  // Reconnect backoff state
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  /** Private constructor — use getInstance() */
  private constructor() {}

  /** Get the singleton instance */
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // ------------------------------------------
  // PUBLIC API
  // ------------------------------------------

  /** Connect to the realtime service with an auth token */
  connect(token: string, options?: { forceReconnect?: boolean }): void {
    if (!options?.forceReconnect) {
      if (this.socket?.connected) {
        console.log('[Socket] Already connected, skipping');
        return;
      }
      if (this.isConnecting) {
        console.log('[Socket] Connection already in progress, skipping');
        return;
      }
    } else {
      // Force reconnect: tear down existing connection first
      console.log('[Socket] Force reconnect requested');
      this.clearReconnectTimer();
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      this.isConnected = false;
      this.isConnecting = false;
    }

    if (!token) {
      console.warn('[Socket] No auth token provided, skipping connection');
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

    const socketUrl = this.getSocketUrl();

    console.log('[Socket] Connecting to:', socketUrl, 'with XTransformPort:', SOCKET_PORT);

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: { XTransformPort: String(SOCKET_PORT) },
      auth: { token },
      reconnection: false, // We handle reconnection ourselves with backoff
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  /** Disconnect from the realtime service */
  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.currentToken = null;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;

    // Clear all local listeners on intentional disconnect
    this.listeners.clear();

    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
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

  /** Emit a raw event to the server */
  emit(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit, not connected:', event);
    }
  }

  /** Join a task room for real-time updates (matches backend `task:join`) */
  joinTaskRoom(taskId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('task:join', taskId);
    }
  }

  /** Leave a task room (matches backend `task:leave`) */
  leaveTaskRoom(taskId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('task:leave', taskId);
    }
  }

  /** Send rider location update (matches backend `rider:location`) */
  updateLocation(data: {
    riderId: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }): void {
    this.emit('rider:location', data);
  }

  /** Send driver location update (matches backend `driver:location:update`) */
  updateDriverLocation(data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }): void {
    this.emit('driver:location:update', data);
  }

  /** Try to auto-connect using a stored token (useful on page load) */
  autoConnect(): boolean {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        this.connect(token);
        return true;
      }
    } catch {
      // localStorage unavailable
    }
    return false;
  }

  /** Get the underlying Socket instance (for advanced usage) */
  getSocket(): Socket | null {
    return this.socket;
  }

  // ------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------

  /** Determine socket URL — same origin so Caddy gateway handles routing */
  private getSocketUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }

  /** Set up socket.io event handlers */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.emitLocal('connect', undefined);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.isConnecting = false;
      this.emitLocal('disconnect', reason);

      // Auto-reconnect unless intentionally disconnected
      if (!this.intentionalDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.isConnected = false;
      this.isConnecting = false;
      this.scheduleReconnect();
    });

    // Backend-emitted events
    this.socket.on('connection:established', (data: ConnectionEstablishedData) => {
      this.emitLocal('connection:established', data);
    });

    this.socket.on('task:status:update', (data: TaskStatusUpdateData) => {
      this.emitLocal('task:status:update', data);
    });

    this.socket.on('rider:task:matched', (data: RiderTaskMatchedData) => {
      this.emitLocal('rider:task:matched', data);
    });

    this.socket.on('rider:location:update', (data: LocationData) => {
      this.emitLocal('rider:location:update', data);
    });

    this.socket.on('driver:request', (data: DriverRequestData) => {
      this.emitLocal('driver:request', data);
    });

    this.socket.on('notification', (data: NotificationData) => {
      this.emitLocal('notification', data);
    });
  }

  /** Emit to local listeners */
  private emitLocal(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Socket] Listener error for "${event}":`, err);
        }
      });
    }
  }

  /** Schedule a reconnect attempt with exponential backoff */
  private scheduleReconnect(): void {
    if (this.intentionalDisconnect) return;
    if (this.reconnectTimer) return; // Already scheduled

    this.reconnectAttempts++;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_MULTIPLIER, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY
    );

    console.log(
      `[Socket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptReconnect();
    }, delay);
  }

  /** Attempt a single reconnect */
  private attemptReconnect(): void {
    if (this.intentionalDisconnect) return;
    if (this.socket?.connected) return;

    // Get token: prefer in-memory, fall back to localStorage
    const token = this.currentToken || this.getStoredToken();
    if (!token) {
      console.warn('[Socket] No token available for reconnect, giving up');
      return;
    }

    console.log('[Socket] Attempting reconnect...');

    // Clean up old socket before reconnecting (preserve listeners map)
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connect(token);
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

  /** Clean up socket reference. Does NOT clear the listeners map so re-subscriptions persist. */
  private cleanupSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
  }
}

// ============================================
// EXPORTS
// ============================================

/** Singleton instance — always use this */
export const socketService = SocketService.getInstance();
export default socketService;
