// ============================================
// SMART RIDE - USER HARD-DELETE CASCADE
// ============================================
// Hard-deletes a user and every record that references them (directly, or via
// their Rider / Merchant / HealthProvider profile), inside a single
// transaction so it is all-or-nothing.
//
// Why this exists: several relations use onDelete: Restrict (Order.client,
// Payment.user, RiderPayout.rider, CashCollection.rider) or are required with
// no cascade (DispatchMatch.rider, Rating.fromUser, CallSession.*). A plain
// `user.delete` throws a FK error, and enumerating the relations ad-hoc had
// already drifted out of sync with the schema (e.g. Dispute has no `userId`
// column — it's `clientId` — so the old query threw for EVERY user).
//
// Order matters: children before parents. Keep this list in sync with any new
// model that gains a userId/riderId/merchantId/clientId relation.
// ============================================

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Delete a user and all dependent records. Throws if the user does not exist.
 * Callers are responsible for authorization + not deleting admins.
 */
export async function deleteUserCascade(userId: string): Promise<void> {
  const [rider, merchant, healthProvider] = await Promise.all([
    db.rider.findUnique({ where: { userId }, select: { id: true } }),
    db.merchant.findUnique({ where: { userId }, select: { id: true } }),
    db.healthProvider.findUnique({ where: { userId }, select: { id: true } }),
  ]);
  const riderId = rider?.id;
  const merchantId = merchant?.id;

  // Orders where this user is the client OR (if a merchant) the fulfilling merchant.
  const orders = await db.order.findMany({
    where: {
      OR: [{ clientId: userId }, ...(merchantId ? [{ merchantId }] : [])],
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  // Every task this user touches (as client, as rider, or via their orders).
  // DispatchMatch.taskId and Conversation.taskId reference these and must be
  // cleared before the tasks can be deleted.
  const tasks = await db.task.findMany({
    where: {
      OR: [
        { clientId: userId },
        ...(riderId ? [{ riderId }] : []),
        ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
      ],
    },
    select: { id: true },
  });
  const taskIds = tasks.map((t) => t.id);

  await db.$transaction(
    async (tx: Tx) => {
      // ---- Break task-referencing FKs first (DispatchMatch.taskId is a
      //      required relation → blocks task deletion; Conversation.taskId
      //      too). Cover matches by rider as well. ----
      if (taskIds.length) {
        await tx.dispatchMatch.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.conversation.deleteMany({ where: { taskId: { in: taskIds } } });
      }

      // ---- Children of the user's orders ----
      if (orderIds.length) {
        // Ratings + receipts on these tasks cascade when the tasks are deleted
        // (Rating.task / has onDelete: Cascade); no direct order link on Rating.
        await tx.task.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.kOT.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.receipt.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
      }

      // ---- Rider profile + its dependents ----
      if (riderId) {
        await tx.task.deleteMany({ where: { riderId } });
        await tx.dispatchMatch.deleteMany({ where: { riderId } });
        await tx.riderPayout.deleteMany({ where: { riderId } });
        await tx.cashCollection.deleteMany({ where: { riderId } });
        await tx.heartbeatLog.deleteMany({ where: { riderId } });
        await tx.connectionAlert.deleteMany({ where: { riderId } });
        await tx.riderMetrics.deleteMany({ where: { riderId } });
        await tx.vehicle.deleteMany({ where: { riderId } });
        await tx.document.deleteMany({ where: { riderId } });
        await tx.fraudAlert.deleteMany({ where: { riderId } });
        await tx.transaction.deleteMany({ where: { riderId } });
        await tx.financeLog.deleteMany({ where: { riderId } });
        await tx.dispute.deleteMany({ where: { riderId } });
        await tx.sOSAlert.deleteMany({ where: { riderId } });
        await tx.auditLog.deleteMany({ where: { riderId } });
      }

      // ---- Merchant profile + its dependents ----
      if (merchantId) {
        await tx.menuItem.deleteMany({ where: { merchantId } });
        await tx.kOT.deleteMany({ where: { merchantId } });
        await tx.merchantDocument.deleteMany({ where: { merchantId } });
        await tx.document.deleteMany({ where: { merchantId } });
        await tx.pharmacy.deleteMany({ where: { merchantId } });
        await tx.cart.deleteMany({ where: { merchantId } });
        await tx.transaction.deleteMany({ where: { merchantId } });
        await tx.financeLog.deleteMany({ where: { merchantId } });
        await tx.dispute.deleteMany({ where: { merchantId } });
        await tx.auditLog.deleteMany({ where: { merchantId } });
      }

      // ---- Orders themselves (after their children) ----
      if (orderIds.length) {
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // ---- Records referencing the user directly ----
      await tx.healthOrder.deleteMany({ where: { clientId: userId } });
      await tx.prescription.deleteMany({ where: { clientId: userId } });
      await tx.task.deleteMany({ where: { clientId: userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.receipt.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.financeLog.deleteMany({ where: { clientId: userId } });
      await tx.dispute.deleteMany({ where: { clientId: userId } });
      await tx.savedAddress.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.notificationLog.deleteMany({ where: { userId } });
      await tx.expoPushToken.deleteMany({ where: { userId } });
      await tx.offlineAction.deleteMany({ where: { userId } });
      await tx.sOSAlert.deleteMany({ where: { userId } });
      await tx.fraudAlert.deleteMany({ where: { userId } });
      await tx.conversationParticipant.deleteMany({ where: { userId } });
      await tx.cashCollection.deleteMany({ where: { userId } });
      await tx.rating.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });
      await tx.callSession.deleteMany({ where: { OR: [{ callerId: userId }, { recipientId: userId }] } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });

      // ---- Profiles ----
      if (riderId) await tx.rider.delete({ where: { id: riderId } });
      if (merchantId) await tx.merchant.delete({ where: { id: merchantId } });
      if (healthProvider?.id) await tx.healthProvider.delete({ where: { id: healthProvider.id } });

      // ---- Finally the user ----
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 30_000 },
  );
}
