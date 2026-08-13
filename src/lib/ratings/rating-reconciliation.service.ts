/**
 * SMART RIDE — RATING RECONCILIATION (BE-013)
 *
 * Three stores held the same number and nothing reconciled them:
 *
 *   1. `Rating` rows              — one per rater per task
 *   2. `Rider.rating`             — a single Float, default 5.0
 *   3. `DriverReputation.averageRating` + five star-bucket counters
 *
 * Two of the three default to 5, so an unrated driver was indistinguishable
 * from a flawless one, and any of the three could drift from the others
 * without anything noticing.
 *
 * The resolution is not to delete the caches — dispatch ranking and rider
 * lists read them on every request and cannot aggregate ratings inline — but
 * to make them provably DERIVED. `Rating` rows are the source of truth. This
 * module is the only thing that writes the other two, and it always computes
 * them from the rows.
 *
 * `reconcileAll()` is idempotent and safe to run on a schedule: it recomputes
 * from facts, so running it twice changes nothing the first run did not
 * already settle.
 */

import { db } from '@/lib/db';

/** What a rating cache should hold, computed from the Rating rows. */
export interface DerivedRating {
  average: number | null;
  count: number;
  buckets: {
    fiveStarRatings: number;
    fourStarRatings: number;
    threeStarRatings: number;
    twoStarRatings: number;
    oneStarRatings: number;
  };
}

const EMPTY_BUCKETS = {
  fiveStarRatings: 0,
  fourStarRatings: 0,
  threeStarRatings: 0,
  twoStarRatings: 0,
  oneStarRatings: 0,
};

function bucketsOf(scores: number[]): DerivedRating['buckets'] {
  const b = { ...EMPTY_BUCKETS };
  for (const s of scores) {
    if (s >= 5) b.fiveStarRatings++;
    else if (s === 4) b.fourStarRatings++;
    else if (s === 3) b.threeStarRatings++;
    else if (s === 2) b.twoStarRatings++;
    else if (s <= 1) b.oneStarRatings++;
  }
  return b;
}

/** Round to one decimal — the precision every surface displays. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Derive a driver's true rating from the Rating rows.
 *
 * Returns `average: null` when there are no ratings. A caller that needs a
 * number for display should show "New" rather than substituting 5.0 — that
 * substitution is what made an unrated driver look perfect.
 */
export async function deriveRiderRating(riderId: string): Promise<DerivedRating> {
  const rows = await db.rating.findMany({
    where: { toRiderId: riderId },
    select: { score: true },
  });
  const scores = rows.map(r => r.score);
  if (scores.length === 0) return { average: null, count: 0, buckets: { ...EMPTY_BUCKETS } };
  return {
    average: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
    buckets: bucketsOf(scores),
  };
}

/** Derive a passenger's rating from the ratings drivers gave them. */
export async function derivePassengerRating(userId: string): Promise<DerivedRating> {
  const rows = await db.rating.findMany({
    where: { toUserId: userId, toRiderId: null },
    select: { score: true },
  });
  const scores = rows.map(r => r.score);
  if (scores.length === 0) return { average: null, count: 0, buckets: { ...EMPTY_BUCKETS } };
  return {
    average: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
    buckets: bucketsOf(scores),
  };
}

/**
 * Push a driver's derived rating into both caches so all three stores agree.
 *
 * Call this after every rating write. `Rider.rating` keeps its historical
 * 5.0 default when there are no ratings — the column is non-nullable and
 * changing that would ripple through every consumer — but `totalRatings` on
 * the reputation row is written truthfully, so "5.0 with 0 ratings" stays
 * detectable by anything that cares.
 */
export async function syncRiderRating(riderId: string): Promise<DerivedRating> {
  const derived = await deriveRiderRating(riderId);

  await db.rider.update({
    where: { id: riderId },
    data: { rating: derived.average ?? 5 },
  });

  // The reputation row may not exist yet for a driver who has never been
  // scored; updateMany is a no-op rather than an error in that case, and the
  // reputation engine creates the row on its own first write.
  await db.driverReputation.updateMany({
    where: { riderId },
    data: {
      averageRating: derived.average ?? 5,
      totalRatings: derived.count,
      ...derived.buckets,
    },
  });

  return derived;
}

/** Push a passenger's derived rating into the User cache. */
export async function syncPassengerRating(userId: string): Promise<DerivedRating> {
  const derived = await derivePassengerRating(userId);
  await db.user.update({
    where: { id: userId },
    data: {
      passengerRating: derived.average,
      passengerRatingCount: derived.count,
    },
  });
  return derived;
}

export interface ReconciliationReport {
  ridersChecked: number;
  ridersRepaired: number;
  passengersChecked: number;
  passengersRepaired: number;
  /** Every discrepancy found, so drift is visible rather than merely fixed. */
  drift: Array<{
    kind: 'rider' | 'passenger';
    id: string;
    field: string;
    was: number | null;
    now: number | null;
  }>;
}

/**
 * Recompute every cached rating from the Rating rows and report what was
 * wrong. Repairs drift AND surfaces it: a cache that silently self-heals hides
 * the bug that caused the drift in the first place.
 */
export async function reconcileAll(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    ridersChecked: 0,
    ridersRepaired: 0,
    passengersChecked: 0,
    passengersRepaired: 0,
    drift: [],
  };

  const riders = await db.rider.findMany({
    select: { id: true, rating: true, reputation: { select: { averageRating: true, totalRatings: true } } },
  });

  for (const rider of riders) {
    report.ridersChecked++;
    const derived = await deriveRiderRating(rider.id);
    const expected = derived.average ?? 5;

    let repaired = false;
    if (round1(rider.rating) !== expected) {
      report.drift.push({
        kind: 'rider',
        id: rider.id,
        field: 'Rider.rating',
        was: rider.rating,
        now: expected,
      });
      repaired = true;
    }
    if (rider.reputation && rider.reputation.totalRatings !== derived.count) {
      report.drift.push({
        kind: 'rider',
        id: rider.id,
        field: 'DriverReputation.totalRatings',
        was: rider.reputation.totalRatings,
        now: derived.count,
      });
      repaired = true;
    }
    if (rider.reputation && round1(rider.reputation.averageRating) !== expected) {
      report.drift.push({
        kind: 'rider',
        id: rider.id,
        field: 'DriverReputation.averageRating',
        was: rider.reputation.averageRating,
        now: expected,
      });
      repaired = true;
    }

    if (repaired) {
      await syncRiderRating(rider.id);
      report.ridersRepaired++;
    }
  }

  // Only users who have actually been rated as passengers, so this does not
  // walk the whole user table on every run.
  const ratedPassengers = await db.rating.findMany({
    where: { toRiderId: null, toUserId: { not: null } },
    select: { toUserId: true },
    distinct: ['toUserId'],
  });

  for (const { toUserId } of ratedPassengers) {
    if (!toUserId) continue;
    report.passengersChecked++;
    const derived = await derivePassengerRating(toUserId);
    const user = await db.user.findUnique({
      where: { id: toUserId },
      select: { passengerRating: true, passengerRatingCount: true },
    });
    if (!user) continue;

    if (
      user.passengerRatingCount !== derived.count ||
      (user.passengerRating === null) !== (derived.average === null) ||
      (user.passengerRating !== null &&
        derived.average !== null &&
        round1(user.passengerRating) !== derived.average)
    ) {
      report.drift.push({
        kind: 'passenger',
        id: toUserId,
        field: 'User.passengerRating',
        was: user.passengerRating,
        now: derived.average,
      });
      await syncPassengerRating(toUserId);
      report.passengersRepaired++;
    }
  }

  return report;
}
