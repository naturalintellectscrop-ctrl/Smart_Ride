/**
 * Disposable fixtures for driving the app on a physical device.
 *
 * One command each way, so a device session does not start with twenty lines
 * of Prisma. Creates a merchant with one menu item, a customer with a funded
 * wallet (the only non-cash method that works without a gateway), and an
 * approved courier of the role food and pharmacy actually dispatch to.
 *
 *   bun scripts/qa-device-fixtures.ts setup     # prints the three logins
 *   bun scripts/qa-device-fixtures.ts beat      # courier goes stale after 90s
 *   bun scripts/qa-device-fixtures.ts state     # orders, payments, tasks, matches
 *   bun scripts/qa-device-fixtures.ts cleanup   # removes everything it made
 *
 * `beat` matters: eligibility requires a heartbeat inside 90s, and a courier
 * who is not tapping the app goes invisible to dispatch. Run it just before
 * marking an order ready.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
const db = new PrismaClient();
const STATE = 'scripts/.qa-device.json'; // gitignored
const PW = 'QaDevice#2026';
const SHOP = { lat: 0.3476, lng: 32.5825 };
const load = (): any => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});

async function setup() {
  const rand = Math.random().toString(36).slice(2, 6);
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;
  const mU = await db.user.create({ data: { email: `qa-dev-m-${rand}@qa.invalid`, phone: ph(), name: 'QA Dev Kitchen', passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE' } });
  const merchant = await db.merchant.create({ data: { userId: mU.id, name: `QA Dev Kitchen ${rand}`, type: 'RESTAURANT', email: mU.email!, phone: mU.phone, address: 'Kira Road, Kampala', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, status: 'APPROVED', isOpen: true } });
  const item = await db.menuItem.create({ data: { merchantId: merchant.id, name: 'QA Dev Pilau', description: 'Disposable QA item', price: 18000, category: 'Main', isAvailable: true } });
  const cU = await db.user.create({ data: { email: `qa-dev-c-${rand}@qa.invalid`, phone: ph(), name: 'QA Dev Customer', passwordHash: hash, role: 'CLIENT', status: 'ACTIVE' } });
  await db.wallet.create({ data: { ownerId: cU.id, ownerType: 'USER', balance: 200000 } });
  const rU = await db.user.create({ data: { email: `qa-dev-r-${rand}@qa.invalid`, phone: ph(), name: 'QA Dev Courier', passwordHash: hash, role: 'RIDER', status: 'ACTIVE' } });
  const rider = await db.rider.create({ data: { userId: rU.id, fullName: 'QA Dev Courier', phone: rU.phone, email: rU.email!, physicalAddress: 'Kampala', riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true, currentLatitude: SHOP.lat, currentLongitude: SHOP.lng, lastHeartbeatAt: new Date() } });
  fs.writeFileSync(STATE, JSON.stringify({ rand, merchantId: merchant.id, itemId: item.id, riderId: rider.id, mUserId: mU.id, cUserId: cU.id, rUserId: rU.id, mEmail: mU.email, cEmail: cU.email, rEmail: rU.email, password: PW }, null, 2));
  console.log(`MERCHANT ${mU.email}`);
  console.log(`CUSTOMER ${cU.email}   (wallet 200,000)`);
  console.log(`COURIER  ${rU.email}`);
}
async function beat() { const s = load(); await db.rider.update({ where: { id: s.riderId }, data: { isOnline: true, lastHeartbeatAt: new Date(), currentLatitude: SHOP.lat, currentLongitude: SHOP.lng } }); console.log('beat'); }
async function state() {
  const s = load();
  const orders = await db.order.findMany({ where: { merchantId: s.merchantId }, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, totalAmount: true, deliveryFee: true, serviceFee: true, subtotal: true } });
  for (const o of orders) console.log(`ORDER ${o.orderNumber} ${o.status} ${o.paymentMethod}/${o.paymentStatus} sub=${Number(o.subtotal)} del=${Number(o.deliveryFee)} svc=${Number(o.serviceFee)} tot=${Number(o.totalAmount)}`);
  const pays = await db.payment.findMany({ where: { userId: s.cUserId }, select: { paymentReference: true, paymentMethod: true, status: true, amount: true } });
  for (const p of pays) console.log(`PAY   ${p.paymentReference} ${p.paymentMethod}/${p.status} ${Number(p.amount)}`);
  const tasks = await db.task.findMany({ where: { orderId: { in: orders.map(o => o.id) } }, select: { id: true, taskNumber: true, status: true, totalAmount: true, riderEarnings: true, platformCommission: true, riderId: true } });
  for (const t of tasks) { const mm = await db.dispatchMatch.count({ where: { taskId: t.id } }); console.log(`TASK  ${t.taskNumber} ${t.status} fare=${Number(t.totalAmount)} courier=${Number(t.riderEarnings)} platform=${Number(t.platformCommission)} rider=${t.riderId ?? '-'} matches=${mm}`); }
  const w = await db.wallet.findFirst({ where: { ownerId: s.cUserId }, select: { balance: true } });
  console.log(`WALLET customer=${Number(w?.balance ?? 0)}`);
}
async function cleanup() {
  const s = load(); if (!s.merchantId) return console.log('nothing');
  const orders = await db.order.findMany({ where: { merchantId: s.merchantId }, select: { id: true } });
  const ids = orders.map(o => o.id);
  const tasks = await db.task.findMany({ where: { OR: [{ orderId: { in: ids } }, { riderId: s.riderId }, { clientId: s.cUserId }] }, select: { id: true } });
  const tids = tasks.map(t => t.id);
  for (const t of tids) { for (const m of ['taskStateTransition','dispatchMatch','auditLog','cashCollection','payment','conversation','receipt']) await (db as any)[m].deleteMany({ where: { taskId: t } }).catch(() => {}); }
  await db.task.deleteMany({ where: { id: { in: tids } } }).catch(() => {});
  await db.financeLog.deleteMany({ where: { OR: [{ clientId: s.cUserId }, { riderId: s.riderId }] } }).catch(() => {});
  for (const m of ['orderItem','payment','kOT','auditLog','receipt']) await (db as any)[m].deleteMany({ where: { orderId: { in: ids } } }).catch(() => {});
  await db.order.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  await db.menuItem.deleteMany({ where: { merchantId: s.merchantId } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { merchantId: s.merchantId } }).catch(() => {});
  await db.merchant.delete({ where: { id: s.merchantId } }).catch((e) => console.log('merchant:', e.message.slice(0,70)));
  const us = [s.mUserId, s.cUserId, s.rUserId];
  await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: { in: us } } } }).catch(() => {});
  await db.wallet.deleteMany({ where: { ownerId: { in: us } } }).catch(() => {});
  await db.cashCollection.deleteMany({ where: { riderId: s.riderId } }).catch(() => {});
  await db.driverReputation.deleteMany({ where: { riderId: s.riderId } }).catch(() => {});
  await db.rider.delete({ where: { id: s.riderId } }).catch((e) => console.log('rider:', e.message.slice(0,70)));
  for (const u of us) { for (const m of ['auditLog','notification','payment']) await (db as any)[m].deleteMany({ where: { userId: u } }).catch(() => {}); await db.user.delete({ where: { id: u } }).catch((e) => console.log('user:', e.message.slice(0,70))); }
  if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
  console.log('CLEANUP done');
}
const c: Record<string, () => Promise<void>> = { setup, beat, state, cleanup };
(c[process.argv[2]] ?? (async () => console.log(Object.keys(c).join(', '))))().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
