/**
 * Can an ordinary user make themselves an administrator?
 *
 * `PUT /api/user/profile` accepted `role` straight from the request body. The
 * `UserRole` enum contains ADMIN, SUPER_ADMIN, OPERATIONS_ADMIN,
 * COMPLIANCE_ADMIN and FINANCE_ADMIN, every admin guard reads the role out of
 * the JWT, and login mints that JWT from the same column. So the whole chain
 * was: write your own role, log in again, hold an admin token.
 *
 * This suite drives the REAL handlers with REAL signed tokens — it never writes
 * the role column directly, because doing so would prove nothing about who is
 * authorized to write it.
 *
 * It asserts both directions. A whitelist that stops escalation but also breaks
 * the role chooser at signup is not a fix, so the legitimate self-service change
 * is checked too.
 *
 *   bun scripts/verify-privilege-escalation.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';
import { PUT as updateProfile } from '../src/app/api/user/profile/route';
import { GET as fraudDashboard } from '../src/app/api/fraud/dashboard/route';

const TAG = 'E2E-ESCALATION';
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

function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id,
    email: u.email ?? '',
    role: u.role as never,
    name: u.name ?? '',
  } as never);
}

function req(url: string, init?: { method?: string; token?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
}

const made = { userIds: [] as string[] };

async function main() {
  console.log('\n=== Privilege escalation via profile update ===\n');

  const email = `${TAG.toLowerCase()}-probe@smartride.test`;
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: {
      name: `${TAG} Probe`,
      email,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(user.id);

  stage('Baseline — an ordinary client');

  const clientToken = tokenFor(user);
  const before = await fraudDashboard(req('/api/fraud/dashboard', { token: clientToken }));
  check(
    'client token is refused by the fraud dashboard',
    before.status === 401 || before.status === 403,
    `status ${before.status}`,
  );

  stage('The escalation attempt');

  for (const role of ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN']) {
    const res = await updateProfile(
      req('/api/user/profile', { method: 'PUT', token: clientToken, body: { role } }),
    );
    const row = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
    check(
      `PUT role=${role} is refused`,
      res.status === 403,
      `status ${res.status}`,
    );
    check(
      `the stored role is still CLIENT after trying ${role}`,
      row?.role === 'CLIENT',
      `column reads ${row?.role}`,
    );
  }

  stage('The token that a fresh login would mint');

  // The escalation only pays off if the NEW role reaches a new token. Re-read
  // the column and sign what login would sign, then present it to an admin
  // route. If the column never changed, this is still a client token.
  const after = await db.user.findUnique({ where: { id: user.id } });
  const refreshed = tokenFor(after!);
  const post = await fraudDashboard(req('/api/fraud/dashboard', { token: refreshed }));
  check(
    'a re-issued token still cannot reach the fraud dashboard',
    post.status === 401 || post.status === 403,
    `status ${post.status}`,
  );

  stage('The legitimate change still works');

  // A whitelist that also breaks the role chooser is not a fix.
  const ok = await updateProfile(
    req('/api/user/profile', { method: 'PUT', token: clientToken, body: { role: 'RIDER' } }),
  );
  const nowRider = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  check('a client may still become a RIDER', ok.status === 200, `status ${ok.status}`);
  check('the stored role changed to RIDER', nowRider?.role === 'RIDER', `column reads ${nowRider?.role}`);

  // And the escape hatch the rider onboarding screen uses.
  const riderToken = tokenFor({ ...user, role: 'RIDER' });
  const back = await updateProfile(
    req('/api/user/profile', { method: 'PUT', token: riderToken, body: { role: 'CLIENT' } }),
  );
  check('a rider may still switch back to CLIENT', back.status === 200, `status ${back.status}`);

  stage('An admin cannot be demoted through a profile edit');

  await db.user.update({ where: { id: user.id }, data: { role: 'OPERATIONS_ADMIN' } });
  const adminToken = tokenFor({ ...user, role: 'OPERATIONS_ADMIN' });
  const demote = await updateProfile(
    req('/api/user/profile', { method: 'PUT', token: adminToken, body: { role: 'CLIENT' } }),
  );
  const stillAdmin = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  check('self-demotion out of an admin role is refused', demote.status === 403, `status ${demote.status}`);
  check('the admin role is intact', stillAdmin?.role === 'OPERATIONS_ADMIN', `column reads ${stillAdmin?.role}`);

  stage('Non-role profile fields are unaffected');

  const rename = await updateProfile(
    req('/api/user/profile', { method: 'PUT', token: adminToken, body: { name: `${TAG} Renamed` } }),
  );
  check('an ordinary profile edit still succeeds', rename.status === 200, `status ${rename.status}`);
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
