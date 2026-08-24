/**
 * AUTHORIZATION — the hostile cases, driven against the deployed API.
 *
 * Every check here is an attack somebody could actually mount with a modified
 * client and a valid account of their own. None of them assume the UI would
 * stop it, because the UI is not what stops it.
 *
 * Covers: ownership, role, merchant isolation, provider isolation, task
 * ownership, payment ownership, amount derivation, and the state machine's
 * authority over lifecycle moves.
 *
 *   bun scripts/verify-authorization.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { API, qaLogin, qaCall } from './qa-http';
import { qaCleanupByTag, qaNothingLeft } from './qa-cleanup';

const db = new PrismaClient();

/**
 * One tag on every fixture this run creates, so the sweep at the bottom can
 * find them all whether or not the suite got far enough to remember their ids.
 */
const TAG = Math.random().toString(36).slice(2, 8);
const PW = 'QaAuthz#2026';
const SHOP = { lat: 0.3476, lng: 32.5825 };
const DROP = { lat: 0.3626, lng: 32.6111 };

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};
/** A refusal is anything that is not a success. 401/403/404/409 are all fine. */
const refused = (status: number) => status >= 400;

const login = (email: string) => qaLogin(email, PW);
const call = qaCall;

async function run() {
  const rand = TAG;
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;
  const mk = async (tag: string, role: string) =>
    db.user.create({ data: { email: `qa-az-${tag}-${rand}@qa.invalid`, phone: ph(), name: `QA AZ ${tag}`, passwordHash: hash, role: role as never, status: 'ACTIVE' } });

  console.log(`\n=== AUTHORIZATION (${API}) ===\n`);

  // Two of everything, so "someone else's" is a real other party.
  const mUserA = await mk('ma', 'MERCHANT');
  const mUserB = await mk('mb', 'MERCHANT');
  const cUserA = await mk('ca', 'CLIENT');
  const cUserB = await mk('cb', 'CLIENT');
  const rUserA = await mk('ra', 'RIDER');
  const pUserA = await mk('pa', 'PHARMACIST');
  const pUserB = await mk('pb', 'PHARMACIST');

  const merchA = await db.merchant.create({ data: { userId: mUserA.id, name: `QA AZ Shop A ${rand}`, type: 'RESTAURANT', email: mUserA.email!, phone: mUserA.phone, address: 'Kira Road', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, status: 'APPROVED', isOpen: true } });
  const merchB = await db.merchant.create({ data: { userId: mUserB.id, name: `QA AZ Shop B ${rand}`, type: 'RESTAURANT', email: mUserB.email!, phone: mUserB.phone, address: 'Bukoto', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, status: 'APPROVED', isOpen: true } });
  const itemA = await db.menuItem.create({ data: { merchantId: merchA.id, name: 'QA AZ Pilau', price: 18000, category: 'Main', isAvailable: true } });
  const riderA = await db.rider.create({ data: { userId: rUserA.id, fullName: 'QA AZ Courier', phone: rUserA.phone, email: rUserA.email!, physicalAddress: 'Kampala', riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED', isOnline: false } });

  const provA = await db.healthProvider.create({ data: { user: { connect: { id: pUserA.id } }, businessName: `QA AZ Pharmacy A ${rand}`, providerType: 'PHARMACY', licenseNumber: `QAAZ-A-${rand}`, ownerFullName: 'QA AZ A', ownerPhone: pUserA.phone!, ownerEmail: pUserA.email!, address: 'Kira Road', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, verificationStatus: 'APPROVED', isOpenNow: true } });
  const provB = await db.healthProvider.create({ data: { user: { connect: { id: pUserB.id } }, businessName: `QA AZ Pharmacy B ${rand}`, providerType: 'PHARMACY', licenseNumber: `QAAZ-B-${rand}`, ownerFullName: 'QA AZ B', ownerPhone: pUserB.phone!, ownerEmail: pUserB.email!, address: 'Bukoto', city: 'Kampala', latitude: SHOP.lat, longitude: SHOP.lng, verificationStatus: 'APPROVED', isOpenNow: true } });

  const createdOrderIds: string[] = [];

  try {
    const A = call(await login(cUserA.email!));
    const B = call(await login(cUserB.email!));
    const MA = call(await login(mUserA.email!));
    const MB = call(await login(mUserB.email!));
    const RA = call(await login(rUserA.email!));
    const PA = call(await login(pUserA.email!));
    const PB = call(await login(pUserB.email!));
    const anon = call();

    // Customer A places a real order with Shop A.
    const pr = await A('/orders', 'POST', {
      merchantId: merchA.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: itemA.id, itemName: 'QA AZ Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'WALLET', deliveryAddress: 'Ntinda',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng, recipientName: 'QA AZ A',
    });
    const orderId = (await pr.json())?.data?.id;
    if (!orderId) throw new Error(`order creation failed: HTTP ${pr.status}`);
    createdOrderIds.push(orderId);

    // ── who may read it ────────────────────────────────────────────────────
    console.log('-- reading an order --');
    ok('the owner can read their own order', (await A(`/orders/${orderId}`)).status === 200);
    ok("its merchant can read it", (await MA(`/orders/${orderId}`)).status === 200);
    ok('another customer cannot read it', refused((await B(`/orders/${orderId}`)).status),
      `HTTP ${(await B(`/orders/${orderId}`)).status}`);
    ok('another merchant cannot read it', refused((await MB(`/orders/${orderId}`)).status));
    ok('an unassigned courier cannot read it', refused((await RA(`/orders/${orderId}`)).status));
    ok('an anonymous caller cannot read it', refused((await anon(`/orders/${orderId}`)).status));

    // ── who may pay for it ─────────────────────────────────────────────────
    console.log('\n-- paying for an order --');
    const foreignPay = await B('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    ok("another customer cannot pay for someone else's order", foreignPay.status === 403,
      `HTTP ${foreignPay.status}`);
    const noRef = await A('/payments/initiate', 'POST', { paymentMethod: 'WALLET', amount: 500 });
    ok('a payment referencing nothing is refused', noRef.status === 400, `HTTP ${noRef.status}`);
    const underpay = await A('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET', amount: 1 });
    ok('a client-chosen amount is refused, not obeyed', underpay.status === 400, `HTTP ${underpay.status}`);
    const negative = await A('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET', amount: -50000 });
    ok('a negative amount is refused', refused(negative.status), `HTTP ${negative.status}`);
    const anonPay = await anon('/payments/initiate', 'POST', { orderId, paymentMethod: 'WALLET' });
    ok('an anonymous payment is refused', anonPay.status === 401, `HTTP ${anonPay.status}`);

    // ── who may drive the lifecycle ────────────────────────────────────────
    console.log('\n-- driving the order lifecycle --');
    const fakePaid = await A(`/orders/${orderId}?action=confirm-payment`, 'PATCH', { paymentReference: 'QA-NO-SUCH-PAYMENT' });
    ok('the customer cannot declare their own order paid (BE-044)', fakePaid.status === 402,
      `HTTP ${fakePaid.status}`);

    const foreignAccept = await MB(`/orders/${orderId}?action=accept`, 'PATCH', { merchantId: merchA.id, estimatedPrepTime: 5 });
    ok("a merchant cannot accept another shop's order", refused(foreignAccept.status), `HTTP ${foreignAccept.status}`);
    const clientAccept = await A(`/orders/${orderId}?action=accept`, 'PATCH', { merchantId: merchA.id });
    ok('a customer cannot accept an order as the merchant', clientAccept.status === 403, `HTTP ${clientAccept.status}`);
    const riderReady = await RA(`/orders/${orderId}?action=ready`, 'PATCH', { merchantId: merchA.id });
    ok('a courier cannot mark an order ready', riderReady.status === 403, `HTTP ${riderReady.status}`);
    const riderDeliver = await RA(`/orders/${orderId}?action=deliver`, 'PATCH', {});
    ok('a courier cannot deliver an order that is not theirs', refused(riderDeliver.status), `HTTP ${riderDeliver.status}`);
    const anonAccept = await anon(`/orders/${orderId}?action=accept`, 'PATCH', { merchantId: merchA.id });
    ok('an anonymous caller cannot drive the lifecycle', anonAccept.status === 401, `HTTP ${anonAccept.status}`);

    // ── ordering on someone else's behalf ──────────────────────────────────
    console.log('\n-- placing an order as somebody else --');
    const idor = await A('/orders', 'POST', {
      clientId: cUserB.id, merchantId: merchA.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: itemA.id, itemName: 'QA AZ Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'WALLET', deliveryAddress: 'Ntinda',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    });
    ok('a customer cannot place an order for another customer', idor.status === 403, `HTTP ${idor.status}`);

    // ── the catalogue price is the merchant's, not the buyer's ─────────────
    console.log('\n-- pricing a cart --');
    const cheap = await A('/orders/quote', 'POST', {
      merchantId: merchA.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: itemA.id, quantity: 1, unitPrice: 1 }],
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    });
    const cheapQuote = (await cheap.json())?.data;
    ok('a client-supplied unit price does not set the subtotal',
      cheapQuote?.subtotal === 18000, `subtotal=${cheapQuote?.subtotal}`);
    const foreignItem = await A('/orders', 'POST', {
      merchantId: merchB.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: itemA.id, itemName: 'QA AZ Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'WALLET', deliveryAddress: 'Ntinda',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    });
    ok("an item from another shop's menu cannot be bought here", refused(foreignItem.status),
      `HTTP ${foreignItem.status}`);
    const cashTry = await A('/orders', 'POST', {
      merchantId: merchA.id, orderType: 'FOOD_DELIVERY',
      items: [{ menuItemId: itemA.id, itemName: 'QA AZ Pilau', quantity: 1, unitPrice: 18000 }],
      paymentMethod: 'CASH', deliveryAddress: 'Ntinda',
      deliveryLatitude: DROP.lat, deliveryLongitude: DROP.lng,
    });
    ok('cash is refused on a merchant order', cashTry.status === 400, `HTTP ${cashTry.status}`);

    // ── provider isolation ─────────────────────────────────────────────────
    console.log('\n-- one pharmacy against another --');
    const foreignOrders = await PA(`/health-provider/orders?providerId=${provB.id}`);
    ok("a pharmacy cannot read another pharmacy's order book", foreignOrders.status === 403,
      `HTTP ${foreignOrders.status}`);
    const anonOrders = await anon(`/health-provider/orders?providerId=${provA.id}`);
    ok('an anonymous caller cannot read a pharmacy order book', anonOrders.status === 401,
      `HTTP ${anonOrders.status}`);

    const med = await db.medicineCatalog.create({
      data: { providerId: provB.id, name: `QA AZ Med ${rand}`, category: 'OTHER', price: 5000, stockQuantity: 10 },
      select: { id: true },
    });
    const steal = await PA(`/health-provider/catalog?id=${med.id}`, 'DELETE');
    ok("a pharmacy cannot delete another pharmacy's medicine", refused(steal.status), `HTTP ${steal.status}`);
    const stillThere = await db.medicineCatalog.count({ where: { id: med.id } });
    ok('and the medicine is untouched', stillThere === 1);
    const edit = await PA('/health-provider/catalog', 'PATCH', { id: med.id, price: 1 });
    ok("a pharmacy cannot reprice another pharmacy's medicine", refused(edit.status), `HTTP ${edit.status}`);
    const priceNow = await db.medicineCatalog.findUnique({ where: { id: med.id }, select: { price: true } });
    ok('and the price is unchanged', Number(priceNow?.price) === 5000, String(priceNow?.price));
    await db.medicineCatalog.delete({ where: { id: med.id } }).catch(() => {});

    // ── pharmacy order ownership ───────────────────────────────────────────
    const po = await db.providerOrder.create({
      data: {
        orderNumber: `QAAZ-${Date.now().toString(36).toUpperCase()}`,
        providerId: provA.id, customerId: cUserA.id, customerName: 'QA AZ A',
        orderType: 'OVER_THE_COUNTER', items: JSON.stringify([{ name: 'QA AZ Med', quantity: 1, price: 5000 }]),
        subtotal: 5000, deliveryFee: 5000, serviceFee: 100, totalAmount: 10100,
        providerEarnings: 4500, deliveryAddress: 'Ntinda',
        paymentMethod: 'MTN_MOMO', paymentStatus: 'PENDING', status: 'ORDER_RECEIVED',
      },
      select: { id: true },
    });
    const foreignAdvance = await PB('/health-provider/orders', 'PATCH', { orderId: po.id, action: 'ACCEPT' });
    ok("a pharmacy cannot advance another pharmacy's order", refused(foreignAdvance.status),
      `HTTP ${foreignAdvance.status}`);
    const unpaidAccept = await PA('/health-provider/orders', 'PATCH', { orderId: po.id, action: 'ACCEPT' });
    ok('a pharmacy cannot accept an order nobody has paid for', unpaidAccept.status === 402,
      `HTTP ${unpaidAccept.status}`);
    const stillReceived = await db.providerOrder.findUnique({ where: { id: po.id }, select: { status: true } });
    ok('and the order has not moved', stillReceived?.status === 'ORDER_RECEIVED', stillReceived?.status);
    const foreignPharmPay = await B('/payments/initiate', 'POST', { providerOrderId: po.id, paymentMethod: 'WALLET' });
    ok("a customer cannot pay for another customer's pharmacy order", foreignPharmPay.status === 403,
      `HTTP ${foreignPharmPay.status}`);
    await db.providerOrder.delete({ where: { id: po.id } }).catch(() => {});

    // ── task ownership ─────────────────────────────────────────────────────
    console.log('\n-- one courier against another --');
    const strayTask = await db.task.create({
      data: {
        taskNumber: `TSK-QAAZ-${Date.now().toString(36).toUpperCase()}`,
        taskType: 'SMART_BODA_RIDE', clientId: cUserB.id, status: 'ASSIGNED',
        pickupAddress: 'Kira Road', dropoffAddress: 'Ntinda',
        baseFare: 2000, totalAmount: 5000, platformCommission: 750, riderEarnings: 4250,
        paymentMethod: 'CASH', paymentStatus: 'PENDING',
      },
      select: { id: true },
    });
    const strayDecline = await RA(`/tasks/${strayTask.id}/decline`, 'POST', { reason: 'QA probe' });
    ok("a courier cannot decline a task that is not theirs", refused(strayDecline.status),
      `HTTP ${strayDecline.status}`);
    const declinedTask = await db.task.findUnique({ where: { id: strayTask.id }, select: { status: true } });
    ok('and the task is untouched', declinedTask?.status === 'ASSIGNED', declinedTask?.status);
    const clientDecline = await A(`/tasks/${strayTask.id}/decline`, 'POST', { reason: 'QA probe' });
    ok('a customer cannot decline a task at all', clientDecline.status === 403, `HTTP ${clientDecline.status}`);
    const strayPay = await A('/payments/initiate', 'POST', { taskId: strayTask.id, paymentMethod: 'WALLET' });
    ok("a customer cannot pay for someone else's task", strayPay.status === 403, `HTTP ${strayPay.status}`);
    await db.taskStateTransition.deleteMany({ where: { taskId: strayTask.id } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: strayTask.id } }).catch(() => {});
    await db.task.delete({ where: { id: strayTask.id } }).catch(() => {});
  } finally {
    console.log('\n-- cleanup --');
    const allUsers = [mUserA.id, mUserB.id, cUserA.id, cUserB.id, rUserA.id, pUserA.id, pUserB.id];
    const merchIds = [merchA.id, merchB.id];
    const orders = await db.order.findMany({ where: { merchantId: { in: merchIds } }, select: { id: true } });
    const oids = Array.from(new Set([...createdOrderIds, ...orders.map((o) => o.id)]));
    const tasks = await db.task.findMany({ where: { OR: [{ orderId: { in: oids } }, { clientId: { in: allUsers } }, { riderId: riderA.id }] }, select: { id: true } });
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
    await db.financeLog.deleteMany({ where: { clientId: { in: allUsers } } }).catch(() => {});
    await db.orderItem.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.kOT.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.receipt.deleteMany({ where: { orderId: { in: oids } } }).catch(() => {});
    await db.order.deleteMany({ where: { id: { in: oids } } }).catch(() => {});
    await db.menuItem.deleteMany({ where: { merchantId: { in: merchIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { merchantId: { in: merchIds } } }).catch(() => {});
    await db.merchant.deleteMany({ where: { id: { in: merchIds } } }).catch((e) => console.log('merchant:', e.message.slice(0, 70)));
    for (const pid of [provA.id, provB.id]) {
      await db.medicineCatalog.deleteMany({ where: { providerId: pid } }).catch(() => {});
      await db.providerDocument.deleteMany({ where: { providerId: pid } }).catch(() => {});
      await db.providerOrder.deleteMany({ where: { providerId: pid } }).catch(() => {});
      await db.healthProvider.delete({ where: { id: pid } }).catch((e) => console.log('provider:', e.message.slice(0, 70)));
    }
    await db.walletTransaction.deleteMany({ where: { wallet: { ownerId: { in: allUsers } } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: allUsers } } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { riderId: riderA.id } }).catch(() => {});
    await db.rider.delete({ where: { id: riderA.id } }).catch((e) => console.log('rider:', e.message.slice(0, 70)));
    for (const uid of allUsers) {
      await db.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.payment.deleteMany({ where: { userId: uid } }).catch(() => {});
      await db.user.delete({ where: { id: uid } }).catch((e) => console.log('user:', e.message.slice(0, 70)));
    }
    ok('no QA users left', (await db.user.count({ where: { id: { in: allUsers } } })) === 0);
    ok('no QA orders left', (await db.order.count({ where: { id: { in: oids } } })) === 0);
    ok('no QA providers left', (await db.healthProvider.count({ where: { id: { in: [provA.id, provB.id] } } })) === 0);
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}



/**
 * The last word on cleanup.
 *
 * Each suite builds its fixtures BEFORE the `try` that removes them, so a
 * failure part way through creation used to leave the ones already made with
 * nothing to clean them — five crashed runs of the authorization suite left 35
 * users and 10 merchants behind while still reporting "no QA users left",
 * because each run only knew about its own ids.
 *
 * Every fixture carries the same random tag, so this sweeps by tag and catches
 * whatever the suite did not get far enough to remember.
 */
async function main() {
  const tag = TAG;
  try {
    await run();
  } finally {
    await qaCleanupByTag(db, tag);
    if (!(await qaNothingLeft(db, tag))) {
      console.log(`  WARN  fixtures tagged ${tag} survived cleanup — check manually`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
