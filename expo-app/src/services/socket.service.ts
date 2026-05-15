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
      
      // Parse the base URL to get WebSocket URL
      const apiBase = API_CONFIG.baseUrl;
      const wsUrl = apiBase.replace(/^https?/, apiBase.startsWith('https') ? 'wss' : 'ws');
      
      console.log('[SOCKET] Connecting to:', wsUrl);

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
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
    // DRIVER EVENTS
    // ==========================================

    this.socket.on('driver:request', (data: IncomingRequest) => {
      console.log('[SOCKET] Incoming ride request:', data.task?.id);
      this.emit('driver:request', data);
    });

    this.socket.on('driver:request:expired', (data: { taskId: string }) => {
      console.log('[SOCKET] Request expired:', data.taskId);
      this.emit('driver:request:expired', data);
    });

    this.socket.on('driver:request:cancelled', (data: { taskId: string }) => {
      console.log('[SOCKET] Request cancelled:', data.taskId);
      this.emit('driver:request:cancelled', data);
    });

    this.socket.on('driver:task:updated', (data: TaskUpdate) => {
      console.log('[SOCKET] Task updated:', data);
      this.emit('driver:task:updated', data);
    });

    // ==========================================
    // RIDER EVENTS
    // ==========================================

    this.socket.on('rider:task:created', (data: TaskUpdate) => {
      console.log('[SOCKET] Task created:', data);
      this.emit('rider:task:created', data);
    });

    this.socket.on('rider:task:matched', (data: any) => {
      console.log('[SOCKET] Driver matched:', data);
      this.emit('rider:task:matched', data);
    });

    this.socket.on('rider:driver:location', (data: LocationUpdate & { driverId: string }) => {
      this.emit('rider:driver:location', data);
    });

    this.socket.on('rider:task:status', (data: TaskUpdate) => {
      console.log('[SOCKET] Task status update:', data);
      this.emit('rider:task:status', data);
    });

    this.socket.on('rider:task:completed', (data: any) => {
      console.log('[SOCKET] Task completed:', data);
      this.emit('rider:task:completed', data);
    });

    // ==========================================
    // GENERAL EVENTS
    // ==========================================

    this.socket.on('task:status:changed', (data: TaskUpdate) => {
      console.log('[SOCKET] Task status changed:', data);
      this.emit('task:status:changed', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('[SOCKET] Disconnecting...');
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
    
    this.socket?.emit('driver:join', { driverId });
    console.log('[SOCKET] Joined driver room:', driverId);
  }

  leaveDriverRoom(driverId: string): void {
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

  // ==========================================
  // TASK ROOM METHODS
  // ==========================================

  joinTaskRoom(taskId: string): void {
    if (!this.socket?.connected) {
      console.warn('[SOCKET] Cannot join task room - not connected');
      return;
    }
    
    this.socket.emit('task:join', { taskId });
    console.log('[SOCKET] Joined task room:', taskId);
  }

  leaveTaskRoom(taskId: string): void {
    this.socket?.emit('task:leave', { taskId });
    console.log('[SOCKET] Left task room:', taskId);
  }

  // ==========================================
  // RIDER METHODS
  // ==========================================

  joinRiderRoom(riderId: string): void {
    if (!this.socket?.connected) {
      this.connect();
    }
    
    this.socket?.emit('rider:join', { riderId });
    console.log('[SOCKET] Joined rider room:', riderId);
  }

  leaveRiderRoom(riderId: string): void {
    this.socket?.emit('rider:leave', { riderId });
    console.log('[SOCKET] Left rider room:', riderId);
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
