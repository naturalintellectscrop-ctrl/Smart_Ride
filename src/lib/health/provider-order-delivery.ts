/**
 * Pharmacy delivery — the missing half of the pharmacy chain (PHARM-8).
 *
 * A merchant order that reaches READY_FOR_PICKUP creates a delivery Task and
 * calls DispatchService (src/app/api/orders/[id]/route.ts, handleReady). A
 * pharmacy order did not: `PATCH /health-provider/orders` moved the row to
 * READY_FOR_PICKUP and stopped. The medicine was prepared, set aside, and no
 * courier was ever asked for. `ProviderOrder.riderId` and the `ASSIGN_RIDER`
 * action existed, but nothing called them and no screen offered them.
 *
 * Nothing here is new architecture:
 *
 *  - `SMART_HEALTH_DELIVERY` is an existing TaskType, already in
 *    DELIVERY_TASK_TYPES (so proof of delivery is required), already priced in
 *    lib/api/pricing.ts, already mapped to DELIVERY_PERSONNEL by
 *    CapabilityService, and already carrying an 85/15 split in
 *    /api/riders/earnings.
 *  - Dispatch goes through the same DispatchService.findAndAssign the merchant
 *    flow uses. There is no second dispatcher.
 *  - The courier drives the Task through the same EnhancedTaskStateMachine as
 *    every other delivery; this module only mirrors the result back onto the
 *    order the pharmacist is looking at.
 *
 * The mirror never moves an order backwards, and never settles it twice.
 */

import { db, setServiceRoleContext } from '@/lib/db';
import { TaskStatus, TaskType, ProviderOrderStatus, PaymentMethod } from '@prisma/client';
import { nextTaskNumber } from '@/lib/tasks/task-number';
import { generateDeliveryCode } from '@/lib/delivery/delivery-service';
import { calculatePricing } from '@/lib/api/pricing';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

// The task state machine calls mirrorTaskStatusToProviderOrder below, and this
// module drives the state machine to start a dispatch — a genuine cycle. These
// two are therefore imported at call time rather than at module load, so
// neither file can be half-initialised when the other first touches it.
const stateMachine = async () =>
  (await import('@/lib/services/enhanced-task-state-machine.service')).EnhancedTaskStateMachine;
const dispatchService = async () =>
  (await import('@/lib/services/dispatch-persistence.service')).DispatchService;

const toNum = (v: unknown): number => (v == null ? 0 : Number(v));

/** Great-circle distance in km. Same haversine the order route already uses. */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Kampala city centre — the same fallback the merchant flow uses when a
 * location was never captured. A missing coordinate must not stop a delivery.
 */
const FALLBACK_LAT = 0.347596;
const FALLBACK_LNG = 32.582520;

const KNOWN_PAYMENT_METHODS = [
  'CASH', 'MTN_MOMO', 'AIRTEL_MONEY', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET',
] as string[];

function asPaymentMethod(value: string | null | undefined): PaymentMethod {
  const v = (value || '').toUpperCase();
  return (KNOWN_PAYMENT_METHODS.includes(v) ? v : 'CASH') as PaymentMethod;
}

/** Task states that mean a courier already holds this delivery. */
const TAKEN_STATUSES: TaskStatus[] = [
  TaskStatus.ASSIGNED,
  TaskStatus.ACCEPTED,
  TaskStatus.ARRIVED,
  TaskStatus.PICKED_UP,
  TaskStatus.IN_TRANSIT,
  TaskStatus.DELIVERING,
  TaskStatus.DELIVERED,
  TaskStatus.COMPLETED,
];

/**
 * Run the rider search again for a task that already exists and found nobody.
 * Returns whether a match was made; the caller decides what to tell the user.
 */
async function researchForRider(
  taskId: string,
  provider: { latitude: number | null; longitude: number | null }
): Promise<boolean> {
  try {
    const Dispatch = await dispatchService();
    const result = await Dispatch.findAndAssign({
      taskId,
      taskType: TaskType.SMART_HEALTH_DELIVERY,
      pickupLatitude: provider.latitude ?? FALLBACK_LAT,
      pickupLongitude: provider.longitude ?? FALLBACK_LNG,
    });
    await setServiceRoleContext();
    return !!(result.success && result.match);
  } catch (error) {
    console.error('[PharmacyDelivery] re-dispatch failed:', error);
    await setServiceRoleContext().catch(() => {});
    return false;
  }
}

export interface DispatchProviderOrderResult {
  dispatched: boolean;
  taskId?: string;
  taskNumber?: string;
  reason?: string;
}

/**
 * Create the delivery task for a ready pharmacy order and start dispatch.
 *
 * Idempotent: an order that already has a task returns that task rather than
 * creating a second one, the same guard `handleReady` gets from its unique
 * `orderId`. Never throws — a dispatch failure must not undo a pharmacist's
 * legitimate "mark ready", which has already been recorded.
 */
export async function dispatchProviderOrder(
  providerOrderId: string
): Promise<DispatchProviderOrderResult> {
  try {
    const order = await db.providerOrder.findUnique({
      where: { id: providerOrderId },
      include: { provider: true, task: true },
    });

    if (!order) return { dispatched: false, reason: 'Order not found' };

    if (order.task) {
      // A task already exists. If a courier is carrying it, there is nothing to
      // do. If nobody was found the first time, search again on the SAME task
      // rather than creating a second one — the order has one delivery, however
      // many times we have to go looking for someone to make it.
      if (order.task.riderId || TAKEN_STATUSES.includes(order.task.status)) {
        return {
          dispatched: false,
          taskId: order.task.id,
          taskNumber: order.task.taskNumber,
          reason: 'Already dispatched',
        };
      }
      const again = await researchForRider(order.task.id, order.provider);
      return {
        dispatched: again,
        taskId: order.task.id,
        taskNumber: order.task.taskNumber,
        reason: again ? undefined : 'No courier available right now',
      };
    }

    // A pickup-only order has no courier leg. supportsDelivery is the
    // provider's own declaration, and deliveryFee is 0 when it is false —
    // dispatching one would invent a delivery nobody is paying for.
    if (!order.provider.supportsDelivery || toNum(order.deliveryFee) <= 0) {
      return { dispatched: false, reason: 'Order is not a delivery' };
    }

    const pickupLat = order.provider.latitude ?? FALLBACK_LAT;
    const pickupLng = order.provider.longitude ?? FALLBACK_LNG;
    const dropLat = order.deliveryLatitude ?? FALLBACK_LAT;
    const dropLng = order.deliveryLongitude ?? FALLBACK_LNG;

    const km = distanceKm(pickupLat, pickupLng, dropLat, dropLng);
    const pricing = calculatePricing({ taskType: 'SMART_HEALTH_DELIVERY', distanceKm: km });

    const task = await db.task.create({
      data: {
        taskNumber: await nextTaskNumber(db),
        taskType: TaskType.SMART_HEALTH_DELIVERY,
        clientId: order.customerId,
        providerOrderId: order.id,
        status: TaskStatus.CREATED,

        // Handover code, issued to the customer and withheld from the courier.
        // Medicine deliveries need this more than any other kind.
        deliveryCode: generateDeliveryCode(),

        pickupAddress: order.provider.address,
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        pickupContactName: order.provider.businessName,
        pickupContactPhone: order.provider.ownerPhone,

        dropoffAddress: order.deliveryAddress,
        dropoffLatitude: dropLat,
        dropoffLongitude: dropLng,
        dropoffContactName: order.customerName,
        dropoffContactPhone: order.customerPhone,

        distanceKm: km,

        baseFare: pricing.baseFare,
        distanceFare: pricing.distanceFare,
        deliveryFee: pricing.deliveryFee,
        serviceFee: pricing.serviceFee,
        totalAmount: pricing.totalAmount,
        platformCommission: pricing.platformCommission,
        riderEarnings: pricing.riderEarnings,

        paymentMethod: asPaymentMethod(order.paymentMethod),
        paymentStatus: order.paymentStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING',

        itemDescription: `Pharmacy order ${order.orderNumber}`,
      },
    });

    await createAuditLog({
      action: AuditActions.TASK_CREATED,
      entityType: EntityTypes.TASK,
      entityId: task.id,
      actorType: 'SYSTEM',
      taskId: task.id,
      description: `Pharmacy delivery task ${task.taskNumber} created for order ${order.orderNumber}`,
    }).catch(() => {});

    const SM = await stateMachine();
    const matchResult = await SM.transition(task.id, TaskStatus.MATCHING, {
      triggeredByType: 'SYSTEM',
      reason: 'Pharmacy order ready, starting dispatch',
    });
    if (!matchResult.success) {
      console.error(
        `[PharmacyDelivery] MATCHING transition failed for ${task.id}:`,
        matchResult.error
      );
    }

    // Non-blocking, exactly as the merchant flow dispatches — the pharmacist's
    // response must not wait on the rider search.
    const Dispatch = await dispatchService();
    Dispatch.findAndAssign({
      taskId: task.id,
      taskType: TaskType.SMART_HEALTH_DELIVERY,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
    })
      .then(async (result) => {
        if (result.success && result.match) {
          await createAuditLog({
            action: AuditActions.DISPATCH_ASSIGNED,
            entityType: EntityTypes.DISPATCH,
            entityId: result.match.id,
            actorType: 'SYSTEM',
            taskId: task.id,
            description: `Dispatch match created for pharmacy delivery ${task.taskNumber}`,
          }).catch(() => {});
        } else if (result.noRidersAvailable) {
          await SM.transition(task.id, TaskStatus.SEARCHING, {
            triggeredByType: 'SYSTEM',
            reason: 'No delivery personnel available for pharmacy order',
          }).catch(() => {});
        }
      })
      .catch((err) => console.error('[PharmacyDelivery] dispatch error (non-blocking):', err));

    // Re-assert the caller's elevated context before handing back.
    // DispatchService.findAndAssign calls resetRLSContext() in its own finally,
    // and with connection_limit=1 every query in this request shares one
    // connection — so a floating dispatch can strip `app.current_user_id` out
    // from under work the caller has not finished yet, and the next query dies
    // with "unrecognized configuration parameter". Reproduced by the chain
    // suite on a second dispatch.
    await setServiceRoleContext();

    return { dispatched: true, taskId: task.id, taskNumber: task.taskNumber };
  } catch (error) {
    console.error('[PharmacyDelivery] dispatchProviderOrder failed:', error);
    return { dispatched: false, reason: (error as Error).message };
  }
}

/**
 * Settle a delivered pharmacy order, exactly once.
 *
 * `totalEarnings` was already incremented on DELIVER before this change, but
 * `pendingPayout` — the balance `/api/pharmacy/payout` treats as the pharmacy's
 * withdrawable money, and the only figure it decrements — was never credited by
 * anything, anywhere in the codebase. A pharmacy could deliver a hundred orders
 * and still withdraw nothing. Both move together now, from one place.
 *
 * The conditional updateMany is what makes it once-only: if the row is already
 * DELIVERED the update matches nothing and no money is written, so the manual
 * DELIVER action and the courier's completion cannot both pay the pharmacy.
 */
export async function settleProviderOrderDelivery(
  providerOrderId: string,
  opts: { riderId?: string | null } = {}
): Promise<{ settled: boolean }> {
  const order = await db.providerOrder.findUnique({
    where: { id: providerOrderId },
    select: {
      id: true,
      providerId: true,
      providerEarnings: true,
      totalAmount: true,
      subtotal: true,
      deliveryFee: true,
      serviceFee: true,
      paymentMethod: true,
      status: true,
      orderNumber: true,
      customerId: true,
    },
  });
  if (!order || order.status === ProviderOrderStatus.DELIVERED) return { settled: false };

  const now = new Date();
  const claimed = await db.providerOrder.updateMany({
    where: { id: providerOrderId, status: { not: ProviderOrderStatus.DELIVERED } },
    data: {
      status: ProviderOrderStatus.DELIVERED,
      deliveredAt: now,
      paymentStatus: 'COMPLETED',
      ...(opts.riderId ? { riderId: opts.riderId } : {}),
    },
  });
  if (claimed.count !== 1) return { settled: false };

  await db.healthProvider.update({
    where: { id: order.providerId },
    data: {
      totalOrders: { increment: 1 },
      completedOrders: { increment: 1 },
      totalEarnings: { increment: order.providerEarnings },
      // What the pharmacy can actually withdraw.
      pendingPayout: { increment: order.providerEarnings },
    },
  });

  // The order's own money, in the immutable ledger.
  //
  // FinanceLedgerService records the COURIER's fare when the delivery task
  // completes, but nothing recorded the medicine sale — ProviderOrder simply
  // flipped a `paymentStatus` string with no Payment row and no ledger entry
  // behind it. The pharmacy's balance moved above, so where it came from has
  // to be written down: what the customer owed, what the pharmacy keeps, and
  // what the platform took. HEALTH_ORDER_PAYMENT already exists for exactly
  // this. The delivery fee is excluded from the commission figure because it
  // funds the courier leg, which the task's own ledger entry settles.
  const platformShare =
    toNum(order.totalAmount) - toNum(order.providerEarnings) - toNum(order.deliveryFee);
  await db.financeLog
    .create({
      data: {
        transactionType: 'HEALTH_ORDER_PAYMENT',
        referenceId: providerOrderId,
        amount: toNum(order.totalAmount),
        currency: 'UGX',
        clientId: order.customerId,
        riderId: opts.riderId ?? null,
        merchantEarnings: toNum(order.providerEarnings),
        platformCommission: platformShare > 0 ? platformShare : 0,
        status: 'COMPLETED',
        description:
          `Pharmacy order ${order.orderNumber} delivered — customer UGX ` +
          `${toNum(order.totalAmount)} (${(order.paymentMethod || 'UNKNOWN').toUpperCase()}), ` +
          `pharmacy UGX ${toNum(order.providerEarnings)}, delivery UGX ` +
          `${toNum(order.deliveryFee)}, platform UGX ${platformShare > 0 ? platformShare : 0}`,
        metadata: JSON.stringify({
          providerOrderId,
          orderNumber: order.orderNumber,
          subtotal: toNum(order.subtotal),
          deliveryFee: toNum(order.deliveryFee),
          serviceFee: toNum(order.serviceFee),
          providerEarnings: toNum(order.providerEarnings),
          paymentMethod: order.paymentMethod,
        }),
      },
    })
    .catch((e) => console.error('[PharmacyDelivery] finance log failed:', e));

  // Cash: the courier took the customer's money at the door, so the platform
  // never received it — but the pharmacy is still owed its share above. Record
  // what the courier is holding on other people's behalf, so the existing
  // deposit/reconciliation flow can clear it. Without this the pharmacy's
  // payable balance would be funded by money nobody had recorded receiving.
  if ((order.paymentMethod || '').toUpperCase() === 'CASH') {
    const task = await db.task.findUnique({
      where: { providerOrderId },
      select: { id: true, riderEarnings: true, riderId: true, platformCommission: true },
    });
    // Whoever actually carried it. A pharmacist marking DELIVER by hand does
    // not name a rider, and the order's own riderId is only set once dispatch
    // assigned one — so the task is the authoritative answer to "who is
    // holding the customer's cash".
    const carrier = opts.riderId ?? task?.riderId ?? null;
    // Everything the courier must hand back: what they collected, less what
    // they keep, less the fare commission FinanceLedger records as its own
    // receivable when the task completes. Without that last subtraction the
    // same UGX is counted twice and the courier is shown owing more than they
    // are physically holding — measured on a real delivery: 6,530 + 450
    // recorded against 6,530 actually collected.
    const owed =
      toNum(order.totalAmount) - toNum(task?.riderEarnings) - toNum(task?.platformCommission);
    if (carrier && owed > 0) {
      await db.cashCollection
        .create({
          data: {
            riderId: carrier,
            taskId: task?.id ?? null,
            userId: order.customerId,
            amount: owed,
            currency: 'UGX',
            collectionType: 'COD_PAYMENT',
            status: 'COLLECTED',
            collectedAt: now,
            notes:
              `Pharmacy order ${order.orderNumber} paid in cash: courier collected UGX ` +
              `${toNum(order.totalAmount)}, keeps UGX ${toNum(task?.riderEarnings)} delivery ` +
              `earnings, owes UGX ${owed} on the order (pharmacy share + order fees); the ` +
              `delivery commission is recorded separately against the task`,
          },
        })
        .catch((e) => console.error('[PharmacyDelivery] cash collection record failed:', e));
    }
  }

  return { settled: true };
}

/**
 * Which order states each mirrored status may advance from. Forward-only: a
 * mirror that could move an order backwards would reintroduce PHARM-2 through
 * a side door.
 */
const MIRROR_ALLOWED_FROM = {
  RIDER_ASSIGNED: [ProviderOrderStatus.READY_FOR_PICKUP],
  OUT_FOR_DELIVERY: [ProviderOrderStatus.READY_FOR_PICKUP, ProviderOrderStatus.RIDER_ASSIGNED],
};

/**
 * Mirror a delivery task's status onto the pharmacy order behind it.
 *
 * The pharmacist watches ProviderOrder; the courier moves Task. Without this
 * the two drift, and the pharmacy screen still reads READY_FOR_PICKUP while the
 * medicine is already at the customer's door.
 */
export async function mirrorTaskStatusToProviderOrder(
  taskId: string,
  toStatus: TaskStatus
): Promise<void> {
  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, providerOrderId: true, riderId: true },
    });
    if (!task?.providerOrderId) return;

    const orderId = task.providerOrderId;

    switch (toStatus) {
      case TaskStatus.ASSIGNED:
      case TaskStatus.ACCEPTED: {
        await db.providerOrder.updateMany({
          where: { id: orderId, status: { in: MIRROR_ALLOWED_FROM.RIDER_ASSIGNED } },
          data: {
            status: ProviderOrderStatus.RIDER_ASSIGNED,
            riderId: task.riderId,
            riderAssignedAt: new Date(),
          },
        });
        break;
      }

      case TaskStatus.PICKED_UP:
      case TaskStatus.IN_TRANSIT: {
        await db.providerOrder.updateMany({
          where: { id: orderId, status: { in: MIRROR_ALLOWED_FROM.OUT_FOR_DELIVERY } },
          data: {
            status: ProviderOrderStatus.OUT_FOR_DELIVERY,
            pickedUpAt: new Date(),
            ...(task.riderId ? { riderId: task.riderId } : {}),
          },
        });
        break;
      }

      case TaskStatus.DELIVERED:
      case TaskStatus.COMPLETED: {
        await settleProviderOrderDelivery(orderId, { riderId: task.riderId });
        break;
      }

      case TaskStatus.CANCELLED: {
        // The pharmacy already prepared the medicine — a courier dropping the
        // job does not cancel the customer's order. Hand it back to
        // READY_FOR_PICKUP so it can be dispatched again, and release the rider.
        await db.providerOrder.updateMany({
          where: {
            id: orderId,
            status: {
              in: [ProviderOrderStatus.RIDER_ASSIGNED, ProviderOrderStatus.OUT_FOR_DELIVERY],
            },
          },
          data: {
            status: ProviderOrderStatus.READY_FOR_PICKUP,
            riderId: null,
            riderAssignedAt: null,
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // A mirroring failure must never fail the courier's transition — the task
    // is the authoritative record and can be re-mirrored.
    console.error('[PharmacyDelivery] mirrorTaskStatusToProviderOrder failed:', error);
  }
}
