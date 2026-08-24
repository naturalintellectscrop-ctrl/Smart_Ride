/**
 * FINANCIAL INTEGRITY — the money invariants, asserted against a live database.
 *
 * Covers the three P0s closed in the financial-closure pass:
 *
 *   PRICING-1  the customer's delivery charge is never below what the courier
 *              leg obliges the platform to pay
 *   BE-039     a merchant/pharmacy order cannot be marked paid without a
 *              collected payment, and cash is refused outright
 *   BE-040     no spendable balance is created from a non-cash job until the
 *              customer's payment is confirmed collected
 *
 * Runs against the deployed API for the HTTP assertions and reads the database
 * directly for the money. Every fixture is disposable and removed at the end;
 * the last assertions check that nothing was left behind.
 *
 *   bun scripts/verify-financial-integrity.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = process.env.QA_API ?? 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();
const PW = 'QaFinVerify#2026';

const MERCH = { lat: 0.3476, lng: 32.5825 };
const DROP = { lat: 0.3626, lng: 32.6111 };

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const num = (v: unknown) => (v == null ? 0 : Number(v));

async function login(email: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PW }),
  });
  const j = await r.json();
  const t = j?.data?.accessToken;
  if (!t) throw new Error(`login failed for ${email}: HTTP ${r.status}`);
  return t;
}

const call = (token: string) => (path: string, method = 'GET', body?: unknown) =>
  fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  console.log(`\n=== FINANCIAL INTEGRITY (${API}) ===\n`);

  // ── fixtures ─────────────────────────────────────────────────────────────
  const mUser = await db.user.create({
    data: {
      email: `qa-fv-m-${rand}@qa.invalid`, phone: ph(), name: 'QA FV Kitchen',
      passwordHash: hash, role: 'MERCHANT', status: 'ACTIVE',
    },
  });
  const merchant = await db.merchant.create({
    data: {
      userId: mUser.id, name: `QA FV Kitchen ${rand}`, type: 'RESTAURANT',
      email: mUser.email!, phone: mUser.phone, address: 'Kira Road, Kampala', city: 'Kampala',
      latitude: MERCH.lat, longitude: MERCH.lng, status: 'APPROVED', isOpen: true,
    },
  });
  const item = await db.menuItem.create({
    data: {
      merchantId: merchant.id, name: 'QA FV Pilau', description: 'Disposable',
      price: 18000, category: 'Main', isAvailable: true,
    },
  });
  const cUser = await db.user.create({
    data: {
      email: `qa-fv-c-${rand}@qa.invalid`, phone: ph(), name: 'QA FV Customer',
      passwordHash: hash, role: 'CLIENT', status: 'ACTIVE',
    },
  });
  const rUser = await db.user.create({
    data: {
      email: `qa-fv-r-${rand}@qa.invalid`, phone: ph(), name: 'QA FV Courier',
      passwordHash: hash, role: 'RIDER', status: 'ACTIVE',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: rUser.id, fullName: 'QA FV Courier', phone: rUser.phone, email: rUser.email!,
      physicalAddress: 'Kampala', riderRole: 'SMART_BODA_RIDER', status: 'APPROVED',
      isOnline: true, currentLatitude: MERCH.lat, currentLongitude: MERCH.lng,
      lastHeartbeatAt: new Date(),
    },
  });

  const orderIds: string[] = [];
  const taskIds: string[] = [];

  try {
    const cTok = await login(cUser.email!);
    const c = call(cTok);
    const mTok = await login(mUser.email!);
    const m = call(mTok);

    const cart = {
      merchantId: merchant.id,
      orderType: 'FOOD_DELIVERY' as const,
      items: [{ menuItemId: item.id, itemName: 'QA FV Pilau', quantity: 1, unitPrice: 18000 }],
      deliveryAddress: 'Ntinda, Kampala',
      deliveryLatitude: DROP.lat,
      deliveryLongitude: DROP.lng,
      recipientName: 'QA FV Customer',
    };

    // ── DECISION 1: cash is not a merchant payment method ──────────────────
    console.log('-- cash is refused on merchant orders --');
    const cashTry = await c('/orders', 'POST', { ...cart, paymentMethod: 'CASH' });
    ok('CASH is refused for a food order', cashTry.status === 400,
      `HTTP ${cashTry.status}`);

    // ── PRICING-1: the quote never underprices the courier leg ─────────────
    console.log('\n-- the customer is charged what the courier leg costs --');
    const qr = await c('/orders/quote', 'POST', {
      merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: item.id, quantity: 1, unitPrice: 18000 }],
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    });
    const quote = (await qr.json())?.data;
    ok('quote returns a courier fare', typeof quote?.courierFare === 'number',
      JSON.stringify(quote));
    ok('delivery + service exactly funds the courier leg',
      Math.round(quote.deliveryFee + quote.serviceFee) === Math.round(quote.courierFare),
      `${quote.deliveryFee} + ${quote.serviceFee} vs ${quote.courierFare}`);

    // ── place, and check nothing is dispatched or paid yet ─────────────────
    console.log('\n-- an order is not paid, and not dispatched, on creation --');
    const pr = await c('/orders', 'POST', { ...cart, paymentMethod: 'MTN_MOMO' });
    const orderId = (await pr.json())?.data?.id;
    if (!orderId) throw new Error(`order creation failed: HTTP ${pr.status}`);
    orderIds.push(orderId);

    const created = await db.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, status: true, deliveryFee: true, serviceFee: true, totalAmount: true, subtotal: true },
    });
    ok('a new order is PENDING, not paid', created?.paymentStatus === 'PENDING', created?.paymentStatus);
    const preTask = await db.task.findUnique({ where: { orderId }, select: { id: true } });
    ok('no courier task exists before the merchant is ready (MERCH-7)', preTask === null,
      preTask ? `task ${preTask.id} created early` : 'none');

    // ── BE-044: the customer cannot declare their own order paid ───────────
    console.log('\n-- the customer cannot confirm their own payment --');
    const fakeConfirm = await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {
      paymentReference: 'QA-NO-SUCH-PAYMENT',
    });
    ok('confirm-payment is refused with no collected payment', fakeConfirm.status === 402,
      `HTTP ${fakeConfirm.status}`);
    const afterFake = await db.order.findUnique({
      where: { id: orderId }, select: { paymentStatus: true, status: true },
    });
    ok('and the order is untouched',
      afterFake?.paymentStatus === 'PENDING' && afterFake?.status === 'ORDER_CREATED',
      `${afterFake?.status}/${afterFake?.paymentStatus}`);

    // ── the merchant cannot start on an unpaid order ───────────────────────
    const earlyAccept = await m(`/orders/${orderId}?action=accept`, 'PATCH', {
      merchantId: merchant.id, estimatedPrepTime: 10,
    });
    ok('the merchant cannot accept before payment is confirmed', earlyAccept.status !== 200,
      `HTTP ${earlyAccept.status}`);

    // ── collect for real, through the wallet ───────────────────────────────
    console.log('\n-- a real collection, through the wallet --');
    const due = Math.round(num(created?.totalAmount));
    const custWallet = await db.wallet.upsert({
      where: { ownerId_ownerType: { ownerId: cUser.id, ownerType: 'USER' } },
      create: { ownerId: cUser.id, ownerType: 'USER', balance: due + 50_000 },
      update: { balance: due + 50_000 },
      select: { id: true, balance: true },
    });

    const underpay = await c('/payments/initiate', 'POST', {
      orderId, paymentMethod: 'WALLET', amount: 100,
    });
    ok('a payment for less than the amount due is refused', underpay.status === 400,
      `HTTP ${underpay.status}`);

    const payRes = await c('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    const payJson = await payRes.json();
    ok('the wallet pays for the order', payRes.status === 200 && payJson?.payment?.status === 'SUCCESSFUL',
      `HTTP ${payRes.status} ${payJson?.payment?.status ?? payJson?.error}`);

    const payment = await db.payment.findFirst({
      where: { orderId }, select: { id: true, status: true, amount: true, paymentMethod: true },
    });
    ok('a COMPLETED Payment row exists for the amount due',
      payment?.status === 'COMPLETED' && Math.round(num(payment?.amount)) === due,
      `${payment?.status} ${num(payment?.amount)} vs ${due}`);
    ok('and it is recorded as WALLET, not CASH', payment?.paymentMethod === 'WALLET',
      String(payment?.paymentMethod));

    const walletAfter = await db.wallet.findUnique({
      where: { id: custWallet.id }, select: { balance: true },
    });
    ok('the customer was actually debited',
      Math.round(num(walletAfter?.balance)) === Math.round(num(custWallet.balance)) - due,
      `${num(custWallet.balance)} → ${num(walletAfter?.balance)} (due ${due})`);

    const paidOrder = await db.order.findUnique({
      where: { id: orderId }, select: { paymentStatus: true },
    });
    ok('the order is marked paid by the collection, not by the client',
      paidOrder?.paymentStatus === 'COMPLETED', paidOrder?.paymentStatus);

    const dupPay = await c('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    ok('a second payment for the same order is refused', dupPay.status === 409,
      `HTTP ${dupPay.status}`);

    // ── now the order can proceed ──────────────────────────────────────────
    console.log('\n-- the order proceeds, and the courier leg is priced from what was charged --');
    const confirm = await c(`/orders/${orderId}?action=confirm-payment`, 'PATCH', {});
    ok('confirm-payment succeeds once payment is collected', confirm.status === 200,
      `HTTP ${confirm.status}`);

    for (const [act, body] of [
      ['accept', { merchantId: merchant.id, estimatedPrepTime: 10 }],
      ['preparing', { merchantId: merchant.id }],
      ['ready', { merchantId: merchant.id }],
    ] as const) {
      const r = await m(`/orders/${orderId}?action=${act}`, 'PATCH', body);
      ok(`merchant ${act}`, r.status === 200, `HTTP ${r.status}`);
    }

    await new Promise((r) => setTimeout(r, 4000));
    const task = await db.task.findUnique({
      where: { orderId },
      select: {
        id: true, taskNumber: true, status: true, totalAmount: true,
        riderEarnings: true, platformCommission: true, riderId: true, paymentStatus: true,
      },
    });
    if (task) taskIds.push(task.id);
    ok('a courier task now exists', !!task, task?.taskNumber);

    const chargedForDelivery = Math.round(num(created?.deliveryFee) + num(created?.serviceFee));
    ok('the task fare equals the delivery money the customer paid (PRICING-1)',
      Math.round(num(task?.totalAmount)) === chargedForDelivery,
      `task ${num(task?.totalAmount)} vs charged ${chargedForDelivery}`);
    ok('commission + courier earnings reconcile to the fare exactly',
      Math.round(num(task?.riderEarnings) + num(task?.platformCommission)) ===
        Math.round(num(task?.totalAmount)),
      `${num(task?.riderEarnings)} + ${num(task?.platformCommission)} = ${num(task?.totalAmount)}`);
    ok('the platform is never out of pocket on the delivery',
      num(task?.riderEarnings) <= chargedForDelivery,
      `courier ${num(task?.riderEarnings)} ≤ charged ${chargedForDelivery}`);

    const matches = task ? await db.dispatchMatch.count({ where: { taskId: task.id } }) : 0;
    ok('the task was actually offered to a courier (MERCH-7)', matches > 0, `${matches} match(es)`);

    // ── BE-040: an unpaid completion holds, it does not pay ────────────────
    console.log('\n-- an unpaid non-cash completion holds the earnings --');
    const heldOrder = await db.order.create({
      data: {
        orderNumber: `QAFV-${Date.now().toString(36).toUpperCase()}`,
        clientId: cUser.id, merchantId: merchant.id, orderType: 'FOOD_DELIVERY',
        subtotal: 10000, deliveryFee: 4000, serviceFee: 200, totalAmount: 14200,
        paymentMethod: 'MTN_MOMO', paymentStatus: 'PENDING', status: 'PICKED_UP',
        deliveryAddress: 'Ntinda, Kampala',
        deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
      },
      select: { id: true },
    });
    orderIds.push(heldOrder.id);

    const heldTask = await db.task.create({
      data: {
        taskNumber: `TSK-QAFV-${Date.now().toString(36).toUpperCase()}`,
        taskType: 'FOOD_DELIVERY', clientId: cUser.id, orderId: heldOrder.id,
        riderId: rider.id, status: 'DELIVERED',
        pickupAddress: 'Kira Road', dropoffAddress: 'Ntinda',
        baseFare: 4000, deliveryFee: 4000, serviceFee: 200,
        totalAmount: 4200, platformCommission: 630, riderEarnings: 3570,
        paymentMethod: 'MTN_MOMO', paymentStatus: 'PENDING',
      },
      select: { id: true },
    });
    taskIds.push(heldTask.id);

    const { FinanceLedgerService } = await import('../src/lib/services/finance-ledger.service');
    await FinanceLedgerService.recordTaskCompletion(heldTask.id);

    const rWallet = await db.wallet.findFirst({
      where: { ownerId: rUser.id, ownerType: 'USER' },
      select: { id: true, balance: true, pendingBalance: true },
    });
    ok('nothing spendable was created from the unpaid job (BE-040)',
      Math.round(num(rWallet?.balance)) === 0, `balance=${num(rWallet?.balance)}`);
    ok('the earnings are recorded as held instead',
      Math.round(num(rWallet?.pendingBalance)) === 3570, `pending=${num(rWallet?.pendingBalance)}`);

    const heldLedger = await db.walletTransaction.findFirst({
      where: { referenceId: heldTask.id, referenceType: 'TASK_EARNINGS' },
      select: { status: true, amount: true },
    });
    ok('the ledger row says PENDING', heldLedger?.status === 'PENDING',
      `${heldLedger?.status} ${num(heldLedger?.amount)}`);

    const exception = await db.financeLog.findFirst({
      where: { referenceId: `unpaid-completion-${heldTask.id}` },
      select: { status: true, transactionType: true },
    });
    ok('the shortfall is recorded for reconciliation',
      !!exception && exception.status === 'PENDING',
      `${exception?.transactionType}/${exception?.status}`);

    const riderRow = await db.rider.findUnique({
      where: { id: rider.id }, select: { walletBalance: true, totalEarnings: true },
    });
    ok('the denormalised rider balance did not move either',
      Math.round(num(riderRow?.walletBalance)) === 0, `${num(riderRow?.walletBalance)}`);
    ok('but the lifetime earnings figure records the work',
      Math.round(num(riderRow?.totalEarnings)) === 3570, `${num(riderRow?.totalEarnings)}`);

    // ── the release, once the money is in ──────────────────────────────────
    console.log('\n-- and releases when the payment lands --');
    const heldPay = await db.payment.create({
      data: {
        paymentReference: `QAFV-PAY-${Date.now().toString(36).toUpperCase()}`,
        orderId: heldOrder.id, userId: cUser.id, amount: 14200,
        paymentMethod: 'MTN_MOMO', status: 'COMPLETED', processedAt: new Date(),
      },
      select: { id: true },
    });
    const { handleSuccessfulPayment } = await import('../src/lib/payments/payment-service');
    await handleSuccessfulPayment(heldPay.id);

    const released = await db.wallet.findUnique({
      where: { id: rWallet!.id }, select: { balance: true, pendingBalance: true },
    });
    ok('the held earnings became spendable', Math.round(num(released?.balance)) === 3570,
      `balance=${num(released?.balance)}`);
    ok('and the held figure came back down', Math.round(num(released?.pendingBalance)) === 0,
      `pending=${num(released?.pendingBalance)}`);

    const releasedTxn = await db.walletTransaction.findFirst({
      where: { referenceId: heldTask.id, referenceType: 'TASK_EARNINGS' },
      select: { status: true },
    });
    ok('the ledger row is COMPLETED', releasedTxn?.status === 'COMPLETED', releasedTxn?.status);

    await handleSuccessfulPayment(heldPay.id);
    const afterReplay = await db.wallet.findUnique({
      where: { id: rWallet!.id }, select: { balance: true },
    });
    ok('a replayed confirmation does not pay twice',
      Math.round(num(afterReplay?.balance)) === 3570, `balance=${num(afterReplay?.balance)}`);

    // ── a replayed completion does not pay twice either ────────────────────
    await FinanceLedgerService.recordTaskCompletion(heldTask.id);
    const afterDupCompletion = await db.wallet.findUnique({
      where: { id: rWallet!.id }, select: { balance: true, pendingBalance: true },
    });
    ok('a replayed completion does not credit again',
      Math.round(num(afterDupCompletion?.balance)) === 3570 &&
        Math.round(num(afterDupCompletion?.pendingBalance)) === 0,
      `balance=${num(afterDupCompletion?.balance)} pending=${num(afterDupCompletion?.pendingBalance)}`);

    // ── rides keep cash ────────────────────────────────────────────────────
    console.log('\n-- rides are unaffected --');
    const cashRide = await db.task.create({
      data: {
        taskNumber: `TSK-QAFVR-${Date.now().toString(36).toUpperCase()}`,
        taskType: 'SMART_BODA_RIDE', clientId: cUser.id, riderId: rider.id, status: 'COMPLETED',
        pickupAddress: 'Kira Road', dropoffAddress: 'Ntinda',
        baseFare: 2000, totalAmount: 5000, platformCommission: 750, riderEarnings: 4250,
        paymentMethod: 'CASH', paymentStatus: 'PENDING',
      },
      select: { id: true },
    });
    taskIds.push(cashRide.id);
    await FinanceLedgerService.recordTaskCompletion(cashRide.id);

    const cashTask = await db.task.findUnique({
      where: { id: cashRide.id }, select: { paymentStatus: true },
    });
    ok('a cash ride settles as before', cashTask?.paymentStatus === 'COMPLETED',
      cashTask?.paymentStatus);
    const receivable = await db.cashCollection.findFirst({
      where: { taskId: cashRide.id }, select: { amount: true, collectionType: true },
    });
    ok('and the commission the rider owes is recorded',
      Math.round(num(receivable?.amount)) === 750,
      `${receivable?.collectionType} ${num(receivable?.amount)}`);
    const cashWallet = await db.wallet.findUnique({
      where: { id: rWallet!.id }, select: { balance: true },
    });
    ok('cash does not credit the wallet (the rider was paid in hand)',
      Math.round(num(cashWallet?.balance)) === 3570, `balance=${num(cashWallet?.balance)}`);
  } finally {
    // ── cleanup ────────────────────────────────────────────────────────────
    console.log('\n-- cleanup --');
    const allOrders = await db.order.findMany({ where: { merchantId: merchant.id }, select: { id: true } });
    const oids = Array.from(new Set([...orderIds, ...allOrders.map((o) => o.id)]));
    const allTasks = await db.task.findMany({
      where: { OR: [{ orderId: { in: oids } }, { riderId: rider.id }, { clientId: cUser.id }] },
      select: { id: true },
    });
    const tids = Array.from(new Set([...taskIds, ...allTasks.map((t) => t.id)]));

    for (const t of tids) {
      await db.taskStateTransition.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.dispatchMatch.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.cashCollection.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.payment.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.conversation.deleteMany({ where: { taskId: t } }).catch(() => {});
      await db.receipt.deleteMany({ where: { taskId: t } }).catch(() => {});
    }
    await db.task.deleteMany({ where: { id: { in: tids } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { OR: [{ clientId: cUser.id }, { riderId: rider.id }] } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.kOT.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.receipt.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: oids } } }).catch(() => {});
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
      await db.user.delete({ where: { id: uid } }).catch((e) => console.log('user:', e.message.slice(0, 80)));
    }

    ok('every QA user removed',
      (await db.user.count({ where: { email: { contains: `qa-fv-${''}` } } })) >= 0 &&
        (await db.user.count({ where: { id: { in: [mUser.id, cUser.id, rUser.id] } } })) === 0);
    ok('no QA orders left', (await db.order.count({ where: { id: { in: oids } } })) === 0);
    ok('no QA tasks left', (await db.task.count({ where: { id: { in: tids } } })) === 0);
    ok('no QA payments left',
      (await db.payment.count({ where: { userId: { in: [cUser.id] } } })) === 0);
    ok('no stranded wallets',
      (await db.wallet.count({ where: { ownerId: { in: [rUser.id, cUser.id] } } })) === 0);
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
