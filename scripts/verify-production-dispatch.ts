/**
 * Does the DEPLOYED backend refuse the double-accept?
 *
 * verify-offer-lifecycle.ts proves the guard against local code. That says
 * nothing about what the phone is talking to. This drives the real production
 * API over HTTP with real production tokens, then reads the production database
 * to confirm the authoritative state — because an API that returns the right
 * JSON while writing the wrong rows is the failure mode worth catching.
 *
 * Fixtures are disposable QA rows created and removed by this script. It does
 * not touch any pre-existing production record.
 *
 *   bun scripts/verify-production-dispatch.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { DispatchMatchStatus, TaskStatus } from '@prisma/client';

const API = process.env.QA_API_BASE || 'https://smartrideug.vercel.app/api';
const TAG = 'E2E-PRODDISP';
const PASSWORD = 'ProbePass@2026!';

let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail: string) {
  checks++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

/**
 * Production tokens must come from production. A locally minted JWT is signed
 * with a different secret and is rejected outright.
 */
async function registerAndLogin(email: string, name: string, role: string, phone: string) {
  await post('/auth/register', { email, password: PASSWORD, name, phone, role });
  const login = await post('/auth/login', { email, password: PASSWORD });
  const token = login.json?.data?.accessToken ?? login.json?.accessToken;
  if (!token) throw new Error(`login failed for ${email}: ${JSON.stringify(login.json)?.slice(0, 200)}`);
  return token as string;
}

async function main() {
  console.log(`\n=== Deployed dispatch guard — ${API} ===\n`);

  stage('Fixtures on the production database');

  const stamp = Date.now();
  const driverEmail = `${TAG.toLowerCase()}-driver-${stamp}@smartride.test`;
  const clientEmail = `${TAG.toLowerCase()}-client-${stamp}@smartride.test`;

  const driverToken = await registerAndLogin(
    driverEmail,
    `${TAG} Driver`,
    'RIDER',
    `07${Math.floor(10000000 + Math.random() * 89999999)}`,
  );
  await registerAndLogin(
    clientEmail,
    `${TAG} Client`,
    'CLIENT',
    `07${Math.floor(10000000 + Math.random() * 89999999)}`,
  );
  console.log('  registered and logged in against production');

  await setServiceRoleContext();
  const driverUser = await db.user.findUnique({ where: { email: driverEmail }, select: { id: true } });
  const clientUser = await db.user.findUnique({ where: { email: clientEmail }, select: { id: true } });
  made.userIds.push(driverUser!.id, clientUser!.id);

  // An APPROVED, online, heartbeating rider — the only reason dispatch could
  // exclude them must be an active task.
  const rider = await db.rider.create({
    data: {
      userId: driverUser!.id,
      fullName: `${TAG} Driver`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      lastHeartbeatAt: new Date(),
      currentLatitude: 0.3176,
      currentLongitude: 32.6103,
    } as never,
  });
  made.riderIds.push(rider.id);

  async function makeTask(n: number) {
    const t = await db.task.create({
      data: {
        taskNumber: `${TAG}-${n}-${stamp}`,
        taskType: 'SMART_BODA_RIDE',
        status: TaskStatus.SEARCHING,
        clientId: clientUser!.id,
        pickupAddress: 'Faraday Road, Kampala',
        pickupLatitude: 0.3176,
        pickupLongitude: 32.6103,
        dropoffAddress: 'MUBS, Nakawa',
        dropoffLatitude: 0.3299,
        dropoffLongitude: 32.6216,
        baseFare: 3000,
        totalAmount: 3000,
        riderEarnings: 2550,
        paymentMethod: 'CASH',
        matchingStartedAt: new Date(),
      } as never,
    });
    made.taskIds.push(t.id);
    return t;
  }

  const taskA = await makeTask(1);
  const taskB = await makeTask(2);

  const expiresAt = new Date(Date.now() + 300_000);
  const matchA = await db.dispatchMatch.create({
    data: { taskId: taskA.id, riderId: rider.id, matchScore: 90, distanceKm: 0.2, estimatedArrival: 60, matchReason: 'NEAREST', status: DispatchMatchStatus.PENDING, expiresAt },
  });
  const matchB = await db.dispatchMatch.create({
    data: { taskId: taskB.id, riderId: rider.id, matchScore: 90, distanceKm: 0.2, estimatedArrival: 60, matchReason: 'NEAREST', status: DispatchMatchStatus.PENDING, expiresAt },
  });
  console.log(`  two PENDING offers created for one driver`);

  // ─────────── The double accept, over the wire ───────────
  stage('Two accepts, near-simultaneous, against the deployed API');

  const [ra, rb] = await Promise.all([
    post(`/dispatch/${matchA.id}/accept`, { riderId: rider.id }, driverToken),
    post(`/dispatch/${matchB.id}/accept`, { riderId: rider.id }, driverToken),
  ]);

  const accepted = [ra, rb].filter(r => r.json?.success === true);
  const refused = [ra, rb].filter(r => r.json?.success !== true);

  check(
    'the deployed API accepts exactly one of the two offers',
    accepted.length === 1,
    `A=${ra.status}/${ra.json?.success} B=${rb.status}/${rb.json?.success}`,
  );
  check(
    'the refusal names the reason rather than a generic 500',
    refused.length === 1 && /active task/i.test(String(refused[0]?.json?.error ?? '')),
    `→ ${refused[0]?.json?.error ?? '(none)'}`,
  );

  // ─────────── The database is the authority, not the response ───────────
  stage('Authoritative state in the production database');

  await setServiceRoleContext();
  const heldTasks = await db.task.findMany({
    where: {
      riderId: rider.id,
      status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.PICKED_UP, TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.DELIVERING] },
    },
    select: { taskNumber: true, status: true },
  });
  check(
    'the driver holds exactly one active task in production',
    heldTasks.length === 1,
    `${heldTasks.length} held: ${heldTasks.map(t => `${t.taskNumber}:${t.status}`).join(', ') || 'none'}`,
  );

  const rows = await db.dispatchMatch.findMany({
    where: { id: { in: [matchA.id, matchB.id] } },
    select: { id: true, status: true, taskId: true },
  });
  const acceptedRow = rows.find(r => r.status === DispatchMatchStatus.ACCEPTED);
  const otherRow = rows.find(r => r.status !== DispatchMatchStatus.ACCEPTED);
  check(
    'one match ACCEPTED, the other rolled back to PENDING',
    !!acceptedRow && otherRow?.status === DispatchMatchStatus.PENDING,
    `statuses: ${rows.map(r => r.status).join(' + ')}`,
  );

  const orphan = await db.task.findUnique({
    where: { id: otherRow!.taskId },
    select: { status: true, riderId: true },
  });
  check(
    'the refused task was left unassigned and still dispatchable',
    orphan?.riderId === null && (orphan?.status === TaskStatus.SEARCHING || orphan?.status === TaskStatus.MATCHING),
    `task ${orphan?.status} riderId=${orphan?.riderId ? 'SET' : 'null'}`,
  );

  const riderRow = await db.rider.findUnique({
    where: { id: rider.id },
    select: { currentTaskId: true },
  });
  check(
    'currentTaskId names the one task actually won',
    !!riderRow?.currentTaskId && riderRow.currentTaskId === acceptedRow!.taskId,
    `currentTaskId ${riderRow?.currentTaskId ? 'points at the accepted task' : 'null'}`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.expoPushToken.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.rider.updateMany({ where: { id: { in: made.riderIds } }, data: { currentTaskId: null } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed against ${API} ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
