/**
 * Remove every fixture a suite made, found by its tag rather than by ids the
 * suite happened to capture.
 *
 * Why by tag: each suite builds its fixtures before the `try` that owns
 * cleanup, so a failure PART WAY THROUGH creation — a Prisma validation error,
 * a rate-limited login — leaves the ones already created with nothing to
 * remove them. That is not hypothetical: five crashed runs of the
 * authorization suite left 35 users and 10 merchants behind, and the suites
 * still reported "no QA users left" because each was only checking the ids from
 * its own run.
 *
 * Every fixture a suite creates carries the same random tag in its email or
 * name, so the tag is enough to find all of it whether or not the suite got far
 * enough to remember it.
 *
 * Deletes in dependency order and swallows individual failures, because a
 * half-built fixture set has holes in it by definition.
 */

import type { PrismaClient } from '@prisma/client';

export async function qaCleanupByTag(db: PrismaClient, tag: string): Promise<void> {
  const anyDb = db as unknown as Record<string, { deleteMany: (a: unknown) => Promise<unknown> }>;
  const swallow = () => {};

  const users = await db.user.findMany({
    where: { email: { contains: tag } },
    select: { id: true },
  });
  const uids = users.map((u) => u.id);
  const merchants = await db.merchant.findMany({
    where: { name: { contains: tag } },
    select: { id: true },
  });
  const mids = merchants.map((m) => m.id);
  const providers = await db.healthProvider.findMany({
    where: { businessName: { contains: tag } },
    select: { id: true },
  });
  const pids = providers.map((p) => p.id);
  if (!uids.length && !mids.length && !pids.length) return;

  const riders = await db.rider.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  const rids = riders.map((r) => r.id);

  const orders = await db.order.findMany({
    where: { OR: [{ merchantId: { in: mids } }, { clientId: { in: uids } }] },
    select: { id: true },
  });
  const oids = orders.map((o) => o.id);

  const tasks = await db.task.findMany({
    where: { OR: [{ orderId: { in: oids } }, { clientId: { in: uids } }, { riderId: { in: rids } }] },
    select: { id: true },
  });
  const tids = tasks.map((t) => t.id);

  for (const t of tids) {
    for (const model of [
      'taskStateTransition', 'dispatchMatch', 'auditLog', 'cashCollection',
      'payment', 'conversation', 'receipt',
    ]) {
      await anyDb[model]?.deleteMany({ where: { taskId: t } }).catch(swallow);
    }
  }
  await db.task.deleteMany({ where: { id: { in: tids } } }).catch(swallow);

  await db.financeLog.deleteMany({
    where: { OR: [{ clientId: { in: uids } }, { riderId: { in: rids } }] },
  }).catch(swallow);
  // The unpaid-completion / unpaid-provider-order exceptions name their task or
  // order in the referenceId, so they are found by that rather than by owner.
  for (const id of [...tids, ...oids]) {
    await db.financeLog.deleteMany({
      where: { referenceId: { in: [`unpaid-completion-${id}`, `unpaid-provider-order-${id}`, `commission-${id}`] } },
    }).catch(swallow);
  }

  for (const model of ['orderItem', 'payment', 'kOT', 'auditLog', 'receipt']) {
    await anyDb[model]?.deleteMany({ where: { orderId: { in: oids } } }).catch(swallow);
  }
  await db.order.deleteMany({ where: { id: { in: oids } } }).catch(swallow);

  for (const mid of mids) {
    for (const model of ['menuItem', 'document', 'auditLog']) {
      await anyDb[model]?.deleteMany({ where: { merchantId: mid } }).catch(swallow);
    }
  }
  await db.merchant.deleteMany({ where: { id: { in: mids } } }).catch(swallow);

  for (const pid of pids) {
    for (const model of ['medicineCatalog', 'providerDocument', 'providerOrder']) {
      await anyDb[model]?.deleteMany({ where: { providerId: pid } }).catch(swallow);
    }
  }
  await db.healthProvider.deleteMany({ where: { id: { in: pids } } }).catch(swallow);

  for (const rid of rids) {
    for (const model of ['cashCollection', 'driverReputation', 'incentiveParticipation']) {
      await anyDb[model]?.deleteMany({ where: { riderId: rid } }).catch(swallow);
    }
  }
  await db.rider.deleteMany({ where: { id: { in: rids } } }).catch(swallow);

  await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: { in: uids } } } }).catch(swallow);
  await db.wallet.deleteMany({ where: { ownerId: { in: uids } } }).catch(swallow);

  for (const uid of uids) {
    for (const model of ['auditLog', 'notification', 'payment']) {
      await anyDb[model]?.deleteMany({ where: { userId: uid } }).catch(swallow);
    }
    await db.user.delete({ where: { id: uid } }).catch(swallow);
  }
}

/** True when nothing carrying this tag survives. */
export async function qaNothingLeft(db: PrismaClient, tag: string): Promise<boolean> {
  const [u, m, p] = await Promise.all([
    db.user.count({ where: { email: { contains: tag } } }),
    db.merchant.count({ where: { name: { contains: tag } } }),
    db.healthProvider.count({ where: { businessName: { contains: tag } } }),
  ]);
  return u === 0 && m === 0 && p === 0;
}
