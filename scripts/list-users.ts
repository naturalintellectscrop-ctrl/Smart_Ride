import { db } from '../src/lib/db';

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, status: true,
      authProvider: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Total users:', users.length);
  console.log('---');
  for (const u of users) {
    console.log(JSON.stringify({
      id: u.id, email: u.email, name: u.name, role: u.role,
      status: u.status, authProvider: u.authProvider,
      lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
    }));
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
