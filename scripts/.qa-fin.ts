/**
 * FINANCIAL MODEL TRACE — merchant/food order, end to end, against the real API.
 *
 * Phase 1 + Phase 6 of the financial-closure brief: place a real order through
 * the deployed routes and read every row the money touches at each step, so the
 * model is traced from implementation rather than from labels.
 *
 * Disposable fixtures only. `cleanup` removes everything it made.
 *
 *   bun scripts/.qa-fin.ts setup
 *   bun scripts/.qa-fin.ts run CASH
 *   bun scripts/.qa-fin.ts run MTN_MOMO
 *   bun scripts/.qa-fin.ts snap
 *   bun scripts/.qa-fin.ts cleanup
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';

const API = process.env.QA_API ?? 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();
const STATE = 'scripts/.qa-fin.json';
const load = (): any => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s: any) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
const n = (v: any) => (v == null ? null : Number(v));
const PW = 'QaFin#2026';

// Merchant sits in Kampala; delivery ~3km away.
const MERCH = { lat: 0.3476, lng: 32.5825 };
const DROP = { lat: 0.3626, lng: 32.6111 };

async function login(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const j = await r.json();
  const t = j?.data?.accessToken;
  if (!t) throw new Error(`login failed for ${email}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return t;
}

const call = (token: string) => (path: string, method = 'GET', body?: unknown) =>
  fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

async function setup() {
  const rand = Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  const mUser = await db.user.create({
    data: {
      email: `qa-fin-m-${rand}@qa.invalid`, phone: ph(), name: 'QA Fin Kitchen',
      passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE',
    },
  });
  const merchant = await db.merchant.create({
    data: {
      userId: mUser.id, name: `QA Fin Kitchen ${rand}`, type: 'RESTAURANT',
      email: mUser.email!, phone: mUser.phone, address: 'Kira Road, Kampala', city: 'Kampala',
      latitude: MERCH.lat, longitude: MERCH.lng, status: 'APPROVED', isOpen: true,
    },
  });
  const item = await db.menuItem.create({
    data: {
      merchantId: merchant.id, name: 'QA Fin Pilau', description: 'Disposable',
      price: 18000, category: 'Main', isAvailable: true,
    },
  });

  const cUser = await db.user.create({
    data: {
      email: `qa-fin-c-${rand}@qa.invalid`, phone: ph(), name: 'QA Fin Customer',
      passwordHash: hash, role: 'CLIENT', status: 'ACTIVE',
    },
  });

  const rUser = await db.user.create({
    data: {
      email: `qa-fin-r-${rand}@qa.invalid`, phone: ph(), name: 'QA Fin Courier',
      passwordHash: hash, role: 'RIDER', status: 'ACTIVE',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: rUser.id, fullName: 'QA Fin Courier', phone: rUser.phone, email: rUser.email!,
      physicalAddress: 'Kampala', riderRole: 'SMART_BODA_RIDER', status: 'APPROVED',
      isOnline: true, currentLatitude: MERCH.lat, currentLongitude: MERCH.lng,
      lastHeartbeatAt: new Date(),
    },
  });

  save({
    rand, merchantId: merchant.id, itemId: item.id,
    mEmail: mUser.email, cEmail: cUser.email, rEmail: rUser.email,
    mUserId: mUser.id, cUserId: cUser.id, rUserId: rUser.id, riderId: rider.id, orderIds: [],
  });
  console.log(`SETUP ok  merchant=${merchant.id} item=${item.id} rider=${rider.id}`);
}

/** Keep the courier dispatchable across the run. */
async function beat() {
  const s = load();
  await db.rider.update({
    where: { id: s.riderId },
    data: {
      isOnline: true, lastHeartbeatAt: new Date(),
      currentLatitude: MERCH.lat, currentLongitude: MERCH.lng,
    },
  });
}

async function dump(label: string, orderId: string) {
  const o = await db.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true, status: true, paymentMethod: true, paymentStatus: true,
      subtotal: true, deliveryFee: true, serviceFee: true, totalAmount: true,
    },
  });
  const t = await db.task.findUnique({
    where: { orderId },
    select: {
      id: true, taskNumber: true, taskType: true, status: true, paymentMethod: true,
      paymentStatus: true, totalAmount: true, riderEarnings: true, platformCommission: true,
      riderId: true, distanceKm: true, baseFare: true, matchingStartedAt: true,
    },
  });
  const pays = await db.payment.findMany({
    where: { orderId },
    select: { paymentReference: true, paymentMethod: true, status: true, amount: true },
  });
  const matches = t ? await db.dispatchMatch.count({ where: { taskId: t.id } }) : 0;

  console.log(`\n--- ${label} ---`);
  console.log(`ORDER  ${o?.orderNumber} ${o?.status} pay=${o?.paymentMethod}/${o?.paymentStatus} sub=${n(o?.subtotal)} del=${n(o?.deliveryFee)} svc=${n(o?.serviceFee)} TOT=${n(o?.totalAmount)}`);
  console.log(`TASK   ${t?.taskNumber ?? '(none)'} ${t?.status ?? ''} pay=${t?.paymentMethod ?? ''}/${t?.paymentStatus ?? ''} tot=${n(t?.totalAmount)} riderEarn=${n(t?.riderEarnings)} comm=${n(t?.platformCommission)} rider=${t?.riderId ?? 'unassigned'} km=${t?.distanceKm ?? 'null'} matchingStartedAt=${t?.matchingStartedAt ?? 'null'}`);
  console.log(`PAY    ${pays.length ? pays.map((p) => `${p.paymentReference} ${p.paymentMethod}/${p.status} ${n(p.amount)}`).join(' | ') : '(no Payment row)'}`);
  console.log(`MATCH  dispatchMatch rows=${matches}`);
}

async function run(method: string) {
  const s = load();
  await beat();
  const cTok = await login(s.cEmail);
  const c = call(cTok);

  // quote first: what the customer is shown
  const qr = await c('/orders/quote', 'POST', {
    merchantId: s.merchantId, orderType: 'FOOD_DELIVERY',
    items: [{ menuItemId: s.itemId, quantity: 1, unitPrice: 18000 }],
    deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
  });
  console.log(`QUOTE  HTTP ${qr.status} ${JSON.stringify(await qr.json()).slice(0, 300)}`);

  // place
  const pr = await c('/orders', 'POST', {
    merchantId: s.merchantId, orderType: 'FOOD_DELIVERY',
    items: [{ menuItemId: s.itemId, itemName: 'QA Fin Pilau', quantity: 1, unitPrice: 18000 }],
    paymentMethod: method,
    deliveryAddress: 'Ntinda, Kampala',
    deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    recipientName: 'QA Fin Customer',
  });
  const pj = await pr.json();
  if (!pr.ok) {
    console.log(`PLACE  REFUSED HTTP ${pr.status} ${JSON.stringify(pj).slice(0, 300)}`);
    return;
  }
  const orderId = pj?.data?.id ?? pj?.id;
  s.orderIds = [...(s.orderIds ?? []), orderId];
  save(s);
  console.log(`PLACE  HTTP ${pr.status} orderId=${orderId} method=${method}`);
  await dump('after POST /orders', orderId);

  // the client declares it paid, with a reference that names no payment
  const cf = await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {
    paymentReference: 'QA-NO-SUCH-PAYMENT',
  });
  console.log(`CONFIRM HTTP ${cf.status} ${JSON.stringify(await cf.json()).slice(0, 200)}`);
  await dump('after client confirm-payment', orderId);

  // merchant works the order
  const mTok = await login(s.mEmail);
  const m = call(mTok);
  const steps: Array<[string, Record<string, unknown>]> = [
    ['accept', { merchantId: s.merchantId, estimatedPrepTime: 10 }],
    ['preparing', { merchantId: s.merchantId }],
    ['ready', { merchantId: s.merchantId }],
  ];
  for (const [act, body] of steps) {
    const r = await m(`/orders/${orderId}?action=${act}`, 'PATCH', body);
    console.log(`${act.toUpperCase().padEnd(9)} HTTP ${r.status} ${JSON.stringify(await r.json()).slice(0, 160)}`);
  }
  await new Promise((r) => setTimeout(r, 3000));
  await dump('after merchant READY (dispatch should have run)', orderId);
}

async function snap() {
  const s = load();
  for (const id of s.orderIds ?? []) await dump(`order ${id}`, id);

  const rider = await db.rider.findUnique({
    where: { id: s.riderId },
    select: { walletBalance: true, totalEarnings: true, currentTaskId: true, isOnline: true },
  });
  console.log(`\nRIDER  walletBalance=${n(rider?.walletBalance)} totalEarnings=${n(rider?.totalEarnings)} currentTask=${rider?.currentTaskId}`);
  const w = await db.wallet.findFirst({
    where: { ownerId: s.rUserId },
    select: { balance: true, availableBalance: true },
  });
  console.log(`WALLET ${w ? `balance=${n(w.balance)} available=${n(w.availableBalance)}` : '(no Wallet row)'}`);
  const fl = await db.financeLog.findMany({
    where: { OR: [{ clientId: s.cUserId }, { riderId: s.riderId }] },
    select: {
      transactionType: true, referenceId: true, amount: true, platformCommission: true,
      riderEarnings: true, merchantEarnings: true, status: true,
    },
  });
  console.log(`FINANCELOG rows=${fl.length}`);
  for (const f of fl) {
    console.log(`  ${f.transactionType} ref=${f.referenceId} amt=${n(f.amount)} comm=${n(f.platformCommission)} rider=${n(f.riderEarnings)} merch=${n(f.merchantEarnings)} ${f.status}`);
  }
  const cc = await db.cashCollection.findMany({
    where: { riderId: s.riderId },
    select: { amount: true, collectionType: true, status: true },
  });
  console.log(`CASHCOLLECTION rows=${cc.length}`);
  for (const x of cc) console.log(`  ${x.collectionType} ${n(x.amount)} ${x.status}`);
}

async function cleanup() {
  const s = load();
  if (!s.merchantId) return console.log('nothing to clean');
  const orders = await db.order.findMany({ where: { merchantId: s.merchantId }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  const tasks = await db.task.findMany({
    where: { OR: [{ orderId: { in: ids } }, { riderId: s.riderId }] },
    select: { id: true },
  });
  const tids = tasks.map((t) => t.id);
  for (const t of tids) {
    await db.taskStateTransition.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.dispatchMatch.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.payment.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.conversation.deleteMany({ where: { taskId: t } }).catch(() => {});
    await db.receipt.deleteMany({ where: { taskId: t } }).catch(() => {});
  }
  await db.task.deleteMany({ where: { id: { in: tids } } }).catch((e) => console.log('task:', e.message.slice(0, 90)));
  await db.financeLog.deleteMany({ where: { OR: [{ clientId: s.cUserId }, { riderId: s.riderId }] } }).catch(() => {});
  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.payment.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.kOT.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.receipt.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.order.deleteMany({ where: { id: { in: ids } } }).catch((e) => console.log('order:', e.message.slice(0, 90)));
  await db.menuItem.deleteMany({ where: { merchantId: s.merchantId } }).catch(() => {});
  await db.document.deleteMany({ where: { merchantId: s.merchantId } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { merchantId: s.merchantId } }).catch(() => {});
  await db.merchant.delete({ where: { id: s.merchantId } }).catch((e) => console.log('merchant:', e.message.slice(0, 90)));
  await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: s.rUserId } } }).catch(() => {});
  await db.wallet.deleteMany({ where: { ownerId: { in: [s.rUserId, s.cUserId] } } }).catch(() => {});
  await db.cashCollection.deleteMany({ where: { riderId: s.riderId } }).catch(() => {});
  await db.rider.delete({ where: { id: s.riderId } }).catch((e) => console.log('rider:', e.message.slice(0, 90)));
  for (const uid of [s.mUserId, s.cUserId, s.rUserId].filter(Boolean)) {
    await db.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
    await db.payment.deleteMany({ where: { userId: uid } }).catch(() => {});
    await db.user.delete({ where: { id: uid } }).catch((e) => console.log('user:', e.message.slice(0, 90)));
  }
  if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
  console.log('CLEANUP done');
}

const cmds: Record<string, (a?: string) => Promise<void>> = {
  setup, snap, cleanup, beat,
  run: async (a) => run(a ?? 'CASH'),
};
(cmds[process.argv[2]] ?? (async () => console.log('commands:', Object.keys(cmds).join(', '))))(process.argv[3])
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
