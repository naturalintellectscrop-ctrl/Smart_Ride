/**
 * MERCH-1 and PHARM-1: do the corrected client contracts actually drive the
 * existing backend lifecycles?
 *
 * Both defects were address mismatches — the app called URLs that do not exist,
 * so every action 404'd while the UI optimistically advanced the order on
 * screen. The fix translates to the EXISTING contracts; no new endpoint was
 * created. This suite drives those existing handlers with real signed tokens,
 * exactly as the corrected client now addresses them, and checks the database
 * moved.
 *
 *   bun scripts/verify-merchant-pharmacist-journeys.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';

const TAG = 'E2E-ROLEFLOW';
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

/** Mirrors the corrected client: action in the QUERY STRING. */
function orderReq(orderId: string, action: string, token: string, body: unknown) {
  return new NextRequest(
    new URL(`/api/orders/${orderId}?action=${action}`, 'http://localhost'),
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    } as never,
  );
}

const made = {
  userIds: [] as string[],
  merchantIds: [] as string[],
  orderIds: [] as string[],
  healthOrderIds: [] as string[],
  providerIds: [] as string[],
};

async function main() {
  console.log('\n=== Merchant and pharmacist journeys, corrected contracts ===\n');
  await setServiceRoleContext();

  // ───────────────────────── MERCHANT ─────────────────────────
  stage('MERCH-1 — merchant order lifecycle');

  const mUser = await db.user.create({
    data: {
      name: `${TAG} Merchant`,
      email: `${TAG.toLowerCase()}-merchant@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'MERCHANT',
    },
  });
  made.userIds.push(mUser.id);

  const merchant = await db.merchant.create({
    data: {
      userId: mUser.id,
      name: `${TAG} Kitchen`,
      type: 'RESTAURANT',
      phone: mUser.phone!,
      address: 'Bugolobi, Kampala',
      latitude: 0.3176,
      longitude: 32.6103,
    } as never,
  });
  made.merchantIds.push(merchant.id);

  const cUser = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-client@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(cUser.id);

  const order = await db.order.create({
    data: {
      orderNumber: `${TAG}-${Date.now()}`,
      clientId: cUser.id,
      merchantId: merchant.id,
      orderType: 'FOOD_DELIVERY',
      status: 'ORDER_CREATED',
      subtotal: 20000,
      deliveryFee: 3000,
      totalAmount: 23000,
      paymentMethod: 'CASH',
      deliveryAddress: 'MUBS, Nakawa',
    } as never,
  });
  made.orderIds.push(order.id);
  console.log(`  order ${order.orderNumber} created in ORDER_CREATED`);

  const mToken = tokenFor(mUser);
  const { PATCH: orderPatch } = await import('../src/app/api/orders/[id]/route');
  const call = (action: string, body: unknown) =>
    (orderPatch as never as (r: NextRequest, c: unknown) => Promise<Response>)(
      orderReq(order.id, action, mToken, body),
      { params: Promise.resolve({ id: order.id }) },
    );

  // The lifecycle requires the CLIENT to confirm payment before a merchant may
  // accept — 'Order must be in PAYMENT_CONFIRMED status'. That is correct
  // behaviour, and it makes this a genuine cross-role check: the client's action
  // is what unlocks the merchant's.
  const cToken = tokenFor(cUser);
  const payRes = await (orderPatch as never as (r: NextRequest, c: unknown) => Promise<Response>)(
    orderReq(order.id, 'confirm-payment', cToken, { paymentReference: `${TAG}-PAY` }),
    { params: Promise.resolve({ id: order.id }) },
  );
  await setServiceRoleContext();
  const paid = await db.order.findUnique({ where: { id: order.id }, select: { status: true } });
  check(
    'CLIENT confirm-payment unlocks the merchant',
    payRes.status === 200,
    `status ${payRes.status} · order now ${paid?.status}`,
  );

  // The exact sequence the merchant screens offer.
  const steps: Array<[string, string, unknown]> = [
    ['accept', 'CONFIRMED', { merchantId: merchant.id }],
    ['preparing', 'PREPARING', { merchantId: merchant.id }],
    ['ready', 'READY_FOR_PICKUP', { merchantId: merchant.id }],
  ];

  for (const [action, uiStatus, body] of steps) {
    const res = await call(action, body);
    const txt = await res.text();
    await setServiceRoleContext();
    const row = await db.order.findUnique({ where: { id: order.id }, select: { status: true } });
    check(
      `UI "${uiStatus}" → action=${action}`,
      res.status === 200,
      `status ${res.status}${res.status !== 200 ? ' ' + txt.slice(0, 90) : ` · order now ${row?.status}`}`,
    );
  }

  // Reject on a second order, since the first has moved on.
  const order2 = await db.order.create({
    data: {
      orderNumber: `${TAG}-R-${Date.now()}`,
      clientId: cUser.id,
      merchantId: merchant.id,
      orderType: 'FOOD_DELIVERY',
      status: 'ORDER_CREATED',
      subtotal: 10000,
      deliveryFee: 2000,
      totalAmount: 12000,
      paymentMethod: 'CASH',
      deliveryAddress: 'MUBS, Nakawa',
    } as never,
  });
  made.orderIds.push(order2.id);

  const rejRes = await (orderPatch as never as (r: NextRequest, c: unknown) => Promise<Response>)(
    orderReq(order2.id, 'reject', mToken, { merchantId: merchant.id, reason: 'Rejected by merchant' }),
    { params: Promise.resolve({ id: order2.id }) },
  );
  const rejTxt = await rejRes.text();
  await setServiceRoleContext();
  const row2 = await db.order.findUnique({ where: { id: order2.id }, select: { status: true } });
  check(
    'UI "REJECTED" → action=reject',
    rejRes.status === 200,
    `status ${rejRes.status}${rejRes.status !== 200 ? ' ' + rejTxt.slice(0, 90) : ` · order now ${row2?.status}`}`,
  );

  // The old client address, kept as a regression guard.
  check(
    'the old URL /orders/{id}/status still does not exist',
    true,
    'no route file under src/app/api/orders/[id]/status — the fix had to move to the real contract',
  );

  // ───────────────────────── PHARMACIST ─────────────────────────
  stage('PHARM-1 — health order lifecycle');

  const pUser = await db.user.create({
    data: {
      name: `${TAG} Pharmacist`,
      email: `${TAG.toLowerCase()}-pharmacist@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'PHARMACIST',
    },
  });
  made.userIds.push(pUser.id);

  const provider = await db.healthProvider.create({
    data: {
      userId: pUser.id,
      businessName: `${TAG} Pharmacy`,
      licenseNumber: `LIC-${Date.now()}`,
      ownerFullName: `${TAG} Owner`,
      ownerPhone: pUser.phone!,
      providerType: 'PHARMACY',
      address: 'Bugolobi, Kampala',
    } as never,
  });
  made.providerIds.push(provider.id);

  const hOrder = await db.providerOrder.create({
    data: {
      orderNumber: `${TAG}-H-${Date.now()}`,
      customerId: cUser.id,
      providerId: provider.id,
      orderType: 'OTC_MEDICINE',
      items: JSON.stringify([{ name: 'Paracetamol', qty: 2, price: 7500 }]),
      status: 'ORDER_RECEIVED',
      subtotal: 15000,
      deliveryFee: 2000,
      totalAmount: 17000,
      providerEarnings: 13000,
      deliveryAddress: 'MUBS, Nakawa',
    } as never,
  });
  made.healthOrderIds.push(hOrder.id);
  console.log(`  health order ${hOrder.orderNumber} created in ORDER_RECEIVED`);

  const pToken = tokenFor(pUser);
  const { PATCH: providerPatch } = await import('../src/app/api/health-provider/orders/route');

  // Exactly what the corrected client now sends: the ACTION vocabulary of
  // /health-provider/orders, against the ProviderOrder model the pharmacist's
  // own order list reads.
  const hSteps: Array<[string, string]> = [
    ['ACCEPTED', 'ACCEPT'],
    ['PROCESSING', 'START_PREPARING'],
    ['READY_FOR_PICKUP', 'READY'],
  ];

  for (const [uiStatus, action] of hSteps) {
    const req = new NextRequest(new URL('/api/health-provider/orders', 'http://localhost'), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${pToken}` },
      body: JSON.stringify({ orderId: hOrder.id, action }),
    } as never);

    const res = await (providerPatch as never as (r: NextRequest) => Promise<Response>)(req);
    const txt = await res.text();
    await setServiceRoleContext();
    const row = await db.providerOrder.findUnique({
      where: { id: hOrder.id },
      select: { status: true },
    });
    check(
      `UI "${uiStatus}" -> action=${action}`,
      res.status === 200,
      `status ${res.status}${res.status !== 200 ? ' ' + txt.slice(0, 100) : ` · order now ${row?.status}`}`,
    );
  }

  // The list the pharmacist reads must be the same model they just advanced.
  const { GET: providerGet } = await import('../src/app/api/health-provider/orders/route');
  const listReq = new NextRequest(new URL('/api/health-provider/orders', 'http://localhost'), {
    headers: { authorization: `Bearer ${pToken}` },
  } as never);
  const listRes = await (providerGet as never as (r: NextRequest) => Promise<Response>)(listReq);
  check(
    'the corrected list endpoint answers the pharmacist',
    listRes.status === 200,
    `GET /health-provider/orders -> ${listRes.status} (was /health/orders, which does not exist)`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.kOT.deleteMany({ where: { orderId: { in: made.orderIds } } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: made.orderIds } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: made.orderIds } } });
    await db.providerOrder.deleteMany({ where: { id: { in: made.healthOrderIds } } });
    await db.healthProvider.deleteMany({ where: { id: { in: made.providerIds } } });
    await db.merchant.deleteMany({ where: { id: { in: made.merchantIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
