/**
 * The five remaining role journeys, driven through real route handlers.
 *
 * Client, Smart Boda, Smart Car, Merchant, Pharmacist — each taken from its
 * starting state to a finished, paid piece of work using the same endpoints
 * the apps call, with real signed tokens.
 *
 * Nothing here advances a lifecycle by writing the status column. Every
 * transition goes through the API, so a stage that passes has also proved the
 * actor was authorized to cause it. Cross-tenant refusals live in
 * verify-role-authorization.ts; this suite is the positive half.
 *
 * Runs over HTTP against a live server rather than by importing the route
 * handlers. Task creation dispatches through next/server `after()`, which
 * throws outside a real request scope — and the fix for that is a real
 * request, not a product change to suit the harness.
 *
 *   npm run dev            # in another terminal
 *   bun scripts/verify-role-journeys.ts
 */

import { db } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { RiderRole, VehicleType, TaskStatus } from '@prisma/client';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-JOURNEYS';
let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail: string) {
  checks++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id,
    email: u.email ?? '',
    role: u.role as never,
    name: u.name ?? '',
  } as never);
}

const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';

interface Reply {
  status: number;
  json: Record<string, unknown>;
}

/** One real HTTP call, the way the apps make it. */
async function call(
  path: string,
  init?: { method?: string; token?: string; body?: unknown }
): Promise<Reply> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty or non-JSON body */
  }
  return { status: res.status, json };
}

const made = {
  userIds: [] as string[],
  riderIds: [] as string[],
  merchantIds: [] as string[],
  providerIds: [] as string[],
  taskIds: [] as string[],
  orderIds: [] as string[],
  providerOrderIds: [] as string[],
};

async function mkUser(role: string, label: string) {
  const u = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: role as never,
    },
  });
  made.userIds.push(u.id);
  return u;
}

/** Drive one status transition through the real endpoint. */
async function transition(taskId: string, token: string, status: string) {
  return call(`/api/tasks/${taskId}/status`, { method: 'POST', token, body: { status } });
}

/**
 * A full ride, from request to rating. Shared by Boda and Car because the two
 * roles differ only in vehicle and task type — running both through the same
 * path is what proves the difference is data, not a separate code path.
 */
async function rideJourney(opts: {
  label: string;
  taskType: 'SMART_BODA_RIDE' | 'SMART_CAR_RIDE';
  riderRole: RiderRole;
  vehicleType: VehicleType;
}) {
  stage(`${opts.label.toUpperCase()}  request → accept → trip → complete → rate`);

  const client = await mkUser('CLIENT', `${opts.label}Client`);
  const driverUser = await mkUser('RIDER', `${opts.label}Driver`);

  const driver = await db.rider.create({
    data: {
      userId: driverUser.id,
      fullName: `${TAG} ${opts.label} Driver`,
      phone: driverUser.phone!,
      physicalAddress: 'Kampala',
      riderRole: opts.riderRole,
      vehicleType: opts.vehicleType,
      status: 'APPROVED',
      isOnline: true,
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
      lastHeartbeatAt: new Date(),
    },
  });
  made.riderIds.push(driver.id);
  check(
    `${opts.label}: registration persists the role`,
    driver.riderRole === opts.riderRole && driver.vehicleType === opts.vehicleType,
    `${driver.riderRole} / ${driver.vehicleType}`
  );

  const clientToken = tokenFor(client);
  const driverToken = tokenFor(driverUser);

  // ── the client requests a ride, and tries to set its own price ──────
  const ride = {
    taskType: opts.taskType,
    pickupAddress: 'Kampala Road',
    pickupLatitude: 0.3476,
    pickupLongitude: 32.5825,
    dropoffAddress: 'Ntinda',
    dropoffLatitude: 0.3576,
    dropoffLongitude: 32.6025,
    distanceKm: 6,
    durationMin: 18,
    paymentMethod: 'CASH',
  };

  const created = await call('/api/tasks', {
    method: 'POST',
    token: clientToken,
    body: {
      ...ride,
      // A client paying itself one shilling. The server must refuse.
      customPricing: { baseFare: 1, totalAmount: 1 },
    },
  });
  check(
    `${opts.label}: a client cannot book a trip at their own price`,
    created.status >= 400,
    `status ${created.status} — ${String(created.json.error ?? '')}`
  );

  // Now book honestly, with no quote at all — the server prices it.
  const booked = await call('/api/tasks', {
    method: 'POST',
    token: clientToken,
    body: { ...ride },
  });
  const task = ((booked.json.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const taskId = String(task.id ?? '');
  if (taskId) made.taskIds.push(taskId);

  check(
    `${opts.label}: client can request a ride`,
    booked.status === 200 || booked.status === 201,
    `status ${booked.status} ${taskId ? `task ${String(task.taskNumber)}` : String(booked.json.error ?? '')}`
  );
  if (!taskId) return;

  const priced = await db.task.findUnique({
    where: { id: taskId },
    select: { totalAmount: true, riderEarnings: true },
  });
  check(
    `${opts.label}: the server prices the trip`,
    toNumber(priced?.totalAmount) > 100,
    `charged ${toNumber(priced?.totalAmount)}, driver share ${toNumber(priced?.riderEarnings)}`
  );
  check(
    `${opts.label}: the platform never pays out more than it charges`,
    toNumber(priced?.riderEarnings) <= toNumber(priced?.totalAmount),
    `earnings ${toNumber(priced?.riderEarnings)} vs fare ${toNumber(priced?.totalAmount)}`
  );

  // ── the driver sees it and claims it ────────────────────────────────
  const avail = await call('/api/tasks/available', { token: driverToken });
  const offered = (avail.json.data as unknown[]) ?? [];
  check(
    `${opts.label}: the trip reaches the driver's queue`,
    avail.status === 200 &&
      Array.isArray(offered) &&
      offered.some(t => (t as Record<string, unknown>).id === taskId),
    `status ${avail.status}, ${Array.isArray(offered) ? offered.length : 0} offer(s) visible`
  );

  const accepted = await call(`/api/tasks/${taskId}/accept`, {
    method: 'POST',
    token: driverToken,
    body: {},
  });
  check(
    `${opts.label}: driver accepts through the API`,
    accepted.status === 200,
    `status ${accepted.status} ${String(accepted.json.error ?? '')}`
  );

  const held = await db.task.findUnique({
    where: { id: taskId },
    select: { riderId: true, status: true },
  });
  check(
    `${opts.label}: the claim is recorded against this driver`,
    held?.riderId === driver.id,
    `riderId=${held?.riderId === driver.id ? 'this driver' : String(held?.riderId)}, status=${held?.status}`
  );

  // ── the trip itself ─────────────────────────────────────────────────
  const path: TaskStatus[] = [
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
  ];
  let walked = 0;
  for (const next of path) {
    const r = await transition(taskId, driverToken, next);
    if (r.status !== 200) {
      check(
        `${opts.label}: trip reaches ${next}`,
        false,
        `status ${r.status} — ${String(r.json.error ?? '')}`
      );
      break;
    }
    walked++;
  }
  check(
    `${opts.label}: the whole trip lifecycle runs through the API`,
    walked === path.length,
    `${walked}/${path.length} transitions accepted`
  );

  const done = await db.task.findUnique({
    where: { id: taskId },
    select: { status: true, riderEarnings: true, completedAt: true },
  });
  check(
    `${opts.label}: the trip ends COMPLETED`,
    done?.status === TaskStatus.COMPLETED,
    `status ${done?.status}`
  );
  check(
    `${opts.label}: the driver is credited`,
    toNumber(done?.riderEarnings) > 0,
    `riderEarnings ${toNumber(done?.riderEarnings)}`
  );

  // The courier must be free for the next job — the defect that let a
  // provider complete exactly one trip ever.
  const freed = await db.rider.findUnique({
    where: { id: driver.id },
    select: { currentTaskId: true },
  });
  check(
    `${opts.label}: the driver is released for the next job`,
    !freed?.currentTaskId,
    `currentTaskId=${String(freed?.currentTaskId)}`
  );

  // ── receipt and rating ──────────────────────────────────────────────
  const receiptRes = await call('/api/receipts', {
    method: 'POST',
    token: clientToken,
    body: { taskId },
  });
  const receipt = (receiptRes.json.data ?? {}) as Record<string, unknown>;
  check(
    `${opts.label}: the client can get a receipt for the trip`,
    (receiptRes.status === 200 || receiptRes.status === 201) && !!receipt.receiptNumber,
    `status ${receiptRes.status} ${String(receipt.receiptNumber ?? receiptRes.json.error ?? '')}`
  );

  const rated = await call(`/api/tasks/${taskId}/rate`, {
    method: 'POST',
    token: clientToken,
    body: { rating: 5, comment: `${TAG} good trip` },
  });
  check(
    `${opts.label}: the client can rate the trip`,
    rated.status === 200,
    `status ${rated.status} ${String(rated.json.error ?? '')}`
  );

  return { client, clientToken, taskId };
}

async function main() {
  console.log('\n=== Role journeys: Client / Boda / Car / Merchant / Pharmacist ===');

  try {
    // ── Boda (and the client journey that rides on it) ───────────────
    const boda = await rideJourney({
      label: 'Boda',
      taskType: 'SMART_BODA_RIDE',
      riderRole: RiderRole.SMART_BODA_RIDER,
      vehicleType: VehicleType.BODA,
    });

    // ── Client money ─────────────────────────────────────────────────
    if (boda) {
      stage('CLIENT MONEY  wallet balance and history');

      const bal = await call('/api/wallet/balance', { token: boda.clientToken });
      check(
        'client can read a wallet balance',
        bal.status === 200,
        `status ${bal.status}`
      );

      const tx = await call('/api/wallet/transactions', { token: boda.clientToken });
      check(
        'client can read transaction history',
        tx.status === 200,
        `status ${tx.status}`
      );

      const rec = await call('/api/receipts', { token: boda.clientToken });
      const list = ((rec.json.data as Record<string, unknown>)?.receipts ??
        rec.json.data ??
        []) as unknown[];
      check(
        'client receipt history returns their own trip',
        rec.status === 200 && Array.isArray(list) && list.length > 0,
        `status ${rec.status}, ${Array.isArray(list) ? list.length : 0} receipt(s)`
      );
    }

    // ── Smart Car ────────────────────────────────────────────────────
    await rideJourney({
      label: 'Car',
      taskType: 'SMART_CAR_RIDE',
      riderRole: RiderRole.SMART_CAR_DRIVER,
      vehicleType: VehicleType.CAR,
    });

    // ── Merchant ─────────────────────────────────────────────────────
    stage('MERCHANT  catalogue → order → accept → prepare → ready');

    const merchUser = await mkUser('MERCHANT', 'Merchant');
    const merchant = await db.merchant.create({
      data: {
        userId: merchUser.id,
        name: `${TAG} Kitchen`,
        type: 'RESTAURANT',
        phone: merchUser.phone!,
        address: 'Kampala',
        latitude: 0.3476,
        longitude: 32.5825,
        status: 'APPROVED',
        isOpen: true,
      },
    });
    made.merchantIds.push(merchant.id);

    const menuItem = await db.menuItem.create({
      data: {
        merchantId: merchant.id,
        name: `${TAG} Rolex`,
        price: 5000,
        isAvailable: true,
      },
    });

    const orderClient = await mkUser('CLIENT', 'OrderClient');
    const orderClientToken = tokenFor(orderClient);

    const orderLine = (unitPrice: number) => ({
      merchantId: merchant.id,
      orderType: 'FOOD_DELIVERY',
      items: [
        { menuItemId: menuItem.id, itemName: 'Anything I like', quantity: 2, unitPrice },
      ],
      paymentMethod: 'CASH',
      deliveryAddress: 'Ntinda',
      deliveryLatitude: 0.3576,
      deliveryLongitude: 32.6025,
    });

    // The catalogue says 5000. The client claims 1. The server must not sell
    // two items for two shillings.
    const underpriced = await call('/api/orders', {
      method: 'POST',
      token: orderClientToken,
      body: { ...orderLine(1), totalAmount: 2 },
    });
    check(
      'merchant: a client cannot dictate the price of a catalogue item',
      underpriced.status >= 400,
      `status ${underpriced.status} — ${String(underpriced.json.error ?? '')}`
    );

    const orderRes = await call('/api/orders', {
      method: 'POST',
      token: orderClientToken,
      body: { ...orderLine(5000), totalAmount: 10000 },
    });
    const order = ((orderRes.json.data as Record<string, unknown>)?.order ??
      orderRes.json.data ??
      {}) as Record<string, unknown>;
    const orderId = String(order.id ?? '');
    if (orderId) made.orderIds.push(orderId);

    check(
      'merchant: a client can place an honestly priced order',
      (orderRes.status === 200 || orderRes.status === 201) && !!orderId,
      `status ${orderRes.status} ${String(orderRes.json.error ?? '')}`
    );

    if (orderId) {
      const stored = await db.order.findUnique({
        where: { id: orderId },
        select: { subtotal: true, totalAmount: true },
      });
      check(
        'merchant: the stored price is the catalogue price',
        toNumber(stored?.subtotal) >= 10000,
        `stored subtotal ${toNumber(stored?.subtotal)} for 2 × 5000`
      );

      const merchToken = tokenFor(merchUser);

      // Payment first — the merchant lifecycle starts at PAYMENT_CONFIRMED.
      await call(`/api/orders/${orderId}?action=confirm-payment`, {
        method: 'PATCH',
        token: orderClientToken,
        body: { paymentMethod: 'CASH', paymentReference: `${TAG}-pay` },
      });

      const steps: Array<[string, Record<string, unknown>]> = [
        ['accept', { merchantId: merchant.id, estimatedPrepTime: 15 }],
        ['preparing', { merchantId: merchant.id }],
        ['ready', { merchantId: merchant.id }],
      ];
      let ok = 0;
      for (const [action, payload] of steps) {
        const r = await call(`/api/orders/${orderId}?action=${action}`, {
          method: 'PATCH',
          token: merchToken,
          body: payload,
        });
        if (r.status !== 200) {
          check(`merchant: order reaches ${action}`, false, `status ${r.status} — ${String(r.json.error ?? '')}`);
          break;
        }
        ok++;
      }
      check(
        'merchant: the order lifecycle runs through the API',
        ok === steps.length,
        `${ok}/${steps.length} steps accepted`
      );

      const earn = await call('/api/merchant/earnings?action=summary', { token: merchToken });
      check(
        'merchant: can read their own earnings summary',
        earn.status === 200,
        `status ${earn.status}`
      );
    }

    // ── Pharmacist ───────────────────────────────────────────────────
    stage('PHARMACIST  order book → accept → verify prescription → ready');

    const pharmUser = await mkUser('MERCHANT', 'Pharmacist');
    const provider = await db.healthProvider.create({
      data: {
        user: { connect: { id: pharmUser.id } },
        businessName: `${TAG} Pharmacy`,
        providerType: 'PHARMACY',
        licenseNumber: `${TAG}-LIC-${Date.now()}`,
        ownerFullName: `${TAG} Owner`,
        ownerPhone: pharmUser.phone!,
        address: 'Kampala',
        latitude: 0.3476,
        longitude: 32.5825,
        verificationStatus: 'APPROVED',
      },
    });
    made.providerIds.push(provider.id);
    const pharmToken = tokenFor(pharmUser);

    const patient = await mkUser('CLIENT', 'Patient');

    const providerOrder = await db.providerOrder.create({
      data: {
        orderNumber: `${TAG}-PO-${Date.now()}`,
        providerId: provider.id,
        customerId: patient.id,
        customerName: `${TAG} Patient`,
        orderType: 'PRESCRIPTION_MEDICINE',
        status: 'ORDER_RECEIVED',
        items: JSON.stringify([{ name: 'Amoxicillin', price: 12000, quantity: 1 }]),
        subtotal: 12000,
        deliveryFee: 2000,
        totalAmount: 14000,
        providerEarnings: 10800,
        deliveryAddress: 'Ntinda',
        paymentMethod: 'CASH',
      },
    });
    made.providerOrderIds.push(providerOrder.id);

    // The positive half of the guard added this session: the pharmacy must
    // still be able to read its OWN book.
    const ownBook = await call('/api/health-provider/orders', { token: pharmToken });
    // This route answers with a bare { orders, pagination, stats } rather than
    // the { success, data } envelope the rest of the API uses — an
    // inconsistency worth knowing about, not a defect to change under a
    // dashboard that already reads this shape.
    const bookOrders =
      (ownBook.json.orders as unknown[]) ??
      ((ownBook.json.data as Record<string, unknown>)?.orders as unknown[]) ??
      [];
    check(
      'pharmacist: can read their own order book',
      ownBook.status === 200 &&
        bookOrders.some(o => (o as Record<string, unknown>).id === providerOrder.id),
      `status ${ownBook.status}, ${bookOrders.length} order(s)`
    );

    const pharmSteps = ['ACCEPT', 'VERIFY_PRESCRIPTION', 'START_PREPARING', 'READY'];
    let pok = 0;
    for (const action of pharmSteps) {
      const r = await call('/api/health-provider/orders', {
        method: 'PATCH',
        token: pharmToken,
        body: { orderId: providerOrder.id, action },
      });
      if (r.status !== 200) {
        check(`pharmacist: order reaches ${action}`, false, `status ${r.status} — ${String(r.json.error ?? '')}`);
        break;
      }
      pok++;
    }
    check(
      'pharmacist: the prescription lifecycle runs through the API',
      pok === pharmSteps.length,
      `${pok}/${pharmSteps.length} steps accepted`
    );

    const finalOrder = await db.providerOrder.findUnique({
      where: { id: providerOrder.id },
      select: { status: true, prescriptionVerified: true },
    });
    check(
      'pharmacist: prescription verification is recorded',
      finalOrder?.prescriptionVerified === true,
      `verified=${String(finalOrder?.prescriptionVerified)}, status=${finalOrder?.status}`
    );

    const pe = await call('/api/pharmacy/earnings?action=summary', { token: pharmToken });
    check(
      'pharmacist: can read their own earnings summary',
      pe.status === 200,
      `status ${pe.status}`
    );
  } finally {
    await db.rating.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.receipt.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.providerOrder.deleteMany({ where: { id: { in: made.providerOrderIds } } }).catch(() => {});
    await db.healthProvider.deleteMany({ where: { id: { in: made.providerIds } } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: made.orderIds } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: made.orderIds } } }).catch(() => {});
    await db.menuItem.deleteMany({ where: { merchantId: { in: made.merchantIds } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.merchant.deleteMany({ where: { id: { in: made.merchantIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`} — ${checks} checks\n`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('\nSUITE CRASHED:', e);
  await db.$disconnect();
  process.exit(1);
});
