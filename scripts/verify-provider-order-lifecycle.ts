/**
 * Can a pharmacy order be moved backwards?
 *
 * PHARM-2: the provider-order endpoint mapped an action straight onto a new
 * status and never read the order's current one, so any action applied from any
 * state. Reproduced against production: an order at READY_FOR_PICKUP accepted
 * ACCEPT and went back to ACCEPTED. A DELIVERED order could be re-accepted, a
 * CANCELLED one marched forward again, and DELIVER on an already-delivered
 * order re-stamped deliveredAt and paymentStatus — which is money.
 *
 * ProviderOrder has no state machine (ProviderOrderStatus is referenced in
 * exactly one file), so the guard added to that route is the first definition
 * of this lifecycle. This suite is what holds it honest: it walks the legal
 * path forward and then tries every backwards and terminal move.
 *
 *   bun scripts/verify-provider-order-lifecycle.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';

const TAG = 'E2E-PROVLIFE';
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

const made = { userIds: [] as string[], providerIds: [] as string[], orderIds: [] as string[] };

async function act(token: string, orderId: string, action: string) {
  const { PATCH } = await import('../src/app/api/health-provider/orders/route');
  const req = new NextRequest(new URL('/api/health-provider/orders', 'http://localhost'), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, action }),
  } as never);
  const res = await (PATCH as never as (r: NextRequest) => Promise<Response>)(req);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  await setServiceRoleContext();
  const row = await db.providerOrder.findUnique({ where: { id: orderId }, select: { status: true } });
  return { status: res.status, json, dbStatus: row?.status };
}

async function main() {
  console.log('\n=== A pharmacy order moves forward only ===\n');
  await setServiceRoleContext();

  stage('Fixtures');

  const pUser = await db.user.create({
    data: {
      name: `${TAG} Pharmacist`,
      email: `${TAG.toLowerCase()}-${Date.now()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'PHARMACIST',
    },
  });
  made.userIds.push(pUser.id);

  const customer = await db.user.create({
    data: {
      name: `${TAG} Customer`,
      email: `${TAG.toLowerCase()}-cust-${Date.now()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(customer.id);

  const provider = await db.healthProvider.create({
    data: {
      userId: pUser.id,
      businessName: `${TAG} Pharmacy`,
      licenseNumber: `LIC-${Date.now()}`,
      ownerFullName: `${TAG} Owner`,
      ownerPhone: pUser.phone!,
      providerType: 'PHARMACY',
      address: 'Bugolobi, Kampala',
      verificationStatus: 'APPROVED',
    } as never,
  });
  made.providerIds.push(provider.id);

  const token = generateAccessToken({
    id: pUser.id,
    email: pUser.email ?? '',
    role: 'PHARMACIST' as never,
    name: pUser.name ?? '',
  } as never);

  const mkOrder = async (label: string, status: string) => {
    const o = await db.providerOrder.create({
      data: {
        orderNumber: `${TAG}-${label}-${Date.now()}`,
        customerId: customer.id,
        providerId: provider.id,
        orderType: 'OTC_MEDICINE',
        items: JSON.stringify([{ name: 'Paracetamol', qty: 2, price: 7500 }]),
        status,
        subtotal: 15000,
        deliveryFee: 2000,
        totalAmount: 17000,
        providerEarnings: 13000,
        deliveryAddress: 'MUBS, Nakawa',
      } as never,
    });
    made.orderIds.push(o.id);
    return o;
  };

  stage('The legal path still works, end to end');

  const live = await mkOrder('OK', 'ORDER_RECEIVED');
  for (const [label, action, expected] of [
    ['Accept', 'ACCEPT', 'ACCEPTED'],
    ['Start preparing', 'START_PREPARING', 'PREPARING'],
    ['Ready', 'READY', 'READY_FOR_PICKUP'],
    ['Rider collected', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
    ['Delivered', 'DELIVER', 'DELIVERED'],
  ] as const) {
    const r = await act(token, live.id, action);
    check(
      `${label} → ${action}`,
      r.status === 200 && r.dbStatus === expected,
      `HTTP ${r.status} · order now ${r.dbStatus}`,
    );
  }

  stage('The backwards move that started this');

  const ready = await mkOrder('BACK', 'READY_FOR_PICKUP');
  const back = await act(token, ready.id, 'ACCEPT');
  check(
    'ACCEPT on a READY_FOR_PICKUP order is refused',
    back.status === 409 && back.dbStatus === 'READY_FOR_PICKUP',
    `HTTP ${back.status} → ${String(back.json?.error ?? '').slice(0, 60)} · still ${back.dbStatus}`,
  );

  stage('Terminal orders stay terminal');

  const delivered = await mkOrder('DONE', 'DELIVERED');
  const reAccept = await act(token, delivered.id, 'ACCEPT');
  check(
    'a DELIVERED order cannot be re-accepted',
    reAccept.status === 409 && reAccept.dbStatus === 'DELIVERED',
    `HTTP ${reAccept.status} · still ${reAccept.dbStatus}`,
  );

  const reDeliver = await act(token, delivered.id, 'DELIVER');
  check(
    'a DELIVERED order cannot be delivered twice',
    reDeliver.status === 409 && reDeliver.dbStatus === 'DELIVERED',
    `HTTP ${reDeliver.status} — re-stamping deliveredAt and paymentStatus is money`,
  );

  const cancelled = await mkOrder('CXL', 'CANCELLED');
  const revive = await act(token, cancelled.id, 'READY');
  check(
    'a CANCELLED order cannot be marched forward',
    revive.status === 409 && revive.dbStatus === 'CANCELLED',
    `HTTP ${revive.status} · still ${revive.dbStatus}`,
  );

  const rejected = await mkOrder('REJ', 'REJECTED');
  const verifyOnDead = await act(token, rejected.id, 'VERIFY_PRESCRIPTION');
  check(
    'a prescription cannot be verified on a REJECTED order',
    verifyOnDead.status === 409,
    `HTTP ${verifyOnDead.status} → ${String(verifyOnDead.json?.error ?? '').slice(0, 50)}`,
  );

  stage('Skipping a step is refused');

  const fresh = await mkOrder('SKIP', 'ORDER_RECEIVED');
  const skip = await act(token, fresh.id, 'READY');
  check(
    'READY before the order was ever accepted is refused',
    skip.status === 409 && skip.dbStatus === 'ORDER_RECEIVED',
    `HTTP ${skip.status} · still ${skip.dbStatus}`,
  );

  stage('Prescription decisions on a live order still work');

  const rx = await mkOrder('RX', 'ORDER_RECEIVED');
  const verify = await act(token, rx.id, 'VERIFY_PRESCRIPTION');
  check(
    'VERIFY_PRESCRIPTION is allowed while the order is live',
    verify.status === 200 && verify.dbStatus === 'ORDER_RECEIVED',
    `HTTP ${verify.status} · status unchanged (${verify.dbStatus}), as it should be`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.providerOrder.deleteMany({ where: { id: { in: made.orderIds } } }).catch(() => {});
    await db.healthProvider.deleteMany({ where: { id: { in: made.providerIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
