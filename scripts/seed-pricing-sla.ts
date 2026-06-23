/**
 * Seed PricingConfig + SLAConfig with the current default values so the admin
 * dashboard shows editable rows. SAFE to run repeatedly (upsert). Optional —
 * the app already falls back to these same values when the tables are empty.
 *
 *   npx tsx scripts/seed-pricing-sla.ts
 *
 * Requires DATABASE_URL in the root .env (use the SESSION pooler, port 5432).
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// [serviceType, baseFare, perKmRate, perMinuteRate, minimumFare,
//  commission, serviceFee, nightSurcharge, peakSurcharge]  (percents as fractions)
const PRICING: Array<[string, number, number, number, number, number, number, number, number]> = [
  ['SMART_BODA_RIDE', 2000, 150, 50, 3000, 0.15, 0.05, 0.20, 0.25],
  ['SMART_CAR_RIDE', 5000, 300, 100, 8000, 0.20, 0.05, 0.20, 0.25],
  ['FOOD_DELIVERY', 3000, 200, 0, 5000, 0.15, 0.03, 0.10, 0.15],
  ['SHOPPING', 3000, 200, 0, 5000, 0.12, 0.03, 0.10, 0.15],
  ['ITEM_DELIVERY', 1000, 100, 0, 2000, 0.10, 0.02, 0.10, 0.15],
];

// [serviceType, slaMinutes]
const SLA: Array<[string, number]> = [
  ['SMART_BODA_RIDE', 10],
  ['SMART_CAR_RIDE', 12],
  ['FOOD_DELIVERY', 45],
  ['SHOPPING', 60],
  ['ITEM_DELIVERY', 40],
];

async function main() {
  for (const [serviceType, baseFare, perKmRate, perMinuteRate, minimumFare, commission, serviceFee, night, peak] of PRICING) {
    const data = {
      baseFare, perKmRate, perMinuteRate, minimumFare,
      platformCommissionPercent: commission,
      serviceFeePercent: serviceFee,
      nightSurchargePercent: night,
      peakSurchargePercent: peak,
    };
    await db.pricingConfig.upsert({ where: { serviceType }, create: { serviceType, ...data }, update: data });
  }
  for (const [serviceType, slaMinutes] of SLA) {
    await db.sLAConfig.upsert({
      where: { serviceType_state: { serviceType, state: 'default' } },
      create: { serviceType, state: 'default', slaMinutes },
      update: { slaMinutes },
    });
  }
  const [pc, sc] = await Promise.all([db.pricingConfig.count(), db.sLAConfig.count()]);
  console.log(`Seeded. PricingConfig rows: ${pc}, SLAConfig rows: ${sc}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
