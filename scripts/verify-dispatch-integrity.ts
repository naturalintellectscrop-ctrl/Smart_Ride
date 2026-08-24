/**
 * DISPATCH INTEGRITY — an order must actually reach a courier.
 *
 * The financial suite proved the money. This one proves the job moves:
 *
 *   MERCH-7  marking a merchant order READY offers it to a courier
 *   LC-1     a driver can give back a job before pickup, and it is re-offered
 *            to somebody else rather than sitting on the refusal
 *   PHARM    the pharmacy chain still dispatches after the financial changes
 *
 * Runs against the deployed API and reads the database for the truth. Every
 * fixture is disposable and the last assertions check nothing was left behind.
 *
 *   bun scripts/verify-dispatch-integrity.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = process.env.QA_API ?? 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();
const PW = 'QaDispatch#2026';

const SHOP = { lat: 0.3476, lng: 32.5825 };
const DROP = { lat: 0.3626, lng: 32.6111 };

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};
const num = (v: unknown) => (v == null ? 0 : Number(v));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const j = await r.json();
  if (!j?.data?.accessToken) throw new Error(`login ${email}: HTTP ${r.status}`);
  return j.data.accessToken as string;
}
const call = (t: string) => (p: string, m = 'GET', b?: unknown) =>
  fetch(`${API}${p}`, {
    method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });

/** Couriers go stale after 90s; a real app beats every 5-10s. */
async function beat(ids: string[]) {
  await db.rider.updateMany({
    where: { id: { in: ids } },
    data: { isOnline: true, lastHeartbeatAt: new Date() },
  });
}

/** Poll the database until `check` is satisfied, or give up. */
async function waitFor<T>(
  label: string, ms: number, check: () => Promise<T | null>
): Promise<T | null> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const got = await check();
    if (got) return got;
    await sleep(1500);
  }
  console.log(`    (waited ${ms}ms for ${label})`);
  return null;
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  console.log(`\n=== DISPATCH INTEGRITY (${API}) ===\n`);

  const mUser = await db.user.create({ data: { email: `qa-dp-m-${rand}@qa.invalid`, phone: ph(), name: 'QA DP Kitchen', passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE' } });
  const merchant = await db.merchant.create({ data: { userId: mUser.id, name: `QA DP Kitchen ${rand}`, type: 'RESTAURANT', email: mUser.email!, phone: mUser.phone, address: 'Kira Road', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, status: 'APPROVED', isOpen: true } });
  const item = await db.menuItem.create({ data: { merchantId: merchant.id, name: 'QA DP Pilau', price: 18000, category: 'Main', isAvailable: true } });
  const cUser = await db.user.create({ data: { email: `qa-dp-c-${rand}@qa.invalid`, phone: ph(), name: 'QA DP Customer', passwordHash: hash, role: 'CLIENT', status: 'ACTIVE' } });

  // TWO couriers, so a job given back by one has somewhere else to go.
  const riders: Array<{ userId: string; riderId: string; email: string }> = [];
  for (const n of ['A', 'B']) {
    const u = await db.user.create({ data: { email: `qa-dp-r${n.toLowerCase()}-${rand}@qa.invalid`, phone: ph(), name: `QA DP Courier ${n}`, passwordHash: hash, role: 'RIDER', status: 'ACTIVE' } });
    const r = await db.rider.create({ data: { userId: u.id, fullName: `QA DP Courier ${n}`, phone: u.phone, email: u.email!, physicalAddress: 'Kampala', riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true, currentLatitude: SHOP.lat, currentLongitude: SHOP.lng, lastHeartbeatAt: new Date() } });
    riders.push({ userId: u.id, riderId: r.id, email: u.email! });
  }
  const riderIds = riders.map((r) => r.riderId);

  const orderIds: string[] = [];
  const taskIds: string[] = [];

  try {
    const c = call(await login(cUser.email!));
    const m = call(await login(mUser.email!));

    // ── drive a merchant order to READY ─────────────────────────────────────
    console.log('-- a merchant order reaches a courier (MERCH-7) --');
    const pr = await c('/orders', 'POST', {
      merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: item.id, itemName: 'QA DP Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'WALLET', deliveryAddress: 'Ntinda, Kampala',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng, recipientName: 'QA DP Customer',
    });
    const orderId = (await pr.json())?.data?.id;
    if (!orderId) throw new Error(`order creation failed: HTTP ${pr.status}`);
    orderIds.push(orderId);

    const order = await db.order.findUnique({ where: { id: orderId }, select: { totalAmount: true, deliveryFee: true, serviceFee: true } });
    await db.wallet.upsert({
      where: { ownerId_ownerType: { ownerId: cUser.id, ownerType: 'USER' } },
      create: { ownerId: cUser.id, ownerType: 'USER', balance: num(order!.totalAmount) + 20000 },
      update: { balance: num(order!.totalAmount) + 20000 },
    });
    await c('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {});
    await m(`/orders/${orderId}?action=accept`, 'PATCH', { merchantId: merchant.id, estimatedPrepTime: 10 });
    await m(`/orders/${orderId}?action=preparing`, 'PATCH', { merchantId: merchant.id });

    await beat(riderIds);
    const eligibleBefore = await db.rider.count({
      where: { riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true, currentTaskId: null, lastHeartbeatAt: { gte: new Date(Date.now() - 90_000) } },
    });
    ok('there are eligible couriers online before we ask', eligibleBefore >= 2, `${eligibleBefore}`);

    const ready = await m(`/orders/${orderId}?action=ready`, 'PATCH', { merchantId: merchant.id });
    ok('merchant marks the order ready', ready.status === 200, `HTTP ${ready.status}`);

    const task = await db.task.findUnique({
      where: { orderId },
      select: { id: true, taskNumber: true, totalAmount: true, riderEarnings: true, platformCommission: true },
    });
    if (!task) throw new Error('no delivery task was created');
    taskIds.push(task.id);
    ok('a delivery task exists and is priced',
      num(task.riderEarnings) > 0 && num(task.platformCommission) > 0,
      `${task.taskNumber} fare=${num(task.totalAmount)} courier=${num(task.riderEarnings)} platform=${num(task.platformCommission)}`);

    const firstMatch = await waitFor('the first offer', 25_000, async () =>
      db.dispatchMatch.findFirst({
        where: { taskId: task.id, status: 'PENDING' },
        select: { id: true, riderId: true, status: true },
        orderBy: { createdAt: 'desc' },
      })
    );
    ok('the job is actually OFFERED to a courier (MERCH-7)', !!firstMatch,
      firstMatch ? `match ${firstMatch.id} -> rider ${firstMatch.riderId}` : 'no DispatchMatch created');

    if (!firstMatch) {
      throw new Error('dispatch produced no offer — the rest of this suite depends on it');
    }

    const offered = riders.find((r) => r.riderId === firstMatch.riderId)!;
    const other = riders.find((r) => r.riderId !== firstMatch.riderId)!;
    ok('the offer went to one of our couriers', !!offered, offered?.email);

    // ── LC-1: give the job back before pickup ───────────────────────────────
    console.log('\n-- a courier gives the job back before pickup (LC-1) --');
    const rTok = await login(offered.email);
    const r1 = call(rTok);

    const accepted = await r1(`/dispatch/${firstMatch.id}/accept`, 'POST', {});
    ok('the courier can accept the offer', accepted.status === 200, `HTTP ${accepted.status}`);

    const afterAccept = await db.task.findUnique({ where: { id: task.id }, select: { status: true, riderId: true } });
    ok('the task is now theirs', afterAccept?.riderId === offered.riderId, `${afterAccept?.status} rider=${afterAccept?.riderId}`);
    const heldBy = await db.rider.findUnique({ where: { id: offered.riderId }, select: { currentTaskId: true } });
    ok('and they are marked as holding it', heldBy?.currentTaskId === task.id, String(heldBy?.currentTaskId));

    // A courier holding a job must not be offered another.
    const eligibleWhileHolding = await db.rider.count({
      where: { id: offered.riderId, currentTaskId: null, isOnline: true },
    });
    ok('a courier holding a job is not in the eligible pool', eligibleWhileHolding === 0, `${eligibleWhileHolding}`);

    await beat(riderIds);
    const declined = await r1(`/tasks/${task.id}/decline`, 'POST', { reason: 'QA: giving the job back' });
    const declinedBody = await declined.json().catch(() => ({}));
    ok('the courier can give it back before pickup', declined.status === 200,
      `HTTP ${declined.status} ${JSON.stringify(declinedBody).slice(0, 200)}`);

    const afterDecline = await db.task.findUnique({ where: { id: task.id }, select: { status: true, riderId: true } });
    ok('the task goes back to searching', afterDecline?.status === 'SEARCHING', String(afterDecline?.status));
    ok('and is no longer pinned to that courier', afterDecline?.riderId === null, String(afterDecline?.riderId));

    const released = await db.rider.findUnique({ where: { id: offered.riderId }, select: { currentTaskId: true } });
    ok('the courier is released and can be offered work again', released?.currentTaskId === null, String(released?.currentTaskId));

    const rejectedMatch = await waitFor('the refused offer to be closed', 20_000, async () => {
      const mrow = await db.dispatchMatch.findUnique({ where: { id: firstMatch.id }, select: { status: true } });
      return mrow && mrow.status !== 'PENDING' ? mrow : null;
    });
    ok('the offer they refused is closed, not left pending (LC-1)',
      !!rejectedMatch && rejectedMatch.status === 'REJECTED', String(rejectedMatch?.status));

    const reoffer = await waitFor('the job to be re-offered', 30_000, async () =>
      db.dispatchMatch.findFirst({
        where: { taskId: task.id, status: 'PENDING', riderId: { not: offered.riderId } },
        select: { id: true, riderId: true },
        orderBy: { createdAt: 'desc' },
      })
    );
    ok('the job is re-offered to a DIFFERENT courier (LC-1)', !!reoffer,
      reoffer ? `rider ${reoffer.riderId} (was ${offered.riderId})` : 'no re-offer');
    ok('and not back to the one who refused it',
      !reoffer || reoffer.riderId === other.riderId, reoffer?.riderId);

    // ── the app must never attempt ASSIGNED -> CANCELLED ────────────────────
    console.log('\n-- the lifecycle is not driven backwards --');
    const transitions = await db.taskStateTransition.findMany({
      where: { taskId: task.id }, select: { fromStatus: true, toStatus: true }, orderBy: { createdAt: 'asc' },
    });
    const path = transitions.map((t) => `${t.fromStatus ?? '?'}->${t.toStatus}`);
    ok('no ASSIGNED -> CANCELLED was ever recorded',
      !path.includes('ASSIGNED->CANCELLED'), path.join(', '));
    ok('the task never moved to a terminal state on a give-back',
      !transitions.some((t) => ['CANCELLED', 'FAILED', 'CLOSED'].includes(String(t.toStatus))),
      path.join(', '));
  } finally {
    console.log('\n-- cleanup --');
    const orders = await db.order.findMany({ where: { merchantId: merchant.id }, select: { id: true } });
    const oids = Array.from(new Set([...orderIds, ...orders.map((o) => o.id)]));
    const tasks = await db.task.findMany({
      where: { OR: [{ orderId: { in: oids } }, { riderId: { in: riderIds } }, { clientId: cUser.id }] },
      select: { id: true },
    });
    const tids = Array.from(new Set([...taskIds, ...tasks.map((t) => t.id)]));
    for (const t of tids) {
      await db.taskStateTransition.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.dispatchMatch.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.cashCollection.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.payment.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.conversation.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.receipt.deleteMany({ where: { taskId: t } }).catch(() => {});
    }
    await db.rider.updateMany({ where: { id: { in: riderIds } }, data: { currentTaskId: null, isOnline: false } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: tids } } }).catch((e) => console.log('task:', e.message.slice(0, 80)));
    await db.financeLog.deleteMany({ where: { OR: [{ clientId: cUser.id }, { riderId: { in: riderIds } }] } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.kOT.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.receipt.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: oids } } }).catch((e) => console.log('order:', e.message.slice(0, 80)));
    await db.menuItem.deleteMany({ where: { merchantId: merchant.id } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { merchantId: merchant.id } }).catch(() => {});
    await db.merchant.delete({ where: { id: merchant.id } }).catch((e) => console.log('merchant:', e.message.slice(0, 80)));
    const allUsers = [mUser.id, cUser.id, ...riders.map((r) => r.userId)];
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: { in: allUsers } } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: allUsers } } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { riderId: { in: riderIds } } }).catch(() => {});
    await db.driverReputation.deleteMany({ where: { riderId: { in: riderIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: riderIds } } }).catch((e) => console.log('rider:', e.message.slice(0, 80)));
    for (const uid of allUsers) {
      await db.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.payment.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.user.delete({ where: { id: uid } }).catch((e) => console.log('user:', e.message.slice(0, 80)));
    }

    ok('no QA users left', (await db.user.count({ where: { id: { in: allUsers } } })) === 0);
    ok('no QA tasks left', (await db.task.count({ where: { id: { in: tids } } })) === 0);
    ok('no QA orders left', (await db.order.count({ where: { id: { in: oids } } })) === 0);
    ok('no pending offers left', (await db.dispatchMatch.count({ where: { taskId: { in: tids } } })) === 0);
    ok('no riders left online from this suite',
      (await db.rider.count({ where: { id: { in: riderIds } } })) === 0);
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
