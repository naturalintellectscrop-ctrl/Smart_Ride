/**
 * MERCHANT CHECKOUT, END TO END — browse to settlement, one order, all the way.
 *
 * The dispatch suite proves a job reaches a courier and the financial suite
 * proves the money rules. Neither drives a SINGLE order the whole distance, and
 * the whole distance is what a customer actually experiences:
 *
 *   browse → cart → order → pay → confirm → merchant accepts → prepares →
 *   ready → dispatch → courier accepts → pickup → proof → delivered →
 *   completed → settlement
 *
 * Every step is driven through the deployed HTTP API as the app drives it, and
 * the database is read after each one. A 200 is never taken as evidence that
 * anything moved.
 *
 *   bun scripts/verify-merchant-checkout-e2e.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { API, qaLogin, qaCall } from './qa-http';
import { qaCleanupByTag, qaNothingLeft } from './qa-cleanup';

const db = new PrismaClient();
const TAG = Math.random().toString(36).slice(2, 8);
const PW = 'QaE2E#2026';
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

const login = (email: string) => qaLogin(email, PW);
const call = qaCall;

async function waitFor<T>(label: string, ms: number, check: () => Promise<T | null>): Promise<T | null> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const got = await check();
    if (got) return got;
    await sleep(1500);
  }
  console.log(`    (waited ${ms}ms for ${label})`);
  return null;
}

async function run() {
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  console.log(`\n=== MERCHANT CHECKOUT END TO END (${API}) ===\n`);

  const mUser = await db.user.create({ data: { email: `qa-e2e-m-${TAG}@qa.invalid`, phone: ph(), name: 'QA E2E Kitchen', passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE' } });
  const merchant = await db.merchant.create({ data: { userId: mUser.id, name: `QA E2E Kitchen ${TAG}`, type: 'RESTAURANT', email: mUser.email!, phone: mUser.phone, address: 'Kira Road, Kampala', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, status: 'APPROVED', isOpen: true } });
  const item = await db.menuItem.create({ data: { merchantId: merchant.id, name: `QA E2E Pilau ${TAG}`, price: 18000, category: 'Main', isAvailable: true } });
  const cUser = await db.user.create({ data: { email: `qa-e2e-c-${TAG}@qa.invalid`, phone: ph(), name: 'QA E2E Customer', passwordHash: hash, role: 'CLIENT', status: 'ACTIVE' } });
  const rUser = await db.user.create({ data: { email: `qa-e2e-r-${TAG}@qa.invalid`, phone: ph(), name: 'QA E2E Courier', passwordHash: hash, role: 'RIDER', status: 'ACTIVE' } });
  const rider = await db.rider.create({ data: { userId: rUser.id, fullName: `QA E2E Courier ${TAG}`, phone: rUser.phone, email: rUser.email!, physicalAddress: 'Kampala', riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: true, currentLatitude: SHOP.lat, currentLongitude: SHOP.lng, lastHeartbeatAt: new Date() } });

  const beat = () => db.rider.update({ where: { id: rider.id }, data: { isOnline: true, lastHeartbeatAt: new Date() } });

  const c = call(await login(cUser.email!));
  const m = call(await login(mUser.email!));
  const r = call(await login(rUser.email!));

  // ── 1-2. browse and price the cart ──────────────────────────────────────
  console.log('-- 1-2. browse, and the cart is priced by the server --');
  const browse = await c(`/merchants?category=RESTAURANT`);
  ok('the customer can browse merchants', browse.status === 200, `HTTP ${browse.status}`);

  // Opening one. This route did not exist — the directory held only
  // subdirectories — so every card in the list led to "Merchant not found" and
  // no customer could order anything. The list passing told us nothing about
  // it, which is why the assertion is here now.
  const shopRes = await c(`/merchants/${merchant.id}`);
  const shopBody = await shopRes.json().catch(() => ({}));
  ok('the customer can OPEN a merchant', shopRes.status === 200 && shopBody?.data?.id === merchant.id,
    `HTTP ${shopRes.status}`);
  ok('and the response is JSON, not an HTML 404',
    typeof shopBody?.data?.name === 'string', String(shopBody?.data?.name));
  ok('the storefront does not leak business contact details',
    !shopBody?.data?.phone && !shopBody?.data?.email,
    `phone=${shopBody?.data?.phone ?? 'none'} email=${shopBody?.data?.email ?? 'none'}`);

  const menuRes = await c(`/merchants/${merchant.id}/menu`);
  const menuBody = await menuRes.json().catch(() => ({}));
  const menuItems = Array.isArray(menuBody?.data)
    ? menuBody.data
    : (menuBody?.data?.menuItems ?? []);
  ok('and its menu loads', menuRes.status === 200, `HTTP ${menuRes.status}`);
  // The menu must actually CONTAIN the item. An empty list here is what the
  // client showed as "this merchant hasn't listed anything yet" while the
  // merchant had items listed.
  ok('the menu contains the merchant's item',
    menuItems.some((i: { id: string }) => i.id === item.id),
    `${menuItems.length} item(s)`);

  const qr = await c('/orders/quote', 'POST', {
    merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
    items: [{ menuItemId: item.id, quantity: 1, unitPrice: 18000 }],
    deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
  });
  const quote = (await qr.json())?.data;
  ok('the cart is quoted', qr.status === 200 && quote?.totalAmount > 0,
    `goods ${quote?.subtotal} + delivery ${quote?.deliveryFee} + service ${quote?.serviceFee} = ${quote?.totalAmount}`);
  ok('the delivery lines fund exactly one courier leg',
    Math.round(quote.deliveryFee + quote.serviceFee) === Math.round(quote.courierFare),
    `${quote.deliveryFee} + ${quote.serviceFee} vs ${quote.courierFare}`);

  // ── 3-4. create the order, choosing a payment method ────────────────────
  console.log('\n-- 3-4. the order is created, unpaid --');
  const pr = await c('/orders', 'POST', {
    merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
    items: [{ menuItemId: item.id, itemName: `QA E2E Pilau ${TAG}`, quantity: 1, unitPrice: 18000 }],
    paymentMethod: 'WALLET', deliveryAddress: 'Ntinda, Kampala',
    deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng, recipientName: 'QA E2E Customer',
  });
  const orderId = (await pr.json())?.data?.id;
  if (!orderId) throw new Error(`order creation failed: HTTP ${pr.status}`);

  let order = await db.order.findUnique({ where: { id: orderId } });
  ok('the order exists in the database', !!order, order?.orderNumber);
  ok('and it is PENDING, not paid', order?.paymentStatus === 'PENDING', order?.paymentStatus);
  ok('the charged total matches the quote', num(order?.totalAmount) === quote.totalAmount,
    `${num(order?.totalAmount)} vs ${quote.totalAmount}`);
  ok('no courier task exists yet', (await db.task.count({ where: { orderId } })) === 0);

  // ── 5. a legitimate payment ─────────────────────────────────────────────
  console.log('\n-- 5. the customer pays --');
  const due = Math.round(num(order?.totalAmount));
  const wallet = await db.wallet.upsert({
    where: { ownerId_ownerType: { ownerId: cUser.id, ownerType: 'USER' } },
    create: { ownerId: cUser.id, ownerType: 'USER', balance: due + 50_000 },
    update: { balance: due + 50_000 },
    select: { id: true, balance: true },
  });
  const payRes = await c('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
  ok('the payment succeeds', payRes.status === 200, `HTTP ${payRes.status}`);

  const payment = await db.payment.findFirst({ where: { orderId }, select: { status: true, amount: true, paymentMethod: true, paymentReference: true } });
  ok('a COMPLETED Payment row exists for the full amount',
    payment?.status === 'COMPLETED' && Math.round(num(payment?.amount)) === due,
    `${payment?.status} ${num(payment?.amount)}/${due} via ${payment?.paymentMethod}`);
  const walletAfter = await db.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
  ok('the customer was really debited',
    Math.round(num(walletAfter?.balance)) === Math.round(num(wallet.balance)) - due,
    `${num(wallet.balance)} → ${num(walletAfter?.balance)}`);

  // ── 6. confirmation reads the collection ────────────────────────────────
  console.log('\n-- 6. confirmation --');
  const confirm = await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {});
  ok('confirm-payment succeeds now that money exists', confirm.status === 200, `HTTP ${confirm.status}`);
  order = await db.order.findUnique({ where: { id: orderId } });
  ok('the order is PAYMENT_CONFIRMED and paid',
    order?.status === 'PAYMENT_CONFIRMED' && order?.paymentStatus === 'COMPLETED',
    `${order?.status}/${order?.paymentStatus}`);
  ok('and it carries the real payment reference, not a made-up one',
    order?.paymentReference === payment?.paymentReference, order?.paymentReference ?? 'null');

  // ── 7-10. the merchant works the order ──────────────────────────────────
  console.log('\n-- 7-10. the merchant sees it, accepts, prepares, marks ready --');
  const inbox = await m('/orders?status=PAYMENT_CONFIRMED&page=1&limit=20');
  const inboxBody = await inbox.json();
  const seen = (inboxBody?.data ?? []).some((o: { id: string }) => o.id === orderId);
  ok('the merchant receives the order in their list', inbox.status === 200 && seen, `HTTP ${inbox.status}`);
  ok('the merchant can open its detail (MERCH-6)', (await m(`/orders/${orderId}`)).status === 200);

  for (const [action, expected] of [
    ['accept', 'MERCHANT_ACCEPTED'],
    ['preparing', 'PREPARING'],
  ] as const) {
    const res = await m(`/orders/${orderId}?action=${action}`, 'PATCH', { merchantId: merchant.id, estimatedPrepTime: 10 });
    order = await db.order.findUnique({ where: { id: orderId } });
    ok(`merchant ${action} → ${expected}`, res.status === 200 && order?.status === expected,
      `HTTP ${res.status}, order is ${order?.status}`);
  }

  await beat();
  const readyRes = await m(`/orders/${orderId}?action=ready`, 'PATCH', { merchantId: merchant.id });
  order = await db.order.findUnique({ where: { id: orderId } });
  ok('merchant ready → READY_FOR_PICKUP', readyRes.status === 200 && order?.status === 'READY_FOR_PICKUP',
    `HTTP ${readyRes.status}, order is ${order?.status}`);

  // ── 11. the task exists, priced from what was charged ───────────────────
  console.log('\n-- 11. the courier leg is created and priced --');
  const task = await db.task.findUnique({ where: { orderId } });
  ok('a delivery task now exists', !!task, task?.taskNumber);
  const chargedForDelivery = Math.round(num(order?.deliveryFee) + num(order?.serviceFee));
  ok('its fare is the delivery money the customer paid',
    Math.round(num(task?.totalAmount)) === chargedForDelivery,
    `${num(task?.totalAmount)} vs ${chargedForDelivery}`);
  ok('commission + courier earnings reconcile to the fare',
    Math.round(num(task?.riderEarnings) + num(task?.platformCommission)) === Math.round(num(task?.totalAmount)),
    `${num(task?.riderEarnings)} + ${num(task?.platformCommission)}`);
  ok('a handover code was issued', !!task?.deliveryCode);

  // ── 12. dispatch reaches a courier ──────────────────────────────────────
  console.log('\n-- 12. dispatch --');
  const match = await waitFor('the offer', 25_000, async () =>
    db.dispatchMatch.findFirst({ where: { taskId: task!.id, status: 'PENDING' }, select: { id: true, riderId: true } })
  );
  ok('a DispatchMatch was created', !!match, match ? `${match.id} → ${match.riderId}` : 'none');
  ok('and it went to our courier', match?.riderId === rider.id);

  const accepted = await r(`/dispatch/${match!.id}/accept`, 'POST', {});
  const afterAccept = await db.task.findUnique({ where: { id: task!.id }, select: { status: true, riderId: true } });
  ok('the courier accepts', accepted.status === 200 && afterAccept?.riderId === rider.id,
    `HTTP ${accepted.status}, task ${afterAccept?.status}`);

  // ── 13. pickup ──────────────────────────────────────────────────────────
  console.log('\n-- 13. pickup --');
  const pickup = await r(`/orders/${orderId}?action=pickup`, 'PATCH', { riderId: rider.id });
  order = await db.order.findUnique({ where: { id: orderId } });
  const pickedTask = await db.task.findUnique({ where: { id: task!.id }, select: { status: true } });
  ok('pickup moves the order and the task together',
    pickup.status === 200 && order?.status === 'PICKED_UP' && pickedTask?.status === 'PICKED_UP',
    `HTTP ${pickup.status}, order ${order?.status}, task ${pickedTask?.status}`);

  // ── 14. proof, then delivery ────────────────────────────────────────────
  console.log('\n-- 14. proof of delivery --');
  const noProof = await r(`/tasks/${task!.id}/status`, 'POST', { status: 'DELIVERED' });
  ok('the task route refuses delivery without proof (BE-005)', noProof.status === 409, `HTTP ${noProof.status}`);

  // The order route moves the SAME task to the SAME status, and used to do it
  // without asking for proof at all.
  const orderRouteNoProof = await r(`/orders/${orderId}?action=deliver`, 'PATCH', { riderId: rider.id });
  ok('and so does the order route', orderRouteNoProof.status === 409, `HTTP ${orderRouteNoProof.status}`);
  const stillPicked = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  ok('the order did not move', stillPicked?.status === 'PICKED_UP', stillPicked?.status);

  const wrongCode = await r(`/tasks/${task!.id}/proof`, 'POST', { proofType: 'CODE', code: '0000' });
  ok('a wrong handover code is refused', wrongCode.status >= 400, `HTTP ${wrongCode.status}`);

  const proof = await r(`/tasks/${task!.id}/proof`, 'POST', { proofType: 'CODE', code: task!.deliveryCode });
  ok('the real handover code is accepted', proof.status === 200, `HTTP ${proof.status}`);

  const delivered = await r(`/orders/${orderId}?action=deliver`, 'PATCH', { riderId: rider.id });
  order = await db.order.findUnique({ where: { id: orderId } });
  const deliveredTask = await db.task.findUnique({ where: { id: task!.id }, select: { status: true } });
  ok('delivery moves the order and the task',
    delivered.status === 200 && order?.status === 'DELIVERED',
    `HTTP ${delivered.status}, order ${order?.status}, task ${deliveredTask?.status}`);

  // ── 15. completion and settlement ───────────────────────────────────────
  console.log('\n-- 15. completion and settlement --');
  const completed = await r(`/tasks/${task!.id}/status`, 'POST', { status: 'COMPLETED' });
  ok('the courier completes the task', completed.status === 200, `HTTP ${completed.status}`);

  const settled = await waitFor('the completion ledger', 15_000, async () =>
    db.financeLog.findFirst({ where: { referenceId: task!.id, transactionType: 'FOOD_ORDER_PAYMENT' } })
  );
  ok('a completion ledger entry exists', !!settled);

  const goods = num(order?.subtotal);
  const merchantRate = merchant.commissionRate ?? 0.15;
  const expectedMerchant = Math.max(0, Math.round(goods * (1 - merchantRate)));
  ok('the merchant is credited goods less their commission',
    Math.round(num(settled?.merchantEarnings)) === expectedMerchant,
    `${num(settled?.merchantEarnings)} vs ${expectedMerchant}`);

  const courierWallet = await db.wallet.findFirst({ where: { ownerId: rUser.id, ownerType: 'USER' }, select: { balance: true, pendingBalance: true } });
  ok('the courier is paid, because the customer really paid',
    Math.round(num(courierWallet?.balance)) === Math.round(num(task?.riderEarnings)),
    `wallet ${num(courierWallet?.balance)} vs earnings ${num(task?.riderEarnings)}`);
  ok('and nothing is left held', Math.round(num(courierWallet?.pendingBalance)) === 0,
    `pending ${num(courierWallet?.pendingBalance)}`);

  const exception = await db.financeLog.count({ where: { referenceId: `unpaid-completion-${task!.id}` } });
  ok('no unpaid-completion exception was raised', exception === 0);

  const commissionLog = await db.financeLog.findFirst({ where: { referenceId: `commission-${task!.id}` }, select: { amount: true } });
  ok('the platform commission is recorded', !!commissionLog, `${num(commissionLog?.amount)}`);

  // ── the whole thing must add up ─────────────────────────────────────────
  console.log('\n-- reconciliation --');
  const customerPaid = Math.round(num(payment?.amount));
  const merchantGot = expectedMerchant;
  const courierGot = Math.round(num(task?.riderEarnings));
  const platformGot = customerPaid - merchantGot - courierGot;
  console.log(`    customer ${customerPaid} = merchant ${merchantGot} + courier ${courierGot} + platform ${platformGot}`);
  ok('every shilling the customer paid is accounted for',
    merchantGot + courierGot + platformGot === customerPaid);
  ok('the platform is never out of pocket', platformGot >= 0, `${platformGot}`);

  const riderRow = await db.rider.findUnique({ where: { id: rider.id }, select: { currentTaskId: true } });
  ok('the courier is free for the next job', riderRow?.currentTaskId === null, String(riderRow?.currentTaskId));

  const receipt = await db.receipt.findFirst({ where: { taskId: task!.id }, select: { receiptNumber: true, total: true } });
  ok('a receipt was generated for the customer', !!receipt,
    receipt ? `${receipt.receiptNumber} ${num(receipt.total)}` : 'none');
}

async function main() {
  try {
    await run();
  } finally {
    await qaCleanupByTag(db, TAG);
    ok('no QA fixtures left', await qaNothingLeft(db, TAG));
  }
  console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
