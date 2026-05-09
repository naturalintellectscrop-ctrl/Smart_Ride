import { Server } from 'socket.io';
import { PrismaClient } from '../../node_modules/@prisma/client';

const PORT = 3004;
const prisma = new PrismaClient();

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Heartbeat monitoring configuration
const CONFIG = {
  UNSTABLE_THRESHOLD_SECONDS: 30,      // 30 seconds - mark UNSTABLE
  DISCONNECT_THRESHOLD_SECONDS: 60,    // 60 seconds - mark DISCONNECTED
  LONG_DISCONNECT_THRESHOLD_SECONDS: 120, // 120 seconds - escalate alert
  MONITOR_INTERVAL_MS: 10 * 1000,      // Check every 10 seconds
  BATTERY_LOW_THRESHOLD: 20,           // Alert when battery below 20%
  BATTERY_CRITICAL_THRESHOLD: 10,      // Critical alert when battery below 10%
};

// Task states that require heartbeat monitoring
const HEARTBEAT_ACTIVE_STATES = [
  'RIDER_ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_PROGRESS',
  'DELIVERING',
];

// In-memory tracking for active monitoring
const activeRiders = new Map<string, {
  riderId: string;
  taskId: string | null;
  lastHeartbeatAt: Date;
  connectionStatus: string;
  lastKnownLocation: { latitude: number; longitude: number } | null;
  batteryLevel: number | null;
  socketId?: string;
}>();

// Admin clients connected for monitoring
const adminClients = new Set<string>();

console.log(`🚀 Smart Ride Heartbeat Monitor running on port ${PORT}`);
console.log(`📊 Monitoring configuration:`);
console.log(`   - UNSTABLE after ${CONFIG.UNSTABLE_THRESHOLD_SECONDS}s`);
console.log(`   - DISCONNECTED after ${CONFIG.DISCONNECT_THRESHOLD_SECONDS}s`);
console.log(`   - ESCALATE after ${CONFIG.LONG_DISCONNECT_THRESHOLD_SECONDS}s`);

// ================== SOCKET EVENTS ==================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Admin joins for monitoring alerts
  socket.on('admin:join', () => {
    adminClients.add(socket.id);
    socket.join('admin');
    console.log(`Admin joined: ${socket.id}`);
    
    // Send current status of all active riders
    socket.emit('admin:active-riders', Array.from(activeRiders.values()));
  });

  // Admin leaves
  socket.on('admin:leave', () => {
    adminClients.delete(socket.id);
    socket.leave('admin');
  });

  // Client subscribes to rider location updates
  socket.on('subscribe:rider', (data: { riderId: string }) => {
    socket.join(`rider:${data.riderId}:location`);
    
    // Send last known location if available
    const rider = activeRiders.get(data.riderId);
    if (rider && rider.lastKnownLocation) {
      socket.emit('rider:location', {
        riderId: data.riderId,
        latitude: rider.lastKnownLocation.latitude,
        longitude: rider.lastKnownLocation.longitude,
        timestamp: rider.lastHeartbeatAt,
        connectionStatus: rider.connectionStatus,
      });
    }
  });

  // Client unsubscribes from rider location
  socket.on('unsubscribe:rider', (data: { riderId: string }) => {
    socket.leave(`rider:${data.riderId}:location`);
  });

  // Client subscribes to task tracking
  socket.on('subscribe:task', (data: { taskId: string }) => {
    socket.join(`task:${data.taskId}:tracking`);
  });

  // Rider heartbeat via WebSocket (alternative to HTTP)
  socket.on('heartbeat', async (data: {
    riderId: string;
    taskId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    batteryLevel?: number;
    heading?: number;
  }) => {
    await processHeartbeat({
      riderId: data.riderId,
      taskId: data.taskId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      batteryLevel: data.batteryLevel,
      heading: data.heading,
      socketId: socket.id,
    });
  });

  // Rider starts task (begin monitoring)
  socket.on('rider:task:start', async (data: { riderId: string; taskId: string }) => {
    console.log(`Rider ${data.riderId} starting task ${data.taskId}`);
    
    const existing = activeRiders.get(data.riderId);
    activeRiders.set(data.riderId, {
      riderId: data.riderId,
      taskId: data.taskId,
      lastHeartbeatAt: existing?.lastHeartbeatAt || new Date(),
      connectionStatus: existing?.connectionStatus || 'ACTIVE',
      lastKnownLocation: existing?.lastKnownLocation || null,
      batteryLevel: existing?.batteryLevel || null,
      socketId: socket.id,
    });

    socket.join(`rider:${data.riderId}`);
    socket.join(`task:${data.taskId}`);
  });

  // Rider ends task (stop monitoring)
  socket.on('rider:task:end', (data: { riderId: string; taskId: string }) => {
    console.log(`Rider ${data.riderId} ended task ${data.taskId}`);
    
    const rider = activeRiders.get(data.riderId);
    if (rider && rider.taskId === data.taskId) {
      rider.taskId = null;
    }

    socket.leave(`task:${data.taskId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    adminClients.delete(socket.id);
    
    // Mark rider as disconnected if socket matches
    for (const [riderId, rider] of activeRiders) {
      if (rider.socketId === socket.id) {
        rider.connectionStatus = 'DISCONNECTED';
        broadcastRiderStatus(riderId, 'DISCONNECTED');
        break;
      }
    }
  });
});

// ================== HEARTBEAT PROCESSING ==================

interface HeartbeatData {
  riderId: string;
  taskId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  batteryLevel?: number;
  heading?: number;
  socketId?: string;
}

async function processHeartbeat(data: HeartbeatData) {
  const now = new Date();
  
  // Update in-memory tracking
  const existing = activeRiders.get(data.riderId);
  activeRiders.set(data.riderId, {
    riderId: data.riderId,
    taskId: data.taskId || existing?.taskId || null,
    lastHeartbeatAt: now,
    connectionStatus: 'ACTIVE',
    lastKnownLocation: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
    batteryLevel: data.batteryLevel ?? existing?.batteryLevel ?? null,
    socketId: data.socketId || existing?.socketId,
  });

  // Broadcast location to subscribers
  io.to(`rider:${data.riderId}:location`).emit('rider:location', {
    riderId: data.riderId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    heading: data.heading,
    batteryLevel: data.batteryLevel,
    timestamp: now,
    connectionStatus: 'ACTIVE',
  });

  // If task is active, broadcast to task subscribers
  if (data.taskId) {
    io.to(`task:${data.taskId}:tracking`).emit('task:location', {
      taskId: data.taskId,
      riderId: data.riderId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: now,
    });
  }

  // Check for low battery
  if (data.batteryLevel !== undefined && data.batteryLevel < CONFIG.BATTERY_LOW_THRESHOLD) {
    const severity = data.batteryLevel < CONFIG.BATTERY_CRITICAL_THRESHOLD ? 'CRITICAL' : 'HIGH';
    await createAlert({
      riderId: data.riderId,
      taskId: data.taskId,
      alertType: 'BATTERY_LOW',
      severity: severity as any,
      message: `Rider battery is ${data.batteryLevel}%`,
    });
  }
}

// ================== MONITORING LOOP ==================

async function runMonitoringCycle() {
  const now = Date.now();

  for (const [riderId, rider] of activeRiders) {
    // Skip riders without active tasks
    if (!rider.taskId) continue;

    const secondsSinceHeartbeat = (now - rider.lastHeartbeatAt.getTime()) / 1000;
    let newStatus = rider.connectionStatus;
    let alertNeeded = false;
    let alertType: string | null = null;
    let alertSeverity: string | null = null;

    // Determine new status based on time since last heartbeat
    if (secondsSinceHeartbeat > CONFIG.LONG_DISCONNECT_THRESHOLD_SECONDS) {
      newStatus = 'DISCONNECTED';
      alertNeeded = true;
      alertType = 'LONG_DISCONNECT';
      alertSeverity = 'CRITICAL';
    } else if (secondsSinceHeartbeat > CONFIG.DISCONNECT_THRESHOLD_SECONDS) {
      newStatus = 'DISCONNECTED';
      alertNeeded = true;
      alertType = 'CONNECTION_LOST';
      alertSeverity = 'HIGH';
    } else if (secondsSinceHeartbeat > CONFIG.UNSTABLE_THRESHOLD_SECONDS) {
      newStatus = 'UNSTABLE';
      alertNeeded = true;
      alertType = 'CONNECTION_UNSTABLE';
      alertSeverity = 'MEDIUM';
    }

    // Update status if changed
    if (newStatus !== rider.connectionStatus) {
      const previousStatus = rider.connectionStatus;
      rider.connectionStatus = newStatus;
      
      console.log(`Rider ${riderId} status: ${previousStatus} -> ${newStatus}`);
      
      // Update database
      await updateRiderConnectionStatus(riderId, newStatus, rider.taskId);
      
      // Broadcast status change
      broadcastRiderStatus(riderId, newStatus, rider.lastKnownLocation);
    }

    // Create alert if needed
    if (alertNeeded && alertType && alertSeverity) {
      await createAlert({
        riderId: riderId,
        taskId: rider.taskId,
        alertType: alertType as any,
        severity: alertSeverity as any,
        message: `No heartbeat from rider for ${Math.round(secondsSinceHeartbeat)} seconds`,
      });
    }
  }
}

async function updateRiderConnectionStatus(
  riderId: string, 
  status: string, 
  taskId: string | null
) {
  try {
    await prisma.rider.update({
      where: { id: riderId },
      data: {
        connectionStatus: status as any,
      },
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          connectionStatus: status as any,
        },
      });
    }
  } catch (error) {
    console.error(`Error updating rider ${riderId} status:`, error);
  }
}

async function createAlert(data: {
  riderId: string;
  taskId: string | null;
  alertType: string;
  severity: string;
  message: string;
}) {
  try {
    // Check if similar unresolved alert exists
    const existingAlert = await prisma.connectionAlert.findFirst({
      where: {
        riderId: data.riderId,
        taskId: data.taskId,
        alertType: data.alertType as any,
        isResolved: false,
      },
    });

    if (existingAlert) {
      // Update existing alert
      await prisma.connectionAlert.update({
        where: { id: existingAlert.id },
        data: {
          message: data.message,
          updatedAt: new Date(),
        },
      });
      return;
    }

    // Create new alert
    const alert = await prisma.connectionAlert.create({
      data: {
        riderId: data.riderId,
        taskId: data.taskId,
        alertType: data.alertType as any,
        severity: data.severity as any,
        message: data.message,
      },
    });

    // Broadcast alert to admin dashboard
    io.to('admin').emit('admin:alert', {
      id: alert.id,
      riderId: data.riderId,
      taskId: data.taskId,
      alertType: data.alertType,
      severity: data.severity,
      message: data.message,
      createdAt: alert.createdAt,
    });

    console.log(`Alert created: ${data.alertType} for rider ${data.riderId}`);
  } catch (error) {
    console.error('Error creating alert:', error);
  }
}

function broadcastRiderStatus(
  riderId: string, 
  status: string, 
  location?: { latitude: number; longitude: number } | null
) {
  io.emit(`rider:${riderId}:status`, {
    riderId,
    connectionStatus: status,
    location: location,
    timestamp: new Date(),
  });

  // Also notify admin
  io.to('admin').emit('admin:rider:status', {
    riderId,
    connectionStatus: status,
    timestamp: new Date(),
  });
}

// ================== INITIALIZATION ==================

// Start monitoring loop
setInterval(runMonitoringCycle, CONFIG.MONITOR_INTERVAL_MS);

// Load active tasks on startup
async function initializeActiveTasks() {
  try {
    const activeTasks = await prisma.task.findMany({
      where: {
        status: { in: HEARTBEAT_ACTIVE_STATES as any },
        riderId: { not: null },
      },
      include: {
        rider: true,
      },
    });

    for (const task of activeTasks) {
      if (task.riderId && task.rider) {
        activeRiders.set(task.riderId, {
          riderId: task.riderId,
          taskId: task.id,
          lastHeartbeatAt: task.lastHeartbeatAt || task.rider.lastHeartbeatAt || new Date(),
          connectionStatus: task.rider.connectionStatus || 'ACTIVE',
          lastKnownLocation: task.rider.lastKnownLatitude && task.rider.lastKnownLongitude
            ? { latitude: task.rider.lastKnownLatitude, longitude: task.rider.lastKnownLongitude }
            : null,
          batteryLevel: task.rider.lastKnownBattery,
        });
      }
    }

    console.log(`Initialized ${activeTasks.length} active tasks for monitoring`);
  } catch (error) {
    console.error('Error initializing active tasks:', error);
  }
}

initializeActiveTasks();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down heartbeat monitor...');
  await prisma.$disconnect();
  io.close();
  process.exit(0);
});

export { io };
