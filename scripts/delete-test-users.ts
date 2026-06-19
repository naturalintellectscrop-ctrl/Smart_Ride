/**
 * Smart Ride — Bulk Delete Test Users
 *
 * Deletes all test/demo users from the production database.
 * Run this from your LOCAL machine (GitBash) where you have network
 * access to the Supabase database.
 *
 * USAGE (from project root):
 *
 *   # Dry run — lists what WOULD be deleted (no changes)
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" bunx tsx scripts/delete-test-users.ts
 *
 *   # Actually delete — add CONFIRM=1
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" CONFIRM=1 bunx tsx scripts/delete-test-users.ts
 *
 * The script:
 *   - Identifies test users by email pattern (@demo.com, @test., @example.com)
 *   - NEVER deletes admin accounts (ADMIN, SUPER_ADMIN, etc.)
 *   - Cascades deletes: rider profiles, orders, payments, tasks, etc.
 *   - Creates an audit log entry for each deletion
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test email patterns — users matching these are candidates for deletion
const TEST_EMAIL_PATTERNS = [
  /@demo\.com$/i,
  /@test\./i,
  /@example\.com$/i,
  /^test/i,
  /^demo/i,
];

// Explicit list of known seed test users
const KNOWN_TEST_EMAILS = [
  'client@demo.com',
  'rider@demo.com',
  'driver@demo.com',
  'delivery@demo.com',
];

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

async function isTestUser(email: string, name: string): boolean {
  if (KNOWN_TEST_EMAILS.includes(email.toLowerCase())) return true;
  for (const pattern of TEST_EMAIL_PATTERNS) {
    if (pattern.test(email) || pattern.test(name)) return true;
  }
  return false;
}

async function deleteUserCascade(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete Rider profile and its children (if exists)
    const rider = await prisma.rider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (rider) {
      await prisma.cashCollection.deleteMany({ where: { riderId: rider.id } });
      await prisma.vehicle.deleteMany({ where: { riderId: rider.id } });
      await prisma.task.deleteMany({ where: { riderId: rider.id } });
      await prisma.rider.delete({ where: { id: rider.id } });
    }

    // 2. Delete user's orders and their children (Restrict on Order.client)
    const userOrders = await prisma.order.findMany({
      where: { clientId: userId },
      select: { id: true },
    });
    if (userOrders.length > 0) {
      const orderIds = userOrders.map(o => o.id);
      await prisma.task.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.rating.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.kOT.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    // 3. Delete user's payments (Restrict on Payment.user)
    await prisma.payment.deleteMany({ where: { userId } });

    // 4. Delete user's tasks (Task.client is Cascade, but delete manually for safety)
    await prisma.task.deleteMany({ where: { clientId: userId } });

    // 5. Delete remaining relations that may block (no explicit Cascade)
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.notificationLog.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.notificationPreference.deleteMany({ where: { userId } });
    await prisma.expoPushToken.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.savedAddress.deleteMany({ where: { userId } });
    await prisma.sOSAlert.deleteMany({ where: { userId } });
    await prisma.conversationParticipant.deleteMany({ where: { userId } });
    await prisma.dispute.deleteMany({ where: { userId } });
    await prisma.rating.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    await prisma.callSession.deleteMany({
      where: { OR: [{ callerId: userId }, { recipientId: userId }] },
    });
    await prisma.cashCollection.deleteMany({ where: { userId } });

    // 6. Finally, delete the user
    await prisma.user.delete({ where: { id: userId } });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  const isConfirmed = process.env.CONFIRM === '1';

  console.log('');
  console.log('========================================');
  console.log('  Smart Ride — Delete Test Users');
  console.log('========================================');
  console.log(`  Mode: ${isConfirmed ? '🔴 DELETE (CONFIRM=1)' : '🟡 DRY RUN (add CONFIRM=1 to actually delete)'}`);
  console.log(`  Database: ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://<hidden>@') || '(not set)'}`);
  console.log('========================================');
  console.log('');

  // Fetch all users
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total users in database: ${allUsers.length}`);
  console.log('');

  // Identify test users (excluding admins)
  const testUsers: typeof allUsers = [];
  const adminTestUsers: typeof allUsers = []; // admins with test emails — show but DON'T delete

  for (const user of allUsers) {
    const isTest = await isTestUser(user.email, user.name || '');
    if (isTest) {
      if (ADMIN_ROLES.includes(user.role)) {
        adminTestUsers.push(user);
      } else {
        testUsers.push(user);
      }
    }
  }

  if (testUsers.length === 0 && adminTestUsers.length === 0) {
    console.log('✅ No test users found. Database is clean.');
    return;
  }

  console.log('--- TEST USERS (will be deleted) ---');
  for (const u of testUsers) {
    console.log(`  • ${u.email.padEnd(30)} ${u.role.padEnd(12)} ${u.name}`);
  }
  console.log(`  Total: ${testUsers.length}`);

  if (adminTestUsers.length > 0) {
    console.log('');
    console.log('--- ADMIN USERS WITH TEST EMAILS (will be KEPT — admins are protected) ---');
    for (const u of adminTestUsers) {
      console.log(`  ⚠️  ${u.email.padEnd(30)} ${u.role.padEnd(12)} ${u.name}`);
    }
    console.log(`  Total: ${adminTestUsers.length} (protected)`);
  }

  console.log('');

  if (!isConfirmed) {
    console.log('🟡 DRY RUN COMPLETE — no changes made.');
    console.log('   To actually delete these users, run again with CONFIRM=1:');
    console.log('');
    console.log('   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" CONFIRM=1 bunx tsx scripts/delete-test-users.ts');
    return;
  }

  // Actually delete
  console.log('🔴 Deleting test users...\n');

  let deleted = 0;
  let failed = 0;

  for (const user of testUsers) {
    process.stdout.write(`  Deleting ${user.email}... `);
    const result = await deleteUserCascade(user.id);
    if (result.success) {
      console.log('✅ done');
      deleted++;

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'TEST_USER_DELETED',
          entityType: 'User',
          entityId: user.id,
          description: `Test user ${user.email} (${user.name}) deleted via bulk cleanup script`,
          oldValues: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
        },
      }).catch(() => { /* audit log failure shouldn't block */ });
    } else {
      console.log(`❌ FAILED: ${result.error}`);
      failed++;
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`  ✅ Deleted: ${deleted}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  Total processed: ${testUsers.length}`);
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
