import { db } from '@/lib/db';

export type ActorType = 'SYSTEM' | 'USER' | 'RIDER' | 'MERCHANT' | 'ADMIN';

interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  actorType: ActorType;
  actorId?: string;
  userId?: string;
  riderId?: string;
  merchantId?: string;
  orderId?: string;
  taskId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry for tracking system actions
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const auditLog = await db.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        actorType: data.actorType,
        actorId: data.actorId,
        userId: data.userId,
        riderId: data.riderId,
        merchantId: data.merchantId,
        orderId: data.orderId,
        taskId: data.taskId,
        description: data.description,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Common audit actions
 */
export const AuditActions = {
  // User actions
  USER_REGISTERED: 'USER_REGISTERED',
  USER_UPDATED: 'USER_UPDATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_BANNED: 'USER_BANNED',
  
  // Rider actions
  RIDER_REGISTERED: 'RIDER_REGISTERED',
  RIDER_APPROVED: 'RIDER_APPROVED',
  RIDER_REJECTED: 'RIDER_REJECTED',
  RIDER_SUSPENDED: 'RIDER_SUSPENDED',
  RIDER_ONLINE: 'RIDER_ONLINE',
  RIDER_OFFLINE: 'RIDER_OFFLINE',
  
  // Merchant actions
  MERCHANT_REGISTERED: 'MERCHANT_REGISTERED',
  MERCHANT_APPROVED: 'MERCHANT_APPROVED',
  MERCHANT_REJECTED: 'MERCHANT_REJECTED',
  MERCHANT_SUSPENDED: 'MERCHANT_SUSPENDED',
  
  // Order actions
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
  ORDER_PREPARING: 'ORDER_PREPARING',
  ORDER_READY: 'ORDER_READY',
  ORDER_PICKED_UP: 'ORDER_PICKED_UP',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  
  // Task actions
  TASK_CREATED: 'TASK_CREATED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_ACCEPTED: 'TASK_ACCEPTED',
  TASK_STARTED: 'TASK_STARTED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_CANCELLED: 'TASK_CANCELLED',
  
  // Payment actions
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  
  // KOT actions
  KOT_GENERATED: 'KOT_GENERATED',
  KOT_PRINTED: 'KOT_PRINTED',
  KOT_STARTED: 'KOT_STARTED',
  KOT_COMPLETED: 'KOT_COMPLETED',
} as const;

/**
 * Entity types for audit logs
 */
export const EntityTypes = {
  USER: 'User',
  RIDER: 'Rider',
  VEHICLE: 'Vehicle',
  MERCHANT: 'Merchant',
  MENU_ITEM: 'MenuItem',
  ORDER: 'Order',
  ORDER_ITEM: 'OrderItem',
  KOT: 'KOT',
  TASK: 'Task',
  PAYMENT: 'Payment',
  RATING: 'Rating',
  NOTIFICATION: 'Notification',
} as const;
