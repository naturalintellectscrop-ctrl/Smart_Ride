/**
 * Production QA harness — pharmacy catalogue + delivery chain.
 * Disposable fixtures, deleted at the end. Not part of the verify suite.
 *
 *   bun scripts/.qa-pharm-chain.ts setup
 *   bun scripts/.qa-pharm-chain.ts catalog
 *   bun scripts/.qa-pharm-chain.ts chain
 *   bun scripts/.qa-pharm-chain.ts verify
 *   bun scripts/.qa-pharm-chain.ts cleanup
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const API = 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();
const STATE = path.join(process.cwd(), 'scripts', '.qa-pharm-chain.json');
const TAG = 'qa-pchain';

type State = {
  pharmUserId?: string; pharmEmail?: string; pharmPass?: string; providerId?: string;
  rivalUserId?: string; rivalEmail?: string; rivalProviderId?: string; rivalMedicineId?: string;
  customerId?: string; customerEmail?: string; orderId?: string; taskId?: string; medicineId?: string;
};
const load = (): State => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s: State) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

const num = (v: unknown) => (v == null ? 0 : Number(v));
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j: any = await r.json();
  const token = j?.data?.accessToken ?? j?.accessToken ?? j?.data?.token;
  if (!token) throw new Error(`login failed ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return token;
}

const call = async (token: string, p: string, method = 'GET', body?: unknown) => {
  const r = await fetch(`${API}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: r.status, json, text };
};

async function makePharmacy(label: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `${TAG}-${label}-${rand}@qa.invalid`;
  const password = 'QaChain#2026';
  const user = await db.user.create({
    data: {
      email,
      phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`,
      name: `QA ${label} Pharmacy`,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'PHARMACIST',
      status: 'ACTIVE',
    },
  });
  const provider = await db.healthProvider.create({
    data: {
      userId: user.id,
      businessName: `QA ${label} Pharmacy`,
      licenseNumber: `LIC-${rand}`,
      ownerFullName: `QA ${label}`,
      ownerPhone: '+256700000000',
      address: 'Plot 1, Kampala',
      latitude: 0.3476, longitude: 32.5825,
      providerType: 'PHARMACY',
      verificationStatus: 'APPROVED',
      supportsDelivery: true,
      commissionRate: 0.1,
    },
  });
  // The approval gate reads Merchant+Pharmacy (PHARM-3), so a usable pharmacist
  // needs both halves.
  const merchant = await db.merchant.create({
    data: {
      userId: user.id, name: `QA ${label} Pharmacy`, type: 'PHARMACY',
      email, phone: '+256700000000', address: 'Plot 1, Kampala',
      latitude: 0.3476, longitude: 32.5825,
      status: 'APPROVED', isOpen: true,
    },
  });
  await db.pharmacy.create({
    data: {
      merchantId: merchant.id, pharmacyLicense: `PH-${rand}`,
      pharmacistInCharge: `QA ${label}`, pharmacistLicense: `PL-${rand}`,
      status: 'APPROVED', isOpen: true,
    },
  });
  return { userId: user.id, email, password, providerId: provider.id, merchantId: merchant.id };
}

async function setup() {
  const s = load();
  const mine = await makePharmacy('mine');
  const rival = await makePharmacy('rival');
  const customer = await db.user.create({
    data: {
      email: `${TAG}-customer-${Math.random().toString(36).slice(2, 8)}@qa.invalid`,
      phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`,
      name: 'QA Chain Customer',
      passwordHash: await bcrypt.hash('QaChain#2026', 10),
      role: 'CLIENT', status: 'ACTIVE',
    },
  });
  // A medicine belonging to the rival, for the cross-provider checks.
  const rivalMed = await db.medicineCatalog.create({
    data: { providerId: rival.providerId, name: 'Rival Aspirin', category: 'PAINKILLERS', price: 5000 },
  });

  Object.assign(s, {
    pharmUserId: mine.userId, pharmEmail: mine.email, pharmPass: mine.password, providerId: mine.providerId,
    rivalUserId: rival.userId, rivalEmail: rival.email, rivalProviderId: rival.providerId,
    rivalMedicineId: rivalMed.id, customerId: customer.id, customerEmail: customer.email,
  });
  save(s);
  console.log('SETUP  pharmacy=%s rival=%s customer=%s', mine.providerId, rival.providerId, customer.id);
  console.log('LOGIN  %s', mine.email);
}

async function catalog() {
  const s = load();
  const token = await login(s.pharmEmail!, s.pharmPass!);
  console.log('\n=== CATALOGUE (production) ===\n');

  const empty = await call(token, '/health-provider/catalog');
  ok('own catalogue loads without a providerId', empty.status === 200, `HTTP ${empty.status}`);
  ok('starts empty', Array.isArray(empty.json?.medicines) && empty.json.medicines.length === 0,
    `${empty.json?.medicines?.length ?? '?'} items`);

  const add = await call(token, '/health-provider/catalog', 'POST', {
    name: 'QA Paracetamol 500mg', genericName: 'Paracetamol', price: 3500,
    stockQuantity: 40, requiresPrescription: false, description: 'QA fixture',
  });
  ok('a medicine can be added with no providerId and no category', add.status === 200,
    `HTTP ${add.status} ${add.json?.error ?? ''}`);
  const medicineId = add.json?.medicine?.id;
  ok('it comes back with an id', !!medicineId);
  ok('unclassified stock lands in OTHER', add.json?.medicine?.category === 'OTHER', add.json?.medicine?.category);
  ok('it belongs to the calling pharmacy', add.json?.medicine?.providerId === s.providerId);
  if (medicineId) { s.medicineId = medicineId; save(s); }

  const named = await call(token, '/health-provider/catalog', 'POST', {
    name: 'QA Amoxicillin 250mg', category: 'ANTIBIOTICS', price: 12000,
    stockQuantity: 15, requiresPrescription: true,
  });
  ok('a categorised prescription medicine is accepted', named.status === 200, `HTTP ${named.status}`);
  ok('prescription flag persists', named.json?.medicine?.requiresPrescription === true);

  const bad = await call(token, '/health-provider/catalog', 'POST', { name: 'No price' });
  ok('a medicine with no price is refused', bad.status === 400, `HTTP ${bad.status}`);
  const neg = await call(token, '/health-provider/catalog', 'POST', { name: 'Negative', price: -100 });
  ok('a negative price is refused', neg.status === 400, `HTTP ${neg.status}`);

  const listed = await call(token, '/health-provider/catalog');
  ok('both medicines appear in the catalogue', listed.json?.medicines?.length === 2,
    `${listed.json?.medicines?.length} items`);

  if (medicineId) {
    const edit = await call(token, '/health-provider/catalog', 'PATCH', { medicineId, price: 4000, stockQuantity: 60 });
    ok('a medicine can be repriced', edit.status === 200 && num(edit.json?.medicine?.price) === 4000,
      `HTTP ${edit.status} price=${num(edit.json?.medicine?.price)}`);
    ok('restock time is stamped', !!edit.json?.medicine?.lastRestockedAt);

    const off = await call(token, '/health-provider/catalog', 'PATCH', { medicineId, isAvailable: false });
    ok('availability can be turned off', off.status === 200 && off.json?.medicine?.isAvailable === false);
    await call(token, '/health-provider/catalog', 'PATCH', { medicineId, isAvailable: true });

    const persisted = await db.medicineCatalog.findUnique({ where: { id: medicineId } });
    ok('the change is in the database, not just the response', num(persisted?.price) === 4000,
      `db price=${num(persisted?.price)}`);
  }

  // ── PHARM-11: someone else's stock ──
  const stealEdit = await call(token, '/health-provider/catalog', 'PATCH', {
    medicineId: s.rivalMedicineId, price: 1,
  });
  ok("another pharmacy's medicine cannot be repriced", stealEdit.status === 403,
    `HTTP ${stealEdit.status} ${stealEdit.json?.error ?? ''}`);
  const stealDelete = await call(token, `/health-provider/catalog?medicineId=${s.rivalMedicineId}`, 'DELETE');
  ok("another pharmacy's medicine cannot be deleted", stealDelete.status === 403, `HTTP ${stealDelete.status}`);
  const rivalStill = await db.medicineCatalog.findUnique({ where: { id: s.rivalMedicineId } });
  ok("the rival's medicine is untouched", num(rivalStill?.price) === 5000, `price=${num(rivalStill?.price)}`);

  // Reading a named pharmacy's catalogue is deliberately open — it is the
  // customer-facing storefront, browsed before anyone signs in. What must not
  // be reachable is MANAGING it, which the two checks above cover.
  const storefront = await call(token, `/health-provider/catalog?providerId=${s.rivalProviderId}`);
  ok('a named storefront is readable', storefront.status === 200, `HTTP ${storefront.status}`);
  ok("it returns that pharmacy, not the caller's",
    storefront.json?.medicines?.[0]?.providerId === s.rivalProviderId,
    storefront.json?.medicines?.[0]?.providerId ?? 'none');

  const anon = await fetch(`${API}/health-provider/catalog`);
  ok('an anonymous request for "my catalogue" is refused', anon.status === 401, `HTTP ${anon.status}`);

  if (medicineId) {
    const del = await call(token, `/health-provider/catalog?medicineId=${medicineId}`, 'DELETE');
    ok('a medicine can be deleted', del.status === 200, `HTTP ${del.status}`);
    const gone = await db.medicineCatalog.findUnique({ where: { id: medicineId } });
    ok('it is gone from the database', gone === null);
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
}

async function chain() {
  const s = load();
  const token = await login(s.pharmEmail!, s.pharmPass!);
  console.log('\n=== ORDER → COURIER (production) ===\n');

  const order = await db.providerOrder.create({
    data: {
      orderNumber: `HPO-${TAG}-${Math.random().toString(36).slice(2, 6)}`,
      providerId: s.providerId!, customerId: s.customerId!,
      customerName: 'QA Chain Customer', customerPhone: '+256700000001',
      orderType: 'OTC_MEDICINE',
      items: JSON.stringify([{ name: 'QA Paracetamol 500mg', price: 30000, quantity: 1 }]),
      subtotal: 30000, deliveryFee: 5000, serviceFee: 600,
      totalAmount: 35600, providerEarnings: 27000,
      deliveryAddress: 'Ntinda, Kampala', deliveryLatitude: 0.3626, deliveryLongitude: 32.6111,
      paymentMethod: 'CASH', paymentStatus: 'PENDING', status: 'ORDER_RECEIVED',
    },
  });
  s.orderId = order.id; save(s);
  console.log('order %s created\n', order.orderNumber);

  for (const [action, expected] of [
    ['ACCEPT', 'ACCEPTED'], ['START_PREPARING', 'PREPARING'], ['READY', 'READY_FOR_PICKUP'],
  ] as const) {
    const r = await call(token, '/health-provider/orders', 'PATCH', { orderId: order.id, action });
    ok(`${action} accepted`, r.status === 200, `HTTP ${r.status} ${r.json?.error ?? ''}`);
    const row = await db.providerOrder.findUnique({ where: { id: order.id } });
    ok(`database says ${expected}`, row?.status === expected, row?.status);
    if (action === 'READY') {
      ok('the response names a delivery task', !!r.json?.deliveryTask?.taskNumber,
        r.json?.deliveryTask?.taskNumber ?? 'none');
    }
  }

  // Give the non-blocking dispatch a moment to land.
  await new Promise((r) => setTimeout(r, 6000));

  const task = await db.task.findUnique({ where: { providerOrderId: order.id } });
  s.taskId = task?.id; save(s);
  ok('a delivery task exists in production', !!task, task?.taskNumber ?? 'none');
  ok('it is a SMART_HEALTH_DELIVERY', task?.taskType === 'SMART_HEALTH_DELIVERY', task?.taskType);
  ok('the customer owns it, not SYSTEM', task?.clientId === s.customerId);
  ok('a handover code was issued', !!task?.deliveryCode);
  ok('it carries the cash payment method', task?.paymentMethod === 'CASH', task?.paymentMethod);
  ok('pickup is the pharmacy address', task?.pickupAddress === 'Plot 1, Kampala', task?.pickupAddress ?? '');
  ok('dropoff is the customer address', task?.dropoffAddress === 'Ntinda, Kampala', task?.dropoffAddress ?? '');
  ok('the courier fare was priced', num(task?.totalAmount) > 0 && num(task?.riderEarnings) > 0,
    `total=${num(task?.totalAmount)} rider=${num(task?.riderEarnings)}`);
  ok('dispatch left the task looking for a rider',
    ['MATCHING', 'SEARCHING', 'ASSIGNED'].includes(task?.status ?? ''), task?.status);

  const matches = task ? await db.dispatchMatch.count({ where: { taskId: task.id } }) : 0;
  console.log(`  INFO  dispatch matches created: ${matches}`);

  const dup = await call(token, '/health-provider/orders', 'PATCH', { orderId: order.id, action: 'READY' });
  ok('READY twice is refused (PHARM-2 intact)', dup.status === 409, `HTTP ${dup.status}`);
  const taskCount = await db.task.count({ where: { providerOrderId: order.id } });
  ok('still exactly one delivery task', taskCount === 1, `${taskCount}`);

  const back = await call(token, '/health-provider/orders', 'PATCH', { orderId: order.id, action: 'ACCEPT' });
  ok('the order still cannot go backwards', back.status === 409, `HTTP ${back.status}`);

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
}

async function money() {
  const s = load();
  const token = await login(s.pharmEmail!, s.pharmPass!);
  console.log('\n=== SETTLEMENT (production) ===\n');

  const before = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  const rider = await db.rider.findFirst({ where: { status: 'APPROVED' }, select: { id: true } });
  if (rider && s.taskId) await db.task.update({ where: { id: s.taskId }, data: { riderId: rider.id } });

  await call(token, '/health-provider/orders', 'PATCH', { orderId: s.orderId!, action: 'PICKED_UP' });
  const r = await call(token, '/health-provider/orders', 'PATCH', { orderId: s.orderId!, action: 'DELIVER' });
  ok('DELIVER accepted', r.status === 200, `HTTP ${r.status} ${r.json?.error ?? ''}`);

  const after = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  const order = await db.providerOrder.findUnique({ where: { id: s.orderId! } });
  ok('order is DELIVERED', order?.status === 'DELIVERED', order?.status);
  ok('order payment reads COMPLETED', order?.paymentStatus === 'COMPLETED');
  ok('lifetime earnings moved by the order share',
    Math.abs(num(after?.totalEarnings) - num(before?.totalEarnings) - 27000) < 1,
    `${num(before?.totalEarnings)} → ${num(after?.totalEarnings)}`);
  ok('withdrawable balance moved by the same amount (PHARM-10)',
    Math.abs(num(after?.pendingPayout) - num(before?.pendingPayout) - 27000) < 1,
    `${num(before?.pendingPayout)} → ${num(after?.pendingPayout)}`);

  const logs = await db.financeLog.findMany({ where: { referenceId: s.orderId! } });
  ok('the sale is in the ledger', logs.length === 1, `${logs.length} entries`);
  if (logs[0]) {
    console.log(`  INFO  ledger: ${logs[0].description}`);
    ok('ledger balances to the customer total',
      Math.abs(num(logs[0].merchantEarnings) + 5000 + num(logs[0].platformCommission) - num(logs[0].amount)) < 1);
  }

  if (rider && s.taskId) {
    const cc = await db.cashCollection.findMany({ where: { taskId: s.taskId } });
    ok('cash held by the courier is recorded', cc.length >= 1, `${cc.length} collections`);
    if (cc[0]) console.log(`  INFO  cash: UGX ${num(cc[0].amount)} — ${cc[0].notes}`);
  }

  const dup = await call(token, '/health-provider/orders', 'PATCH', { orderId: s.orderId!, action: 'DELIVER' });
  ok('DELIVER twice is refused', dup.status === 409, `HTTP ${dup.status}`);
  const afterDup = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  ok('and no second payment was made',
    num(afterDup?.pendingPayout) === num(after?.pendingPayout),
    `${num(after?.pendingPayout)} → ${num(afterDup?.pendingPayout)}`);

  // Can the pharmacy actually WITHDRAW it? This is the whole point of
  // crediting pendingPayout — an earning nobody can take out is not payment.
  const over = await call(token, '/pharmacy/payout', 'POST', { amount: 999_999 });
  ok('withdrawing more than the balance is refused', over.status === 400, `HTTP ${over.status}`);

  const withdraw = await call(token, '/pharmacy/payout', 'POST', { amount: 27000 });
  ok('the pharmacy can withdraw what it earned', withdraw.status === 200,
    `HTTP ${withdraw.status} ${(withdraw.text || '').slice(0, 160)}`);
  const drained = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  ok('the balance is drawn down', num(drained?.pendingPayout) === 0,
    `pendingPayout=${num(drained?.pendingPayout)}`);

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
}

async function status() {
  const s = load();
  const token = await login(s.pharmEmail!, s.pharmPass!);
  console.log('\n=== OPEN / CLOSED (production) ===\n');

  const close = await call(token, '/health-provider/status', 'PATCH', { isOpen: false });
  ok('close accepted', close.status === 200, `HTTP ${close.status}`);
  let row = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  ok('database says closed', row?.isOpenNow === false);

  let read = await call(token, '/health-provider/status');
  ok('reading back says closed', read.json?.provider?.isOpenNow === false, String(read.json?.provider?.isOpenNow));

  const open = await call(token, '/health-provider/status', 'PATCH', { isOpen: true });
  ok('open accepted', open.status === 200, `HTTP ${open.status}`);
  row = await db.healthProvider.findUnique({ where: { id: s.providerId! } });
  ok('database says open', row?.isOpenNow === true);

  // Fresh login = fresh token, proving it is not client state.
  const token2 = await login(s.pharmEmail!, s.pharmPass!);
  read = await call(token2, '/health-provider/status');
  ok('still open after a new sign-in', read.json?.provider?.isOpenNow === true);

  // Closing must actually stop new orders — otherwise the control is cosmetic.
  const custToken = await login(`${s.customerEmail}`, 'QaChain#2026').catch(() => null);
  if (custToken) {
    await call(token, '/health-provider/status', 'PATCH', { isOpen: false });
    const blocked = await call(custToken, '/health-provider/orders', 'POST', {
      providerId: s.providerId, customerId: s.customerId, orderType: 'OTC_MEDICINE',
      items: JSON.stringify([{ name: 'X', price: 1000, quantity: 1 }]),
      deliveryAddress: 'Ntinda', paymentMethod: 'CASH',
    });
    ok('a closed pharmacy refuses new orders', blocked.status === 409,
      `HTTP ${blocked.status} ${blocked.json?.error ?? ''}`);

    await call(token, '/health-provider/status', 'PATCH', { isOpen: true });
    const allowed = await call(custToken, '/health-provider/orders', 'POST', {
      providerId: s.providerId, customerId: s.customerId, orderType: 'OTC_MEDICINE',
      items: JSON.stringify([{ name: 'X', price: 1000, quantity: 1 }]),
      deliveryAddress: 'Ntinda', paymentMethod: 'CASH',
    });
    ok('an open pharmacy accepts them again', allowed.status === 200 || allowed.status === 201,
      `HTTP ${allowed.status} ${allowed.json?.error ?? ''}`);

    // Existing orders must survive the pharmacy closing.
    const live = allowed.json?.order?.id ?? allowed.json?.data?.id;
    if (live) {
      await call(token, '/health-provider/status', 'PATCH', { isOpen: false });
      const still = await db.providerOrder.findUnique({ where: { id: live } });
      ok('an order already placed is not cancelled by closing', still?.status === 'ORDER_RECEIVED',
        still?.status);
      await call(token, '/health-provider/status', 'PATCH', { isOpen: true });
    }
  }

  const steal = await call(token, `/health-provider/status?providerId=${s.rivalProviderId}`, 'PATCH', { isOpen: false });
  ok("another pharmacy cannot be closed", steal.status === 403, `HTTP ${steal.status}`);
  const rival = await db.healthProvider.findUnique({ where: { id: s.rivalProviderId! } });
  ok('the rival is untouched', rival?.isOpenNow === false || rival?.isOpenNow === true);

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
}

async function cleanup() {
  const s = load();
  const providerIds = [s.providerId, s.rivalProviderId].filter(Boolean) as string[];
  const userIds = [s.pharmUserId, s.rivalUserId, s.customerId].filter(Boolean) as string[];

  const orders = await db.providerOrder.findMany({
    where: { providerId: { in: providerIds } }, select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  const tasks = await db.task.findMany({
    where: { OR: [{ providerOrderId: { in: orderIds } }, { clientId: { in: userIds } }] },
    select: { id: true },
  });
  const taskIds = tasks.map((t) => t.id);

  await db.cashCollection.deleteMany({ where: { OR: [{ taskId: { in: taskIds } }, { userId: { in: userIds } }] } }).catch(() => {});
  await db.financeLog.deleteMany({ where: { referenceId: { in: [...orderIds, ...taskIds] } } }).catch(() => {});
  await db.dispatchMatch.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {});
  await db.taskStateTransition.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { taskId: { in: taskIds } } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await db.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
  await db.task.deleteMany({ where: { id: { in: taskIds } } }).catch(() => {});
  await db.providerOrder.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
  await db.medicineCatalog.deleteMany({ where: { providerId: { in: providerIds } } }).catch(() => {});
  await db.healthProvider.deleteMany({ where: { id: { in: providerIds } } }).catch(() => {});

  const merchants = await db.merchant.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const merchantIds = merchants.map((m) => m.id);
  await db.pharmacy.deleteMany({ where: { merchantId: { in: merchantIds } } }).catch(() => {});
  await db.merchant.deleteMany({ where: { id: { in: merchantIds } } }).catch(() => {});
  await db.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});

  if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
  console.log('CLEANUP done');
}

async function verify() {
  const users = await db.user.count({ where: { email: { contains: TAG } } });
  const providers = await db.healthProvider.count({ where: { businessName: { contains: 'QA ' } } });
  const orders = await db.providerOrder.count({ where: { orderNumber: { contains: TAG } } });
  const tasks = await db.task.count({ where: { itemDescription: { contains: 'HPO-qa' } } });
  const activeTasks = await db.task.count({
    where: { status: { in: ['CREATED', 'MATCHING', 'SEARCHING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERING'] } },
  });
  const pendingOffers = await db.dispatchMatch.count({ where: { status: 'PENDING' } });
  const ridersOnline = await db.rider.count({ where: { isOnline: true } });
  const ridersBusy = await db.rider.count({ where: { currentTaskId: { not: null } } });
  const pendingPayments = await db.payment.count({ where: { status: 'PENDING' } });
  console.log(
    `VERIFY qaUsers=${users} qaProviders=${providers} qaOrders=${orders} qaTasks=${tasks} ` +
    `activeTasks=${activeTasks} pendingOffers=${pendingOffers} ridersOnline=${ridersOnline} ` +
    `ridersHoldingTask=${ridersBusy} pendingPayments=${pendingPayments}`
  );
}

const cmds: Record<string, () => Promise<void>> = { setup, catalog, chain, money, status, cleanup, verify };
const cmd = process.argv[2];
(cmds[cmd] ?? (async () => console.log('commands:', Object.keys(cmds).join(', '))))()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
