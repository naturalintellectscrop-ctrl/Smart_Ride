/**
 * Verifies that Driver Reputation actually governs dispatch.
 *
 * Asserts the three behaviours that make reputation more than cosmetic:
 *   1. A high-trust driver outranks a low-trust driver at equal distance.
 *   2. A suspended driver is excluded from dispatch entirely.
 *   3. An expired suspension makes the driver dispatchable again.
 *
 * Calls the real DispatchService.scoreRiders via its module, so this exercises
 * the shipped ranking code, not a copy of it.
 *
 *   bun scripts/verify-dispatch-reputation.ts
 */

import { db } from '../src/lib/db';
import { DispatchService } from '../src/lib/services/dispatch-persistence.service';

const TAG = 'VERIFY-DISPATCH';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}

// scoreRiders is private; reach it through the class object. Verifying the
// real implementation matters more than respecting TS visibility here.
const scoreRiders = (
  DispatchService as unknown as {
    scoreRiders: (
      riders: unknown[],
      lat: number,
      lng: number
    ) => Promise<{ rider: { id: string }; score: number }[]>;
  }
).scoreRiders.bind(DispatchService);

async function makeRider(label: string, trust: number, opts: {
  priority?: boolean;
  suspended?: boolean;
  suspensionEndsAt?: Date | null;
} = {}) {
  const user = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label}-${Date.now()}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'RIDER',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} ${label}`,
      phone: user.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      isOnline: true,
      rating: 5,
      completedTrips: 100,
      // Identical coordinates so distance cannot explain any ranking gap.
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
    },
  });
  await db.driverReputation.create({
    data: {
      riderId: rider.id,
      trustScore: trust,
      priorityDispatch: opts.priority ?? false,
      isSuspended: opts.suspended ?? false,
      suspendedAt: opts.suspended ? new Date() : null,
      suspensionEndsAt: opts.suspensionEndsAt ?? null,
    },
  });
  return { user, rider };
}

async function main() {
  console.log('\n=== Dispatch × Reputation Verification ===\n');
  const made: { user: { id: string }; rider: { id: string } }[] = [];

  try {
    const high = await makeRider('HighTrust', 95, { priority: true });
    const low = await makeRider('LowTrust', 40);
    const suspended = await makeRider('Suspended', 90, {
      suspended: true,
      suspensionEndsAt: new Date(Date.now() + 7 * 24 * 3600e3),
    });
    const lapsed = await makeRider('LapsedSuspension', 88, {
      suspended: true,
      suspensionEndsAt: new Date(Date.now() - 24 * 3600e3), // ended yesterday
    });
    made.push(high, low, suspended, lapsed);

    const candidates = [low, high, suspended, lapsed].map((m) => ({
      id: m.rider.id,
      rating: 5,
      completedTrips: 100,
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
    }));

    const ranked = await scoreRiders(candidates, 0.3476, 32.5825);
    const ids = ranked.map((r) => r.rider.id);
    const scoreOf = (id: string) => ranked.find((r) => r.rider.id === id)?.score ?? -1;

    check(
      'high-trust driver outranks low-trust at equal distance',
      ids[0] === high.rider.id,
      `winner score=${scoreOf(high.rider.id).toFixed(1)} vs low-trust ${scoreOf(low.rider.id).toFixed(1)}`
    );

    check(
      'suspended driver excluded from dispatch',
      !ids.includes(suspended.rider.id),
      `pool=${ids.length} (suspended driver ${ids.includes(suspended.rider.id) ? 'PRESENT' : 'absent'})`
    );

    check(
      'expired suspension is dispatchable again',
      ids.includes(lapsed.rider.id),
      `lapsed driver ${ids.includes(lapsed.rider.id) ? 'included' : 'MISSING'} score=${scoreOf(lapsed.rider.id).toFixed(1)}`
    );

    check(
      'ranking is strictly ordered by score',
      ranked.every((r, i) => i === 0 || ranked[i - 1].score >= r.score),
      ranked.map((r) => r.score.toFixed(1)).join(' >= ')
    );

    // An all-suspended pool must return empty rather than throw.
    const allSuspended = await scoreRiders(
      [{ id: suspended.rider.id, rating: 5, completedTrips: 100, currentLatitude: 0.3476, currentLongitude: 32.5825 }],
      0.3476,
      32.5825
    );
    check(
      'all-suspended pool yields empty ranking (no crash)',
      allSuspended.length === 0,
      `returned ${allSuspended.length} candidates`
    );
  } finally {
    for (const m of made) {
      await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: m.rider.id } } });
      await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: m.rider.id } } });
      await db.driverReputation.deleteMany({ where: { riderId: m.rider.id } });
      await db.rider.deleteMany({ where: { id: m.rider.id } });
      await db.user.deleteMany({ where: { id: m.user.id } });
    }
    console.log('\n  cleanup complete');
  }

  console.log(failures === 0 ? '\n=== ALL CHECKS PASSED ===\n' : `\n=== ${failures} CHECK(S) FAILED ===\n`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('VERIFICATION ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});
