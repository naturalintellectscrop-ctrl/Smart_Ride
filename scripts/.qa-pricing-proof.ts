/** PRICING-1 before/after, from the LIVE engine (admin PricingConfig merged). */
import { calculatePricingAsync } from '../src/lib/api/pricing';

const line = (a: any, w: number) => String(a).padStart(w);

console.log('\nFOOD_DELIVERY — customer delivery charge vs courier compensation');
console.log('  km | OLD customer | NEW customer | courier gets | platform | OLD margin');
console.log('-----+--------------+--------------+--------------+----------+-----------');
for (const km of [1, 3, 5.5, 8, 10, 15]) {
  const b = await calculatePricingAsync({ taskType: 'FOOD_DELIVERY', distanceKm: km });
  const oldCustomer = Math.round(b.baseFare + b.distanceFare + b.nightSurcharge + b.peakSurcharge) + Math.round(b.serviceFee);
  console.log(`${line(km,4)} | ${line(oldCustomer,12)} | ${line(b.totalAmount,12)} | ${line(b.riderEarnings,12)} | ${line(b.platformCommission,8)} | ${line(oldCustomer - b.riderEarnings,10)}`);
}

console.log('\nSMART_HEALTH_DELIVERY — with the admin PricingConfig row in place');
console.log('  km | customer pays | courier gets | platform keeps | (before: courier / platform)');
console.log('-----+---------------+--------------+----------------+-----------------------------');
for (const km of [1, 3, 5.5, 10, 15]) {
  const b = await calculatePricingAsync({ taskType: 'SMART_HEALTH_DELIVERY', distanceKm: km });
  // Before: customer charged a flat 5,000; the courier task was priced
  // independently at the 3,000-floor rates, so the courier got 85% of THAT.
  const oldTaskFare = Math.max(3000, Math.round((2000 + km * 150) * 1.02 / 100) * 100);
  const oldCourier = oldTaskFare - Math.round(oldTaskFare * 0.15);
  console.log(`${line(km,4)} | ${line(b.totalAmount,13)} | ${line(b.riderEarnings,12)} | ${line(b.platformCommission,14)} | ${line(oldCourier,8)} / ${5000 - oldCourier}`);
}
console.log();
