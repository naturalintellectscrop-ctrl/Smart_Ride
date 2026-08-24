/**
 * Fill in any missing PricingConfig row.
 *
 * `PricingConfig` is the admin-editable source of truth for fares — the
 * dashboard writes it and `calculatePricingAsync` merges it over the hardcoded
 * defaults in `src/lib/api/pricing.ts`. Five of the six service types have a
 * row. `SMART_HEALTH_DELIVERY` never got one, which is why pharmacy delivery
 * had been carrying a `deliveryFee = supportsDelivery ? 5000 : 0` constant in
 * the order route instead: with no row and a hardcoded `minimumFare` of 3,000,
 * the engine would have priced a pharmacy run below the intended charge.
 *
 * Business decision, 2026-08-24: pharmacy delivery is charged at UGX 5,000, and
 * that figure is owned by this configuration rather than by a constant in a
 * route. Everything else about the leg follows the normal model — the customer
 * charge, the courier's compensation and the platform's commission stay
 * separate accounting components, and `platformCommissionPercent` below is what
 * allocates between the last two. The 5,000 is what the customer pays, NOT what
 * the platform keeps.
 *
 * CREATE-ONLY. An existing row is left exactly as it is, because an admin may
 * have edited it and a seed must never silently undo that. Re-runnable.
 *
 *   bun scripts/seed-pricing-config.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * Rows the platform expects to exist. Values match the engine's own defaults
 * for each service, except `SMART_HEALTH_DELIVERY.minimumFare`, which carries
 * the pharmacy delivery decision above.
 */
const EXPECTED = [
  {
    serviceType: 'SMART_BODA_RIDE',
    baseFare: 2000, perKmRate: 150, perMinuteRate: 50, minimumFare: 3000,
    platformCommissionPercent: 0.15, serviceFeePercent: 0.05,
    nightSurchargePercent: 0.2, peakSurchargePercent: 0.25,
  },
  {
    serviceType: 'SMART_CAR_RIDE',
    baseFare: 5000, perKmRate: 300, perMinuteRate: 100, minimumFare: 8000,
    platformCommissionPercent: 0.2, serviceFeePercent: 0.05,
    nightSurchargePercent: 0.2, peakSurchargePercent: 0.25,
  },
  {
    serviceType: 'FOOD_DELIVERY',
    baseFare: 3000, perKmRate: 200, perMinuteRate: 0, minimumFare: 5000,
    platformCommissionPercent: 0.15, serviceFeePercent: 0.03,
    nightSurchargePercent: 0.1, peakSurchargePercent: 0.15,
  },
  {
    serviceType: 'SHOPPING',
    baseFare: 3000, perKmRate: 200, perMinuteRate: 0, minimumFare: 5000,
    platformCommissionPercent: 0.12, serviceFeePercent: 0.03,
    nightSurchargePercent: 0.1, peakSurchargePercent: 0.15,
  },
  {
    serviceType: 'ITEM_DELIVERY',
    baseFare: 1000, perKmRate: 100, perMinuteRate: 0, minimumFare: 2000,
    platformCommissionPercent: 0.1, serviceFeePercent: 0.02,
    nightSurchargePercent: 0.1, peakSurchargePercent: 0.15,
  },
  {
    serviceType: 'SMART_HEALTH_DELIVERY',
    baseFare: 2000, perKmRate: 150, perMinuteRate: 0,
    // The pharmacy delivery charge. Acts as a floor, so a short medicine run
    // is charged 5,000 and a long one prices up from base + distance as usual.
    minimumFare: 5000,
    platformCommissionPercent: 0.15, serviceFeePercent: 0.02,
    nightSurchargePercent: 0.1, peakSurchargePercent: 0.15,
  },
];

async function main() {
  let created = 0;
  for (const row of EXPECTED) {
    const existing = await db.pricingConfig.findUnique({
      where: { serviceType: row.serviceType },
      select: { id: true, minimumFare: true, platformCommissionPercent: true },
    });
    if (existing) {
      console.log(
        `  keep    ${row.serviceType.padEnd(24)} minimumFare=${Number(existing.minimumFare)} ` +
        `commission=${((existing.platformCommissionPercent ?? 0) * 100).toFixed(0)}%`
      );
      continue;
    }
    await db.pricingConfig.create({ data: row });
    created++;
    console.log(
      `  CREATE  ${row.serviceType.padEnd(24)} minimumFare=${row.minimumFare} ` +
      `commission=${(row.platformCommissionPercent * 100).toFixed(0)}%`
    );
  }
  console.log(`\n${created} row(s) created, ${EXPECTED.length - created} left untouched.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
