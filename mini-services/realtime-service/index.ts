/**
 * Smart Ride Real-time Communication Service
 * Socket.io server for real-time updates
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars';

// Create Socket.io server
const io = new Server(PORT, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

console.log(`🚀 Real-time service running on port ${PORT}`);

// Store connected users
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userRooms = new Map<string, string>(); // socketId -> current room

// Middleware: Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    // Allow connection without auth for public channels
    socket.data.isAnonymous = true;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'smart-ride',
      audience: 'smart-ride-api',
    }) as { userId: string; email: string; role: string };

    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    socket.data.role = decoded.role;
    socket.data.isAuthenticated = true;

    next();
  } catch (error) {
    console.error('Socket auth error:', error instanceof Error ? error.message : 'Unknown error');
    socket.data.isAnonymous = true;
    next();
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Track authenticated users
  if (socket.data.userId) {
    if (!connectedUsers.has(socket.data.userId)) {
      connectedUsers.set(socket.data.userId, new Set());
    }
    connectedUsers.get(socket.data.userId)!.add(socket.id);

    // Auto-join user's personal room
    socket.join(`user:${socket.data.userId}`);
    console.log(`User ${socket.data.userId} joined their room`);

    // Notify user about their active connections
    socket.emit('connection:established', {
      socketId: socket.id,
      userId: socket.data.userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // TASK EVENTS
  // ============================================

  // Join task room for real-time updates
  socket.on('task:join', (taskId: string) => {
    socket.join(`task:${taskId}`);
    userRooms.set(socket.id, `task:${taskId}`);
    console.log(`Socket ${socket.id} joined task room: ${taskId}`);
    socket.emit('task:joined', { taskId });
  });

  // Leave task room
  socket.on('task:leave', (taskId: string) => {
    socket.leave(`task:${taskId}`);
    userRooms.delete(socket.id);
    console.log(`Socket ${socket.id} left task room: ${taskId}`);
  });

  // Task status update
  socket.on('task:status', (data: { taskId: string; status: string; metadata?: unknown }) => {
    io.to(`task:${data.taskId}`).emit('task:status:update', {
      taskId: data.taskId,
      status: data.status,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // RIDER TRACKING
  // ============================================

  // Rider location update
  socket.on('rider:location', (data: { 
    riderId: string; 
    taskId?: string;
    latitude: number; 
    longitude: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }) => {
    // Update location for task room if active task
    if (data.taskId) {
      io.to(`task:${data.taskId}`).emit('rider:location:update', {
        riderId: data.riderId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        battery: data.battery,
        timestamp: new Date().toISOString(),
      });
    }

    // Also emit to rider's room for admin monitoring
    io.to(`rider:${data.riderId}`).emit('rider:location:update', {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  // Join rider tracking room
  socket.on('rider:track', (riderId: string) => {
    socket.join(`rider:${riderId}`);
    console.log(`Socket ${socket.id} tracking rider: ${riderId}`);
  });

  // Stop tracking rider
  socket.on('rider:untrack', (riderId: string) => {
    socket.leave(`rider:${riderId}`);
  });

  // ============================================
  // DISPATCH EVENTS
  // ============================================

  // New task request (for riders)
  socket.on('dispatch:request', (data: { 
    riderId: string; 
    task: unknown;
    expiresIn: number;
  }) => {
    io.to(`user:${data.riderId}`).emit('dispatch:new-task', {
      task: data.task,
      expiresIn: data.expiresIn,
      timestamp: new Date().toISOString(),
    });
  });

  // Task assignment broadcast
  socket.on('dispatch:assigned', (data: { taskId: string; riderId: string }) => {
    io.to(`task:${data.taskId}`).emit('dispatch:assignment', {
      taskId: data.taskId,
      riderId: data.riderId,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // ORDER EVENTS
  // ============================================

  // Join order room
  socket.on('order:join', (orderId: string) => {
    socket.join(`order:${orderId}`);
    socket.emit('order:joined', { orderId });
  });

  // Order status update
  socket.on('order:status', (data: { orderId: string; status: string; metadata?: unknown }) => {
    io.to(`order:${data.orderId}`).emit('order:status:update', {
      orderId: data.orderId,
      status: data.status,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // CHAT/MESSAGING
  // ============================================

  // Join chat room
  socket.on('chat:join', (roomId: string) => {
    socket.join(`chat:${roomId}`);
    socket.emit('chat:joined', { roomId });
  });

  // Send message
  socket.on('chat:message', (data: { roomId: string; message: unknown }) => {
    io.to(`chat:${data.roomId}`).emit('chat:message:received', {
      ...data.message,
      timestamp: new Date().toISOString(),
    });
  });

  // Typing indicator
  socket.on('chat:typing', (data: { roomId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.roomId}`).emit('chat:typing', {
      userId: socket.data.userId,
      isTyping: data.isTyping,
    });
  });

  // ============================================
  // ADMIN MONITORING
  // ============================================

  // Admin dashboard room
  socket.on('admin:dashboard', () => {
    if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(socket.data.role)) {
      socket.join('admin:dashboard');
      socket.emit('admin:joined', { message: 'Connected to admin dashboard' });
    } else {
      socket.emit('error', { message: 'Unauthorized' });
    }
  });

  // SOS Alert broadcast
  socket.on('sos:alert', (data: unknown) => {
    io.to('admin:dashboard').emit('sos:new', data);
  });

  // ============================================
  // HEARTBEAT
  // ============================================

  // Heartbeat from riders
  socket.on('heartbeat', (data: { 
    riderId: string; 
    taskId?: string;
    latitude: number;
    longitude: number;
    battery?: number;
  }) => {
    socket.emit('heartbeat:ack', { 
      received: true, 
      timestamp: new Date().toISOString() 
    });
  });

  // ============================================
  // DISCONNECT
  // ============================================

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from connected users
    if (socket.data.userId) {
      const userSockets = connectedUsers.get(socket.data.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.data.userId);
        }
      }
    }

    // Clean up room tracking
    userRooms.delete(socket.id);
  });
});

// ============================================
// INTERNAL API FOR EMITTING EVENTS
// ============================================

// Simple HTTP server for internal event emission
const httpServer = Bun.serve({
  port: 3002,
  async fetch(request) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Key',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Emit event endpoint
    if (url.pathname === '/emit' && request.method === 'POST') {
      const authKey = request.headers.get('X-Internal-Key');
      if (authKey !== JWT_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const body = await request.json() as { room: string; event: string; data: unknown };
        io.to(body.room).emit(body.event, body.data);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Broadcast endpoint
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const authKey = request.headers.get('X-Internal-Key');
      if (authKey !== JWT_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const body = await request.json() as { event: string; data: unknown };
        io.emit(body.event, body.data);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        connections: io.sockets.sockets.size,
        connectedUsers: connectedUsers.size,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
});

console.log(`📡 Internal API running on port ${httpServer.port}`);

// Export for type checking
export { io, connectedUsers };
