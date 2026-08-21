/**
 * Client-journey driver for physical-device QA. Temporary harness.
 *
 *   bun scripts/.qa-journey.ts setup      — fresh client, check the phone driver
 *   bun scripts/.qa-journey.ts request    — client requests a ride
 *   bun scripts/.qa-journey.ts state      — authoritative state of the live task
 *   bun scripts/.qa-journey.ts client     — what the CLIENT can see via the API
 *   bun scripts/.qa-journey.ts rate       — client rates the driver
 *   bun scripts/.qa-journey.ts money      — earnings, wallet, ledger, payment
 *   bun scripts/.qa-journey.ts cleanup    — remove every fixture, verify
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import fs from 'fs';

const API = 'https://smartrideug.vercel.app/api';
const PASSWORD = 'ProbePass@2026!';
const STATE = 'C:/Users/GODWIN/AppData/Local/Temp/claude/c--Smart-Ride/799958f2-f0b4-4e0a-9c1d-f3ba52909f98/scratchpad/journey.json';

type S = { email?: string; userId?: string; token?: string; taskId?: string; taskNumber?: string };
const load = (): S => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = (s: S) => fs.writeFileSync(STATE, JSON.stringify(s, null, 1));

async function api(path: string, method: string, body?: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function phoneDriver() {
  const u = await db.user.findUnique({ where: { email: 'qa.boda@smartride.test' }, select: { id: true } });
  const r = await db.rider.findFirst({
    where: { userId: u!.id },
    select: {
      id: true, userId: true, status: true, isOnline: true, currentTaskId: true,
      lastHeartbeatAt: true, currentLatitude: true, currentLongitude: true,
      walletBalance: true, totalEarnings: true, completedTrips: true,
    },
  });
  return r!;
}

async function main() {
  const cmd = process.argv[2] ?? 'state';
  await setServiceRoleContext();
  const s = load();

  if (cmd === 'setup') {
    const r = await phoneDriver();
    // Age comes from the DATABASE clock, not this machine's. The local box runs
    // an hour ahead of the server, which made a perfectly fresh rider read as
    // an hour stale and sent me hunting a heartbeat bug that was not there.
    const [{ age_sec_db: hb }] = await db.$queryRawUnsafe<any[]>(
      'SELECT EXTRACT(EPOCH FROM (NOW() - "lastHeartbeatAt"))::int AS age_sec_db FROM "Rider" WHERE id = $1',
      r.id,
    );
    console.log(`DRIVER   ${r.status} online=${r.isOnline} currentTask=${r.currentTaskId ?? 'null'} heartbeat=${hb}s`);
    console.log(`         gps=${r.currentLatitude},${r.currentLongitude} wallet=${Number(r.walletBalance)} trips=${r.completedTrips}`);

    const email = `qa-journey-${Date.now()}@smartride.test`;
    const u = await db.user.create({
      data: {
        email, name: 'QA Journey Client',
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await hashPassword(PASSWORD), role: 'CLIENT',
      },
    });
    const login = await api('/auth/login', 'POST', { email, password: PASSWORD });
    const token = login.json?.data?.accessToken ?? login.json?.accessToken;
    if (!token) throw new Error('login failed: ' + JSON.stringify(login.json).slice(0, 200));
    save({ email, userId: u.id, token });
    console.log(`CLIENT   ${email} created, production token obtained`);
    console.log(`         client user ${u.id} !== driver user ${r.userId}  (properly separated)`);
    return;
  }

  if (cmd === 'request') {
    const r = await phoneDriver();
    const create = await api('/tasks', 'POST', {
      taskType: 'SMART_BODA_RIDE',
      pickupAddress: 'Faraday Road, Bugolobi',
      pickupLatitude: r.currentLatitude ?? 0.3176,
      pickupLongitude: r.currentLongitude ?? 32.6103,
      dropoffAddress: 'MUBS, Nakawa, Kampala',
      dropoffLatitude: 0.3299, dropoffLongitude: 32.6216,
      distanceKm: 2.1, durationMin: 9, paymentMethod: 'CASH',
    }, s.token);
    const t = create.json?.data ?? {};
    console.log(`REQUEST  HTTP ${create.status} ${t.taskNumber ?? ''} fare=${t.totalAmount ?? '?'} riderEarnings=${t.riderEarnings ?? '?'}`);
    if (!t.id) { console.log(JSON.stringify(create.json).slice(0, 300)); return; }
    save({ ...s, taskId: t.id, taskNumber: t.taskNumber });

    await new Promise(res => setTimeout(res, 6000));
    await setServiceRoleContext();
    const ms = await db.dispatchMatch.findMany({
      where: { taskId: t.id },
      select: { id: true, riderId: true, status: true, notificationSent: true, expiresAt: true },
    });
    console.log(`MATCHES  ${ms.length} — ${ms.map(m => `${m.riderId === r.id ? 'THE-PHONE' : m.riderId}:${m.status}:sent=${m.notificationSent}`).join(', ')}`);
    return;
  }

  if (cmd === 'state') {
    const t = await db.task.findUnique({
      where: { id: s.taskId! },
      select: {
        taskNumber: true, status: true, riderId: true, paymentStatus: true, paymentMethod: true,
        totalAmount: true, riderEarnings: true, assignedAt: true, acceptedAt: true,
        arrivedAtPickupAt: true, pickedUpAt: true, inProgressAt: true, completedAt: true, cancelledAt: true,
      },
    });
    console.log(`TASK     ${t?.taskNumber} status=${t?.status} rider=${t?.riderId ? 'assigned' : 'none'} payment=${t?.paymentStatus}/${t?.paymentMethod}`);
    console.log(`         amounts total=${Number(t?.totalAmount)} riderEarnings=${Number(t?.riderEarnings)}`);
    const stamps = { assignedAt: t?.assignedAt, acceptedAt: t?.acceptedAt, arrivedAtPickupAt: t?.arrivedAtPickupAt, pickedUpAt: t?.pickedUpAt, inProgressAt: t?.inProgressAt, completedAt: t?.completedAt };
    console.log(`         ` + Object.entries(stamps).filter(([, v]) => v).map(([k, v]) => `${k}=${(v as Date).toISOString().slice(11, 19)}`).join(' '));
    const tr = await db.taskStateTransition.findMany({
      where: { taskId: s.taskId! },
      select: { fromStatus: true, toStatus: true, triggeredByType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`TRANSITIONS (${tr.length}): ` + tr.map(x => `${x.fromStatus}→${x.toStatus}[${x.triggeredByType}]`).join(' '));
    const ms = await db.dispatchMatch.findMany({ where: { taskId: s.taskId! }, select: { status: true } });
    console.log(`MATCHES  ${ms.map(m => m.status).join(', ')}`);
    return;
  }

  if (cmd === 'client') {
    const g = await api(`/tasks/${s.taskId}`, 'GET', undefined, s.token);
    const d = g.json?.data ?? {};
    console.log(`CLIENT SEES  HTTP ${g.status} status=${d.status} rider=${d.rider ? (d.rider.fullName ?? 'present') : 'none'}`);
    console.log(`             allowedTransitions=${JSON.stringify(d.allowedTransitions ?? null)}`);
    if (d.rider) {
      console.log(`             driver name=${d.rider.fullName} phone=${d.rider.phone ?? '(hidden)'} rating=${d.rider.rating ?? 'n/a'}`);
    }
    const active = await api('/tasks/active', 'GET', undefined, s.token);
    console.log(`CLIENT ACTIVE HTTP ${active.status} ${active.json?.data?.taskNumber ?? active.json?.data?.id ?? '(none)'}`);
    return;
  }

  if (cmd === 'rate') {
    const r = await phoneDriver();
    const res = await api(`/tasks/${s.taskId}/rate`, 'POST', {
      rating: 5, comment: 'QA journey rating',
    }, s.token);
    console.log(`RATE     HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 200)}`);
    await setServiceRoleContext();
    const rows = await db.rating.findMany({
      where: { taskId: s.taskId! },
      select: { score: true, toRiderId: true, toUserId: true, comment: true },
    });
    console.log(`RATINGS  ${rows.length} — ${rows.map(x => `${x.score}★ toRider=${x.toRiderId ? 'yes' : 'no'} toUser=${x.toUserId ? 'yes' : 'no'}`).join(', ')}`);
    return;
  }

  if (cmd === 'money') {
    const r = await phoneDriver();
    const t = await db.task.findUnique({
      where: { id: s.taskId! },
      select: { paymentStatus: true, paymentMethod: true, riderEarnings: true, totalAmount: true },
    });
    console.log(`PAYMENT  ${t?.paymentStatus} via ${t?.paymentMethod} total=${Number(t?.totalAmount)} earnings=${Number(t?.riderEarnings)}`);
    const w = await db.wallet.findFirst({ where: { ownerId: r.userId, ownerType: 'USER' }, select: { id: true, balance: true } });
    console.log(`WALLET   Wallet.balance=${w ? Number(w.balance) : '(no row)'}  rider.walletBalance=${Number(r.walletBalance)}`);
    const fl = await db.financeLog.findFirst({ where: { referenceId: s.taskId! }, select: { riderEarnings: true, platformCommission: true, status: true } });
    console.log(`LEDGER   ${fl ? `riderEarnings=${Number(fl.riderEarnings)} commission=${Number(fl.platformCommission)} ${fl.status}` : '(no finance log)'}`);
    const cc = await db.cashCollection.findFirst({ where: { taskId: s.taskId! }, select: { amount: true, status: true, collectionType: true } });
    console.log(`CASH     ${cc ? `${cc.collectionType} ${Number(cc.amount)} ${cc.status}` : '(none)'}`);
    const wt = await db.walletTransaction.findMany({ where: { walletId: w?.id, referenceId: s.taskId! }, select: { transactionType: true, amount: true } });
    console.log(`WALLET TX ${wt.length} — ${wt.map(x => `${x.transactionType} ${Number(x.amount)}`).join(', ')}`);
    return;
  }

  if (cmd === 'cleanup') {
    const users = await db.user.findMany({ where: { email: { startsWith: 'qa-journey-' } }, select: { id: true } });
    const ids = users.map(u => u.id);
    const tasks = await db.task.findMany({ where: { clientId: { in: ids } }, select: { id: true, taskNumber: true, status: true } });
    const tids = tasks.map(t => t.id);
    console.log(`cleaning ${users.length} user(s), ${tasks.length} task(s): ${tasks.map(t => t.taskNumber + ':' + t.status).join(', ')}`);

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
    await db.notification.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: tids } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});

    const r = await phoneDriver();
    const leftUsers = await db.user.count({ where: { email: { startsWith: 'qa-journey-' } } });
    const searching = await db.task.count({ where: { status: { in: ['MATCHING', 'SEARCHING'] } } });
    const pending = await db.dispatchMatch.count({ where: { status: 'PENDING' } });
    console.log(`VERIFY   leftover users=${leftUsers} tasksSearching=${searching} pendingOffers=${pending} driverCurrentTask=${r.currentTaskId ?? 'null'}`);
    if (fs.existsSync(STATE)) fs.unlinkSync(STATE);
    return;
  }

  console.log('unknown command');
}

main().finally(async () => {
  await db.$disconnect();
});
