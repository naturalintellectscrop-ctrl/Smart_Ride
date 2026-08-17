/**
 * The routes a guard sweep could not clear, asked directly.
 *
 * A static scan for guard helpers leaves a residue: routes that reference no
 * known guard at all. Most are public by design — auth, health, the Mapbox
 * proxies, the payment callbacks. The rest are what this suite is for.
 *
 * Each candidate is driven UNAUTHENTICATED against the real handler, with real
 * fixture rows behind it, so a 200 here means a stranger reads that data. Where
 * a route also mutates, the mutation is attempted too: reading a payment is bad,
 * writing one is worse, and a sweep that only sends GET would have called
 * `payments/[id]` half-safe.
 *
 *   bun scripts/verify-unguarded-routes.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';

const TAG = 'E2E-UNGUARDED';
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

function req(url: string, init?: { method?: string; body?: unknown }) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: init?.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
}

/** Refused = the platform said no. Anything 2xx means it answered a stranger. */
function refused(status: number) {
  return status === 401 || status === 403;
}

async function bodyOf(res: Response): Promise<string> {
  try {
    return JSON.stringify(await res.json());
  } catch {
    return '';
  }
}

const made = { userIds: [] as string[], riderIds: [] as string[], paymentIds: [] as string[] };

async function main() {
  console.log('\n=== Unauthenticated probe of routes with no guard reference ===\n');

  stage('admin/finance-integrity — an admin route');

  {
    const { GET } = await import('../src/app/api/admin/finance-integrity/route');
    const res = await GET(req('/api/admin/finance-integrity'));
    const body = await bodyOf(res);
    check(
      'unauthenticated GET is refused',
      refused(res.status),
      `status ${res.status}, ${body.length} bytes returned`,
    );
  }

  stage('driver-reputation/[riderId] — read and write');

  {
    const user = await db.user.create({
      data: {
        name: `${TAG} Driver`,
        email: `${TAG.toLowerCase()}-driver@smartride.test`,
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: 'x',
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
      } as never,
    });
    made.riderIds.push(rider.id);

    // Without a reputation row the route 404s and the probe proves nothing —
    // a "not found" is not a refusal, it is the route looking the driver up on
    // a stranger's behalf and coming back empty.
    await db.driverReputation.create({
      data: { riderId: rider.id, trustScore: 82, averageRating: 4.7 } as never,
    });

    const mod = await import('../src/app/api/driver-reputation/[riderId]/route');
    const ctx = { params: Promise.resolve({ riderId: rider.id }) };

    const read = await (mod.GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
      req(`/api/driver-reputation/${rider.id}`),
      ctx,
    );
    check(
      'a stranger cannot read a named driver’s reputation',
      refused(read.status),
      `status ${read.status}`,
    );

    if (mod.PATCH) {
      const write = await (mod.PATCH as never as (r: NextRequest, c: unknown) => Promise<Response>)(
        // The route's real contract: an `adjustment`, a reason, and an
        // `adminId` taken from the body — the caller names the administrator
        // the change will be attributed to.
        req(`/api/driver-reputation/${rider.id}`, {
          method: 'PATCH',
          body: { adjustment: 15, reason: 'probe', adminId: 'nobody-in-particular' },
        }),
        ctx,
      );
      const after = await db.driverReputation.findUnique({
        where: { riderId: rider.id },
        select: { trustScore: true },
      });
      check(
        'a stranger cannot rewrite a driver’s trust score',
        refused(write.status),
        `status ${write.status}`,
      );
      check(
        'the trust score is untouched',
        after?.trustScore === 82,
        `score reads ${after?.trustScore} (seeded 82)`,
      );
    }
  }

  stage('payments/[id] — read and write');

  {
    const payer = await db.user.create({
      data: {
        name: `${TAG} Payer`,
        email: `${TAG.toLowerCase()}-payer@smartride.test`,
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: 'x',
        role: 'CLIENT',
      },
    });
    made.userIds.push(payer.id);

    const payment = await db.payment.create({
      data: {
        userId: payer.id,
        amount: 25000,
        currency: 'UGX',
        paymentMethod: 'MTN_MOMO',
        status: 'PENDING',
        paymentReference: `${TAG}-${Date.now()}`,
      } as never,
    });
    made.paymentIds.push(payment.id);

    const mod = await import('../src/app/api/payments/[id]/route');
    const ctx = { params: Promise.resolve({ id: payment.id }) };

    const read = await (mod.GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
      req(`/api/payments/${payment.id}`),
      ctx,
    );
    check(
      'a stranger cannot read someone else’s payment',
      refused(read.status),
      `status ${read.status}`,
    );

    if (mod.PUT) {
      const write = await (mod.PUT as never as (r: NextRequest, c: unknown) => Promise<Response>)(
        req(`/api/payments/${payment.id}`, { method: 'PUT', body: { status: 'COMPLETED' } }),
        ctx,
      );
      const after = await db.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });
      check(
        'a stranger cannot mark a payment COMPLETED',
        refused(write.status),
        `status ${write.status}`,
      );
      check(
        'the payment status is untouched',
        after?.status === 'PENDING',
        `column reads ${after?.status}`,
      );
    }
  }

  stage('health-orders/[id] — a patient’s order');

  {
    const mod = await import('../src/app/api/health-orders/[id]/route');
    const ctx = { params: Promise.resolve({ id: 'probe' }) };
    const read = await (mod.GET as never as (r: NextRequest, c: unknown) => Promise<Response>)(
      req('/api/health-orders/probe'),
      ctx,
    );
    // A 404 here means the id was not found, NOT that the route is guarded —
    // it reached the database on a stranger's behalf to decide that.
    check(
      'unauthenticated GET is refused before the lookup',
      refused(read.status),
      `status ${read.status}${read.status === 404 ? ' (404 = looked it up for a stranger)' : ''}`,
    );

    if (mod.PATCH) {
      const write = await (mod.PATCH as never as (r: NextRequest, c: unknown) => Promise<Response>)(
        req('/api/health-orders/probe', { method: 'PATCH', body: { status: 'DELIVERED' } }),
        ctx,
      );
      check(
        'unauthenticated PATCH is refused',
        refused(write.status),
        `status ${write.status}`,
      );
    }
  }

  stage('inventory — stock levels and reservations');

  {
    const { GET } = await import('../src/app/api/inventory/route');
    const res = await GET(req('/api/inventory'));
    check('unauthenticated inventory read is refused', refused(res.status), `status ${res.status}`);
  }

  stage('riders/nearby — live driver positions');

  {
    const { GET } = await import('../src/app/api/riders/nearby/route');
    const res = await GET(req('/api/riders/nearby?latitude=0.3476&longitude=32.5825&radius=5'));
    const body = await bodyOf(res);
    check(
      'unauthenticated live-position query is refused',
      refused(res.status),
      `status ${res.status}, ${body.length} bytes`,
    );
  }
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await db.payment.deleteMany({ where: { id: { in: made.paymentIds } } });
    await db.driverReputation.deleteMany({ where: { riderId: { in: made.riderIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
