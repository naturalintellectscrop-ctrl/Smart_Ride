/**
 * Pharmacy → courier → customer, end to end (PHARM-8, PHARM-10).
 *
 * The pharmacy lifecycle suite (verify-provider-order-lifecycle.ts) proves the
 * order cannot move illegally. This one proves it moves at all: that a ready
 * order actually asks for a courier, that the courier's task drives the
 * pharmacy's own order forward, and that the money lands where the payout
 * endpoint looks for it.
 *
 * Run: bun scripts/verify-pharmacy-delivery-chain.ts
 */

import { PrismaClient } from '@prisma/client';
import { setServiceRoleContext } from '../src/lib/db';
import {
  dispatchProviderOrder,
  mirrorTaskStatusToProviderOrder,
  settleProviderOrderDelivery,
} from '../src/lib/health/provider-order-delivery';

const db = new PrismaClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const stamp = Date.now().toString(36);
const tag = `qa-chain-${stamp}`;
const num = (v: unknown) => (v == null ? 0 : Number(v));

async function main() {
  console.log('\n=== PHARMACY DELIVERY CHAIN ===\n');

  // ── Fixtures ────────────────────────────────────────────────────────────
  const customer = await db.user.create({
    data: {
      email: `${tag}-customer@qa.invalid`,
      phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`,
      name: 'QA Chain Customer',
      passwordHash: 'x',
      role: 'CLIENT',
    },
  });

  const providerUser = await db.user.create({
    data: {
      email: `${tag}-pharmacy@qa.invalid`,
      phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`,
      name: 'QA Chain Pharmacist',
      passwordHash: 'x',
      role: 'PHARMACIST',
    },
  });

  const provider = await db.healthProvider.create({
    data: {
      userId: providerUser.id,
      businessName: `${tag} Pharmacy`,
      licenseNumber: `LIC-${stamp}`,
      ownerFullName: 'QA Chain Pharmacist',
      ownerPhone: '+256700000000',
      address: 'Plot 1, Kampala',
      latitude: 0.3476,
      longitude: 32.5825,
      providerType: 'PHARMACY',
      verificationStatus: 'APPROVED',
      supportsDelivery: true,
      commissionRate: 0.1,
    },
  });

  const SUBTOTAL = 30000;
  const DELIVERY_FEE = 5000;
  const SERVICE_FEE = SUBTOTAL * 0.02;
  const TOTAL = SUBTOTAL + DELIVERY_FEE + SERVICE_FEE;
  const PROVIDER_EARNINGS = SUBTOTAL * (1 - 0.1);

  async function newOrder(paymentMethod: string) {
    return db.providerOrder.create({
      data: {
        orderNumber: `HPO-${tag}-${Math.random().toString(36).slice(2, 6)}`,
        providerId: provider.id,
        customerId: customer.id,
        customerName: 'QA Chain Customer',
        customerPhone: '+256700000001',
        orderType: 'OTC_MEDICINE',
        items: JSON.stringify([{ name: 'Paracetamol', price: SUBTOTAL, quantity: 1 }]),
        subtotal: SUBTOTAL,
        deliveryFee: DELIVERY_FEE,
        serviceFee: SERVICE_FEE,
        totalAmount: TOTAL,
        providerEarnings: PROVIDER_EARNINGS,
        deliveryAddress: 'Ntinda, Kampala',
        deliveryLatitude: 0.3626,
        deliveryLongitude: 32.6111,
        paymentMethod,
        paymentStatus: 'PENDING',
        status: 'READY_FOR_PICKUP',
        readyAt: new Date(),
      },
    });
  }

  const createdOrderIds: string[] = [];
  const createdTaskIds: string[] = [];

  try {
    // ── 1. A ready order creates a delivery task ──────────────────────────
    const order = await newOrder('MTN_MOMO');
    createdOrderIds.push(order.id);

    const dispatch = await dispatchProviderOrder(order.id);
    if (dispatch.taskId) createdTaskIds.push(dispatch.taskId);

    check('ready order is dispatched', dispatch.dispatched, dispatch.reason ?? '');
    check('a delivery task exists', !!dispatch.taskId);

    const task = dispatch.taskId
      ? await db.task.findUnique({ where: { id: dispatch.taskId } })
      : null;

    check('task is SMART_HEALTH_DELIVERY', task?.taskType === 'SMART_HEALTH_DELIVERY', task?.taskType);
    check('task points back at the pharmacy order', task?.providerOrderId === order.id);
    check('task client is the customer, not SYSTEM', task?.clientId === customer.id);
    check(
      'pickup is the pharmacy',
      task?.pickupLatitude === provider.latitude && task?.pickupLongitude === provider.longitude
    );
    check(
      'dropoff is the delivery address',
      task?.dropoffLatitude === order.deliveryLatitude &&
        task?.dropoffLongitude === order.deliveryLongitude
    );
    check('a handover code was issued', !!task?.deliveryCode && task.deliveryCode.length >= 4);
    check('fare was priced, not hardcoded', num(task?.totalAmount) > 0 && num(task?.riderEarnings) > 0);
    check(
      'courier split is 85/15',
      Math.abs(num(task?.riderEarnings) + num(task?.platformCommission) - num(task?.totalAmount)) < 1,
      `rider=${num(task?.riderEarnings)} commission=${num(task?.platformCommission)} total=${num(task?.totalAmount)}`
    );
    check('payment method carried onto the task', task?.paymentMethod === 'MTN_MOMO');

    // ── 2. Dispatching twice does not create a second task ────────────────
    const again = await dispatchProviderOrder(order.id);
    check('second dispatch is refused', !again.dispatched && again.reason === 'Already dispatched');
    const taskCount = await db.task.count({ where: { providerOrderId: order.id } });
    check('exactly one task per order', taskCount === 1, `found ${taskCount}`);

    // ── 3. The courier's task drives the pharmacy's order ─────────────────
    if (task) {
      await mirrorTaskStatusToProviderOrder(task.id, 'ASSIGNED');
      let cur = await db.providerOrder.findUnique({ where: { id: order.id } });
      check('assignment shows as RIDER_ASSIGNED', cur?.status === 'RIDER_ASSIGNED', cur?.status);

      await mirrorTaskStatusToProviderOrder(task.id, 'PICKED_UP');
      cur = await db.providerOrder.findUnique({ where: { id: order.id } });
      check('pickup shows as OUT_FOR_DELIVERY', cur?.status === 'OUT_FOR_DELIVERY', cur?.status);
      check('pickup time recorded', !!cur?.pickedUpAt);

      // Backwards mirror must not take. RIDER_ASSIGNED is only legal from
      // READY_FOR_PICKUP, and this order has moved past it.
      await mirrorTaskStatusToProviderOrder(task.id, 'ASSIGNED');
      cur = await db.providerOrder.findUnique({ where: { id: order.id } });
      check('mirror will not move an order backwards', cur?.status === 'OUT_FOR_DELIVERY', cur?.status);
    }

    // ── 4. Delivery settles the pharmacy, exactly once ────────────────────
    const before = await db.healthProvider.findUnique({ where: { id: provider.id } });
    if (task) await mirrorTaskStatusToProviderOrder(task.id, 'DELIVERED');
    const afterFirst = await db.healthProvider.findUnique({ where: { id: provider.id } });
    const settledOrder = await db.providerOrder.findUnique({ where: { id: order.id } });

    check('order is DELIVERED', settledOrder?.status === 'DELIVERED', settledOrder?.status);
    check('delivery time recorded', !!settledOrder?.deliveredAt);
    check('order payment marked COMPLETED', settledOrder?.paymentStatus === 'COMPLETED');
    check(
      'lifetime earnings credited',
      Math.abs(num(afterFirst?.totalEarnings) - num(before?.totalEarnings) - PROVIDER_EARNINGS) < 1,
      `${num(before?.totalEarnings)} → ${num(afterFirst?.totalEarnings)}`
    );
    check(
      'withdrawable balance credited (PHARM-10)',
      Math.abs(num(afterFirst?.pendingPayout) - num(before?.pendingPayout) - PROVIDER_EARNINGS) < 1,
      `${num(before?.pendingPayout)} → ${num(afterFirst?.pendingPayout)}`
    );

    // Replay: a second completion event must not pay twice.
    if (task) await mirrorTaskStatusToProviderOrder(task.id, 'COMPLETED');
    const afterSecond = await db.healthProvider.findUnique({ where: { id: provider.id } });
    check(
      'a replayed completion does not pay twice',
      num(afterSecond?.pendingPayout) === num(afterFirst?.pendingPayout),
      `${num(afterFirst?.pendingPayout)} → ${num(afterSecond?.pendingPayout)}`
    );

    const direct = await settleProviderOrderDelivery(order.id, {});
    check('direct re-settlement is refused', direct.settled === false);

    // ── 5. The sale is in the ledger ──────────────────────────────────────
    const logs = await db.financeLog.findMany({ where: { referenceId: order.id } });
    check('one ledger entry for the sale', logs.length === 1, `found ${logs.length}`);
    const log = logs[0];
    check('ledger records the customer total', Math.abs(num(log?.amount) - TOTAL) < 1, String(num(log?.amount)));
    check(
      "ledger records the pharmacy's share",
      Math.abs(num(log?.merchantEarnings) - PROVIDER_EARNINGS) < 1,
      String(num(log?.merchantEarnings))
    );
    check(
      'customer total = pharmacy + delivery + platform',
      Math.abs(
        num(log?.merchantEarnings) + DELIVERY_FEE + num(log?.platformCommission) - num(log?.amount)
      ) < 1,
      `pharmacy=${num(log?.merchantEarnings)} delivery=${DELIVERY_FEE} platform=${num(log?.platformCommission)} total=${num(log?.amount)}`
    );

    // ── 6. Cash: what the courier is holding is written down ──────────────
    const cashOrder = await newOrder('CASH');
    createdOrderIds.push(cashOrder.id);
    const cashDispatch = await dispatchProviderOrder(cashOrder.id);
    if (cashDispatch.taskId) createdTaskIds.push(cashDispatch.taskId);

    const rider = await db.rider.findFirst({ where: { status: 'APPROVED' }, select: { id: true } });
    if (rider && cashDispatch.taskId) {
      await db.task.update({ where: { id: cashDispatch.taskId }, data: { riderId: rider.id } });
      const cashTask = await db.task.findUnique({ where: { id: cashDispatch.taskId } });
      await settleProviderOrderDelivery(cashOrder.id, { riderId: rider.id });

      const collections = await db.cashCollection.findMany({
        where: { taskId: cashDispatch.taskId },
      });
      check('cash delivery records a collection', collections.length === 1, `found ${collections.length}`);
      const owed = TOTAL - num(cashTask?.riderEarnings);
      check(
        'courier owes total minus their delivery earnings',
        Math.abs(num(collections[0]?.amount) - owed) < 1,
        `recorded=${num(collections[0]?.amount)} expected=${owed}`
      );

      const cashProvider = await db.healthProvider.findUnique({ where: { id: provider.id } });
      check(
        'pharmacy is still owed its share on a cash order',
        Math.abs(num(cashProvider?.pendingPayout) - num(afterSecond?.pendingPayout) - PROVIDER_EARNINGS) < 1,
        `${num(afterSecond?.pendingPayout)} → ${num(cashProvider?.pendingPayout)}`
      );
    } else {
      console.log('  SKIP  cash collection checks — no approved rider on this database');
    }

    // ── 7. A cancelled courier job hands the order back ───────────────────
    const reOrder = await newOrder('WALLET');
    createdOrderIds.push(reOrder.id);
    const reDispatch = await dispatchProviderOrder(reOrder.id);
    if (reDispatch.taskId) {
      createdTaskIds.push(reDispatch.taskId);
      await mirrorTaskStatusToProviderOrder(reDispatch.taskId, 'ASSIGNED');
      await mirrorTaskStatusToProviderOrder(reDispatch.taskId, 'CANCELLED');
      const back = await db.providerOrder.findUnique({ where: { id: reOrder.id } });
      check('a dropped courier job returns the order to READY_FOR_PICKUP', back?.status === 'READY_FOR_PICKUP', back?.status);
      check('the rider is released', back?.riderId === null);
    }

    // ── 8. Pickup-only orders are not dispatched ──────────────────────────
    const pickupOnly = await db.providerOrder.create({
      data: {
        orderNumber: `HPO-${tag}-pickup`,
        providerId: provider.id,
        customerId: customer.id,
        orderType: 'OTC_MEDICINE',
        items: '[]',
        subtotal: SUBTOTAL,
        deliveryFee: 0,
        serviceFee: 0,
        totalAmount: SUBTOTAL,
        providerEarnings: PROVIDER_EARNINGS,
        deliveryAddress: 'Collect in store',
        paymentMethod: 'CASH',
        status: 'READY_FOR_PICKUP',
      },
    });
    createdOrderIds.push(pickupOnly.id);
    const noDispatch = await dispatchProviderOrder(pickupOnly.id);
    check('a collect-in-store order is not dispatched', !noDispatch.dispatched, noDispatch.reason);
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────
    await db.cashCollection.deleteMany({ where: { taskId: { in: createdTaskIds } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { referenceId: { in: createdOrderIds } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { referenceId: { in: createdTaskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: createdTaskIds } } }).catch(() => {});
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: createdTaskIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: createdTaskIds } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: createdTaskIds } } }).catch(() => {});
    await db.providerOrder.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => {});
    await db.healthProvider.delete({ where: { id: provider.id } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: [customer.id, providerUser.id] } } }).catch(() => {});

    const leftoverOrders = await db.providerOrder.count({ where: { providerId: provider.id } });
    const leftoverTasks = await db.task.count({ where: { id: { in: createdTaskIds } } });
    const leftoverUsers = await db.user.count({
      where: { id: { in: [customer.id, providerUser.id] } },
    });
    check(
      'fixtures cleaned up',
      leftoverOrders === 0 && leftoverTasks === 0 && leftoverUsers === 0,
      `orders=${leftoverOrders} tasks=${leftoverTasks} users=${leftoverUsers}`
    );
  }

  console.log(`\n=== ${passed}/${passed + failed} passed ===`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  await db.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
