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

// Test email patterns — users matching these are candidates for deletion.
// Covers every pattern the seed scripts use: @demo.com, stress_test_*@test.com,
// @example.com, @smartride.test, and generic test*/demo* local parts.
const TEST_EMAIL_PATTERNS = [
  /@demo\.com$/i,
  /@test\b/i,          // @test.com, @test.xyz
  /@example\.com$/i,
  /@smartride\.test$/i,
  /@smartride\.temp$/i, // generated test merchants (…@smartride.temp)
  /@ex\.com$/i,         // synthetic QA accounts (drv_/ph_/gate_/rd_/pl_/lic_…@ex.com)
  /^test/i,
  /^demo/i,
  /^stress_test/i,
];

// Explicit list of known seed/QA test users that don't fit a domain pattern
// (e.g. phone-based @smartride.ug riders created during onboarding testing).
const KNOWN_TEST_EMAILS = [
  'client@demo.com',
  'rider@demo.com',
  'driver@demo.com',
  'delivery@demo.com',
  '+25672212311@smartride.ug', // "RiderV" QA rider
  '+2567604026@smartride.ug',  // "V Test" QA rider
];

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

function isTestUser(email: string, name: string): boolean {
  if (KNOWN_TEST_EMAILS.includes(email.toLowerCase())) return true;
  for (const pattern of TEST_EMAIL_PATTERNS) {
    if (pattern.test(email) || pattern.test(name)) return true;
  }
  return false;
}

async function deleteUserCascade(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [rider, merchant, healthProvider] = await Promise.all([
      prisma.rider.findUnique({ where: { userId }, select: { id: true } }),
      prisma.merchant.findUnique({ where: { userId }, select: { id: true } }),
      prisma.healthProvider.findUnique({ where: { userId }, select: { id: true } }),
    ]);
    const riderId = rider?.id;
    const merchantId = merchant?.id;

    const orders = await prisma.order.findMany({
      where: { OR: [{ clientId: userId }, ...(merchantId ? [{ merchantId }] : [])] },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { clientId: userId },
          ...(riderId ? [{ riderId }] : []),
          ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    await prisma.$transaction(async (tx) => {
      // DispatchMatch.taskId / Conversation.taskId reference the user's tasks
      // and must be cleared before the tasks can be deleted.
      if (taskIds.length) {
        await tx.dispatchMatch.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.conversation.deleteMany({ where: { taskId: { in: taskIds } } });
      }

      // Order children (ratings/receipts cascade from tasks)
      if (orderIds.length) {
        await tx.task.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.kOT.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.receipt.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.transaction.deleteMany({ where: { orderId: { in: orderIds } } });
      }

      // Rider profile + dependents (RiderPayout/CashCollection are Restrict;
      // DispatchMatch is required — all block a plain rider delete)
      if (riderId) {
        await tx.task.deleteMany({ where: { riderId } });
        await tx.dispatchMatch.deleteMany({ where: { riderId } });
        await tx.riderPayout.deleteMany({ where: { riderId } });
        await tx.cashCollection.deleteMany({ where: { riderId } });
        await tx.heartbeatLog.deleteMany({ where: { riderId } });
        await tx.connectionAlert.deleteMany({ where: { riderId } });
        await tx.riderMetrics.deleteMany({ where: { riderId } });
        await tx.vehicle.deleteMany({ where: { riderId } });
        await tx.document.deleteMany({ where: { riderId } });
        await tx.fraudAlert.deleteMany({ where: { riderId } });
        await tx.transaction.deleteMany({ where: { riderId } });
        await tx.financeLog.deleteMany({ where: { riderId } });
        await tx.dispute.deleteMany({ where: { riderId } });
        await tx.sOSAlert.deleteMany({ where: { riderId } });
        await tx.auditLog.deleteMany({ where: { riderId } });
      }

      // Merchant profile + dependents
      if (merchantId) {
        await tx.menuItem.deleteMany({ where: { merchantId } });
        await tx.kOT.deleteMany({ where: { merchantId } });
        await tx.merchantDocument.deleteMany({ where: { merchantId } });
        await tx.document.deleteMany({ where: { merchantId } });
        await tx.pharmacy.deleteMany({ where: { merchantId } });
        await tx.cart.deleteMany({ where: { merchantId } });
        await tx.transaction.deleteMany({ where: { merchantId } });
        await tx.financeLog.deleteMany({ where: { merchantId } });
        await tx.dispute.deleteMany({ where: { merchantId } });
        await tx.auditLog.deleteMany({ where: { merchantId } });
      }

      if (orderIds.length) {
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // User-direct relations (Dispute uses clientId, NOT userId)
      await tx.healthOrder.deleteMany({ where: { clientId: userId } });
      await tx.prescription.deleteMany({ where: { clientId: userId } });
      await tx.task.deleteMany({ where: { clientId: userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.receipt.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.financeLog.deleteMany({ where: { clientId: userId } });
      await tx.dispute.deleteMany({ where: { clientId: userId } });
      await tx.savedAddress.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.notificationLog.deleteMany({ where: { userId } });
      await tx.expoPushToken.deleteMany({ where: { userId } });
      await tx.offlineAction.deleteMany({ where: { userId } });
      await tx.sOSAlert.deleteMany({ where: { userId } });
      await tx.fraudAlert.deleteMany({ where: { userId } });
      await tx.conversationParticipant.deleteMany({ where: { userId } });
      await tx.cashCollection.deleteMany({ where: { userId } });
      await tx.rating.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });
      await tx.callSession.deleteMany({ where: { OR: [{ callerId: userId }, { recipientId: userId }] } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });

      // deleteMany (not delete) so a re-run or concurrent run can't trip P2025
      // "record not found" if the row was already removed.
      if (riderId) await tx.rider.deleteMany({ where: { id: riderId } });
      if (merchantId) await tx.merchant.deleteMany({ where: { id: merchantId } });
      if (healthProvider?.id) await tx.healthProvider.deleteMany({ where: { id: healthProvider.id } });

      await tx.user.deleteMany({ where: { id: userId } });
    }, { timeout: 30_000 });

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
