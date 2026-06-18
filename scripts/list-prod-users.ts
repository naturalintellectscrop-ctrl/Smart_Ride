/**
 * List all users in the production database (dry run).
 * Uses DATABASE_URL from .env.production
 *
 * Usage:
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" bunx tsx scripts/list-prod-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, status: true,
      authProvider: true, phone: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n=== ${users.length} users in production DB ===\n`);

  const testEmailPatterns = /@demo\.com|@test\.|@example\.com|testuser|demouser/i;
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

  const testUsers = users.filter(u =>
    testEmailPatterns.test(u.email) ||
    testEmailPatterns.test(u.name || '') ||
    (u.email === 'client@demo.com') ||
    (u.email === 'rider@demo.com') ||
    (u.email === 'driver@demo.com') ||
    (u.email === 'delivery@demo.com')
  );
  const adminUsers = users.filter(u => adminRoles.includes(u.role));
  const realUsers = users.filter(u => !testUsers.includes(u) && !adminUsers.includes(u));

  console.log('--- TEST USERS (candidates for deletion) ---');
  for (const u of testUsers) {
    console.log(`  [TEST] ${u.email.padEnd(30)} ${u.role.padEnd(12)} ${u.name}`);
  }

  console.log(`\n--- ADMIN USERS (will be KEPT) ---`);
  for (const u of adminUsers) {
    console.log(`  [ADMIN] ${u.email.padEnd(30)} ${u.role.padEnd(12)} ${u.name}`);
  }

  console.log(`\n--- OTHER USERS (real users — will be KEPT) ---`);
  for (const u of realUsers) {
    console.log(`  [REAL] ${u.email.padEnd(30)} ${u.role.padEnd(12)} ${u.name}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Test users (to delete): ${testUsers.length}`);
  console.log(`  Admin users (keep):     ${adminUsers.length}`);
  console.log(`  Other users (keep):     ${realUsers.length}`);
  console.log(`  Total:                  ${users.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
