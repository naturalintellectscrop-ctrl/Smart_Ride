import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const caps = await db.riderCapability.findMany({ select: { riderRole: true, taskType: true, isAllowed: true } });
console.log('RiderCapability rows:', caps.length);
for (const c of caps) console.log(` ${c.riderRole} -> ${c.taskType} allowed=${c.isAllowed}`);
console.log('\nriders by role/status:');
const r = await db.rider.groupBy({ by: ['riderRole','status'], _count: { _all: true } });
for (const x of r) console.log(` ${x.riderRole} ${x.status} n=${x._count._all}`);
await db.$disconnect();
