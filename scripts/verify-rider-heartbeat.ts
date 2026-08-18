/**
 * Can a driver who is standing still stay eligible for work?
 *
 * Dispatch only offers to riders whose lastHeartbeatAt is within 90s. The
 * driver app forwards `location.coords` straight into the heartbeat, and
 * Android reports `heading: null` and `speed: null` whenever the device is not
 * moving — so a rider parked at a stage sent null telemetry, the schema
 * rejected it with 400, and the caller's `.catch(() => {})` threw the failure
 * away. The rider went stale and vanished from the eligible pool while their
 * app still said ONLINE.
 *
 * This drives the real route handler with the exact payloads the device
 * produces, stationary and moving, and checks the database moved.
 *
 *   bun scripts/verify-rider-heartbeat.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';
import { CapabilityService } from '../src/lib/services/capability.service';

const TAG = 'E2E-HEARTBEAT';
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

const made = { userIds: [] as string[], riderIds: [] as string[] };

async function beat(token: string, payload: Record<string, unknown>) {
  const { POST } = await import('../src/app/api/rider/heartbeat/route');
  const req = new NextRequest(new URL('/api/rider/heartbeat', 'http://localhost'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  } as never);
  const res = await (POST as never as (r: NextRequest) => Promise<Response>)(req);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('\n=== A stationary driver must stay dispatchable ===\n');
  await setServiceRoleContext();

  stage('Fixtures');

  const user = await db.user.create({
    data: {
      name: `${TAG} Driver`,
      email: `${TAG.toLowerCase()}-${Date.now()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'RIDER',
    },
  });
  made.userIds.push(user.id);

  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} Driver`,
      phone: user.phone!,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      currentLatitude: 0.3176,
      currentLongitude: 32.6103,
      // Deliberately stale: this is a rider who has been parked a while.
      lastHeartbeatAt: new Date(Date.now() - 60 * 60 * 1000),
    } as never,
  });
  made.riderIds.push(rider.id);

  const token = generateAccessToken({
    id: user.id,
    email: user.email ?? '',
    role: 'RIDER' as never,
    name: user.name ?? '',
  } as never);

  await setServiceRoleContext();
  const pool0 = await CapabilityService.getEligibleRiders('SMART_BODA_RIDE', {
    latitude: 0.3176,
    longitude: 32.6103,
    radiusKm: 10,
    limit: 20,
  });
  check(
    'a stale rider starts OUT of the dispatch pool',
    !pool0.some(r => r.id === rider.id),
    'absent, as the 90s staleness rule intends',
  );

  stage('The payload a STATIONARY device actually sends');

  // Exactly what expo-location gives on a phone that is not moving, forwarded
  // verbatim by the driver app.
  const stationary = await beat(token, {
    latitude: 0.3176,
    longitude: 32.6103,
    heading: null,
    speed: null,
  });
  check(
    'null heading and speed are accepted',
    stationary.status === 200,
    `HTTP ${stationary.status} ${stationary.status !== 200 ? JSON.stringify(stationary.json).slice(0, 90) : ''}`,
  );

  await setServiceRoleContext();
  const afterStationary = await db.rider.findUnique({
    where: { id: rider.id },
    select: { lastHeartbeatAt: true, isOnline: true },
  });
  const freshSecs = afterStationary?.lastHeartbeatAt
    ? Math.round((Date.now() - afterStationary.lastHeartbeatAt.getTime()) / 1000)
    : null;
  check(
    'the heartbeat actually landed in the database',
    freshSecs !== null && freshSecs < 30,
    `lastHeartbeatAt is ${freshSecs}s old`,
  );

  stage('And the rider becomes dispatchable again');

  const pool1 = await CapabilityService.getEligibleRiders('SMART_BODA_RIDE', {
    latitude: 0.3176,
    longitude: 32.6103,
    radiusKm: 10,
    limit: 20,
  });
  check(
    'a parked driver is back IN the dispatch pool',
    pool1.some(r => r.id === rider.id),
    pool1.some(r => r.id === rider.id) ? 'present' : 'STILL ABSENT — would receive no work',
  );

  stage('The other shapes the app sends');

  const moving = await beat(token, {
    latitude: 0.3177,
    longitude: 32.6104,
    heading: 271.5,
    speed: 8.3,
  });
  check('a moving device (real heading and speed) is accepted', moving.status === 200, `HTTP ${moving.status}`);

  const minimal = await beat(token, { latitude: 0.3176, longitude: 32.6103 });
  check('the keep-alive timer payload (position only) is accepted', minimal.status === 200, `HTTP ${minimal.status}`);

  const fullNulls = await beat(token, {
    latitude: 0.3176,
    longitude: 32.6103,
    heading: null,
    speed: null,
    accuracy: null,
    battery_level: null,
    task_id: null,
  });
  check(
    'every optional telemetry field may be null',
    fullNulls.status === 200,
    `HTTP ${fullNulls.status} ${fullNulls.status !== 200 ? JSON.stringify(fullNulls.json).slice(0, 90) : ''}`,
  );

  stage('Position is still mandatory');

  const noPos = await beat(token, { heading: null, speed: null });
  check(
    'a heartbeat without a position is still refused',
    noPos.status === 400,
    `HTTP ${noPos.status}`,
  );

  const badPos = await beat(token, { latitude: 999, longitude: 32.6103 });
  check(
    'an out-of-range latitude is still refused',
    badPos.status === 400,
    `HTTP ${badPos.status}`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.heartbeatLog.deleteMany({ where: { riderId: { in: made.riderIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
