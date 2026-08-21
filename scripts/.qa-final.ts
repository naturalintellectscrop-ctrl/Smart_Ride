/**
 * Pharmacy + delivery-personnel device fixtures. Temporary QA harness.
 *
 *   bun scripts/.qa-final.ts pharm-setup    — pharmacist account + one order
 *   bun scripts/.qa-final.ts pharm-state    — provider order state
 *   bun scripts/.qa-final.ts dp-setup       — delivery rider + client
 *   bun scripts/.qa-final.ts dp-offer       — client requests an ITEM_DELIVERY
 *   bun scripts/.qa-final.ts dp-state       — task state + transitions + proof
 *   bun scripts/.qa-final.ts dp-money       — earnings / wallet / ledger
 *   bun scripts/.qa-final.ts cleanup        — remove everything, verify
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import fs from 'fs';

const API = 'https://smartrideug.vercel.app/api';
const PASSWORD = 'ProbePass@2026!';
const STATE = 'C:/Users/GODWIN/AppData/Local/Temp/claude/c--Smart-Ride/799958f2-f0b4-4e0a-9c1d-f3ba52909f98/scratchpad/final.json';

type S = {
  pharmEmail?: string; providerId?: string; providerOrderId?: string; providerOrderNumber?: string;
  dpEmail?: string; dpRiderId?: string; dpUserId?: string;
  clientEmail?: string; clientToken?: string; clientId?: string;
  taskId?: string; taskNumber?: string;
};
const load = (): S => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s: S) => fs.writeFileSync(STATE, JSON.stringify(s, null, 1));

async function call(path: string, method: string, body?: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function mkUser(prefix: string, name: string, role: string) {
  const email = `${prefix}-${Date.now()}@smartride.test`;
  const u = await db.user.create({
    data: {
      email, name,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword(PASSWORD), role: role as never,
    },
  });
  return { user: u, email };
}

async function main() {
  const cmd = process.argv[2] ?? 'dp-state';
  await setServiceRoleContext();
  const s = load();

  if (cmd === 'pharm-setup') {
    const { user, email } = await mkUser('qa-rx', 'QA Pharmacist Two', 'PHARMACIST');
    const provider = await db.healthProvider.create({
      data: {
        userId: user.id, businessName: 'QA Pharmacy Two',
        licenseNumber: `LIC-${Date.now()}`, ownerFullName: 'QA Owner Two',
        ownerPhone: user.phone!, providerType: 'PHARMACY',
        address: 'Bugolobi, Kampala', verificationStatus: 'APPROVED',
      } as never,
    });
    const { user: cust } = await mkUser('qa-rxcust', 'QA Rx Customer', 'CLIENT');
    const o = await db.providerOrder.create({
      data: {
        orderNumber: `QA-RX-${Date.now()}`,
        customerId: cust.id, providerId: provider.id,
        orderType: 'PRESCRIPTION_MEDICINE',
        items: JSON.stringify([{ name: 'Amoxicillin 500mg', qty: 1, price: 12000 }]),
        status: 'ORDER_RECEIVED',
        subtotal: 12000, deliveryFee: 3000, totalAmount: 15000,
        providerEarnings: 10000, deliveryAddress: 'MUBS, Nakawa',
      } as never,
    });
    save({ ...s, pharmEmail: email, providerId: provider.id, providerOrderId: o.id, providerOrderNumber: o.orderNumber });
    console.log(`PHARMACIST ${email} / ${PASSWORD}`);
    console.log(`           QA Pharmacy Two (APPROVED) — order ${o.orderNumber} ${o.status} UGX ${Number(o.totalAmount)}`);
    return;
  }

  if (cmd === 'pharm-state') {
    const o = await db.providerOrder.findUnique({
      where: { id: s.providerOrderId! },
      select: { orderNumber: true, status: true, acceptedAt: true, preparingAt: true, readyAt: true, prescriptionVerified: true, totalAmount: true },
    });
    console.log(`PROVIDER ORDER ${o?.orderNumber} status=${o?.status} rxVerified=${o?.prescriptionVerified} total=${Number(o?.totalAmount)}`);
    const st = { acceptedAt: o?.acceptedAt, preparingAt: o?.preparingAt, readyAt: o?.readyAt };
    console.log('  ' + Object.entries(st).filter(([, v]) => v).map(([k, v]) => `${k}=${(v as Date).toISOString().slice(11, 19)}`).join(' '));
    // Prove the pharmacist's list and their action operate on the same row.
    const hoCount = await db.healthOrder.count().catch(() => -1);
    console.log(`  (HealthOrder table rows platform-wide: ${hoCount} — a different table entirely)`);
    return;
  }

  if (cmd === 'dp-setup') {
    const { user: dpUser, email: dpEmail } = await mkUser('qa-dp', 'QA Courier', 'RIDER');
    const rider = await db.rider.create({
      data: {
        userId: dpUser.id, fullName: 'QA Courier', phone: dpUser.phone!,
        riderRole: 'DELIVERY_PERSONNEL', status: 'APPROVED',
        physicalAddress: 'Bugolobi, Kampala',
        isOnline: false, currentLatitude: 0.3165, currentLongitude: 32.6211,
      } as never,
    });
    const { user: client, email: clientEmail } = await mkUser('qa-dpclient', 'QA Delivery Client', 'CLIENT');
    const login = await call('/auth/login', 'POST', { email: clientEmail, password: PASSWORD });
    const clientToken = login.json?.data?.accessToken ?? login.json?.accessToken;
    if (!clientToken) throw new Error('client login failed: ' + JSON.stringify(login.json).slice(0, 160));
    save({ ...s, dpEmail, dpRiderId: rider.id, dpUserId: dpUser.id, clientEmail, clientToken, clientId: client.id });
    console.log(`COURIER  ${dpEmail} / ${PASSWORD}`);
    console.log(`         rider ${rider.id} DELIVERY_PERSONNEL APPROVED`);
    console.log(`CLIENT   ${clientEmail} (token obtained)`);
    return;
  }

  if (cmd === 'dp-offer') {
    const r = await db.rider.findUnique({
      where: { id: s.dpRiderId! },
      select: { currentLatitude: true, currentLongitude: true, isOnline: true, currentTaskId: true },
    });
    const [{ age_sec_db: hb }] = await db.$queryRawUnsafe<any[]>(
      'SELECT EXTRACT(EPOCH FROM (NOW() - "lastHeartbeatAt"))::int AS age_sec_db FROM "Rider" WHERE id = $1', s.dpRiderId!,
    );
    console.log(`COURIER  online=${r?.isOnline} heartbeat=${hb}s currentTask=${r?.currentTaskId ?? 'null'}`);
    const create = await call('/tasks', 'POST', {
      taskType: 'ITEM_DELIVERY',
      pickupAddress: 'Faraday Road, Bugolobi',
      pickupLatitude: r?.currentLatitude ?? 0.3165,
      pickupLongitude: r?.currentLongitude ?? 32.6211,
      dropoffAddress: 'MUBS, Nakawa, Kampala',
      dropoffLatitude: 0.3299, dropoffLongitude: 32.6216,
      distanceKm: 2.1, durationMin: 9, paymentMethod: 'CASH',
    }, s.clientToken);
    const t = create.json?.data ?? {};
    console.log(`TASK     HTTP ${create.status} ${t.taskNumber ?? ''} fare=${t.totalAmount ?? '?'} riderEarnings=${t.riderEarnings ?? '?'}`);
    if (!t.id) { console.log(JSON.stringify(create.json).slice(0, 300)); return; }
    save({ ...s, taskId: t.id, taskNumber: t.taskNumber });
    await new Promise(res => setTimeout(res, 6000));
    await setServiceRoleContext();
    const ms = await db.dispatchMatch.findMany({ where: { taskId: t.id }, select: { riderId: true, status: true, notificationSent: true } });
    console.log(`MATCHES  ${ms.length} — ${ms.map(m => `${m.riderId === s.dpRiderId ? 'THE-PHONE' : 'other'}:${m.status}:sent=${m.notificationSent}`).join(', ')}`);
    return;
  }

  if (cmd === 'dp-state') {
    const t = await db.task.findUnique({
      where: { id: s.taskId! },
      select: {
        taskNumber: true, status: true, riderId: true, paymentStatus: true, paymentMethod: true,
        totalAmount: true, riderEarnings: true, proofOfDeliveryUrl: true, proofCapturedAt: true,
        recipientName: true, deliveryNotes: true, completedAt: true,
      },
    });
    console.log(`TASK   ${t?.taskNumber} status=${t?.status} rider=${t?.riderId ? 'assigned' : 'none'} payment=${t?.paymentStatus}/${t?.paymentMethod}`);
    console.log(`       total=${Number(t?.totalAmount)} riderEarnings=${Number(t?.riderEarnings)}`);
    console.log(`PROOF  url=${t?.proofOfDeliveryUrl ? 'PRESENT' : 'none'} capturedAt=${t?.proofCapturedAt ? t.proofCapturedAt.toISOString().slice(11, 19) : 'none'} recipient=${t?.recipientName ?? 'none'}`);
    const tr = await db.taskStateTransition.findMany({
      where: { taskId: s.taskId! }, select: { fromStatus: true, toStatus: true, triggeredByType: true }, orderBy: { createdAt: 'asc' },
    });
    console.log(`TRANSITIONS (${tr.length}): ` + tr.map(x => `${x.fromStatus}→${x.toStatus}[${x.triggeredByType}]`).join(' '));
    const g = await call(`/tasks/${s.taskId}`, 'GET', undefined, s.clientToken);
    console.log(`CLIENT SEES status=${g.json?.data?.status} allowedTransitions=${JSON.stringify(g.json?.data?.allowedTransitions ?? null)}`);
    return;
  }

  if (cmd === 'dp-money') {
    const r = await db.rider.findUnique({ where: { id: s.dpRiderId! }, select: { userId: true, walletBalance: true, totalEarnings: true, completedTrips: true, currentTaskId: true } });
    const t = await db.task.findUnique({ where: { id: s.taskId! }, select: { paymentStatus: true, paymentMethod: true, riderEarnings: true, totalAmount: true } });
    console.log(`PAYMENT ${t?.paymentStatus} via ${t?.paymentMethod} total=${Number(t?.totalAmount)} earnings=${Number(t?.riderEarnings)}`);
    const w = await db.wallet.findFirst({ where: { ownerId: r!.userId, ownerType: 'USER' }, select: { id: true, balance: true } });
    console.log(`WALLET  Wallet.balance=${w ? Number(w.balance) : '(no row)'} rider.walletBalance=${Number(r?.walletBalance)} trips=${r?.completedTrips} currentTask=${r?.currentTaskId ?? 'null'}`);
    const fl = await db.financeLog.findMany({ where: { referenceId: s.taskId! }, select: { riderEarnings: true, platformCommission: true, status: true } });
    console.log(`LEDGER  ${fl.length} row(s) — ${fl.map(x => `earnings=${Number(x.riderEarnings)} commission=${Number(x.platformCommission)} ${x.status}`).join(' | ') || '(none)'}`);
    const wt = await db.walletTransaction.findMany({ where: { walletId: w?.id, referenceId: s.taskId! }, select: { transactionType: true, amount: true } });
    console.log(`WALLETTX ${wt.length} — ${wt.map(x => `${x.transactionType} ${Number(x.amount)}`).join(', ') || '(none)'}`);
    const cc = await db.cashCollection.findMany({ where: { taskId: s.taskId! }, select: { amount: true, status: true } });
    console.log(`CASH    ${cc.length} — ${cc.map(x => `${Number(x.amount)} ${x.status}`).join(', ') || '(none)'}`);
    return;
  }

  if (cmd === 'cleanup') {
    const users = await db.user.findMany({
      where: { OR: [
        { email: { startsWith: 'qa-rx' } }, { email: { startsWith: 'qa-rxcust' } },
        { email: { startsWith: 'qa-dp' } }, { email: { startsWith: 'qa-dpclient' } },
      ] }, select: { id: true },
    });
    const ids = users.map(u => u.id);
    const riders = await db.rider.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const rids = riders.map(r => r.id);
    const providers = await db.healthProvider.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const tasks = await db.task.findMany({
      where: { OR: [{ clientId: { in: ids } }, { riderId: { in: rids } }] },
      select: { id: true, taskNumber: true, status: true },
    });
    const tids = tasks.map(t => t.id);
    const pos = await db.providerOrder.findMany({ where: { OR: [{ customerId: { in: ids } }, { providerId: { in: providers.map(p => p.id) } }] }, select: { id: true, orderNumber: true, status: true } });
    console.log(`cleaning ${users.length} user(s), ${tasks.length} task(s), ${pos.length} provider order(s)`);
    console.log(`  tasks: ${tasks.map(t => t.taskNumber + ':' + t.status).join(', ') || '(none)'}`);
    console.log(`  orders: ${pos.map(o => o.orderNumber + ':' + o.status).join(', ') || '(none)'}`);

    const wallets = await db.wallet.findMany({ where: { ownerId: { in: ids } }, select: { id: true } });
    await db.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map(w => w.id) } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: ids } } }).catch(() => {});
    await db.rating.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.payment.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { referenceId: { in: tids } } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.transaction.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: tids } } }).catch(() => {});
    await db.heartbeatLog.deleteMany({ where: { riderId: { in: rids } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.expoPushToken.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.providerOrder.deleteMany({ where: { id: { in: pos.map(o => o.id) } } }).catch(() => {});
    await db.healthProvider.deleteMany({ where: { id: { in: providers.map(p => p.id) } } }).catch(() => {});
    await db.rider.updateMany({ where: { id: { in: rids } }, data: { currentTaskId: null } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: tids } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: rids } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});

    const left = await db.user.count({ where: { OR: [{ email: { startsWith: 'qa-' } }, { email: { contains: 'e2e-' } }] } });
    const active = await db.task.count({ where: { status: { in: ['MATCHING','SEARCHING','ASSIGNED','ACCEPTED','ARRIVING','ARRIVED','PICKED_UP','IN_PROGRESS','IN_TRANSIT','DELIVERING'] } } });
    const pending = await db.dispatchMatch.count({ where: { status: 'PENDING' } });
    const online = await db.rider.count({ where: { isOnline: true } });
    const busy = await db.rider.count({ where: { currentTaskId: { not: null } } });
    const pay = await db.payment.count({ where: { status: 'PENDING' } });
    console.log(`VERIFY users=${left} activeTasks=${active} pendingOffers=${pending} ridersOnline=${online} ridersHoldingTask=${busy} pendingPayments=${pay}`);
    if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
    return;
  }

  console.log('unknown command');
}

main().finally(async () => {
  await db.$disconnect();
});
