/**
 * Admin User Management API
 * GET /api/admin/users - Get all users with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import { generateCSV, csvResponse } from '@/lib/export';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};
    
    if (role && role !== 'all') {
      where.role = role as UserRole;
    }
    
    if (status && status !== 'all') {
      where.status = status as UserStatus;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // CSV Export
    if (action === 'export') {
      const users = await db.user.findMany({
        where,
        take: 10000,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              orders: true,
              tasks: true,
            }
          }
        }
      });

      const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined', 'Last Login', 'Orders', 'Tasks'];
      const rows = users.map(u => [
        u.name,
        u.email,
        u.phone || '',
        u.role,
        u.status,
        new Date(u.createdAt).toLocaleDateString(),
        u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never',
        String(u._count.orders),
        String(u._count.tasks),
      ]);

      const csv = generateCSV(headers, rows);
      const date = new Date().toISOString().split('T')[0];
      return csvResponse(csv, `users-export-${date}.csv`);
    }

    // Get users and count
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              orders: true,
              tasks: true,
            }
          }
        }
      }),
      db.user.count({ where })
    ]);

    // Get stats
    const stats = await db.user.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const roleStats = await db.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        orderCount: user._count.orders,
        taskCount: user._count.tasks,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        active: stats.find(s => s.status === 'ACTIVE')?._count.id || 0,
        suspended: stats.find(s => s.status === 'SUSPENDED')?._count.id || 0,
        inactive: stats.find(s => s.status === 'INACTIVE')?._count.id || 0,
        banned: stats.find(s => s.status === 'BANNED')?._count.id || 0,
        admins: roleStats.filter(r => 
          ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(r.role)
        ).reduce((sum, r) => sum + r._count.id, 0),
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// Update user status
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !['ADMIN', 'SUPER_ADMIN'].includes(decoded.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const body = await request.json();

    const adminUserPatchSchema = z.object({
      userId: z.string().min(1),
      action: z.enum(['activate', 'suspend', 'ban', 'change_role', 'update']),
      role: z.enum(['CLIENT', 'RIDER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN', 'HEALTH_PROVIDER']).optional(),
      data: z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(['CLIENT', 'RIDER', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN', 'HEALTH_PROVIDER']).optional(),
      }).optional(),
    });

    const parsed = adminUserPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { userId, action, role, data } = parsed.data;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let updateData: Prisma.UserUpdateInput = {};

    switch (action) {
      case 'activate':
        updateData.status = 'ACTIVE';
        break;
      case 'suspend':
        updateData.status = 'SUSPENDED';
        break;
      case 'ban':
        updateData.status = 'BANNED';
        break;
      case 'change_role':
        if (!role) {
          return NextResponse.json({ success: false, error: 'role is required for change_role action' }, { status: 400 });
        }
        updateData.role = role as UserRole;
        break;
      case 'update':
        // Full user update
        if (data) {
          if (data.name) updateData.name = data.name;
          if (data.email) updateData.email = data.email;
          if (data.phone !== undefined) updateData.phone = data.phone || null;
          if (data.role) updateData.role = data.role as UserRole;
        }
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId: decoded.userId,
        action: action.toUpperCase(),
        entityType: 'User',
        entityId: userId,
        description: `User ${user.name} (${user.email}) ${action}d by admin`,
        oldValues: JSON.stringify({ status: user.status, role: user.role }),
        newValues: JSON.stringify(updateData),
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// ============================================
// DELETE /api/admin/users
// Hard-delete a user with cascading delete of related records.
// Required body: { userId: string }
// Security: SUPER_ADMIN only. Cannot delete your own account.
// ============================================
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded || !['SUPER_ADMIN'].includes(decoded.role)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Super Admin access required for deletion' },
      { status: 403 }
    );
  }

  await setRLSContext(decoded);
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of other admin accounts (only allow non-admin deletion)
    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];
    if (adminRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete admin accounts via this endpoint. Use database operations.' },
        { status: 403 }
      );
    }

    // ============================================
    // Cascading delete — manually delete Restrict relations first
    // ============================================
    // 1. Delete the user's Rider profile and its children (if exists)
    const rider = await db.rider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (rider) {
      // Delete rider's cash collections (Restrict)
      await db.cashCollection.deleteMany({ where: { riderId: rider.id } });
      // Delete rider's vehicle
      await db.vehicle.deleteMany({ where: { riderId: rider.id } });
      // Delete rider's tasks (will be handled by user task deletion below, but clean up rider-scoped ones)
      // Delete the rider record itself
      await db.rider.delete({ where: { id: rider.id } });
    }

    // 2. Delete user's orders and their children (Restrict on Order.client)
    const userOrders = await db.order.findMany({
      where: { clientId: userId },
      select: { id: true },
    });
    if (userOrders.length > 0) {
      const orderIds = userOrders.map(o => o.id);
      // Delete order children first
      await db.task.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.rating.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.kOT.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    // 3. Delete user's payments (Restrict on Payment.user)
    await db.payment.deleteMany({ where: { userId } });

    // 4. Delete user's tasks (Task.client uses Cascade, but delete manually for safety)
    await db.task.deleteMany({ where: { clientId: userId } });// Also delete tasks where this user is the rider
    if (rider) {
      await db.task.deleteMany({ where: { riderId: rider.id } });
    }

    // 5. Delete remaining Cascade/SetNull relations (safe to delete directly)
    await db.auditLog.deleteMany({ where: { userId } });
    await db.notificationLog.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });
    await db.notificationPreference.deleteMany({ where: { userId } });
    await db.expoPushToken.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.savedAddress.deleteMany({ where: { userId } });
    await db.sOSAlert.deleteMany({ where: { userId } });
    await db.conversationParticipant.deleteMany({ where: { userId } });
    await db.dispute.deleteMany({ where: { userId } });
    await db.rating.deleteMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    await db.callSession.deleteMany({
      where: { OR: [{ callerId: userId }, { recipientId: userId }] },
    });
    // CashCollection.userId is SetNull (won't block), but delete for cleanliness
    await db.cashCollection.deleteMany({ where: { userId } });

    // 6. Finally, delete the user
    await db.user.delete({ where: { id: userId } });

    // Create audit log for the deletion (use the admin's ID, not the deleted user)
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        userId: decoded.userId,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: userId,
        description: `User ${user.name} (${user.email}) permanently deleted by super admin`,
        oldValues: JSON.stringify({ email: user.email, name: user.name, role: user.role }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user. The user may have related records that prevent deletion.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
