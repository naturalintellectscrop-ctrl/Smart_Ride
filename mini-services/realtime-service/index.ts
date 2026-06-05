/**
 * Smart Ride Real-time Communication Service
 * Socket.io server for real-time updates
 * Compatible with both Bun (local dev) and Node.js (Fly.io production)
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const API_PORT = parseInt(process.env.API_PORT || '3002', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'smart-ride-jwt-secret-prod-2024-ug-kampala';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';

// Allowed CORS origins (add your production domains here)
const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://smartrideug.vercel.app',
  // Add any other domains you need
];

// Create Socket.io server
const io = new Server(SOCKET_PORT, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

console.log(`🚀 Real-time service running on port ${SOCKET_PORT}`);

// Maximum number of tracked users to prevent unbounded memory growth
const MAX_CONNECTED_USERS = 10_000;

// Store connected users
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userRooms = new Map<string, string>(); // socketId -> current room

/** Enforce max size on connectedUsers map — evicts oldest entry if limit exceeded */
function enforceConnectedUsersLimit() {
  if (connectedUsers.size > MAX_CONNECTED_USERS) {
    const firstKey = connectedUsers.keys().next().value;
    if (firstKey) {
      const socketIds = connectedUsers.get(firstKey);
      if (socketIds) {
        socketIds.forEach(sid => userRooms.delete(sid));
      }
      connectedUsers.delete(firstKey);
      console.warn(`[Socket] connectedUsers limit (${MAX_CONNECTED_USERS}) reached, evicted user: ${firstKey}`);
    }
  }
}

// Middleware: Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
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
      enforceConnectedUsersLimit();
    }
    connectedUsers.get(socket.data.userId)!.add(socket.id);

    // Auto-join user's personal room
    socket.join(`user:${socket.data.userId}`);
    console.log(`User ${socket.data.userId} joined their room`);

    socket.emit('connection:established', {
      socketId: socket.id,
      userId: socket.data.userId,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // TASK EVENTS
  // ============================================

  socket.on('task:join', (data: string | { taskId: string }) => {
    const taskId = typeof data === 'string' ? data : data?.taskId;
    if (!taskId) return;
    socket.join(`task:${taskId}`);
    userRooms.set(socket.id, `task:${taskId}`);
    console.log(`Socket ${socket.id} joined task room: ${taskId}`);
    socket.emit('task:joined', { taskId });
  });

  socket.on('task:leave', (data: string | { taskId: string }) => {
    const taskId = typeof data === 'string' ? data : data?.taskId;
    if (!taskId) return;
    socket.leave(`task:${taskId}`);
    userRooms.delete(socket.id);
    console.log(`Socket ${socket.id} left task room: ${taskId}`);
  });

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

  socket.on('rider:location', (data: {
    riderId: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }) => {
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

    io.to(`rider:${data.riderId}`).emit('rider:location:update', {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('driver:location:update', (data: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
  }) => {
    if (socket.data.userId) {
      const currentRoom = userRooms.get(socket.id);

      if (currentRoom && currentRoom.startsWith('task:')) {
        socket.to(currentRoom).emit('rider:location:update', {
          riderId: socket.data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          timestamp: new Date().toISOString(),
        });
      }

      socket.to(`user:${socket.data.userId}`).emit('rider:location:update', {
        riderId: socket.data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('rider:track', (riderId: string) => {
    socket.join(`rider:${riderId}`);
    console.log(`Socket ${socket.id} tracking rider: ${riderId}`);
  });

  socket.on('rider:untrack', (riderId: string) => {
    socket.leave(`rider:${riderId}`);
  });

  // ============================================
  // DRIVER ROOM EVENTS (Expo mobile app)
  // ============================================

  socket.on('driver:join', (data: { driverId: string } | string) => {
    const driverId = typeof data === 'string' ? data : data?.driverId;
    if (!driverId) return;
    socket.join(`driver:${driverId}`);
    console.log(`Socket ${socket.id} joined driver room: ${driverId}`);
  });

  socket.on('driver:leave', (data: { driverId: string } | string) => {
    const driverId = typeof data === 'string' ? data : data?.driverId;
    if (!driverId) return;
    socket.leave(`driver:${driverId}`);
    console.log(`Socket ${socket.id} left driver room: ${driverId}`);
  });

  // ============================================
  // RIDER ROOM EVENTS (Expo mobile app)
  // ============================================

  socket.on('rider:join', (data: { riderId: string } | string) => {
    const riderId = typeof data === 'string' ? data : data?.riderId;
    if (!riderId) return;
    socket.join(`rider:${riderId}`);
    console.log(`Socket ${socket.id} joined rider room: ${riderId}`);
  });

  socket.on('rider:leave', (data: { riderId: string } | string) => {
    const riderId = typeof data === 'string' ? data : data?.riderId;
    if (!riderId) return;
    socket.leave(`rider:${riderId}`);
    console.log(`Socket ${socket.id} left rider room: ${riderId}`);
  });

  // ============================================
  // DISPATCH EVENTS
  // ============================================

  socket.on('dispatch:request', (data: {
    riderId: string;
    task: unknown;
    expiresIn: number;
  }) => {
    const payload = {
      task: data.task,
      expiresIn: data.expiresIn,
      timestamp: new Date().toISOString(),
    };
    io.to(`user:${data.riderId}`).emit('dispatch:new-task', payload);
    io.to(`user:${data.riderId}`).emit('driver:request', payload);
  });

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

  socket.on('order:join', (data: string | { orderId: string }) => {
    const orderId = typeof data === 'string' ? data : data?.orderId;
    if (!orderId) return;
    socket.join(`order:${orderId}`);
    socket.emit('order:joined', { orderId });
  });

  socket.on('order:leave', (data: string | { orderId: string }) => {
    const orderId = typeof data === 'string' ? data : data?.orderId;
    if (!orderId) return;
    socket.leave(`order:${orderId}`);
  });

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

  socket.on('chat:join', (roomId: string) => {
    socket.join(`chat:${roomId}`);
    socket.emit('chat:joined', { roomId });
  });

  socket.on('chat:message', (data: { roomId: string; message: unknown }) => {
    io.to(`chat:${data.roomId}`).emit('chat:message:received', {
      ...data.message,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('chat:typing', (data: { roomId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.roomId}`).emit('chat:typing', {
      userId: socket.data.userId,
      isTyping: data.isTyping,
    });
  });

  // ============================================
  // ADMIN MONITORING
  // ============================================

  socket.on('admin:dashboard', () => {
    if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(socket.data.role)) {
      socket.join('admin:dashboard');
      socket.emit('admin:joined', { message: 'Connected to admin dashboard' });
    } else {
      socket.emit('error', { message: 'Unauthorized' });
    }
  });

  socket.on('sos:alert', (data: unknown) => {
    io.to('admin:dashboard').emit('sos:new', data);
  });

  // ============================================
  // HEARTBEAT
  // ============================================

  socket.on('heartbeat', (data: {
    riderId: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    battery?: number;
  }) => {
    socket.data.lastHeartbeat = {
      riderId: data.riderId,
      taskId: data.taskId,
      latitude: data.latitude,
      longitude: data.longitude,
      battery: data.battery,
      timestamp: new Date().toISOString(),
    };

    socket.emit('heartbeat:ack', {
      received: true,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // DISCONNECT
  // ============================================

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (socket.data.userId) {
      const userSockets = connectedUsers.get(socket.data.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.data.userId);
        }
      }
    }

    userRooms.delete(socket.id);
  });
});

// ============================================
// INTERNAL API FOR EMITTING EVENTS
// (Node.js compatible HTTP server)
// ============================================

const apiServer = createServer(async (req, res) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Key',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${API_PORT}`);

  // Emit event endpoint
  if (url.pathname === '/emit' && req.method === 'POST') {
    const authKey = req.headers['x-internal-key'];
    if (authKey !== INTERNAL_API_KEY) {
      res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      io.to(body.room).emit(body.event, body.data);

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
    return;
  }

  // Broadcast endpoint
  if (url.pathname === '/broadcast' && req.method === 'POST') {
    const authKey = req.headers['x-internal-key'];
    if (authKey !== INTERNAL_API_KEY) {
      res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      io.emit(body.event, body.data);

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
    return;
  }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: io.sockets.sockets.size,
      connectedUsers: connectedUsers.size,
    }));
    return;
  }

  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

apiServer.listen(API_PORT, () => {
  console.log(`📡 Internal API running on port ${API_PORT}`);
});

// Helper: Parse request body as JSON
function parseBody(req: import('http').IncomingMessage): Promise<{ room?: string; event: string; data: unknown }> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Periodic cleanup of stale connections
setInterval(() => {
  let cleaned = 0;
  for (const [userId, socketIds] of connectedUsers.entries()) {
    for (const socketId of socketIds) {
      if (!io.sockets.sockets.has(socketId)) {
        socketIds.delete(socketId);
        userRooms.delete(socketId);
        cleaned++;
      }
    }
    if (socketIds.size === 0) {
      connectedUsers.delete(userId);
    }
  }
  if (cleaned > 0) {
    console.log(`[Socket] Cleaned up ${cleaned} stale socket entries`);
  }
}, 60000);

// Export for type checking
export { io, connectedUsers };
