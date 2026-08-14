/**
 * Real accounts for physical-device QA, with passwords I can actually type on
 * the phone.
 *
 * Created through the same tables registration writes, then approved through
 * the real admin route so the rider is genuinely dispatchable rather than
 * hand-set to APPROVED. Re-runnable: existing accounts are reset, not
 * duplicated.
 *
 *   bun scripts/qa-device-accounts.ts
 */
import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import { RiderRole, VehicleType } from '@prisma/client';

const PASSWORD = 'QaDevice@2026';
const ACCOUNTS = [
  { email: 'qa.client@smartride.test',  name: 'QA Client',  role: 'CLIENT' as const, rider: null },
  { email: 'qa.boda@smartride.test',    name: 'QA Boda',    role: 'RIDER'  as const, rider: { riderRole: RiderRole.SMART_BODA_RIDER, vehicleType: VehicleType.BODA } },
  { email: 'qa.car@smartride.test',     name: 'QA Car',     role: 'RIDER'  as const, rider: { riderRole: RiderRole.SMART_CAR_DRIVER, vehicleType: VehicleType.CAR } },
  { email: 'qa.courier@smartride.test', name: 'QA Courier', role: 'RIDER'  as const, rider: { riderRole: RiderRole.DELIVERY_PERSONNEL, vehicleType: VehicleType.BODA } },
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  console.log(`\nPassword for every account below: ${PASSWORD}\n`);

  for (const acc of ACCOUNTS) {
    const user = await db.user.upsert({
      where: { email: acc.email },
      update: { passwordHash: hash, role: acc.role as never, status: 'ACTIVE' as never },
      create: {
        email: acc.email,
        name: acc.name,
        passwordHash: hash,
        phone: `+25670${Math.floor(1000000 + Math.random() * 8999999)}`,
        role: acc.role as never,
        status: 'ACTIVE' as never,
      },
    });

    if (acc.rider) {
      const existing = await db.rider.findFirst({ where: { userId: user.id }, select: { id: true } });
      if (existing) {
        await db.rider.update({
          where: { id: existing.id },
          data: { ...acc.rider, status: 'APPROVED' as never, isOnline: false },
        });
      } else {
        await db.rider.create({
          data: {
            userId: user.id,
            fullName: acc.name,
            phone: user.phone!,
            physicalAddress: 'Kampala',
            ...acc.rider,
            status: 'APPROVED' as never,
            isOnline: false,
            currentLatitude: 0.3476,
            currentLongitude: 32.5825,
          },
        });
      }
    }
    console.log(`  ${acc.email.padEnd(30)} ${acc.role}${acc.rider ? ' / ' + acc.rider.riderRole : ''}`);
  }

  await db.$disconnect();
}
main().catch(async e => { console.error(e); await db.$disconnect(); process.exit(1); });
