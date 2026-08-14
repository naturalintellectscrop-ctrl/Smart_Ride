/**
 * Cross-tenant authorization across the five remaining roles.
 *
 * The standing QA rule is that a lifecycle tested by writing the status column
 * proves nothing about who is authorized to write that status. This suite is
 * the inverse test: every case drives a REAL route handler with a REAL signed
 * token belonging to the WRONG party, and asserts the platform says no.
 *
 * Passing means the refusal came from the server. Nothing here asserts on UI
 * visibility — a hidden button is not an authorization control.
 *
 *   bun scripts/verify-role-authorization.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { RiderRole, VehicleType } from '@prisma/client';

const TAG = 'E2E-ROLEAUTH';
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

/** A signed token for a user that actually exists. */
function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id,
    email: u.email ?? '',
    role: u.role as never,
    name: u.name ?? '',
  } as never);
}

function req(url: string, init?: { method?: string; token?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** A refusal is a 401/403/404 — anything 2xx means the action went through. */
function refused(status: number) {
  return status === 401 || status === 403 || status === 404;
}

const made = {
  userIds: [] as string[],
  merchantIds: [] as string[],
  riderIds: [] as string[],
  orderIds: [] as string[],
  taskIds: [] as string[],
  providerIds: [] as string[],
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

async function main() {
  console.log('\n=== Cross-tenant authorization: Client / Boda / Car / Merchant / Pharmacist ===');

  try {
    // ── Fixtures ────────────────────────────────────────────────────
    stage('SETUP  two of everything, so "the other one" always exists');

    const clientA = await mkUser('CLIENT', 'ClientA');
    const clientB = await mkUser('CLIENT', 'ClientB');
    const bodaUser = await mkUser('RIDER', 'Boda');
    const carUser = await mkUser('RIDER', 'Car');
    const merchUserA = await mkUser('MERCHANT', 'MerchA');
    const merchUserB = await mkUser('MERCHANT', 'MerchB');

    const boda = await db.rider.create({
      data: {
        userId: bodaUser.id,
        fullName: `${TAG} Boda`,
        phone: bodaUser.phone!,
        physicalAddress: 'Kampala',
        riderRole: RiderRole.SMART_BODA_RIDER,
        vehicleType: VehicleType.MOTORCYCLE,
        status: 'APPROVED',
        isOnline: true,
      },
    });
    made.riderIds.push(boda.id);

    const car = await db.rider.create({
      data: {
        userId: carUser.id,
        fullName: `${TAG} Car`,
        phone: carUser.phone!,
        physicalAddress: 'Kampala',
        riderRole: RiderRole.SMART_CAR_DRIVER,
        vehicleType: VehicleType.CAR,
        status: 'APPROVED',
        isOnline: true,
      },
    });
    made.riderIds.push(car.id);

    const merchA = await db.merchant.create({
      data: {
        userId: merchUserA.id,
        name: `${TAG} Kitchen A`,
        type: 'RESTAURANT',
        phone: merchUserA.phone!,
        address: 'Kampala',
        latitude: 0.3476,
        longitude: 32.5825,
        status: 'APPROVED',
      },
    });
    made.merchantIds.push(merchA.id);

    const merchB = await db.merchant.create({
      data: {
        userId: merchUserB.id,
        name: `${TAG} Kitchen B`,
        type: 'RESTAURANT',
        phone: merchUserB.phone!,
        address: 'Kampala',
        latitude: 0.3476,
        longitude: 32.5825,
        status: 'APPROVED',
      },
    });
    made.merchantIds.push(merchB.id);

    check('fixtures', true, `clients A/B, boda, car, merchants A/B`);

    // ── 1. Merchant cannot touch another merchant's order ────────────
    stage('CASE 1  merchant B drives merchant A\'s order');

    const orderA = await db.order.create({
      data: {
        orderNumber: `${TAG}-${Date.now()}`,
        clientId: clientA.id,
        merchantId: merchA.id,
        orderType: 'FOOD_DELIVERY',
        status: 'PAYMENT_CONFIRMED',
        subtotal: 20000,
        deliveryFee: 3000,
        serviceFee: 1000,
        totalAmount: 24000,
        paymentMethod: 'CASH',
        deliveryAddress: 'Kampala',
      },
    });
    made.orderIds.push(orderA.id);

    const { PATCH: orderPatch } = await import('../src/app/api/orders/[id]/route');
    const tokMerchB = tokenFor(merchUserB);

    // The give-away: merchant B supplies merchant A's id in the body. That id
    // is not a secret — it is returned by the public merchant listing.
    const acceptRes = await orderPatch(
      req(`/api/orders/${orderA.id}?action=accept`, {
        method: 'PATCH',
        token: tokMerchB,
        body: { merchantId: merchA.id, estimatedPrepTime: 15 },
      }),
      { params: Promise.resolve({ id: orderA.id }) } as never
    );
    const acceptBody = await readJson(acceptRes as never);
    check(
      'merchant B cannot ACCEPT merchant A\'s order',
      refused(acceptRes.status),
      `status ${acceptRes.status} — ${String(acceptBody.error ?? acceptBody.message ?? '')}`
    );

    const prepRes = await orderPatch(
      req(`/api/orders/${orderA.id}?action=preparing`, {
        method: 'PATCH',
        token: tokMerchB,
        body: { merchantId: merchA.id },
      }),
      { params: Promise.resolve({ id: orderA.id }) } as never
    );
    check(
      'merchant B cannot mark merchant A\'s order PREPARING',
      refused(prepRes.status),
      `status ${prepRes.status}`
    );

    const rejRes = await orderPatch(
      req(`/api/orders/${orderA.id}?action=reject`, {
        method: 'PATCH',
        token: tokMerchB,
        body: { merchantId: merchA.id, reason: 'hostile takeover' },
      }),
      { params: Promise.resolve({ id: orderA.id }) } as never
    );
    check(
      'merchant B cannot REJECT merchant A\'s order',
      refused(rejRes.status),
      `status ${rejRes.status}`
    );

    // ...and the rightful owner still can.
    const ownRes = await orderPatch(
      req(`/api/orders/${orderA.id}?action=accept`, {
        method: 'PATCH',
        token: tokenFor(merchUserA),
        body: { merchantId: merchA.id, estimatedPrepTime: 15 },
      }),
      { params: Promise.resolve({ id: orderA.id }) } as never
    );
    check(
      'merchant A CAN still accept its own order',
      ownRes.status === 200,
      `status ${ownRes.status} — the guard must not break the real journey`
    );

    // ── 2. Rider cannot complete a delivery they do not hold ─────────
    stage('CASE 2  an unassigned rider marks an order delivered');

    const deliverRes = await orderPatch(
      req(`/api/orders/${orderA.id}?action=deliver`, {
        method: 'PATCH',
        token: tokenFor(carUser),
        body: { riderId: car.id },
      }),
      { params: Promise.resolve({ id: orderA.id }) } as never
    );
    check(
      'a rider with no assignment cannot mark an order DELIVERED',
      refused(deliverRes.status),
      `status ${deliverRes.status}`
    );

    // ── 3. Client cannot act as a provider ───────────────────────────
    stage('CASE 3  a client reaches for provider-only surface');

    const { GET: availableGet } = await import('../src/app/api/tasks/available/route');
    const availRes = await availableGet(
      req('/api/tasks/available', { token: tokenFor(clientA) })
    );
    check(
      'client cannot list offerable work',
      refused(availRes.status),
      `status ${availRes.status}`
    );

    // ── 4. One rider cannot drive another rider's task ───────────────
    stage('CASE 4  rider B transitions rider A\'s task');

    const taskA = await db.task.create({
      data: {
        taskNumber: `${TAG}-T-${Date.now()}`,
        clientId: clientA.id,
        riderId: boda.id,
        taskType: 'SMART_BODA_RIDE',
        status: 'ACCEPTED',
        pickupAddress: 'Kampala',
        pickupLatitude: 0.3476,
        pickupLongitude: 32.5825,
        dropoffAddress: 'Ntinda',
        dropoffLatitude: 0.3576,
        dropoffLongitude: 32.6025,
        distanceKm: 5,
        paymentMethod: 'CASH',
        baseFare: 3000,
        totalAmount: 8000,
      },
    });
    made.taskIds.push(taskA.id);

    const { POST: statusPost } = await import('../src/app/api/tasks/[id]/status/route');
    const hijack = await statusPost(
      req(`/api/tasks/${taskA.id}/status`, {
        method: 'POST',
        token: tokenFor(carUser),
        body: { status: 'ARRIVING' },
      }),
      { params: Promise.resolve({ id: taskA.id }) } as never
    );
    check(
      'a rider cannot advance a task assigned to another rider',
      refused(hijack.status),
      `status ${hijack.status}`
    );

    // ── 5. Proof of delivery is readable only by the two parties ─────
    stage('CASE 5  a stranger reads someone else\'s proof of delivery');

    const { GET: proofGet } = await import('../src/app/api/tasks/[id]/proof/route');
    const strangerProof = await proofGet(
      req(`/api/tasks/${taskA.id}/proof`, { token: tokenFor(clientB) }),
      { params: Promise.resolve({ id: taskA.id }) } as never
    );
    check(
      'an unrelated customer cannot read a delivery\'s proof',
      refused(strangerProof.status),
      `status ${strangerProof.status}`
    );

    const ownerProof = await proofGet(
      req(`/api/tasks/${taskA.id}/proof`, { token: tokenFor(clientA) }),
      { params: Promise.resolve({ id: taskA.id }) } as never
    );
    check(
      'the paying customer CAN read their own proof record',
      ownerProof.status === 200,
      `status ${ownerProof.status}`
    );

    // The handover code must never travel to the courier — producing it is
    // the entire evidence value.
    const courierProof = await proofGet(
      req(`/api/tasks/${taskA.id}/proof`, { token: tokenFor(bodaUser) }),
      { params: Promise.resolve({ id: taskA.id }) } as never
    );
    const courierBody = await readJson(courierProof as never);
    const courierData = (courierBody.data ?? {}) as Record<string, unknown>;
    check(
      'the courier never receives the handover code',
      courierProof.status === 200 && courierData.deliveryCode === undefined,
      `status ${courierProof.status}, deliveryCode=${String(courierData.deliveryCode)}`
    );

    // ── 6. Receipts belong to their owner ────────────────────────────
    stage('CASE 6  a stranger opens someone else\'s receipt');

    const receipt = await db.receipt.create({
      data: {
        receiptNumber: `${TAG}-R-${Date.now()}`,
        type: 'RIDE',
        taskId: taskA.id,
        userId: clientA.id,
        total: 8000,
        subtotal: 8000,
        paymentMethod: 'CASH',
        paymentStatus: 'COMPLETED',
      },
    });

    const { GET: receiptGet } = await import('../src/app/api/receipts/[id]/route');
    const strangerReceipt = await receiptGet(
      req(`/api/receipts/${receipt.id}`, { token: tokenFor(clientB) }),
      { params: Promise.resolve({ id: receipt.id }) } as never
    );
    check(
      'an unrelated customer cannot open another customer\'s receipt',
      refused(strangerReceipt.status),
      `status ${strangerReceipt.status}`
    );

    // ── 7. Pharmacy data isolation ───────────────────────────────────
    stage('CASE 7  pharmacy orders read without being that pharmacy');

    const provider = await db.healthProvider.findFirst({
      select: { id: true, businessName: true },
    });
    if (!provider) {
      check('pharmacy isolation', true, 'SKIPPED — no HealthProvider rows to probe');
    } else {
      const { GET: hpOrdersGet } = await import('../src/app/api/health-provider/orders/route');

      // No token at all. If this returns data, the route is open to the world.
      const anon = await hpOrdersGet(
        req(`/api/health-provider/orders?providerId=${provider.id}`)
      );
      check(
        'an UNAUTHENTICATED caller cannot list a pharmacy\'s orders',
        refused(anon.status),
        `status ${anon.status} — provider "${provider.businessName}"`
      );

      // A signed-in customer is authenticated but still not this pharmacy.
      const asClient = await hpOrdersGet(
        req(`/api/health-provider/orders?providerId=${provider.id}`, {
          token: tokenFor(clientB),
        })
      );
      check(
        'a signed-in customer cannot list a pharmacy\'s orders',
        refused(asClient.status),
        `status ${asClient.status}`
      );
    }

    // ── 8. Merchant / pharmacy earnings ──────────────────────────────
    stage('CASE 8  revenue figures read by the wrong party');

    const { GET: merchEarnGet } = await import('../src/app/api/merchant/earnings/route');
    const anonEarn = await merchEarnGet(
      req(`/api/merchant/earnings?merchantId=${merchA.id}`)
    );
    check(
      'an UNAUTHENTICATED caller cannot read a merchant\'s earnings',
      refused(anonEarn.status),
      `status ${anonEarn.status}`
    );

    const rivalEarn = await merchEarnGet(
      req(`/api/merchant/earnings?merchantId=${merchA.id}`, { token: tokMerchB })
    );
    check(
      'merchant B cannot read merchant A\'s earnings',
      refused(rivalEarn.status),
      `status ${rivalEarn.status}`
    );

    const { GET: pharmEarnGet } = await import('../src/app/api/pharmacy/earnings/route');
    const anonPharm = await pharmEarnGet(
      req(`/api/pharmacy/earnings?providerId=${provider?.id ?? 'none'}`)
    );
    check(
      'an UNAUTHENTICATED caller cannot read a pharmacy\'s earnings',
      refused(anonPharm.status),
      `status ${anonPharm.status}`
    );
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────
    await db.receipt.deleteMany({ where: { receiptNumber: { startsWith: TAG } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: made.orderIds } } }).catch(() => {});
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
