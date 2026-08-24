/**
 * Why did marking an order READY produce no courier offer?
 *
 * Drives one order to READY against production and then watches the task, the
 * dispatch matches and the audit trail for 20s, so the answer distinguishes
 * "dispatch never ran" from "dispatch ran and found nobody".
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = process.env.QA_API ?? 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();
const PW = 'QaProbe#2026';
const MERCH = { lat: 0.3476, lng: 32.5825 };
const DROP = { lat: 0.3626, lng: 32.6111 };

const login = async (email: string) => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const j = await r.json();
  if (!j?.data?.accessToken) throw new Error(`login ${email}: HTTP ${r.status}`);
  return j.data.accessToken as string;
};
const call = (t: string) => (p: string, m = 'GET', b?: unknown) =>
  fetch(`${API}${p}`, {
    method: m, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  const mUser = await db.user.create({ data: { email: `qa-pr-m-${rand}@qa.invalid`, phone: ph(), name: 'QA Probe Kitchen', passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE' } });
  const merchant = await db.merchant.create({ data: { userId: mUser.id, name: `QA Probe Kitchen ${rand}`, type: 'RESTAURANT', email: mUser.email!, phone: mUser.phone, address: 'Kira Road', city: 'Kampala', latitude: MERCH.lat, longitude: MERCH.lng, status: 'APPROVED', isOpen: true } });
  const item = await db.menuItem.create({ data: { merchantId: merchant.id, name: 'QA Probe Pilau', price: 18000, category: 'Main', isAvailable: true } });
  const cUser = await db.user.create({ data: { email: `qa-pr-c-${rand}@qa.invalid`, phone: ph(), name: 'QA Probe Customer', passwordHash: hash, role: 'CLIENT', status: 'ACTIVE' } });
  const rUser = await db.user.create({ data: { email: `qa-pr-r-${rand}@qa.invalid`, phone: ph(), name: 'QA Probe Courier', passwordHash: hash, role: 'RIDER', status: 'ACTIVE' } });
  const rider = await db.rider.create({ data: { userId: rUser.id, fullName: 'QA Probe Courier', phone: rUser.phone, email: rUser.email!, physicalAddress: 'Kampala', riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true, currentLatitude: MERCH.lat, currentLongitude: MERCH.lng, lastHeartbeatAt: new Date() } });

  let orderId = '';
  try {
    const c = call(await login(cUser.email!));
    const m = call(await login(mUser.email!));

    const pr = await c('/orders', 'POST', {
      merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: item.id, itemName: 'QA Probe Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'WALLET', deliveryAddress: 'Ntinda',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng, recipientName: 'QA Probe',
    });
    orderId = (await pr.json())?.data?.id;
    console.log('order', orderId);

    const order = await db.order.findUnique({ where: { id: orderId }, select: { totalAmount: true } });
    await db.wallet.upsert({
      where: { ownerId_ownerType: { ownerId: cUser.id, ownerType: 'USER' } },
      create: { ownerId: cUser.id, ownerType: 'USER', balance: Number(order!.totalAmount) + 10000 },
      update: { balance: Number(order!.totalAmount) + 10000 },
    });
    await c('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {});
    await m(`/orders/${orderId}?action=accept`, 'PATCH', { merchantId: merchant.id, estimatedPrepTime: 10 });
    await m(`/orders/${orderId}?action=preparing`, 'PATCH', { merchantId: merchant.id });

    // Genuinely online at the moment dispatch runs.
    await db.rider.update({ where: { id: rider.id }, data: { isOnline: true, currentTaskId: null, lastHeartbeatAt: new Date() } });

    // Prove the rider is eligible by the same rules dispatch uses, BEFORE we ask.
    const eligible = await db.rider.count({
      where: {
        riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true,
        currentTaskId: null, lastHeartbeatAt: { gte: new Date(Date.now() - 90_000) },
      },
    });
    console.log(`eligible DELIVERY_PERSONNEL right now: ${eligible}`);

    const t0 = Date.now();
    const ready = await m(`/orders/${orderId}?action=ready`, 'PATCH', { merchantId: merchant.id });
    console.log(`READY -> HTTP ${ready.status} in ${Date.now() - t0}ms`);

    for (const wait of [1000, 2000, 3000, 5000, 10000]) {
      await new Promise((r) => setTimeout(r, wait));
      const task = await db.task.findUnique({
        where: { orderId },
        select: { id: true, taskNumber: true, status: true, matchingStartedAt: true, riderId: true },
      });
      const matches = task ? await db.dispatchMatch.count({ where: { taskId: task.id } }) : 0;
      const transitions = task
        ? await db.taskStateTransition.findMany({ where: { taskId: task.id }, select: { fromStatus: true, toStatus: true }, orderBy: { createdAt: 'asc' } })
        : [];
      console.log(
        `+${((Date.now() - t0) / 1000).toFixed(1)}s  task=${task?.taskNumber} status=${task?.status} ` +
        `matchingStartedAt=${task?.matchingStartedAt ? 'set' : 'NULL'} rider=${task?.riderId ?? '-'} matches=${matches} ` +
        `transitions=[${transitions.map((x) => `${x.fromStatus ?? '?'}->${x.toStatus}`).join(', ')}]`
      );
    }

    const task = await db.task.findUnique({ where: { orderId }, select: { id: true } });
    if (task) {
      const audits = await db.auditLog.findMany({
        where: { taskId: task.id },
        select: { action: true, description: true }, orderBy: { createdAt: 'asc' },
      });
      console.log('\naudit trail:');
      for (const a of audits) console.log(`  ${a.action}: ${(a.description ?? '').slice(0, 110)}`);
    }
  } finally {
    const orders = await db.order.findMany({ where: { merchantId: merchant.id }, select: { id: true } });
    const ids = orders.map((o) => o.id);
    const tasks = await db.task.findMany({ where: { OR: [{ orderId: { in: ids } }, { riderId: rider.id }] }, select: { id: true } });
    const tids = tasks.map((t) => t.id);
    for (const t of tids) {
      await db.taskStateTransition.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.dispatchMatch.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.cashCollection.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.payment.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.receipt.deleteMany({ where: { taskId: t } }).catch(() => {});
    }
    await db.task.deleteMany({ where: { id: { in: tids } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { OR: [{ clientId: cUser.id }, { riderId: rider.id }] } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
    await db.kOT.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
    await db.receipt.deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    await db.menuItem.deleteMany({ where: { merchantId: merchant.id } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { merchantId: merchant.id } }).catch(() => {});
    await db.merchant.delete({ where: { id: merchant.id } }).catch(() => {});
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: { in: [rUser.id, cUser.id] } } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: [rUser.id, cUser.id] } } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { riderId: rider.id } }).catch(() => {});
    await db.rider.delete({ where: { id: rider.id } }).catch(() => {});
    for (const uid of [mUser.id, cUser.id, rUser.id]) {
      await db.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.payment.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.user.delete({ where: { id: uid } }).catch((e) => console.log('user:', e.message.slice(0, 70)));
    }
    console.log('cleaned');
    await db.$disconnect();
  }
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
