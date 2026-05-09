// ============================================
// SMART RIDE MOBILE - SOCKET SERVICE
// ============================================

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, STORAGE_KEYS } from '@/src/constants';
import { SOCKET_URL } from '@/src/config/env';
import { Task, TaskStatus } from '@/src/types';

// Socket event types
interface SocketEventMap {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: Error) => void;
  
  // Task events
  'task:created': (task: Task) => void;
  'task:assigned': (data: { taskId: string; riderId: string }) => void;
  'task:accepted': (data: { taskId: string }) => void;
  'task:status': (data: { taskId: string; status: TaskStatus }) => void;
  'task:cancelled': (data: { taskId: string; reason: string }) => void;
  'task:completed': (data: { taskId: string }) => void;
  
  // Location events
  'location:update': (data: {
    riderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) => void;
  
  // Driver specific events
  'driver:request': (data: {
    task: Task;
    pickup: { latitude: number; longitude: number; address: string };
    expiresAt: string;
  }) => void;
  'driver:request:expired': (data: { taskId: string }) => void;
  
  // Order events
  'order:status': (data: { orderId: string; status: string }) => void;
  
  // Chat events
  'message:new': (data: { conversationId: string; message: any }) => void;
  
  // SOS events
  'sos:alert': (data: { sosId: string; type: string; location: any }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  // Get socket URL from config
  private getSocketUrl(): string {
    // Use SOCKET_URL from env config (production URL without /api)
    return SOCKET_URL;
  }

  // Connect to socket server
  async connect(userId?: string, role?: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const token = await SecureStore.getItemAsync(STORAGE_KEYS.authToken);
    
    // Don't warn if no token - user may not be logged in yet
    if (!token) {
      console.log('No auth token found, skipping socket connection');
      return;
    }

    const socketUrl = this.getSocketUrl();
    
    console.log('Connecting to socket:', socketUrl);
    
    try {
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'], // Fallback to polling
        auth: { token },
        query: { userId, role },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000, // 10 second connection timeout
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  // Disconnect from socket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Check if connected
  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // Setup socket event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emitLocal('connect', undefined);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emitLocal('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      this.emitLocal('error', error);
    });

    // Task events
    this.socket.on('task:created', (data) => this.emitLocal('task:created', data));
    this.socket.on('task:assigned', (data) => this.emitLocal('task:assigned', data));
    this.socket.on('task:accepted', (data) => this.emitLocal('task:accepted', data));
    this.socket.on('task:status', (data) => this.emitLocal('task:status', data));
    this.socket.on('task:cancelled', (data) => this.emitLocal('task:cancelled', data));
    this.socket.on('task:completed', (data) => this.emitLocal('task:completed', data));

    // Location events
    this.socket.on('location:update', (data) => this.emitLocal('location:update', data));

    // Driver events
    this.socket.on('driver:request', (data) => this.emitLocal('driver:request', data));
    this.socket.on('driver:request:expired', (data) => this.emitLocal('driver:request:expired', data));

    // Order events
    this.socket.on('order:status', (data) => this.emitLocal('order:status', data));

    // Chat events
    this.socket.on('message:new', (data) => this.emitLocal('message:new', data));

    // SOS events
    this.socket.on('sos:alert', (data) => this.emitLocal('sos:alert', data));
  }

  // Subscribe to an event
  on<K extends keyof SocketEventMap>(event: K, callback: SocketEventMap[K]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Unsubscribe from an event
  off<K extends keyof SocketEventMap>(event: K, callback?: SocketEventMap[K]): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }

  // Emit to local listeners
  private emitLocal(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Emit to server
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Join a room
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join', room);
    }
  }

  // Leave a room
  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
    }
  }

  // Join task room for real-time updates
  joinTaskRoom(taskId: string): void {
    this.joinRoom(`task:${taskId}`);
  }

  // Leave task room
  leaveTaskRoom(taskId: string): void {
    this.leaveRoom(`task:${taskId}`);
  }

  // Update location (for drivers)
  updateLocation(data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    batteryLevel?: number;
  }): void {
    this.emit('location:update', data);
  }

  // Accept task request (for drivers)
  acceptTask(taskId: string): void {
    this.emit('task:accept', { taskId });
  }

  // Decline task request (for drivers)
  declineTask(taskId: string, reason?: string): void {
    this.emit('task:decline', { taskId, reason });
  }

  // Send message in conversation
  sendMessage(conversationId: string, content: string): void {
    this.emit('message:send', { conversationId, content });
  }

  // Trigger SOS
  triggerSOS(data: { latitude: number; longitude: number; type: string }): void {
    this.emit('sos:trigger', data);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
