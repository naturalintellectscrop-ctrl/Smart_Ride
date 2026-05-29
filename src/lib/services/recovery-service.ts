// ============================================
// SMART RIDE - RECOVERY SERVICE
// ============================================
// Production-grade failure recovery handling for:
// - Dispatch timeouts (rider ignores request)
// - Rider disconnect during task
// - Merchant non-response
// - Stuck task detection and escalation
// ============================================

import { db } from '@/lib/db';
import {
  TaskStatus,
  DispatchMatchStatus,
  ConnectionStatus,
  AlertType,
  AlertSeverity,
  OrderStatus,
} from '@prisma/client';
import { EnhancedTaskStateMachine } from './enhanced-task-state-machine.service';
import { sendTaskUpdateNotification } from './notification.service';

// ============================================
// RECOVERY CONFIGURATION
// ============================================

const RECOVERY_CONFIG = {
  // Dispatch timeout (seconds)
  DISPATCH_TIMEOUT: 300, // 5 minutes

  // Rider disconnect before reassignment (seconds)
  RIDER_DISCONNECT_REASSIGN: 300, // 5 minutes
  RIDER_DISCONNECT_WARNING: 120, // 2 minutes

  // Merchant non-response timeout (seconds)
  MERCHANT_RESPONSE_TIMEOUT: 180, // 3 minutes

  // Stuck task thresholds (seconds)
  STUCK_MATCHING_THRESHOLD: 300, // 5 minutes
  STUCK_ASSIGNED_THRESHOLD: 600, // 10 minutes
  STUCK_IN_PROGRESS_THRESHOLD: 3600, // 60 minutes

  // Max dispatch retries before giving up
  MAX_DISPATCH_RETRIES: 5,
};

// ============================================
// SOCKET EMISSION HELPER
// ============================================

async function emitSocketEvent(
  room: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const socketPort = process.env.SOCKET_PORT || '3002';
    const internalKey =
      process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
    await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ room, event, data }),
    });
  } catch (error) {
    console.error('[Recovery] Socket emission failed:', error);
  }
}

// ============================================
// RECOVERY SERVICE
// ============================================

export interface RecoverySummary {
  dispatchTimeoutsRecovered: number;
  riderDisconnectsRecovered: number;
  merchantNonResponsesRecovered: number;
  stuckTasksEscalated: number;
  errors: string[];
}

export class RecoveryService {
  // ============================================
  // 1. DISPATCH TIMEOUT RECOVERY
  // ============================================
  // When a rider ignores a dispatch request, expire the match
  // and retry with next rider or mark task as FAILED.

  static async recoverDispatchTimeouts(): Promise<number> {
    let recovered = 0;

    try {
      // Find expired PENDING matches that haven't been processed yet
      const expiredMatches = await db.dispatchMatch.findMany({
        where: {
          status: DispatchMatchStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
        include: {
          task: {
            select: {
              id: true,
              taskNumber: true,
              status: true,
              taskType: true,
              pickupLatitude: true,
              pickupLongitude: true,
              clientId: true,
            },
          },
        },
      });

      for (const match of expiredMatches) {
        try {
          // Expire the match
          await db.dispatchMatch.update({
            where: { id: match.id },
            data: {
              status: DispatchMatchStatus.EXPIRED,
              expiredAt: new Date(),
            },
          });

          // Count failed attempts for this task
          const failedAttempts = await db.dispatchMatch.count({
            where: {
              taskId: match.taskId,
              status: {
                in: [
                  DispatchMatchStatus.EXPIRED,
                  DispatchMatchStatus.REJECTED,
                ],
              },
            },
          });

          const task = match.task;
          if (
            task &&
            (task.status === TaskStatus.SEARCHING ||
              task.status === TaskStatus.MATCHING)
          ) {
            if (failedAttempts < RECOVERY_CONFIG.MAX_DISPATCH_RETRIES) {
              // Notify client about retry
              await emitSocketEvent(`user:${task.clientId}`, 'dispatch:retry', {
                taskId: task.id,
                taskNumber: task.taskNumber,
                message:
                  'Previous rider did not respond. Searching for another rider...',
                attempt: failedAttempts + 1,
              });

              // Create audit log
              await db.auditLog.create({
                data: {
                  actorType: 'SYSTEM',
                  taskId: match.taskId,
                  action: 'DISPATCH_TIMEOUT_RETRY',
                  entityType: 'DispatchMatch',
                  entityId: match.id,
                  description: `Dispatch match expired for task ${task.taskNumber}, retrying (attempt ${failedAttempts + 1})`,
                  source: 'SYSTEM',
                },
              });
            } else {
              // Max retries exceeded - transition to FAILED (not CANCELLED)
              // to distinguish "no rider found" from "client cancelled"
              const transitionResult =
                await EnhancedTaskStateMachine.transition(match.taskId, TaskStatus.FAILED, {
                  triggeredByType: 'SYSTEM',
                  reason: `No rider available after ${failedAttempts} dispatch attempts`,
                });

              if (transitionResult.success) {
                // Create ConnectionAlert for admin visibility
                await db.connectionAlert.create({
                  data: {
                    riderId: match.riderId,
                    taskId: match.taskId,
                    alertType: AlertType.TASK_STUCK,
                    severity: AlertSeverity.HIGH,
                    message: `Task ${task.taskNumber} failed: no rider responded after ${failedAttempts} attempts`,
                  },
                });

                // Notify client
                await sendTaskUpdateNotification(
                  task.clientId,
                  task.id,
                  task.taskNumber || task.id,
                  'FAILED'
                ).catch((err) =>
                  console.error('[Recovery] Notification failed:', err)
                );

                // Notify admin
                await emitSocketEvent('admin:dashboard', 'admin:alert', {
                  type: 'DISPATCH_FAILED',
                  taskId: task.id,
                  taskNumber: task.taskNumber,
                  message: `Task failed: no rider available after ${failedAttempts} attempts`,
                  severity: 'HIGH',
                });
              }
            }
          }

          recovered++;
        } catch (error) {
          console.error(
            `[Recovery] Error recovering expired match ${match.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[Recovery] Error in recoverDispatchTimeouts:', error);
    }

    return recovered;
  }

  // ============================================
  // 2. RIDER DISCONNECT RECOVERY
  // ============================================
  // When a rider's heartbeat fails during an active task,
  // create alerts and optionally reassign.

  static async recoverRiderDisconnects(): Promise<number> {
    let recovered = 0;

    try {
      // Find riders with DISCONNECTED status who have an active task
      const disconnectedRiders = await db.rider.findMany({
        where: {
          connectionStatus: ConnectionStatus.DISCONNECTED,
          currentTaskId: { not: null },
          lastHeartbeatAt: { not: null },
        },
        include: {
          tasks: {
            where: {
              status: {
                in: [
                  TaskStatus.ASSIGNED,
                  TaskStatus.ACCEPTED,
                  TaskStatus.ARRIVING,
                  TaskStatus.ARRIVED,
                  TaskStatus.PICKED_UP,
                  TaskStatus.IN_PROGRESS,
                  TaskStatus.IN_TRANSIT,
                ],
              },
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      for (const rider of disconnectedRiders) {
        try {
          const activeTask = rider.tasks[0];
          if (!activeTask || !rider.lastHeartbeatAt) continue;

          const secondsSinceHeartbeat = Math.floor(
            (Date.now() - rider.lastHeartbeatAt.getTime()) / 1000
          );

          if (
            secondsSinceHeartbeat >= RECOVERY_CONFIG.RIDER_DISCONNECT_REASSIGN
          ) {
            // DISCONNECTED > 5 minutes: Auto-reassign

            // Transition task back to SEARCHING for re-dispatch
            const transitionResult =
              await EnhancedTaskStateMachine.transition(
                activeTask.id,
                TaskStatus.SEARCHING,
                {
                  triggeredByType: 'SYSTEM',
                  reason: `Rider disconnected for ${Math.round(secondsSinceHeartbeat / 60)} minutes, reassigning task`,
                }
              );

            if (transitionResult.success) {
              // Release rider's currentTaskId and mark offline
              await db.rider.update({
                where: { id: rider.id },
                data: {
                  currentTaskId: null,
                  isOnline: false,
                },
              });

              // Create CRITICAL ConnectionAlert
              await db.connectionAlert.create({
                data: {
                  riderId: rider.id,
                  taskId: activeTask.id,
                  alertType: AlertType.RIDER_DISCONNECTED,
                  severity: AlertSeverity.CRITICAL,
                  message: `Rider ${rider.fullName} disconnected for ${Math.round(secondsSinceHeartbeat / 60)} min during task ${activeTask.taskNumber}. Task reassigned.`,
                },
              });

              // Notify client about rider change
              await sendTaskUpdateNotification(
                activeTask.clientId,
                activeTask.id,
                activeTask.taskNumber || activeTask.id,
                'SEARCHING'
              ).catch((err) =>
                console.error('[Recovery] Notification failed:', err)
              );

              // Notify admin
              await emitSocketEvent('admin:dashboard', 'admin:alert', {
                type: 'RIDER_DISCONNECT_REASSIGN',
                riderId: rider.id,
                riderName: rider.fullName,
                taskId: activeTask.id,
                taskNumber: activeTask.taskNumber,
                message: `Rider disconnected, task reassigned to dispatch queue`,
                severity: 'CRITICAL',
              });

              recovered++;
            }
          } else if (
            secondsSinceHeartbeat >= RECOVERY_CONFIG.RIDER_DISCONNECT_WARNING
          ) {
            // DISCONNECTED > 2 minutes: Create warning alert (no reassignment yet)
            const existingAlert = await db.connectionAlert.findFirst({
              where: {
                riderId: rider.id,
                taskId: activeTask.id,
                alertType: AlertType.RIDER_DISCONNECTED,
                isAcknowledged: false,
              },
            });

            if (!existingAlert) {
              await db.connectionAlert.create({
                data: {
                  riderId: rider.id,
                  taskId: activeTask.id,
                  alertType: AlertType.RIDER_DISCONNECTED,
                  severity: AlertSeverity.HIGH,
                  message: `Rider ${rider.fullName} disconnected for ${Math.round(secondsSinceHeartbeat / 60)} min during task ${activeTask.taskNumber}. Will auto-reassign at 5 min.`,
                },
              });

              // Notify admin
              await emitSocketEvent('admin:dashboard', 'admin:alert', {
                type: 'RIDER_DISCONNECT_WARNING',
                riderId: rider.id,
                riderName: rider.fullName,
                taskId: activeTask.id,
                taskNumber: activeTask.taskNumber,
                message: `Rider disconnected for ${Math.round(secondsSinceHeartbeat / 60)} min — will reassign at 5 min`,
                severity: 'HIGH',
              });
            }
          }
        } catch (error) {
          console.error(
            `[Recovery] Error recovering rider ${rider.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[Recovery] Error in recoverRiderDisconnects:', error);
    }

    return recovered;
  }

  // ============================================
  // 3. MERCHANT NON-RESPONSE RECOVERY
  // ============================================
  // When a merchant never accepts an order, auto-cancel
  // after configurable timeout.

  static async recoverMerchantNonResponse(): Promise<number> {
    let recovered = 0;

    try {
      const timeoutDate = new Date(
        Date.now() - RECOVERY_CONFIG.MERCHANT_RESPONSE_TIMEOUT * 1000
      );

      // Find orders in ORDER_CREATED status that are older than the timeout
      const staleOrders = await db.order.findMany({
        where: {
          status: OrderStatus.ORDER_CREATED,
          createdAt: { lt: timeoutDate },
        },
        include: {
          merchant: {
            select: { id: true, name: true },
          },
          task: {
            select: { id: true, status: true },
          },
        },
      });

      for (const order of staleOrders) {
        try {
          // Cancel the order
          await db.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason: `Merchant did not respond within ${Math.round(RECOVERY_CONFIG.MERCHANT_RESPONSE_TIMEOUT / 60)} minutes`,
            },
          });

          // Cancel the associated task if it exists
          if (order.task) {
            await EnhancedTaskStateMachine.transition(
              order.task.id,
              TaskStatus.CANCELLED,
              {
                triggeredByType: 'SYSTEM',
                reason:
                  'Merchant did not respond — order auto-cancelled by recovery system',
              }
            ).catch((err) =>
              console.error('[Recovery] Task cancel failed:', err)
            );
          }

          // If payment was completed, create a refund FinanceLog entry
          if (order.paymentStatus === 'COMPLETED') {
            await db.financeLog.create({
              data: {
                transactionType: 'REFUND',
                referenceId: order.id,
                amount: order.totalAmount,
                currency: 'UGX',
                clientId: order.clientId,
                merchantId: order.merchantId,
                status: 'PENDING',
                description: `Refund for order ${order.orderNumber} — merchant non-response auto-cancel`,
              },
            });
          }

          // Create audit log
          await db.auditLog.create({
            data: {
              actorType: 'SYSTEM',
              orderId: order.id,
              action: 'MERCHANT_NON_RESPONSE_CANCEL',
              entityType: 'Order',
              entityId: order.id,
              description: `Order ${order.orderNumber} auto-cancelled: merchant ${order.merchant?.name} did not respond`,
              source: 'SYSTEM',
            },
          });

          // Notify customer
          await sendTaskUpdateNotification(
            order.clientId,
            order.task?.id || order.id,
            order.orderNumber,
            'CANCELLED'
          ).catch((err) =>
            console.error('[Recovery] Notification failed:', err)
          );

          // Notify admin
          await emitSocketEvent('admin:dashboard', 'admin:alert', {
            type: 'MERCHANT_NON_RESPONSE',
            orderId: order.id,
            orderNumber: order.orderNumber,
            merchantName: order.merchant?.name,
            message: `Order auto-cancelled: merchant did not respond`,
            severity: 'HIGH',
          });

          recovered++;
        } catch (error) {
          console.error(
            `[Recovery] Error recovering order ${order.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[Recovery] Error in recoverMerchantNonResponse:', error);
    }

    return recovered;
  }

  // ============================================
  // 4. STUCK TASK DETECTION AND ESCALATION
  // ============================================
  // Detect tasks that have been in a state too long
  // and create escalation alerts for admin visibility.

  static async detectStuckTasks(): Promise<number> {
    let escalated = 0;

    try {
      const now = Date.now();

      // Tasks stuck in MATCHING/SEARCHING for > 5 minutes
      const matchingThreshold = new Date(
        now - RECOVERY_CONFIG.STUCK_MATCHING_THRESHOLD * 1000
      );
      const stuckMatching = await db.task.findMany({
        where: {
          status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
          matchingStartedAt: { lt: matchingThreshold },
        },
        select: {
          id: true,
          taskNumber: true,
          status: true,
          clientId: true,
          matchingStartedAt: true,
        },
      });

      // Tasks stuck in ASSIGNED/ACCEPTED for > 10 minutes
      const assignedThreshold = new Date(
        now - RECOVERY_CONFIG.STUCK_ASSIGNED_THRESHOLD * 1000
      );
      const stuckAssigned = await db.task.findMany({
        where: {
          status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED] },
          assignedAt: { lt: assignedThreshold },
        },
        select: {
          id: true,
          taskNumber: true,
          status: true,
          clientId: true,
          assignedAt: true,
          riderId: true,
        },
      });

      // Tasks stuck in IN_PROGRESS/IN_TRANSIT for > 60 minutes
      const inProgressThreshold = new Date(
        now - RECOVERY_CONFIG.STUCK_IN_PROGRESS_THRESHOLD * 1000
      );
      const stuckInProgress = await db.task.findMany({
        where: {
          status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT] },
          inProgressAt: { lt: inProgressThreshold },
        },
        select: {
          id: true,
          taskNumber: true,
          status: true,
          clientId: true,
          inProgressAt: true,
          riderId: true,
        },
      });

      // Create escalation alerts for all stuck tasks
      const allStuckTasks = [
        ...stuckMatching.map((t) => ({
          ...t,
          stuckCategory: 'MATCHING' as const,
          threshold: RECOVERY_CONFIG.STUCK_MATCHING_THRESHOLD,
          since: t.matchingStartedAt,
        })),
        ...stuckAssigned.map((t) => ({
          ...t,
          stuckCategory: 'ASSIGNED' as const,
          threshold: RECOVERY_CONFIG.STUCK_ASSIGNED_THRESHOLD,
          since: t.assignedAt,
        })),
        ...stuckInProgress.map((t) => ({
          ...t,
          stuckCategory: 'IN_PROGRESS' as const,
          threshold: RECOVERY_CONFIG.STUCK_IN_PROGRESS_THRESHOLD,
          since: t.inProgressAt,
        })),
      ];

      for (const task of allStuckTasks) {
        try {
          // Check if alert already exists for this task
          const existingAlert = await db.connectionAlert.findFirst({
            where: {
              taskId: task.id,
              alertType: AlertType.TASK_STUCK,
              isAcknowledged: false,
            },
          });

          if (existingAlert) continue; // Already escalated

          const minutesStuck = task.since
            ? Math.round((now - task.since.getTime()) / 60000)
            : 0;

          // Determine severity based on how long stuck
          let severity = AlertSeverity.MEDIUM;
          if (minutesStuck > 30) severity = AlertSeverity.HIGH;
          if (minutesStuck > 60) severity = AlertSeverity.CRITICAL;

          // Create ConnectionAlert for admin visibility
          await db.connectionAlert.create({
            data: {
              riderId: task.riderId || undefined,
              taskId: task.id,
              alertType: AlertType.TASK_STUCK,
              severity,
              message: `Task ${task.taskNumber} stuck in ${task.status} for ${minutesStuck} minutes (threshold: ${Math.round(task.threshold / 60)} min)`,
            },
          });

          // Create audit log
          await db.auditLog.create({
            data: {
              actorType: 'SYSTEM',
              taskId: task.id,
              action: 'STUCK_TASK_DETECTED',
              entityType: 'Task',
              entityId: task.id,
              description: `Task ${task.taskNumber} stuck in ${task.status} for ${minutesStuck} minutes`,
              source: 'SYSTEM',
            },
          });

          // Emit admin alert via socket
          await emitSocketEvent('admin:dashboard', 'admin:alert', {
            type: 'STUCK_TASK',
            taskId: task.id,
            taskNumber: task.taskNumber,
            status: task.status,
            stuckCategory: task.stuckCategory,
            minutesStuck,
            riderId: task.riderId,
            severity,
            recoveryOptions: getRecoveryRecommendations(
              task.stuckCategory,
              task.status
            ),
          });

          escalated++;
        } catch (error) {
          console.error(
            `[Recovery] Error escalating stuck task ${task.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[Recovery] Error in detectStuckTasks:', error);
    }

    return escalated;
  }

  // ============================================
  // 5. MAIN RECOVERY CHECK FUNCTION
  // ============================================

  static async runRecoveryChecks(): Promise<RecoverySummary> {
    const summary: RecoverySummary = {
      dispatchTimeoutsRecovered: 0,
      riderDisconnectsRecovered: 0,
      merchantNonResponsesRecovered: 0,
      stuckTasksEscalated: 0,
      errors: [],
    };

    // Run all recovery checks sequentially (each is independent)
    try {
      summary.dispatchTimeoutsRecovered =
        await RecoveryService.recoverDispatchTimeouts();
    } catch (error) {
      summary.errors.push(
        `Dispatch timeout recovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      summary.riderDisconnectsRecovered =
        await RecoveryService.recoverRiderDisconnects();
    } catch (error) {
      summary.errors.push(
        `Rider disconnect recovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      summary.merchantNonResponsesRecovered =
        await RecoveryService.recoverMerchantNonResponse();
    } catch (error) {
      summary.errors.push(
        `Merchant non-response recovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      summary.stuckTasksEscalated =
        await RecoveryService.detectStuckTasks();
    } catch (error) {
      summary.errors.push(
        `Stuck task detection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log(
      `[Recovery] Check complete: ${summary.dispatchTimeoutsRecovered} dispatch timeouts, ${summary.riderDisconnectsRecovered} rider disconnects, ${summary.merchantNonResponsesRecovered} merchant non-responses, ${summary.stuckTasksEscalated} stuck tasks`
    );

    return summary;
  }

  // ============================================
  // 6. RECOVERY STATUS (for admin dashboard)
  // ============================================

  static async getRecoveryStatus(): Promise<{
    stuckTasks: { status: string; count: number }[];
    disconnectedRidersWithTasks: number;
    expiredMatchesPending: number;
    staleOrders: number;
  }> {
    const [
      stuckMatching,
      stuckAssigned,
      stuckInProgress,
      disconnectedRiders,
      expiredMatches,
      staleOrders,
    ] = await Promise.all([
      db.task.count({
        where: {
          status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
          matchingStartedAt: {
            lt: new Date(
              Date.now() - RECOVERY_CONFIG.STUCK_MATCHING_THRESHOLD * 1000
            ),
          },
        },
      }),
      db.task.count({
        where: {
          status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED] },
          assignedAt: {
            lt: new Date(
              Date.now() - RECOVERY_CONFIG.STUCK_ASSIGNED_THRESHOLD * 1000
            ),
          },
        },
      }),
      db.task.count({
        where: {
          status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT] },
          inProgressAt: {
            lt: new Date(
              Date.now() -
                RECOVERY_CONFIG.STUCK_IN_PROGRESS_THRESHOLD * 1000
            ),
          },
        },
      }),
      db.rider.count({
        where: {
          connectionStatus: ConnectionStatus.DISCONNECTED,
          currentTaskId: { not: null },
        },
      }),
      db.dispatchMatch.count({
        where: {
          status: DispatchMatchStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
      }),
      db.order.count({
        where: {
          status: OrderStatus.ORDER_CREATED,
          createdAt: {
            lt: new Date(
              Date.now() - RECOVERY_CONFIG.MERCHANT_RESPONSE_TIMEOUT * 1000
            ),
          },
        },
      }),
    ]);

    return {
      stuckTasks: [
        { status: 'MATCHING/SEARCHING', count: stuckMatching },
        { status: 'ASSIGNED/ACCEPTED', count: stuckAssigned },
        { status: 'IN_PROGRESS/IN_TRANSIT', count: stuckInProgress },
      ],
      disconnectedRidersWithTasks: disconnectedRiders,
      expiredMatchesPending: expiredMatches,
      staleOrders: staleOrders,
    };
  }
}

// ============================================
// RECOVERY RECOMMENDATIONS
// ============================================

function getRecoveryRecommendations(
  category: 'MATCHING' | 'ASSIGNED' | 'IN_PROGRESS',
  status: string
): string[] {
  switch (category) {
    case 'MATCHING':
      return [
        'Force re-dispatch with expanded radius',
        'Cancel task and notify customer',
        'Escalate to manual dispatch',
      ];
    case 'ASSIGNED':
      return [
        'Check rider connection status',
        'Send push notification to rider',
        'Force reassign to another rider',
        'Cancel task',
      ];
    case 'IN_PROGRESS':
      return [
        'Contact rider via in-app chat',
        'Check last known location',
        'Send SOS check to rider',
        'Admin override: mark as completed or cancelled',
      ];
    default:
      return ['Investigate manually'];
  }
}

export default RecoveryService;
