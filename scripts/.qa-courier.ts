import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const cmd = process.argv[2];

async function main() {
  if (cmd === 'list') {
    const riders = await db.rider.findMany({
      where: { riderRole: 'DELIVERY_PERSONNEL' },
      select: { id: true, fullName: true, status: true, isOnline: true, currentTaskId: true,
                currentLatitude: true, currentLongitude: true, userId: true },
      take: 10,
    });
    console.log(JSON.stringify(riders, null, 2));
    const users = await db.user.findMany({
      where: { id: { in: riders.map(r => r.userId!).filter(Boolean) } },
      select: { id: true, email: true, phone: true, role: true },
    });
    console.log(JSON.stringify(users, null, 2));
  }
  if (cmd === 'online') {
    const id = process.argv[3];
    const r = await db.rider.update({
      where: { id },
      data: {
        isOnline: true, status: 'APPROVED', connectionStatus: 'ACTIVE',
        currentTaskId: null,
        currentLatitude: 0.3476, currentLongitude: 32.5825,
        lastLocationUpdate: new Date(), lastHeartbeatAt: new Date(),
      },
      select: { id: true, fullName: true, isOnline: true, currentLatitude: true, riderRole: true },
    });
    console.log(JSON.stringify(r));
  }
  if (cmd === 'offline') {
    const id = process.argv[3];
    await db.rider.update({ where: { id }, data: { isOnline: false, currentTaskId: null } });
    console.log('offline');
  }
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); });
